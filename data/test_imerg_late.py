"""Offline tests using synthetic fields only; no NASA observations or requests."""

import calendar
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import netCDF4
import numpy as np
import pandas as pd
import xarray as xr
from scipy.sparse import eye

import imerg_late as late


def filename(day, version="V07C"):
    return f"3B-DAY-L.MS.MRG.3IMERG.{day:%Y%m%d}-S000000-E235959.{version}.nc4"


class CalendarTests(unittest.TestCase):
    def test_missing_and_duplicate_days_rejected(self):
        days = pd.date_range("2025-10-01", "2025-10-31")
        paths = [Path(filename(day)) for day in days]
        with self.assertRaisesRegex(ValueError, "Missing"):
            late.validate_daily_files(paths[:-1], days[0], days[-1])
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            late.validate_daily_files(paths + [Path(filename(days[0], "V07B"))], days[0], days[-1])

    def test_final_run_filename_rejected(self):
        with self.assertRaises(ValueError):
            late.file_identity("3B-DAY.MS.MRG.3IMERG.20251001-S000000-E235959.V07B.nc4")

    def test_plan_does_not_login_download_or_create_outputs(self):
        class Granule:
            def __init__(self, day):
                self.day = day

            def data_links(self):
                return ["https://example.invalid/" + filename(self.day)]

        granules = [Granule(day) for day in pd.date_range("2025-10-01", "2026-10-31")]
        with tempfile.TemporaryDirectory() as directory, \
                patch("earthaccess.search_data", return_value=granules) as search, \
                patch("earthaccess.login") as login, patch("earthaccess.download") as download:
            output = Path(directory) / "output"
            stream = io.StringIO()
            with contextlib.redirect_stdout(stream):
                late.main(["--plan", "--start", "2025-10-01", "--end", "2026-10-31",
                           "--output-dir", str(output)])
            search.assert_called_once()
            self.assertEqual(search.call_args.kwargs["short_name"], "GPM_3IMERGDL")
            login.assert_not_called()
            download.assert_not_called()
            self.assertFalse(output.exists())
            self.assertIn("396 daily originals, 13 monthly CSVs", stream.getvalue())


class AccumulationTests(unittest.TestCase):
    def fill(self, month, daily_depth=2, absent_day=None, incomplete_cell_day=None):
        accumulator = late.MonthlyAccumulator(month, (2, 2))
        for day in pd.date_range(month, periods=accumulator.days, freq="D"):
            if day.day == absent_day:
                continue
            depth = np.full((2, 2), daily_depth, dtype=float)
            coverage = np.ones((2, 2))
            if day.day == incomplete_cell_day:
                depth[0, 0], coverage[0, 0] = np.nan, 0.5
            accumulator.add(day, depth, coverage, np.full((2, 2), 0.25), np.ones((2, 2)))
        return accumulator

    def test_daily_mm_day_is_summed_once_not_multiplied_by_24(self):
        result = self.fill("2025-10-01").finish()
        np.testing.assert_allclose(result["precipitation_mm_month"], 62)
        np.testing.assert_allclose(result["precipitation_mm_h"], 2 / 24)
        np.testing.assert_allclose(result["native_daily_random_error_mean_mm_day"], 0.25)

    def test_leap_february_and_variable_month_lengths(self):
        for month in ["2024-02-01", "2025-11-01", "2025-12-01"]:
            result = self.fill(month).finish()
            day = pd.Timestamp(month)
            np.testing.assert_allclose(result["precipitation_mm_month"],
                                       2 * calendar.monthrange(day.year, day.month)[1])

    def test_missing_day_never_becomes_partial_month_total(self):
        with self.assertRaisesRegex(ValueError, "missing"):
            self.fill("2025-10-01", absent_day=15).finish()

    def test_incomplete_cell_day_blanks_only_affected_monthly_cell(self):
        result = self.fill("2025-10-01", incomplete_cell_day=15).finish()
        self.assertTrue(np.isnan(result["precipitation_mm_month"][0, 0]))
        self.assertEqual(result["valid_day_count"][0, 0], 30)
        self.assertEqual(result["valid_area_fraction"][0, 0], 0.5)
        self.assertEqual(result["precipitation_mm_month"][1, 1], 62)

    def test_zero_rain_is_valid(self):
        result = self.fill("2025-10-01", daily_depth=0).finish()
        np.testing.assert_allclose(result["precipitation_mm_month"], 0)
        np.testing.assert_array_equal(result["valid_day_count"], 31)

    def test_duplicate_and_out_of_month_days_rejected(self):
        accumulator = self.fill("2025-10-01")
        for day in ["2025-10-01", "2025-11-01"]:
            with self.assertRaises(ValueError):
                accumulator.add(day, *(np.ones((2, 2)) for _ in range(4)))

    def test_under_sampled_daily_estimates_are_flagged(self):
        weights = (eye(2, format="csr"), eye(2, format="csr"))
        fields = {"precipitation": np.ones((2, 2)), "randomError": np.ones((2, 2)),
                  "precipitation_cnt": np.array([[47, 48], [0, 48]])}
        depth, coverage, _, samples = late.aggregate_day(fields, weights)
        self.assertTrue(np.isnan(depth[0, 0]))
        self.assertTrue(np.isnan(depth[1, 0]))
        self.assertEqual(depth[0, 1], 1)
        self.assertEqual(coverage[0, 0], 0)
        self.assertAlmostEqual(samples[0, 0], 47 / 48)


class FileTests(unittest.TestCase):
    def test_root_netcdf_dimensions_units_and_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / filename(pd.Timestamp("2025-10-01"))
            shape = (1, 3600, 1800)
            dataset = xr.Dataset({
                "precipitation": (("time", "lon", "lat"),
                                  np.broadcast_to((np.arange(3600) * 0.1 + 0.05)[None, :, None], shape).astype("float32"),
                                  {"units": "mm/day"}),
                "randomError": (("time", "lon", "lat"), np.full(shape, 0.25, dtype="float32"), {"units": "mm / day"}),
                "precipitation_cnt": (("time", "lon", "lat"), np.full(shape, 48, dtype="int16")),
            }, coords={"time": [pd.Timestamp("2025-10-01")],
                       "lat": (np.arange(1800) * 0.1 - 89.95)[::-1],
                       "lon": np.arange(3600) * 0.1 + 0.05})
            dataset.to_netcdf(path, engine="netcdf4", encoding={
                name: {"zlib": True} for name in dataset.data_vars})
            day, version, lat, lon, fields = late.read_day(path)
            self.assertEqual(day, pd.Timestamp("2025-10-01"))
            self.assertEqual(version, "V07C")
            self.assertEqual(fields["precipitation"].shape, (1800, 3600))
            # A spatially varying field detects incorrect longitude reordering.
            expected_values = np.where(lon < 0, lon + 360, lon)
            np.testing.assert_allclose(fields["precipitation"][0], expected_values, atol=2e-5, rtol=0)
            self.assertAlmostEqual(lat[0], -89.95)
            self.assertAlmostEqual(lon[0], -179.95)
            with netCDF4.Dataset(path, "a") as raw:
                raw["precipitation_cnt"][0, 0, 0] = 49
            with self.assertRaisesRegex(ValueError, "48"):
                late.read_day(path)
            with netCDF4.Dataset(path, "a") as raw:
                raw["precipitation_cnt"][0, 0, 0] = 48
                raw["precipitation"].units = "mm/hr"
            with self.assertRaisesRegex(ValueError, "unit"):
                late.read_day(path)

    def test_csv_provenance_mixed_versions_and_overwrite_protection(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            month = pd.Timestamp("2026-03-01")
            paths = []
            for day in pd.date_range(month, periods=31):
                version = "V07B" if day.day <= 3 else "V07C"
                path = root / filename(day, version)
                path.write_text("Synthetic test fixture; not NASA observations.\n")
                paths.append(path)

            def fake_read(path):
                day, version = late.file_identity(path)
                return day, version, np.array([-0.5, 0.5]), np.array([-0.625, 0]), {
                    "precipitation": np.full((2, 2), 2),
                    "randomError": np.full((2, 2), 0.25),
                    "precipitation_cnt": np.full((2, 2), 48),
                }

            with patch.object(late, "read_day", side_effect=fake_read), \
                    patch.object(late, "LATITUDES", np.array([-0.5, 0.5])), \
                    patch.object(late, "LONGITUDES", np.array([-0.625, 0])):
                output, _ = late.export_month(paths, month, root / "output",
                    weights=(eye(2, format="csr"), eye(2, format="csr")))
                frame = pd.read_csv(output)
                metadata = json.loads(output.with_suffix(".metadata.json").read_text())
                np.testing.assert_allclose(frame.precipitation_mm_month, 62)
                self.assertEqual(frame.source_run.unique().tolist(), ["Late"])
                self.assertEqual(frame.source_processing_versions.unique().tolist(), ["V07B;V07C"])
                self.assertEqual(metadata["processing_version_day_counts"], {"V07B": 3, "V07C": 28})
                self.assertEqual(metadata["csv_sha256"], late.sha256(output))
                self.assertEqual(len(metadata["sources"]), 31)
                self.assertIn("not propagated", metadata["uncertainty"])
                with self.assertRaises(FileExistsError):
                    late.export_month(paths, month, root / "output")


if __name__ == "__main__":
    unittest.main()
