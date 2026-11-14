"""Offline scientific checks. All fixture measurements are synthetic, not NASA data."""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd
import xarray as xr

import imerg


class AggregationTests(unittest.TestCase):
    def setUp(self):
        self.source_lat = np.arange(-67.5, 90, 45)
        self.source_lon = np.arange(-157.5, 180, 45)
        self.target_lat = np.arange(-90, 91, 45)
        self.target_lon = np.arange(-180, 180, 90)
        self.weights = (imerg.overlap_weights(self.source_lat, self.target_lat, True),
                        imerg.overlap_weights(self.source_lon, self.target_lon))

    def test_constant_field_including_polar_caps(self):
        result, coverage = imerg.aggregate(np.full((4, 8), 2.5), *self.weights)
        np.testing.assert_allclose(result, 2.5)
        np.testing.assert_allclose(coverage, 1)

    def test_global_area_integral_is_conserved(self):
        field = np.arange(32, dtype=float).reshape(4, 8)
        result, _ = imerg.aggregate(field, *self.weights)
        native_edges = np.deg2rad(np.arange(-90, 91, 45))
        target_edges = np.deg2rad([-90, -67.5, -22.5, 22.5, 67.5, 90])
        native_integral = (field * np.diff(np.sin(native_edges))[:, None]).sum() * 45
        target_integral = (result * np.diff(np.sin(target_edges))[:, None]).sum() * 90
        self.assertAlmostEqual(native_integral, target_integral, places=9)

    def test_dateline_cell_uses_both_sides(self):
        field = np.zeros((4, 8))
        field[:, 0], field[:, -1] = 2, 6
        result, _ = imerg.aggregate(field, *self.weights)
        np.testing.assert_allclose(result[:, 0], 4)
        np.testing.assert_allclose(result[:, 1:], 0)

    def test_missing_values_are_not_zero_rainfall(self):
        field = np.zeros((4, 8))
        field[:, 0] = np.nan
        strict, coverage = imerg.aggregate(field, *self.weights)
        self.assertTrue(np.isnan(strict[:, 0]).all())
        np.testing.assert_allclose(coverage[:, 0], 0.5)
        partial, _ = imerg.aggregate(field, *self.weights, minimum_coverage=0.5)
        np.testing.assert_allclose(partial, 0)

    def test_negative_fill_values_are_missing(self):
        result, coverage = imerg.aggregate(np.full((4, 8), -9999), *self.weights)
        self.assertTrue(np.isnan(result).all())
        np.testing.assert_allclose(coverage, 0)

    def test_incomplete_native_grid_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "cover"):
            imerg.overlap_weights(self.source_lon[:-1], self.target_lon)


class MonthlyExportTests(unittest.TestCase):
    def test_reference_tolerates_roundoff_but_rejects_grid_shift(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic-reference.csv"
            frame = pd.DataFrame({
                "lat": np.repeat(imerg.LATITUDES, len(imerg.LONGITUDES)) + 1e-12,
                "lon": np.tile(imerg.LONGITUDES, len(imerg.LATITUDES)) + 1e-12,
                "time": "2025-01-01 00:30:00",
            })
            frame.to_csv(path, index=False)
            imerg.check_reference(path)
            frame["lon"] += 0.01
            frame.to_csv(path, index=False)
            with self.assertRaises(ValueError):
                imerg.check_reference(path)

    def test_invalid_periods(self):
        for start, end in [("2025-01-02", "2025-01-31"),
                           ("2025-01-01", "2025-02-27"),
                           ("2025-03-01", "2025-01-31")]:
            with self.subTest(start=start, end=end), self.assertRaises(ValueError):
                imerg.period(start, end)

    def test_cftime_month(self):
        import cftime
        self.assertEqual(imerg.month_of(cftime.DatetimeJulian(2024, 2, 1)),
                         pd.Timestamp("2024-02-01"))

    def test_offline_hdf5_to_csv_leap_month_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = root / "raw"
            raw.mkdir()
            path = raw / "synthetic-test-only.HDF5"
            # Native NASA dimension order (time, lon, lat), not the CSV order.
            shape = (1, 3600, 1800)
            fixture = xr.Dataset({
                "precipitation": (("time", "lon", "lat"), np.ones(shape, dtype="float32"), {"units": "mm/hr"}),
                "randomError": (("time", "lon", "lat"), np.full(shape, 0.25, dtype="float32"), {"units": "mm/hr"}),
            }, coords={"time": [pd.Timestamp("2024-02-01")],
                       "lat": np.arange(1800) * 0.1 - 89.95,
                       "lon": np.arange(3600) * 0.1 - 179.95})
            fixture.to_netcdf(path, group="Grid", engine="netcdf4", encoding={
                name: {"zlib": True} for name in fixture.data_vars})
            args = ["--offline", "--start", "2024-02-01", "--end", "2024-02-29",
                    "--raw-dir", str(raw), "--output-dir", str(root / "output")]
            with patch("imerg.search_and_download", side_effect=AssertionError("Network forbidden")):
                imerg.main(args)
            csv_path = root / "output/2024/GPM_3IMERGM_precipitation_2024_02.csv"
            frame = pd.read_csv(csv_path)
            self.assertEqual(len(frame), 207936)
            self.assertEqual(list(frame.columns[:3]), ["lat", "lon", "time"])
            self.assertFalse(frame.duplicated(["lat", "lon"]).any())
            self.assertEqual(frame.iloc[0]["lat"], -90)
            self.assertEqual(frame.iloc[-1]["lat"], 90)
            self.assertEqual(frame.iloc[-1]["lon"], 179.375)
            np.testing.assert_allclose(frame.precipitation_mm_h, 1)
            np.testing.assert_allclose(frame.precipitation_mm_month, 696)
            np.testing.assert_allclose(frame.native_random_error_mean_mm_h, 0.25)
            metadata = json.loads(csv_path.with_suffix(".metadata.json").read_text())
            self.assertEqual(metadata["hours_in_month"], 696)
            self.assertEqual(metadata["csv_sha256"], imerg.sha256(csv_path))
            with self.assertRaises(FileExistsError):
                imerg.main(args)
            # Unit validation prevents accidentally multiplying an accumulation again.
            fixture.precipitation.attrs["units"] = "mm"
            fixture.to_netcdf(path, group="Grid", engine="netcdf4", mode="w")
            with self.assertRaisesRegex(ValueError, "unit"):
                imerg.read_month(path)


if __name__ == "__main__":
    unittest.main()
