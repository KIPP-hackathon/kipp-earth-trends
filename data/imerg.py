"""AI-assisted NASA IMERG Final V07 extraction; see docs/imerg-extraction.md."""

import argparse
import calendar
import hashlib
import json
import logging
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

import numpy as np
import pandas as pd
import xarray as xr
from scipy.sparse import csr_matrix

PRODUCT = "GPM_3IMERGM"
VERSION = "07"
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data/data/processed/csv" / PRODUCT
DEFAULT_RAW = ROOT / "data/data/raw" / PRODUCT
LATITUDES = np.arange(-90, 90.001, 0.5)
LONGITUDES = np.arange(-180, 180, 0.625)
LOGGER = logging.getLogger(__name__)


def period(start, end):
    start, end = pd.Timestamp(start), pd.Timestamp(end)
    if start.day != 1 or end.day != calendar.monthrange(end.year, end.month)[1]:
        raise ValueError("Start must be the first day and end the last day of a month.")
    if end < start:
        raise ValueError("End precedes start.")
    return start, end


def overlap_weights(source, target, latitude=False):
    """Spherical cell overlap; clip polar caps and wrap longitude at the dateline."""
    source, target = np.asarray(source), np.asarray(target)
    source_step, target_step = np.diff(source)[0], np.diff(target)[0]
    for centers, step in ((source, source_step), (target, target_step)):
        if step <= 0 or not np.allclose(np.diff(centers), step, atol=1e-4, rtol=0):
            raise ValueError("Coordinates must be regular and ascending.")
    low = target[:, None] - target_step / 2
    high = target[:, None] + target_step / 2
    weights = np.zeros((len(target), len(source)))
    for shift in ((0,) if latitude else (-360, 0, 360)):
        left = np.maximum(low, source[None, :] + shift - source_step / 2)
        right = np.minimum(high, source[None, :] + shift + source_step / 2)
        if latitude:
            left, right = np.clip(left, -90, 90), np.clip(right, -90, 90)
            area = np.sin(np.deg2rad(right)) - np.sin(np.deg2rad(left))
        else:
            area = right - left
        weights += np.maximum(area, 0)
    if latitude:
        full_area = (np.sin(np.deg2rad(np.clip(high[:, 0], -90, 90))) -
                     np.sin(np.deg2rad(np.clip(low[:, 0], -90, 90))))
    else:
        full_area = np.full(len(target), target_step)
    weights /= full_area[:, None]
    if not np.allclose(weights.sum(axis=1), 1, atol=1e-6):
        raise ValueError("Native coordinates do not cover the full target grid.")
    return csr_matrix(weights)


def aggregate(values, lat_weights, lon_weights, minimum_coverage=1.0):
    values = np.asarray(values, dtype=float)
    valid = np.isfinite(values) & (values >= 0)
    coverage = (lon_weights @ (lat_weights @ valid.astype(float)).T).T
    weighted = (lon_weights @ (lat_weights @ np.where(valid, values, 0)).T).T
    result = np.full(weighted.shape, np.nan)
    usable = (coverage > 0) & (coverage >= minimum_coverage - 1e-8)
    np.divide(weighted, coverage, out=result, where=usable)
    return result, np.clip(coverage, 0, 1)


def coordinate(dataset, name):
    matches = [key for key in dataset.variables if key.lower() == name.lower()]
    if len(matches) != 1:
        raise ValueError(f"Expected a single {name} variable; found {matches}.")
    return dataset[matches[0]]


def month_of(value):
    # NASA may use cftime objects (including a Julian calendar).
    if hasattr(value, "year") and hasattr(value, "month"):
        return pd.Timestamp(year=value.year, month=value.month, day=1)
    return pd.Timestamp(value).to_period("M").to_timestamp()


def read_month(path):
    """Load only one monthly Grid group; normalize dimension order explicitly."""
    with xr.open_dataset(path, group="Grid", engine="netcdf4",
                         decode_times=True, mask_and_scale=True) as dataset:
        time = coordinate(dataset, "time")
        if time.size != 1:
            raise ValueError(f"Expected one monthly time sample in {path}.")
        month = month_of(time.values.reshape(-1)[0])
        lat, lon = coordinate(dataset, "lat"), coordinate(dataset, "lon")
        latitude = np.asarray(lat.values, dtype=float)
        longitude = (np.asarray(lon.values, dtype=float) + 180) % 360 - 180
        lat_order, lon_order = np.argsort(latitude), np.argsort(longitude)
        latitude, longitude = latitude[lat_order], longitude[lon_order]
        # Infer exact edges from the documented 0.1-degree grid, rather than
        # float32 coordinate roundoff which would create tiny coverage gaps.
        expected_lat = np.arange(1800) * 0.1 - 89.95
        expected_lon = np.arange(3600) * 0.1 - 179.95
        if (latitude.shape != expected_lat.shape or longitude.shape != expected_lon.shape or
                not np.allclose(latitude, expected_lat, atol=1e-4, rtol=0) or
                not np.allclose(longitude, expected_lon, atol=1e-4, rtol=0)):
            raise ValueError("Expected the global native IMERG 0.1-degree grid.")
        fields = {}
        for name in ("precipitation", "randomError"):
            variable = coordinate(dataset, name)
            unit = str(variable.attrs.get("units", "")).lower().replace(" ", "")
            if unit not in {"mm/hr", "mm/h", "mmhr-1", "mmh-1", "mm/hour"}:
                raise ValueError(f"Unexpected {name} unit {unit!r}; expected mm/hr.")
            variable = variable.isel({time.dims[0]: 0})
            if set(variable.dims) != {lat.dims[0], lon.dims[0]}:
                raise ValueError(f"Unexpected dimensions for {name}: {variable.dims}.")
            data = variable.transpose(lat.dims[0], lon.dims[0]).values
            fields[name] = np.asarray(data)[np.ix_(lat_order, lon_order)]
    return month, expected_lat, expected_lon, fields


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def export_month(path, output, minimum_coverage=1.0, overwrite=False, weights=None):
    month, lat, lon, fields = read_month(path)
    destination = output / month.strftime("%Y") / f"{PRODUCT}_precipitation_{month:%Y_%m}.csv"
    metadata_path = destination.with_suffix(".metadata.json")
    if not overwrite and (destination.exists() or metadata_path.exists()):
        raise FileExistsError(f"Output already exists: {destination}; use --overwrite explicitly.")
    if weights is None:
        weights = (overlap_weights(lat, LATITUDES, latitude=True),
                   overlap_weights(lon, LONGITUDES))
    rate, coverage = aggregate(fields["precipitation"], *weights, minimum_coverage)
    error, _ = aggregate(fields["randomError"], *weights, minimum_coverage)
    hours = calendar.monthrange(month.year, month.month)[1] * 24
    frame = pd.DataFrame({
        "lat": np.repeat(LATITUDES, len(LONGITUDES)),
        "lon": np.tile(LONGITUDES, len(LATITUDES)),
        "time": month.strftime("%Y-%m-%d 00:00:00"),
        "precipitation_mm_h": rate.ravel(),
        "precipitation_mm_month": (rate * hours).ravel(),
        "native_random_error_mean_mm_h": error.ravel(),
        "valid_area_fraction": coverage.ravel(),
    })
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Temporary sibling files prevent a failed write from leaving a partial CSV.
    with tempfile.TemporaryDirectory(dir=destination.parent) as staging:
        staged = Path(staging) / destination.name
        frame.to_csv(staged, index=False, na_rep="", float_format="%.10g")
        metadata = {
            "product": PRODUCT, "version": VERSION, "run": "Final",
            "source_file": path.name, "source_sha256": sha256(path),
            "source_doi": "10.5067/GPM/IMERG/3B-MONTH/07",
            "month": f"{month:%Y-%m}", "hours_in_month": hours,
            "source_time": "Decoded from Grid/time; CSV uses month-start UTC.",
            "rows": len(frame), "native_resolution_degrees": [0.1, 0.1],
            "target_resolution_lat_lon_degrees": [0.5, 0.625],
            "grid": "361 latitudes [-90,90]; 576 longitudes [-180,179.375]",
            "method": "Spherical cell-overlap weighted mean; clipped polar cells; periodic longitude",
            "minimum_valid_area_fraction": minimum_coverage,
            "missing_precipitation_cells": int(np.isnan(rate).sum()),
            "uncertainty": "native_random_error_mean_mm_h is the area-weighted mean of native randomError, NOT propagated coarse-cell uncertainty or a confidence interval; spatial covariance is unavailable.",
            "csv_sha256": sha256(staged),
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "ai_assistance": "Pipeline, documentation and synthetic validation fixtures prepared with Codex.",
        }
        staged_metadata = Path(staging) / metadata_path.name
        staged_metadata.write_text(json.dumps(metadata, indent=2) + "\n")
        staged_metadata.replace(metadata_path)
        staged.replace(destination)
    LOGGER.info("Exported %s (%s missing cells)", destination, metadata["missing_precipitation_cells"])
    return destination, month, weights


def granule_filename(granule):
    names = {Path(unquote(urlparse(link).path)).name for link in granule.data_links()
             if Path(urlparse(link).path).suffix.lower() in {".hdf5", ".h5", ".nc4", ".nc"}}
    if len(names) != 1:
        raise ValueError(f"Expected one original monthly data file; found {sorted(names)}.")
    return names.pop()


def search_and_download(start, end, raw, auth_strategy, plan=False):
    import earthaccess

    granules = earthaccess.search_data(
        short_name=PRODUCT, version=VERSION,
        temporal=(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%dT23:59:59")),
        count=-1,
    )
    if not granules:
        raise RuntimeError("No IMERG Final V07 granules found for the requested period.")
    items = [(granule, granule_filename(granule)) for granule in granules]
    if len({name for _, name in items}) != len(items):
        raise ValueError("CMR returned duplicate filenames; select a homogeneous collection.")
    if plan:
        for _, name in sorted(items, key=lambda item: item[1]):
            print(name)
        print(f"Found {len(items)} monthly files. Plan only: no login or downloads.")
        return []
    missing = [(granule, name) for granule, name in items
               if not (raw / name).is_file() or (raw / name).stat().st_size == 0]
    if missing:
        # Avoid silently reusing a global .netrc from a different project.
        auth = earthaccess.login(strategy=auth_strategy, persist=False)
        if not auth.authenticated:
            raise RuntimeError("NASA Earthdata authentication failed.")
        raw.mkdir(parents=True, exist_ok=True)
        for granule, name in missing:
            with tempfile.TemporaryDirectory(dir=raw) as staging:
                earthaccess.download([granule], local_path=staging)
                downloaded = Path(staging) / name
                if not downloaded.is_file() or downloaded.stat().st_size == 0:
                    raise RuntimeError(f"Download did not produce {name}.")
                # Check the decoded file before promoting it to the reusable cache.
                read_month(downloaded)
                downloaded.replace(raw / name)
    return sorted(raw / name for _, name in items)


def check_reference(path):
    frame = pd.read_csv(path, usecols=["lat", "lon", "time"])
    latitude, longitude = np.sort(frame.lat.unique()), np.sort(frame.lon.unique())
    if (len(frame) != len(LATITUDES) * len(LONGITUDES) or
            frame.duplicated(["lat", "lon"]).any() or frame["time"].nunique() != 1 or
            latitude.shape != LATITUDES.shape or longitude.shape != LONGITUDES.shape or
            not np.allclose(latitude, LATITUDES, atol=1e-8, rtol=0) or
            not np.allclose(longitude, LONGITUDES, atol=1e-8, rtol=0)):
        raise ValueError("Reference CSV does not match the confirmed global MERRA-2 grid.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default="2025-01-01")
    last_complete = datetime.now(timezone.utc).date().replace(day=1) - timedelta(days=1)
    parser.add_argument("--end", default=last_complete.isoformat())
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--reference-csv", type=Path)
    parser.add_argument("--auth-strategy", choices=["interactive", "environment"], default="interactive")
    parser.add_argument("--minimum-coverage", type=float, default=1.0)
    parser.add_argument("--offline", action="store_true", help="Process local originals; no NASA calls.")
    parser.add_argument("--plan", action="store_true", help="List public CMR results; no login/download.")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args(argv)
    if args.offline and args.plan:
        parser.error("--offline and --plan are mutually exclusive")
    if not 0 < args.minimum_coverage <= 1:
        parser.error("--minimum-coverage must be in (0,1]")
    start, end = period(args.start, args.end)
    if args.reference_csv:
        check_reference(args.reference_csv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if args.offline:
        files = sorted(path for path in args.raw_dir.glob("*")
                       if path.suffix.lower() in {".hdf5", ".h5", ".nc4", ".nc"})
    else:
        files = search_and_download(start, end, args.raw_dir, args.auth_strategy, args.plan)
        if args.plan:
            return
    selected = {}
    for path in files:
        month, _, _, _ = read_month(path)
        if start <= month <= end:
            if month in selected:
                raise ValueError(f"Multiple original files for {month:%Y-%m}; resolve before export.")
            selected[month] = path
    if not selected:
        raise RuntimeError("No local monthly originals match the requested period.")
    expected = set(pd.date_range(start, end, freq="MS"))
    missing = sorted(expected - selected.keys())
    if missing:
        LOGGER.warning("Unavailable months (no estimates will be created): %s",
                       ", ".join(f"{month:%Y-%m}" for month in missing))
    weights = None
    for month, path in sorted(selected.items()):
        destination, _, weights = export_month(path, args.output_dir, args.minimum_coverage,
                                               args.overwrite, weights)
        print(destination)
    print(f"Exported {len(selected)} monthly CSVs. No bucket upload was performed.")


if __name__ == "__main__":
    main()
