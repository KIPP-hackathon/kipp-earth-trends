"""Separate monthly IMERG liquid-phase and NSIDC sea-ice concentration tables.

AI-assisted implementation; see docs/phase-concentration-extraction.md.
"""

import argparse
import json
import logging
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from http.client import IncompleteRead
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import numpy as np
import pandas as pd
import xarray as xr
from scipy.sparse import coo_matrix, vstack

import imerg
from water_ice import (LATITUDES, LONGITUDES, ROOT, report_missing, sea_ice_url,
                       signed_average, write_month)

LOGGER = logging.getLogger(__name__)
PHASE_PRODUCT = "GPM_3IMERGM_LIQUID_PROBABILITY_V07"
ICE_PRODUCT = "SEA_ICE_CONCENTRATION_G02135_V4"
ICE_GUIDE = "https://nsidc.org/sites/default/files/documents/user-guide/g02135-v004-userguide.pdf"
IMERG_GUIDE = "https://gpm.nasa.gov/sites/default/files/2023-07/IMERG_TechnicalDocumentation_final_230713.pdf"


def percent(values):
    """Preserve genuine 0 and 100; exclude fill values and invalid percentages."""
    values = np.asarray(values, dtype=float)
    return np.where(np.isfinite(values) & (values >= 0) & (values <= 100), values, np.nan)


def read_phase(path):
    with xr.open_dataset(path, group="Grid", engine="netcdf4",
                         decode_times=True, mask_and_scale=True) as dataset:
        time = imerg.coordinate(dataset, "time")
        if time.size != 1:
            raise ValueError("Expected exactly one IMERG Final monthly sample.")
        month = imerg.month_of(time.values.reshape(-1)[0])
        lat, lon = imerg.coordinate(dataset, "lat"), imerg.coordinate(dataset, "lon")
        latitude = np.asarray(lat.values, dtype=float)
        longitude = (np.asarray(lon.values, dtype=float) + 180) % 360 - 180
        li, lj = np.argsort(latitude), np.argsort(longitude)
        expected_lat = np.arange(1800) * 0.1 - 89.95
        expected_lon = np.arange(3600) * 0.1 - 179.95
        if (latitude.shape != expected_lat.shape or longitude.shape != expected_lon.shape or
                not np.allclose(latitude[li], expected_lat, atol=1e-4, rtol=0) or
                not np.allclose(longitude[lj], expected_lon, atol=1e-4, rtol=0)):
            raise ValueError("Expected the global native IMERG 0.1-degree grid.")
        field = imerg.coordinate(dataset, "probabilityLiquidPrecipitation")
        if str(field.attrs.get("units", "")).lower() not in {"percent", "%"}:
            raise ValueError("Expected probabilityLiquidPrecipitation in percent.")
        attrs = dict(field.attrs)
        field = field.isel({time.dims[0]: 0})
        if set(field.dims) != {lat.dims[0], lon.dims[0]}:
            raise ValueError("Unexpected liquid-probability dimensions.")
        values = field.transpose(lat.dims[0], lon.dims[0]).values[np.ix_(li, lj)]
        return month, expected_lat, expected_lon, percent(values), attrs


def export_phase(path, output, minimum_coverage=1.0, overwrite=False, weights=None):
    month, lat, lon, values, attrs = read_phase(path)
    if weights is None:
        weights = (imerg.overlap_weights(lat, LATITUDES, latitude=True),
                   imerg.overlap_weights(lon, LONGITUDES))
    result, coverage = signed_average(values, weights, minimum_coverage)
    destination = write_month(output, PHASE_PRODUCT, month, {
        "liquid_precipitation_probability_pct": result,
        "valid_area_fraction": coverage,
    }, {
        "collection": imerg.PRODUCT, "version": imerg.VERSION, "run": "Final",
        "source_doi": "10.5067/GPM/IMERG/3B-MONTH/07", "documentation": IMERG_GUIDE,
        "source_file": path.name, "source_sha256": imerg.sha256(path),
        "source_variable": "Grid/probabilityLiquidPrecipitation", "source_units": "percent",
        "source_variable_attributes": attrs, "native_resolution_degrees": [0.1, 0.1],
        "spatial_method": "Spherical cell-overlap area-weighted mean of native monthly probabilities",
        "temporal_method": "Read the original Final monthly field; no daily aggregation or run substitution",
        "minimum_valid_area_fraction": minimum_coverage,
        "interpretation": "Percent probability of liquid phase, NOT probability of precipitation occurrence. "
        "NASA's native monthly probabilities are precipitation-rate-weighted in time, with an "
        "unweighted fallback in dry native cells. Spatial output is the AREA-weighted mean of that "
        "field, not a recomputed precipitation-volume-weighted liquid fraction for the coarse cell. "
        "Dry native cells retain NASA's diagnostic phase values; a value does not imply precipitation. "
        "Zero is a valid native monthly probability. Missing/out-of-range values stay missing.",
    }, overwrite)
    return destination, month, weights


def concentration_values(codes):
    """G02135 v4 uint16 concentration: tenths of a percent, with separate flags."""
    codes = np.asarray(codes)
    allowed = ((codes >= 0) & (codes <= 1000)) | np.isin(codes, [2510, 2530, 2540, 2550])
    if not allowed.all():
        raise ValueError("Unexpected G02135 concentration codes.")
    # NSIDC warns against interpreting native concentrations below 15 percent.
    valid = (codes == 0) | ((codes >= 150) & (codes <= 1000))
    return np.where(valid, codes / 10.0, np.nan)


def geometry(source):
    return (source.width, source.height, tuple(source.transform), source.crs.to_wkt())


def concentration_weights(source, hemisphere, samples=16):
    """Approximate spherical area overlaps by equal-area quadrature, built once per grid.

    Each target cell has samples^2 equal-spherical-area locations (uniform in
    longitude and sine(latitude)). Their native pixel IDs form a reusable sparse
    averaging matrix. Land and unknown coverage are excluded later, per month.
    """
    from rasterio.transform import rowcol
    from rasterio.warp import transform

    if samples < 2 or samples > 64:
        raise ValueError("Quadrature samples per axis must be from 2 to 64.")
    offsets = (np.arange(samples) + 0.5) / samples
    nlon = len(LONGITUDES)
    blocks = []
    for first in range(0, len(LATITUDES), 4):
        latitude = LATITUDES[first:first + 4]
        low = np.maximum(latitude - 0.25, -90)
        high = np.minimum(latitude + 0.25, 90)
        # Only the requested hemisphere belongs in this table. No equator coverage.
        keep = latitude > 0 if hemisphere == "N" else latitude < 0
        lats = np.rad2deg(np.arcsin(np.sin(np.deg2rad(low))[:, None] + offsets *
                                   (np.sin(np.deg2rad(high)) - np.sin(np.deg2rad(low)))[:, None]))
        lons = (LONGITUDES[:, None] - 0.3125 + offsets * 0.625 + 180) % 360 - 180
        shape = (len(latitude), nlon, samples, samples)
        sample_lat = np.broadcast_to(lats[:, None, :, None], shape).ravel()
        sample_lon = np.broadcast_to(lons[None, :, None, :], shape).ravel()
        selected = np.broadcast_to(keep[:, None, None, None], shape).ravel()
        ids = np.repeat(np.arange(len(latitude) * nlon), samples * samples)[selected]
        x, y = transform("EPSG:4326", source.crs, sample_lon[selected], sample_lat[selected])
        if len(x):
            rows, cols = rowcol(source.transform, x, y)
            rows, cols = np.asarray(rows), np.asarray(cols)
            inside = (rows >= 0) & (rows < source.height) & (cols >= 0) & (cols < source.width)
            columns = rows[inside] * source.width + cols[inside]
            block = coo_matrix((np.full(inside.sum(), 1 / samples ** 2), (ids[inside], columns)),
                               shape=(len(latitude) * nlon, source.height * source.width)).tocsr()
        else:
            block = coo_matrix((len(latitude) * nlon, source.height * source.width)).tocsr()
        blocks.append(block)
    return vstack(blocks, format="csr")


def concentration_average(values, weights, minimum_coverage=1.0):
    valid = np.isfinite(values.ravel())
    coverage = np.asarray(weights @ valid.astype(float)).ravel()
    total = np.asarray(weights @ np.where(valid, values.ravel(), 0)).ravel()
    result = np.full(total.shape, np.nan)
    np.divide(total, coverage, out=result,
              where=(coverage > 0) & (coverage >= minimum_coverage - 1e-8))
    shape = (len(LATITUDES), len(LONGITUDES))
    return result.reshape(shape), np.clip(coverage, 0, 1).reshape(shape)


def read_concentration(path, hemisphere):
    import rasterio
    expected_crs = rasterio.crs.CRS.from_epsg(3411 if hemisphere == "N" else 3412)
    with rasterio.open(path) as source:
        if source.count != 1 or source.crs != expected_crs or source.dtypes[0] != "uint16":
            raise ValueError("Expected a one-band uint16 G02135 polar concentration GeoTIFF.")
        return concentration_values(source.read(1)), geometry(source)


def export_concentration(path, month, hemisphere, output, minimum_coverage=1.0,
                         overwrite=False, samples=16, cached=None):
    import rasterio
    values, signature = read_concentration(path, hemisphere)
    if cached is None:
        with rasterio.open(path) as source:
            weights = concentration_weights(source, hemisphere, samples)
        cached = (signature, weights)
    if cached[0] != signature:
        raise ValueError("Native concentration grid changed within this run; refusing stale weights.")
    result, coverage = concentration_average(values, cached[1], minimum_coverage)
    url = sea_ice_url(month, hemisphere).replace("_extent_", "_concentration_")
    destination = write_month(output, f"{ICE_PRODUCT}_{hemisphere}", month, {
        "sea_ice_concentration_pct": result, "valid_area_fraction": coverage,
    }, {
        "collection": "G02135", "version": "4.0", "source_doi": "10.7265/a98x-0f50",
        "documentation": ICE_GUIDE, "source_url": url,
        "source_file": path.name, "source_sha256": imerg.sha256(path),
        "hemisphere": "Arctic" if hemisphere == "N" else "Antarctic",
        "source_units": "tenths of one percent", "output_units": "percent",
        "native_grid": "Polar stereographic 25 km; geometry validated for weight reuse",
        "spatial_method": "Approximate spherical area-weighted mean by equal-area target-cell quadrature",
        "quadrature_samples_per_axis": samples, "quadrature_samples_per_cell": samples ** 2,
        "minimum_valid_area_fraction": minimum_coverage,
        "temporal_method": "Read original NSIDC monthly concentration GeoTIFF",
        "coverage_definition": "Fraction of equal-area samples intersecting valid native ocean/ice pixels; "
        "land, coastline, pole hole, missing, native 0<concentration<15 percent and outside-map excluded",
        "interpretation": "Mean sea-ice concentration, 0 to 100 percent, not a categorical extent flag "
        "or total km2. Native zero is valid open ocean; flags are not zero concentration. "
        "Native monthly concentrations use NSIDC's 15 percent cutoff; the coarse-cell mean may be "
        "below 15 percent after averaging open ocean and ice, and is NOT thresholded again. "
        "Quadrature is an approximation, not exact polygon intersection or exact area conservation. "
        "G02135 v4 input sensors change at January 2025; retain this boundary in trend interpretation.",
    }, overwrite)
    return destination, cached


def destination(output, product, month):
    return output / product / f"{month:%Y}" / f"{product}_{month:%Y_%m}.csv"


def ensure_new(output, product, month, overwrite):
    path = destination(output, product, month)
    if not overwrite and (path.exists() or path.with_suffix(".metadata.json").exists()):
        raise FileExistsError(f"Output exists: {path}; use --overwrite explicitly.")


def resume_complete(args, product, month, original):
    path = destination(args.output_dir, product, month)
    sidecar = path.with_suffix(".metadata.json")
    if not args.resume or not (path.exists() or sidecar.exists()):
        return False
    if not path.is_file() or not sidecar.is_file() or not original.is_file():
        raise ValueError(f"Resume requires complete CSV, metadata and cached original: {path}")
    metadata = json.loads(sidecar.read_text())
    expected = {"product": product, "month": f"{month:%Y-%m}", "rows": 207936,
                "target_resolution_lat_lon_degrees": [0.5, 0.625],
                "source_file": original.name, "minimum_valid_area_fraction": args.minimum_coverage}
    if product.startswith(ICE_PRODUCT):
        expected["quadrature_samples_per_axis"] = args.quadrature_samples
    if (any(metadata.get(key) != value for key, value in expected.items()) or
            metadata.get("csv_sha256") != imerg.sha256(path) or
            metadata.get("source_sha256") != imerg.sha256(original)):
        raise ValueError(f"Resume validation failed; output/original/settings changed: {path}")
    LOGGER.info("Already complete and hashes verified: %s", path.name)
    return True


def download_concentration(url, path, hemisphere, attempts=4):
    """Retry transient transfers; incomplete data never enter the reusable cache."""
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(attempts):
        try:
            with urlopen(url, timeout=30) as response, tempfile.TemporaryDirectory(dir=path.parent) as staging:
                downloaded = Path(staging) / path.name
                with downloaded.open("wb") as stream:
                    while block := response.read(64 * 1024):
                        stream.write(block)
                length = response.headers.get("Content-Length")
                if length and downloaded.stat().st_size != int(length):
                    raise IncompleteRead(b"", int(length))
                read_concentration(downloaded, hemisphere)
                downloaded.replace(path)
            return True
        except HTTPError as error:
            if error.code == 404:
                LOGGER.warning("Unavailable: %s", url)
                return False
            if error.code not in {408, 429, 500, 502, 503, 504}:
                raise
            failure = error
        except (TimeoutError, URLError, IncompleteRead, ConnectionError) as error:
            failure = error
        if attempt == attempts - 1:
            raise failure
        LOGGER.warning("Temporary download failure (%s); retry %d/%d: %s",
                       type(failure).__name__, attempt + 2, attempts, path.name)
        time.sleep(2 ** attempt)


def run_phase(args, start, end):
    raw = args.raw_dir or imerg.DEFAULT_RAW
    if args.offline:
        paths = sorted(raw.glob("*.HDF5"))
    else:
        paths = imerg.search_and_download(start, end, raw, args.auth_strategy, args.plan)
        if args.plan:
            return
    selected = {}
    completed = set()
    for path in paths:
        # Read only time for selection; the variable/grid are validated before each export.
        with xr.open_dataset(path, group="Grid") as dataset:
            time = imerg.coordinate(dataset, "time")
            if time.size != 1:
                raise ValueError(f"Expected one monthly sample: {path}")
            month = imerg.month_of(time.values.reshape(-1)[0])
        if start <= month <= end:
            if month in selected:
                raise ValueError(f"Duplicate monthly originals: {month:%Y-%m}")
            if resume_complete(args, PHASE_PRODUCT, month, path):
                completed.add(month)
            else:
                ensure_new(args.output_dir, PHASE_PRODUCT, month, args.overwrite)
            selected[month] = path
    if not selected:
        raise RuntimeError("No IMERG Final monthly originals in the requested period.")
    report_missing(start, end, selected, "IMERG Final liquid probability")
    weights = None
    for month, path in sorted(selected.items()):
        if month in completed:
            continue
        _, _, weights = export_phase(path, args.output_dir, args.minimum_coverage, args.overwrite, weights)
    print(f"Complete: {len(selected)} monthly liquid-phase tables ({len(completed)} resumed).")


def run_concentration(args, start, end):
    raw = args.raw_dir or ROOT / "data/data/raw/G02135_V4_CONCENTRATION"
    hemispheres = tuple(dict.fromkeys(getattr(args, "hemispheres", None) or ("N", "S")))
    caches = {pole: None for pole in hemispheres}
    found = {pole: set() for pole in hemispheres}
    for month in pd.date_range(start, end, freq="MS"):
        for hemisphere in hemispheres:
            url = sea_ice_url(month, hemisphere).replace("_extent_", "_concentration_")
            path = raw / url.rsplit("/", 1)[-1]
            if args.plan:
                try:
                    with urlopen(url, timeout=60):
                        print(f"Available: {url}")
                except HTTPError as error:
                    if error.code != 404:
                        raise
                    LOGGER.warning("Unavailable: %s", url)
                continue
            if resume_complete(args, f"{ICE_PRODUCT}_{hemisphere}", month, path):
                found[hemisphere].add(month)
                continue
            ensure_new(args.output_dir, f"{ICE_PRODUCT}_{hemisphere}", month, args.overwrite)
            if not args.offline and (not path.is_file() or path.stat().st_size == 0):
                if not download_concentration(url, path, hemisphere):
                    continue
            if not path.is_file():
                continue
            _, caches[hemisphere] = export_concentration(
                path, month, hemisphere, args.output_dir, args.minimum_coverage,
                args.overwrite, args.quadrature_samples, caches[hemisphere])
            found[hemisphere].add(month)
    if not args.plan:
        for hemisphere, months in found.items():
            report_missing(start, end, months, f"Sea-ice concentration {hemisphere}")
        if not any(found.values()):
            raise RuntimeError("No monthly concentration originals in the requested period.")
        print(f"Exported {sum(map(len, found.values()))} monthly concentration tables.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("variable", choices=["liquid-probability", "sea-ice-concentration"])
    parser.add_argument("--start", default="2024-01-01")
    last_complete = datetime.now(timezone.utc).date().replace(day=1) - timedelta(days=1)
    parser.add_argument("--end", default=last_complete.isoformat())
    parser.add_argument("--raw-dir", type=Path)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data/data/processed/csv")
    parser.add_argument("--reference-csv", type=Path)
    parser.add_argument("--hemispheres", nargs="+", choices=["N", "S"], default=["N", "S"])
    parser.add_argument("--minimum-coverage", type=float, default=1.0)
    parser.add_argument("--quadrature-samples", type=int, default=16,
                        help="Equal-area samples per axis for polar reprojection (default 16).")
    parser.add_argument("--auth-strategy", choices=["interactive", "environment"], default="interactive")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--offline", action="store_true")
    mode.add_argument("--plan", action="store_true")
    existing = parser.add_mutually_exclusive_group()
    existing.add_argument("--overwrite", action="store_true")
    existing.add_argument("--resume", action="store_true",
                          help="Keep completed tables after validating settings and source/CSV hashes.")
    args = parser.parse_args(argv)
    start, end = imerg.period(args.start, args.end)
    if end.date() > last_complete:
        parser.error("Only complete UTC calendar months can be exported.")
    if not 0 < args.minimum_coverage <= 1:
        parser.error("--minimum-coverage must be in (0,1].")
    if not 2 <= args.quadrature_samples <= 64:
        parser.error("--quadrature-samples must be from 2 to 64.")
    if args.reference_csv:
        imerg.check_reference(args.reference_csv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if args.variable == "liquid-probability":
        run_phase(args, start, end)
    else:
        run_concentration(args, start, end)


if __name__ == "__main__":
    main()
