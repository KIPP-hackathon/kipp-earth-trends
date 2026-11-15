"""Monthly GRACE mass, NSIDC sea ice and DUACS altimetry on the KIPP grid.

AI-assisted pipeline; scientific conventions and commands: docs/water-ice-extraction.md.
"""

import argparse
import calendar
import json
import logging
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

import numpy as np
import pandas as pd
import xarray as xr

from imerg import (LATITUDES, LONGITUDES, ROOT, check_reference,
                   granule_filename, month_of, overlap_weights, period, sha256)

LOGGER = logging.getLogger(__name__)
GRACE = "TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4"
GRACE_VERSION = "RL06.3Mv04"
ALTIMETRY = "c3s_obs-sl_glo_phy-ssh_my_twosat-l4-duacs-0.25deg_P1M-m"
NSIDC = "https://noaadata.apps.nsidc.org/NOAA/G02135"
MONTH_NAMES = ("Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def signed_average(values, weights, minimum_coverage=1.0):
    """Unlike precipitation, negative water/sea-level anomalies are valid."""
    lat_weights, lon_weights = weights
    valid = np.isfinite(values)
    coverage = (lon_weights @ (lat_weights @ valid.astype(float)).T).T
    total = (lon_weights @ (lat_weights @ np.where(valid, values, 0)).T).T
    result = np.full(total.shape, np.nan)
    np.divide(total, coverage, out=result,
              where=(coverage > 0) & (coverage >= minimum_coverage - 1e-8))
    return result, np.clip(coverage, 0, 1)


def latitude_weights(source):
    """Allow DUACS's unobserved polar bands without extrapolating them."""
    step = np.diff(source)[0]
    # Add missing latitude rows as zero-weight rows, never as observations.
    full = np.arange(int(round(180 / step))) * step - 90 + step / 2
    indices = np.rint((source - full[0]) / step).astype(int)
    if (np.any(indices < 0) or np.any(indices >= len(full)) or
            not np.allclose(full[indices], source, atol=1e-5, rtol=0)):
        raise ValueError("Latitude cells must align with a global cell-centered grid.")
    return overlap_weights(full, LATITUDES, latitude=True)[:, indices]


def regular_field(dataset, name, index, expected_step):
    field = dataset[name]
    if "time" in field.dims:
        field = field.isel(time=index)
    lat_name = "lat" if "lat" in field.coords else "latitude"
    lon_name = "lon" if "lon" in field.coords else "longitude"
    lat, lon = field[lat_name], field[lon_name]
    if lat.ndim != 1 or lon.ndim != 1 or set(field.dims) != {lat.dims[0], lon.dims[0]}:
        raise ValueError(f"Expected a rectilinear 2-D grid for {name}.")
    latitude = np.asarray(lat.values, dtype=float)
    longitude = (np.asarray(lon.values, dtype=float) + 180) % 360 - 180
    li, lj = np.argsort(latitude), np.argsort(longitude)
    latitude, longitude = latitude[li], longitude[lj]
    if (len(latitude) < 2 or len(longitude) < 2 or
            not np.allclose(np.diff(latitude), expected_step, atol=1e-5, rtol=0) or
            not np.allclose(np.diff(longitude), expected_step, atol=1e-5, rtol=0)):
        raise ValueError(f"Expected native {expected_step}-degree regular grid for {name}.")
    values = np.asarray(field.transpose(lat.dims[0], lon.dims[0]).values, dtype=float)
    return latitude, longitude, values[np.ix_(li, lj)]


def millimeters(field):
    unit = str(field.attrs.get("units", "")).lower().strip()
    factors = {"cm": 10, "m": 1000, "mm": 1}
    if unit not in factors:
        raise ValueError(f"Unsupported unit {unit!r}; expected m, cm or mm.")
    return factors[unit]


def cell_areas_m2():
    low = np.clip(LATITUDES - 0.25, -90, 90)
    high = np.clip(LATITUDES + 0.25, -90, 90)
    return (6371008.8 ** 2 * np.deg2rad(0.625) *
            (np.sin(np.deg2rad(high)) - np.sin(np.deg2rad(low))))[:, None]


def write_month(output, product, month, fields, metadata, overwrite=False):
    destination = output / product / f"{month:%Y}" / f"{product}_{month:%Y_%m}.csv"
    companion = destination.with_suffix(".metadata.json")
    if not overwrite and (destination.exists() or companion.exists()):
        raise FileExistsError(f"Output exists: {destination}; use --overwrite explicitly.")
    shape = (len(LATITUDES), len(LONGITUDES))
    if any(np.shape(values) != shape for values in fields.values()):
        raise ValueError("Output field does not match the KIPP grid.")
    frame = pd.DataFrame({"lat": np.repeat(LATITUDES, len(LONGITUDES)),
                          "lon": np.tile(LONGITUDES, len(LATITUDES)),
                          "time": month.strftime("%Y-%m-%d 00:00:00"),
                          **{key: values.ravel() for key, values in fields.items()}})
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as staging:
        staged = Path(staging) / destination.name
        frame.to_csv(staged, index=False, na_rep="", float_format="%.10g")
        metadata = {**metadata, "product": product, "month": f"{month:%Y-%m}",
                    "rows": len(frame), "target_resolution_lat_lon_degrees": [0.5, 0.625],
                    "grid": "361 latitudes [-90,90]; 576 longitudes [-180,179.375]",
                    "csv_time": "Month-start UTC; join other sources by year and month.",
                    "missing_cells": {key: int(np.isnan(val).sum()) for key, val in fields.items()},
                    "csv_sha256": sha256(staged),
                    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                    "ai_assistance": "Pipeline, docs and synthetic tests prepared with Codex."}
        staged_meta = Path(staging) / companion.name
        staged_meta.write_text(json.dumps(metadata, indent=2, default=str) + "\n")
        staged_meta.replace(companion)
        staged.replace(destination)
    print(destination)
    return destination


def selected_times(dataset, start, end, ambiguous_months="error", month_selections=None):
    if "time" not in dataset.coords or dataset.time.ndim != 1:
        raise ValueError("Expected a one-dimensional decoded time coordinate.")
    if ambiguous_months not in {"error", "skip"}:
        raise ValueError("Unknown ambiguous-month policy.")
    selections = month_selections or {}
    if not isinstance(selections, dict):
        raise ValueError("Month selections must be a JSON object keyed by YYYY-MM.")
    for key, interval in selections.items():
        datetime.strptime(key, "%Y-%m")
        if not isinstance(interval, (list, tuple)) or len(interval) != 2:
            raise ValueError(f"Expected two ISO dates for selected month {key}.")
        if date_from_iso(interval[0]) > date_from_iso(interval[1]):
            raise ValueError(f"Reversed native interval for {key}.")
    groups = {}
    for index, value in enumerate(dataset.time.values):
        month = month_of(value)
        if start <= month <= end:
            groups.setdefault(month, []).append(index)
    found = {}
    for month, indices in groups.items():
        key = f"{month:%Y-%m}"
        if key in selections:
            bounds = dataset.time.attrs.get("bounds", "time_bounds")
            if bounds not in dataset or "time" not in dataset[bounds].dims:
                raise ValueError(f"Cannot validate selected interval without time bounds: {key}.")
            wanted = tuple(date_from_iso(value) for value in selections[key])
            matches = []
            for index in indices:
                values = dataset[bounds].isel(time=index).values.reshape(-1)
                if len(values) != 2:
                    raise ValueError("Expected exactly two native time bounds.")
                actual = tuple(pd.Timestamp(value).date() for value in values)
                if actual == wanted:
                    matches.append(index)
            if len(matches) != 1:
                raise ValueError(f"Expected one native solution for {key} with interval {wanted}; found {len(matches)}.")
            found[month] = matches[0]
            LOGGER.info("Selected %s using explicit native interval %s to %s (index %d).",
                        key, *selections[key], matches[0])
            continue
        if len(indices) > 1:
            if ambiguous_months == "error":
                raise ValueError(f"Multiple samples for {month:%Y-%m}; monthly originals required.")
            LOGGER.warning("Ambiguous month %s excluded: %d native solutions; no averaging or reassignment. Times: %s",
                           f"{month:%Y-%m}", len(indices), [str(dataset.time.values[i]) for i in indices])
            continue
        found[month] = indices[0]
    return found


def date_from_iso(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


def provenance(path, dataset):
    keys = ("title", "source", "institution", "doi", "reference", "references",
            "time_mean_removed", "history", "geospatial_lat_min", "geospatial_lat_max")
    return {"source_file": path.name, "source_sha256": sha256(path),
            "source_attributes": {key: dataset.attrs[key] for key in keys if key in dataset.attrs}}


def export_netcdf(path, kind, start, end, output, minimum_coverage=1.0, overwrite=False,
                  skip_months=None, ambiguous_months="error", month_selections=None):
    grace = kind == "grace"
    variable, step = ("lwe_thickness", 0.5) if grace else ("sla", 0.25)
    product = "GRACE_JPL_CRI_RL06.3Mv04" if grace else "DUACS_C3S_MONTHLY"
    with xr.open_dataset(path, decode_times=True, mask_and_scale=True) as dataset:
        factor = millimeters(dataset[variable])
        excluded = set(skip_months or [])
        available = selected_times(dataset, start, end, ambiguous_months, month_selections)
        selected = {m: i for m, i in available.items() if m not in excluded}
        if not selected:
            return set()
        metadata = provenance(path, dataset)
        if grace:
            native_months = {month_of(v) for v in dataset.time.values if start <= month_of(v) <= end}
            metadata["ambiguous_month_policy"] = ambiguous_months
            metadata["excluded_ambiguous_months"] = [f"{m:%Y-%m}" for m in sorted(native_months - set(available))]
            metadata["explicit_month_selections"] = month_selections or {}
            metadata["time_assignment"] = "Month of native solution timestamp. Explicit choices match native interval start/end dates; ambiguous solutions are never averaged or shifted."
        metadata.update({
            "collection": GRACE if grace else ALTIMETRY,
            "version": GRACE_VERSION if grace else "Source attributes and subset manifest",
            "source_doi": "10.5067/TEMSC-3JC634" if grace else "10.48670/moi-00145",
            "source_variable": variable, "source_units": dataset[variable].attrs.get("units"),
            "source_variable_attributes": dict(dataset[variable].attrs),
            "method": "Spherical cell-overlap weighted mean; no extrapolation or temporal interpolation",
            "minimum_valid_area_fraction": minimum_coverage,
            "gain_factors_applied": False,
            "interpretation": (
                "Total surface mass anomaly in mm water equivalent, including land water, ice and ocean. "
                "NOT isolated groundwater, absolute storage or aquifer level. Native mascons ~3 degrees; "
                "0.5 x 0.625 degree output does not add independent spatial information. "
                "No hydrology gain factors applied because these must not be applied to ice sheets. "
                "cell_mass_anomaly_gt = mm * spherical cell area / 1e12; not a regional ice-sheet total."
                if grace else
                "Mapped satellite-altimetry sea-level anomaly; not absolute sea level, ocean mass, "
                "a tide-gauge measurement or tsunami monitoring. Polar/land gaps remain missing."),
        })
        manifest = path.with_suffix(".source.json")
        if manifest.exists():
            metadata["download_request"] = json.loads(manifest.read_text())
            if not grace:
                metadata["version"] = metadata["download_request"].get("dataset_version", "unrecorded")
        weights = None
        for month, index in sorted(selected.items()):
            lat, lon, values = regular_field(dataset, variable, index, step)
            if grace and (len(lat) != 360 or len(lon) != 720):
                raise ValueError("Expected the global JPL 360 x 720 native grid.")
            if weights is None:
                weights = (latitude_weights(lat), overlap_weights(lon, LONGITUDES))
            result, coverage = signed_average(values * factor, weights, minimum_coverage)
            name = "mass_anomaly_mm_we" if grace else "sea_level_anomaly_mm"
            fields = {name: result, "valid_area_fraction": coverage}
            if grace:
                fields["cell_mass_anomaly_gt"] = np.where(
                    coverage >= 1 - 1e-8, result * cell_areas_m2() / 1e12, np.nan)
                if "uncertainty" in dataset:
                    ulat, ulon, uncertainty = regular_field(dataset, "uncertainty", index, step)
                    if not np.array_equal(lat, ulat) or not np.array_equal(lon, ulon):
                        raise ValueError("Uncertainty and anomaly grids differ.")
                    uncertainty[uncertainty < 0] = np.nan
                    fields["native_uncertainty_mean_mm_we"], _ = signed_average(
                        uncertainty * millimeters(dataset.uncertainty), weights, minimum_coverage)
                metadata["uncertainty"] = (
                    "native_uncertainty_mean_mm_we, when present, is a descriptive mean of source "
                    "uncertainty, NOT propagated output uncertainty; mascon pixels are correlated.")
            sample_meta = {**metadata, "source_time": str(dataset.time.values[index]), "source_time_index": int(index)}
            if f"{month:%Y-%m}" in (month_selections or {}):
                sample_meta["selected_native_interval"] = {
                    "start_date": month_selections[f"{month:%Y-%m}"][0],
                    "end_date": month_selections[f"{month:%Y-%m}"][1],
                    "selection_authority": "User explicitly selected this native interval; no temporal averaging or reassignment.",
                }
            bounds = dataset.time.attrs.get("bounds", "time_bounds")
            if bounds in dataset:
                sample_meta["source_time_bounds"] = [str(v) for v in dataset[bounds].isel(time=index).values]
            write_month(output, product, month, fields, sample_meta, overwrite)
    return set(selected)


def grace_files(start, end, raw, auth_strategy, plan=False):
    import earthaccess

    granules = earthaccess.search_data(short_name=GRACE, version=GRACE_VERSION,
                                      temporal=(f"{start:%Y-%m-%d}", f"{end:%Y-%m-%d}T23:59:59"), count=-1)
    if len(granules) != 1:
        raise RuntimeError(f"Expected one cumulative JPL CRI file, found {len(granules)}.")
    granule = granules[0]
    name = granule_filename(granule)
    print(f"{GRACE}: {name} (cumulative file; contains the complete available history)")
    if plan:
        return []
    destination = raw / name
    if not destination.is_file() or destination.stat().st_size == 0:
        auth = earthaccess.login(strategy=auth_strategy, persist=False)
        if not auth.authenticated:
            raise RuntimeError("NASA Earthdata authentication failed.")
        raw.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=raw) as staging:
            earthaccess.download([granule], local_path=staging)
            downloaded = Path(staging) / name
            with xr.open_dataset(downloaded) as ds:
                if "lwe_thickness" not in ds or ds.sizes.get("time", 0) == 0:
                    raise ValueError("Downloaded file is not a JPL monthly mass grid.")
            downloaded.replace(destination)
    return [destination]


def sea_ice_url(month, hemisphere):
    pole = "north" if hemisphere == "N" else "south"
    directory = f"{month.month:02d}_{MONTH_NAMES[month.month - 1]}"
    name = f"{hemisphere}_{month:%Y%m}_extent_v4.0.tif"
    return f"{NSIDC}/{pole}/monthly/geotiff/{directory}/{name}"


def sea_ice_fields(path, hemisphere):
    """Sample the categorical native extent at target centers; never average flags."""
    import rasterio
    from rasterio.warp import transform

    lon, lat = np.meshgrid(LONGITUDES, LATITUDES)
    selected = lat > 0 if hemisphere == "N" else lat < 0
    result = np.full(lat.shape, np.nan)
    expected_crs = "EPSG:3411" if hemisphere == "N" else "EPSG:3412"
    with rasterio.open(path) as source:
        if source.crs != rasterio.crs.CRS.from_string(expected_crs):
            raise ValueError(f"Expected NSIDC polar stereographic CRS {expected_crs}.")
        native = source.read(1)
        if not np.isin(native, [0, 1, 253, 254, 255]).all():
            raise ValueError("Unexpected Sea Ice Index extent codes.")
        x, y = transform("EPSG:4326", source.crs, lon[selected].tolist(), lat[selected].tolist())
        rows, cols = rasterio.transform.rowcol(source.transform, x, y)
        rows, cols = np.asarray(rows), np.asarray(cols)
        inside = (rows >= 0) & (rows < source.height) & (cols >= 0) & (cols < source.width)
        sampled = np.full(rows.shape, np.nan)
        codes = native[rows[inside], cols[inside]]
        sampled[inside] = np.where(codes <= 1, codes, np.nan)
        result[selected] = sampled
    return {"sea_ice_extent_flag": result, "valid_sample": np.isfinite(result).astype(float)}


def run_sea_ice(args, start, end, raw):
    found = {"N": set(), "S": set()}
    for month in pd.date_range(start, end, freq="MS"):
        for hemisphere in ("N", "S"):
            url = sea_ice_url(month, hemisphere)
            path = raw / url.rsplit("/", 1)[1]
            if args.plan:
                # HEAD is not uniformly supported by the archive; request headers only.
                try:
                    with urlopen(url, timeout=60) as response:
                        print(f"Available: {url} ({response.headers.get('Content-Length', '?')} bytes)")
                except HTTPError as error:
                    if error.code != 404:
                        raise
                    LOGGER.warning("Unavailable: %s", url)
                continue
            if not args.offline and (not path.is_file() or path.stat().st_size == 0):
                raw.mkdir(parents=True, exist_ok=True)
                try:
                    with urlopen(url, timeout=60) as response, tempfile.TemporaryDirectory(dir=raw) as staging:
                        downloaded = Path(staging) / path.name
                        with downloaded.open("wb") as stream:
                            while block := response.read(1024 * 1024):
                                stream.write(block)
                        sea_ice_fields(downloaded, hemisphere)
                        downloaded.replace(path)
                except HTTPError as error:
                    if error.code != 404:
                        raise
                    LOGGER.warning("Unavailable: %s", url)
                    continue
            if not path.is_file():
                continue
            fields = sea_ice_fields(path, hemisphere)
            write_month(args.output_dir, f"SEA_ICE_G02135_V4_{hemisphere}", month, fields, {
                "collection": "G02135", "version": "4.0", "source_doi": "10.7265/a98x-0f50",
                "source_url": url, "source_file": path.name, "source_sha256": sha256(path),
                "hemisphere": "Arctic" if hemisphere == "N" else "Antarctic",
                "method": "Nearest native polar-grid cell at each target coordinate; categorical sampling",
                "interpretation": "Monthly extent mask derived from monthly concentration (threshold 15%). "
                "1=ice extent, 0=open ocean; land/coast/missing/outside-domain are blank. "
                "NOT concentration, cell ice fraction, mass, km2 extent or average daily extent. "
                "Do not sum target flags to estimate regional extent; use the official NSIDC extent series.",
            }, args.overwrite)
            found[hemisphere].add(month)
    if not args.plan:
        for hemisphere, months in found.items():
            report_missing(start, end, months, f"Sea ice {hemisphere}")
    return sum(map(len, found.values()))


def altimetry_catalogue():
    """Pin a catalogue version and exact available months, avoiding nearest-date substitution."""
    import copernicusmarine
    catalogue = copernicusmarine.describe(dataset_id=ALTIMETRY, disable_progress_bar=True,
                                          raise_on_error=True).model_dump()
    datasets = [dataset for product in catalogue["products"] for dataset in product["datasets"]
                if dataset["dataset_id"] == ALTIMETRY]
    if len(datasets) != 1 or len(datasets[0]["versions"]) != 1:
        raise ValueError("Expected one current monthly DUACS dataset version.")
    version = datasets[0]["versions"][0]
    month_sets = []
    for part in version["parts"]:
        for service in part["services"]:
            for variable in service["variables"]:
                if variable["short_name"] != "sla":
                    continue
                for coordinate in variable["coordinates"]:
                    if coordinate["coordinate_id"] != "time" or not coordinate.get("values"):
                        continue
                    unit = coordinate["coordinate_unit"]
                    if not unit.startswith("milliseconds since 1970-01-01"):
                        raise ValueError(f"Unsupported catalogue time units: {unit}.")
                    month_sets.append({month_of(value) for value in
                                       pd.to_datetime(coordinate["values"], unit="ms")})
    if not month_sets or any(months != month_sets[0] for months in month_sets):
        raise ValueError("DUACS catalogue does not provide a consistent explicit monthly time axis.")
    return version["label"], month_sets[0]


def altimetry_files(args, start, end, raw):
    import copernicusmarine
    version, available = altimetry_catalogue()
    print(f"{ALTIMETRY}, version {version}: {min(available):%Y-%m} to {max(available):%Y-%m}")
    selected = sorted(set(pd.date_range(start, end, freq="MS")) & available)
    report_missing(start, end, selected, "DUACS catalogue")
    if args.plan:
        print("Available requested months: " + ", ".join(f"{month:%Y-%m}" for month in selected))
        return []
    if not selected:
        return []
    username = os.environ.get("COPERNICUSMARINE_SERVICE_USERNAME")
    password = os.environ.get("COPERNICUSMARINE_SERVICE_PASSWORD")
    raw.mkdir(parents=True, exist_ok=True)
    files = []
    for month in selected:
        name = f"DUACS_C3S_{version}_sla_{month:%Y_%m}.nc"
        path = raw / name
        request = {"dataset_id": ALTIMETRY, "dataset_version": version, "variables": ["sla"],
                   "start_datetime": f"{month:%Y-%m-%d}T00:00:00",
                   "end_datetime": f"{month:%Y-%m}-{calendar.monthrange(month.year, month.month)[1]}T23:59:59",
                   "coordinates_selection_method": "strict-inside", "file_format": "netcdf"}
        if not path.is_file() or path.stat().st_size == 0:
            if not username or not password:
                raise RuntimeError("Set project-specific COPERNICUSMARINE_SERVICE_USERNAME and "
                                   "COPERNICUSMARINE_SERVICE_PASSWORD; global credential files are not used.")
            with tempfile.TemporaryDirectory(dir=raw) as staging:
                copernicusmarine.subset(**request, username=username, password=password,
                                       output_directory=staging, output_filename=name)
                downloaded = Path(staging) / name
                with xr.open_dataset(downloaded) as dataset:
                    if set(selected_times(dataset, month, month)) != {month} or dataset.time.size != 1:
                        raise ValueError("DUACS did not return exactly the requested monthly sample.")
                    regular_field(dataset, "sla", 0, 0.25)
                    millimeters(dataset.sla)
                downloaded.replace(path)
                path.with_suffix(".source.json").write_text(json.dumps(request, indent=2) + "\n")
        files.append(path)
    return files


def report_missing(start, end, found, label):
    missing = sorted(set(pd.date_range(start, end, freq="MS")) - set(found))
    if missing:
        LOGGER.warning("%s unavailable months (no estimates created): %s", label,
                       ", ".join(f"{month:%Y-%m}" for month in missing))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("product", choices=["grace", "sea-ice", "altimetry"])
    parser.add_argument("--start", default="2025-01-01")
    last_complete = datetime.now(timezone.utc).date().replace(day=1) - timedelta(days=1)
    parser.add_argument("--end", default=last_complete.isoformat())
    parser.add_argument("--raw-dir", type=Path)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data/data/processed/csv")
    parser.add_argument("--reference-csv", type=Path)
    parser.add_argument("--skip-months", nargs="*", default=[],
                        type=lambda value: pd.Timestamp(datetime.strptime(value, "%Y-%m")),
                        help="GRACE months already present in GCS, in YYYY-MM form; never export them.")
    parser.add_argument("--ambiguous-months", choices=["error", "skip"], default="error",
                        help="GRACE only: stop on repeated timestamp months, or exclude all their solutions and record the gaps.")
    parser.add_argument("--month-selections", type=json.loads, default={},
                        help='GRACE native intervals, e.g. {"2012-01":["2012-01-01","2012-01-31"]}.')
    parser.add_argument("--minimum-coverage", type=float, default=1.0,
                        help="Minimum valid target-cell area for GRACE/DUACS (default 1).")
    parser.add_argument("--auth-strategy", choices=["interactive", "environment"], default="interactive")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--plan", action="store_true", help="Public source lookup; no login/download/export.")
    mode.add_argument("--offline", action="store_true", help="Process only cached originals, without network.")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args(argv)
    if not 0 < args.minimum_coverage <= 1:
        parser.error("--minimum-coverage must be in (0, 1]")
    start, end = period(args.start, args.end)
    skipped = set(args.skip_months)
    if skipped and args.product != "grace":
        parser.error("--skip-months is only supported for GRACE.")
    if args.ambiguous_months != "error" and args.product != "grace":
        parser.error("--ambiguous-months is only supported for GRACE.")
    if args.month_selections and args.product != "grace":
        parser.error("--month-selections is only supported for GRACE.")
    if set(pd.date_range(start, end, freq="MS")) <= skipped:
        print("All requested months already exist; no source lookup or export.")
        return
    if args.reference_csv:
        check_reference(args.reference_csv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    raw = args.raw_dir or ROOT / "data/data/raw" / {"grace": GRACE, "sea-ice": "G02135_V4",
                                                  "altimetry": "DUACS_C3S_MONTHLY"}[args.product]
    if args.product == "sea-ice":
        count = run_sea_ice(args, start, end, raw)
        if not args.plan and not count:
            raise RuntimeError("No sea ice originals match the requested period.")
    else:
        if args.offline:
            # One selected cumulative GRACE release prevents blending revisions.
            files = sorted(raw.glob("*.nc"))
            if args.product == "grace" and len(files) != 1:
                raise ValueError("Offline GRACE requires exactly one cumulative .nc original in --raw-dir.")
        elif args.product == "grace":
            files = grace_files(start, end, raw, args.auth_strategy, args.plan)
        else:
            files = altimetry_files(args, start, end, raw)
        if args.plan:
            return
        # Preflight overlapping months before producing any output.
        found = set()
        for path in files:
            with xr.open_dataset(path) as dataset:
                months = set(selected_times(dataset, start, end, args.ambiguous_months, args.month_selections)) - skipped
            if found & months:
                raise ValueError("Overlapping source months; select a homogeneous set of originals.")
            found.update(months)
        if not found:
            if skipped and files:
                report_missing(start, end, skipped, args.product)
                print("No additional available months in the selected original; existing months skipped.")
                return
            raise RuntimeError("No monthly originals match the requested period.")
        report_missing(start, end, found | skipped, args.product)
        for path in files:
            export_netcdf(path, args.product, start, end, args.output_dir,
                          args.minimum_coverage, args.overwrite, skipped, args.ambiguous_months, args.month_selections)
    if not args.plan:
        print("Monthly CSV export complete. No bucket upload performed.")


if __name__ == "__main__":
    main()
