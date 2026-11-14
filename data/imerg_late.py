"""AI-assisted IMERG Late daily-to-monthly extraction; see docs/imerg-late.md."""

import argparse
import calendar
import json
import logging
import re
import tempfile
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

from imerg import (LATITUDES, LONGITUDES, ROOT, aggregate, check_reference,
                   coordinate, granule_filename, overlap_weights, period, sha256)

PRODUCT = "GPM_3IMERGDL"
VERSION = "07"
DEFAULT_RAW = ROOT / "data/data/raw" / PRODUCT
DEFAULT_OUTPUT = ROOT / "data/data/processed/csv" / PRODUCT
FILENAME = re.compile(r"^3B-DAY-L\.MS\.MRG\.3IMERG\.(\d{8})-S000000-E235959\.(V07[A-Z])\.nc4$")
TRANSITION_NOTICE = "https://gpm.nasa.gov/data/news/imerg-v08-transition-schedule"
LOGGER = logging.getLogger(__name__)


def file_identity(path):
    match = FILENAME.fullmatch(Path(path).name)
    if not match:
        raise ValueError(f"Expected an original IMERG Late V07 daily filename: {Path(path).name}")
    return pd.Timestamp(datetime.strptime(match[1], "%Y%m%d")), match[2]


def validate_daily_files(paths, start, end):
    selected = {}
    for path in paths:
        day, _ = file_identity(path)
        if start <= day <= end:
            if day in selected:
                raise ValueError(f"Duplicate daily originals for {day:%Y-%m-%d}.")
            selected[day] = path
    missing = sorted(set(pd.date_range(start, end, freq="D")) - selected.keys())
    if missing:
        raise ValueError("Missing daily originals; no complete-month export is possible: " +
                         ", ".join(f"{day:%Y-%m-%d}" for day in missing))
    return selected


def read_day(path):
    expected_day, processing_version = file_identity(path)
    # Unlike monthly Final HDF5, daily Late NetCDF variables live at the root.
    with xr.open_dataset(path, engine="netcdf4", decode_times=True,
                         mask_and_scale=True) as dataset:
        time = coordinate(dataset, "time")
        if time.size != 1:
            raise ValueError(f"Expected one UTC daily sample in {path}.")
        value = time.values.reshape(-1)[0]
        if hasattr(value, "year"):
            day = pd.Timestamp(year=value.year, month=value.month, day=value.day)
        else:
            day = pd.Timestamp(value).normalize()
        if day != expected_day:
            raise ValueError(f"Filename date and decoded time disagree: {path}.")
        lat, lon = coordinate(dataset, "lat"), coordinate(dataset, "lon")
        latitude = np.asarray(lat.values, dtype=float)
        longitude = (np.asarray(lon.values, dtype=float) + 180) % 360 - 180
        lat_order, lon_order = np.argsort(latitude), np.argsort(longitude)
        expected_lat = np.arange(1800) * 0.1 - 89.95
        expected_lon = np.arange(3600) * 0.1 - 179.95
        if (latitude.shape != expected_lat.shape or longitude.shape != expected_lon.shape or
                not np.allclose(latitude[lat_order], expected_lat, atol=1e-4, rtol=0) or
                not np.allclose(longitude[lon_order], expected_lon, atol=1e-4, rtol=0)):
            raise ValueError("Expected the global native IMERG 0.1-degree grid.")
        fields = {}
        for name in ("precipitation", "randomError", "precipitation_cnt"):
            variable = coordinate(dataset, name)
            if name != "precipitation_cnt":
                unit = str(variable.attrs.get("units", "")).lower().replace(" ", "")
                if unit not in {"mm/day", "mm/d", "mmday-1", "mmd-1"}:
                    raise ValueError(f"Unexpected daily {name} unit {unit!r}; expected mm/day.")
            variable = variable.isel({time.dims[0]: 0})
            if set(variable.dims) != {lat.dims[0], lon.dims[0]}:
                raise ValueError(f"Unexpected dimensions for {name}: {variable.dims}.")
            values = variable.transpose(lat.dims[0], lon.dims[0]).values
            fields[name] = np.asarray(values, dtype=float)[np.ix_(lat_order, lon_order)]
        counts = fields["precipitation_cnt"]
        valid_counts = np.isfinite(counts) & (counts >= 0)
        if np.any(valid_counts & ((counts > 48) | (counts != np.floor(counts)))):
            raise ValueError("Daily precipitation_cnt must be an integer from 0 to 48.")
    return day, processing_version, expected_lat, expected_lon, fields


class MonthlyAccumulator:
    """Stream one day at a time; never rescale a partial month into a full month."""

    def __init__(self, month, shape):
        self.month = pd.Timestamp(month).to_period("M").to_timestamp()
        self.days = calendar.monthrange(self.month.year, self.month.month)[1]
        self.seen = set()
        self.total = np.zeros(shape)
        self.error_sum = np.zeros(shape)
        self.valid_days = np.zeros(shape, dtype=np.int16)
        self.error_days = np.zeros(shape, dtype=np.int16)
        self.minimum_coverage = np.ones(shape)
        self.sample_fraction_sum = np.zeros(shape)

    def add(self, day, depth, coverage, error, sample_fraction):
        day = pd.Timestamp(day).normalize()
        if day.to_period("M") != self.month.to_period("M") or day in self.seen:
            raise ValueError(f"Duplicate day or day outside requested month: {day}.")
        self.seen.add(day)
        valid = np.isfinite(depth) & (coverage >= 1 - 1e-8)
        self.total += np.where(valid, depth, 0)
        self.valid_days += valid
        error_valid = valid & np.isfinite(error)
        self.error_sum += np.where(error_valid, error, 0)
        self.error_days += error_valid
        self.minimum_coverage = np.minimum(self.minimum_coverage, coverage)
        self.sample_fraction_sum += sample_fraction

    def finish(self):
        expected = set(pd.date_range(self.month, periods=self.days, freq="D"))
        if self.seen != expected:
            raise ValueError("Month is missing daily files; partial sums are not exported.")
        total = np.where(self.valid_days == self.days, self.total, np.nan)
        error = np.where(self.error_days == self.days, self.error_sum / self.days, np.nan)
        return {
            "precipitation_mm_month": total,
            "precipitation_mm_h": total / (self.days * 24),
            "native_daily_random_error_mean_mm_day": error,
            "valid_day_count": self.valid_days,
            "valid_area_fraction": self.minimum_coverage,
            "mean_halfhourly_sample_fraction": self.sample_fraction_sum / self.days,
        }


def aggregate_day(fields, weights):
    counts = fields["precipitation_cnt"]
    rain = fields["precipitation"]
    # V07 normalizes daily estimates when fewer than 48 half-hours are valid.
    # Keep those raw values, but require all 48 samples for a full-coverage export.
    valid = (counts == 48) & np.isfinite(rain) & (rain >= 0)
    depth, coverage = aggregate(np.where(valid, rain, np.nan), *weights)
    error, _ = aggregate(np.where(valid, fields["randomError"], np.nan), *weights)
    sample_fraction = np.where(np.isfinite(counts) & (counts >= 0), counts / 48, 0)
    sample_fraction, _ = aggregate(sample_fraction, *weights)
    return depth, coverage, error, sample_fraction


def destination_for(month, output):
    return output / f"{month:%Y}" / f"{PRODUCT}_Late_precipitation_{month:%Y_%m}.csv"


def export_month(paths, month, output, overwrite=False, weights=None):
    month = pd.Timestamp(month)
    expected_end = month + pd.offsets.MonthEnd(0)
    selected = validate_daily_files(paths, month, expected_end)
    destination = destination_for(month, output)
    metadata_path = destination.with_suffix(".metadata.json")
    if not overwrite and (destination.exists() or metadata_path.exists()):
        raise FileExistsError(f"Output already exists: {destination}; use --overwrite explicitly.")
    accumulator = MonthlyAccumulator(month, (len(LATITUDES), len(LONGITUDES)))
    sources = []
    for day, path in sorted(selected.items()):
        decoded, version, lat, lon, fields = read_day(path)
        if weights is None:
            weights = (overlap_weights(lat, LATITUDES, latitude=True),
                       overlap_weights(lon, LONGITUDES))
        accumulator.add(decoded, *aggregate_day(fields, weights))
        sources.append({"date": f"{day:%Y-%m-%d}", "filename": path.name,
                        "processing_version": version, "sha256": sha256(path)})
    values = accumulator.finish()
    versions = dict(sorted(Counter(source["processing_version"] for source in sources).items()))
    frame = pd.DataFrame({
        "lat": np.repeat(LATITUDES, len(LONGITUDES)),
        "lon": np.tile(LONGITUDES, len(LATITUDES)),
        "time": month.strftime("%Y-%m-%d 00:00:00"),
        **{name: array.ravel() for name, array in values.items()},
        "source_product": PRODUCT, "source_run": "Late",
        "source_processing_versions": ";".join(versions),
    })
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as staging:
        staged = Path(staging) / destination.name
        frame.to_csv(staged, index=False, na_rep="", float_format="%.10g")
        metadata = {
            "product": PRODUCT, "version": VERSION, "run": "Late",
            "source_doi": "10.5067/GPM/IMERGDL/DAY/07",
            "month": f"{month:%Y-%m}", "days_in_month": accumulator.days,
            "hours_in_month": accumulator.days * 24, "daily_files": len(sources),
            "sources": sources, "processing_version_day_counts": versions,
            "rows": len(frame), "native_resolution_lat_lon_degrees": [0.1, 0.1],
            "target_resolution_lat_lon_degrees": [0.5, 0.625],
            "spatial_method": "Spherical overlap weighted daily means; polar caps and periodic longitude",
            "temporal_method": "Sum daily mm/day estimates over calendar days; divide by calendar hours for mm/h",
            "coverage_policy": "Every calendar day, every contributing native pixel, and 48 valid half-hour samples per day are required for a nonblank monthly precipitation estimate.",
            "valid_area_fraction_definition": "Minimum, across days, of native area satisfying the full-sampling policy.",
            "missing_precipitation_cells": int(frame.precipitation_mm_month.isna().sum()),
            "uncertainty": "native_daily_random_error_mean_mm_day is a descriptive spatial and temporal mean of daily source errors; it is not propagated monthly uncertainty, is not comparable to the Final monthly native-error column, and is not a confidence interval.",
            "comparability": "Late daily-derived monthly data are separate from IMERG Final monthly. V07B/V07C and hybrid-input changes may introduce discontinuities; do not silently concatenate into a homogeneous trend series.",
            "transition_notice": TRANSITION_NOTICE,
            "csv_sha256": sha256(staged),
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "ai_assistance": "Pipeline, documentation and synthetic validation prepared with Codex.",
        }
        staged_metadata = Path(staging) / metadata_path.name
        staged_metadata.write_text(json.dumps(metadata, indent=2) + "\n")
        staged_metadata.replace(metadata_path)
        staged.replace(destination)
    LOGGER.info("Exported %s (%s blank cells)", destination, metadata["missing_precipitation_cells"])
    return destination, weights


def download_files(items, raw, auth_strategy, authenticated):
    import earthaccess

    for granule, filename in items:
        path = raw / filename
        if path.is_file() and path.stat().st_size > 0:
            yield path
            continue
        if not authenticated[0]:
            auth = earthaccess.login(strategy=auth_strategy, persist=False)
            if not auth.authenticated:
                raise RuntimeError("NASA Earthdata authentication failed.")
            authenticated[0] = True
        raw.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=raw) as staging:
            earthaccess.download([granule], local_path=staging)
            downloaded = Path(staging) / filename
            if not downloaded.is_file() or downloaded.stat().st_size == 0:
                raise RuntimeError(f"Download did not produce {filename}.")
            read_day(downloaded)
            downloaded.replace(path)
        yield path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default="2025-10-01")
    last_complete = datetime.now(timezone.utc).date().replace(day=1) - timedelta(days=1)
    parser.add_argument("--end", default=last_complete.isoformat())
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--reference-csv", type=Path)
    parser.add_argument("--auth-strategy", choices=["interactive", "environment"], default="interactive")
    parser.add_argument("--plan", action="store_true")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args(argv)
    if args.plan and args.offline:
        parser.error("--plan and --offline are mutually exclusive")
    start, end = period(args.start, args.end)
    if end.date() > last_complete:
        parser.error("Only completed UTC calendar months can be exported")
    if args.reference_csv:
        check_reference(args.reference_csv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if args.offline:
        selected = validate_daily_files(sorted(args.raw_dir.glob("*.nc4")), start, end)
        items = None
    else:
        import earthaccess
        granules = earthaccess.search_data(short_name=PRODUCT, version=VERSION,
            temporal=(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%dT23:59:59")), count=-1)
        items = [(granule, granule_filename(granule)) for granule in granules]
        selected = validate_daily_files([Path(name) for _, name in items], start, end)
    months = pd.date_range(start, end, freq="MS")
    if args.plan:
        for month in months:
            count = sum(day.to_period("M") == month.to_period("M") for day in selected)
            print(f"{month:%Y-%m}: {count} daily files; processing versions: " +
                  ", ".join(sorted({file_identity(path)[1] for day, path in selected.items()
                                   if day.to_period('M') == month.to_period('M')})))
        print(f"Plan only: {len(selected)} daily originals, {len(months)} monthly CSVs; no login/download/upload.")
        return
    # Preflight every output before downloading anything.
    for month in months:
        destination = destination_for(month, args.output_dir)
        if not args.overwrite and (destination.exists() or destination.with_suffix('.metadata.json').exists()):
            raise FileExistsError(f"Output already exists: {destination}; use --overwrite explicitly.")
    authenticated = [False]
    weights = None
    for month in months:
        month_paths = [path for day, path in selected.items() if day.to_period('M') == month.to_period('M')]
        if items is not None:
            names = {path.name for path in month_paths}
            month_items = [(granule, name) for granule, name in items if name in names]
            month_paths = list(download_files(month_items, args.raw_dir, args.auth_strategy, authenticated))
        destination, weights = export_month(month_paths, month, args.output_dir, args.overwrite, weights)
        print(destination)
    print(f"Exported {len(months)} Late monthly CSVs. No bucket upload was performed.")


if __name__ == "__main__":
    main()
