"""Scientific extraction checks. Fixtures are synthetic, never observations."""

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import pandas as pd
import xarray as xr

import water_ice as pipeline


class RegriddingTests(unittest.TestCase):
    def test_signed_values_and_global_mass_conservation(self):
        lat = np.arange(-89.75, 90, 0.5)
        lon = np.arange(-179.75, 180, 0.5)
        weights = (pipeline.latitude_weights(lat), pipeline.overlap_weights(lon, pipeline.LONGITUDES))
        values = np.broadcast_to(np.linspace(-20, 10, 360)[:, None], (360, 720))
        result, coverage = pipeline.signed_average(values, weights)
        np.testing.assert_allclose(coverage, 1)
        self.assertLess(result.min(), 0)
        native_area = (6371008.8 ** 2 * np.deg2rad(0.5) *
                       np.diff(np.sin(np.deg2rad(np.arange(-90, 90.01, 0.5)))))[:, None]
        self.assertAlmostEqual(float((result * pipeline.cell_areas_m2()).sum() / 1e12),
                               float((values * native_area).sum() / 1e12), places=8)
        self.assertAlmostEqual(float(pipeline.cell_areas_m2().sum() * 576),
                               4 * np.pi * 6371008.8 ** 2, delta=1)

    def test_polar_gaps_and_partial_cells_are_not_extrapolated(self):
        lat = np.arange(-81.875, 82, 0.25)
        lon = np.arange(-179.875, 180, 0.25)
        weights = (pipeline.latitude_weights(lat), pipeline.overlap_weights(lon, pipeline.LONGITUDES))
        result, coverage = pipeline.signed_average(np.full((len(lat), len(lon)), -3.0), weights)
        self.assertTrue(np.isnan(result[0]).all())
        self.assertTrue(np.isnan(result[-1]).all())
        np.testing.assert_allclose(coverage[0], 0)
        np.testing.assert_allclose(result[180], -3)

    def test_missing_is_distinct_from_negative_and_zero(self):
        weights = (pipeline.overlap_weights([-45, 45], [-90, 0, 90], True),
                   pipeline.overlap_weights([-135, -45, 45, 135], [-180, 0]))
        field = np.array([[np.nan, 0, 0, -2], [np.nan, 0, 0, -2]])
        result, coverage = pipeline.signed_average(field, weights)
        self.assertTrue(np.isnan(result[:, 0]).all())
        np.testing.assert_allclose(coverage[:, 0], 0.5)
        np.testing.assert_allclose(result[:, 1], 0)


class NetCDFTests(unittest.TestCase):
    def fixture(self, path, kind):
        grace = kind == "grace"
        step = 0.5 if grace else 0.25
        lat = np.arange(-90 + step / 2, 90, step)
        lon = np.arange(step / 2, 360, step)
        name = "lwe_thickness" if grace else "sla"
        # Deliberately use lon, lat dimension order and descending latitude.
        values = np.full((1, len(lon), len(lat)), -2, dtype="float32")
        ds = xr.Dataset({name: (("time", "lon", "lat"), values,
                                {"units": "cm" if grace else "m"})},
                        coords={"time": [pd.Timestamp("2024-02-15")], "lat": lat[::-1], "lon": lon},
                        attrs={"time_mean_removed": "2004.0 to 2009.999"})
        if grace:
            ds["uncertainty"] = xr.full_like(ds[name], 0.5)
            ds.uncertainty.attrs["units"] = "cm"
            ds["time_bounds"] = (("time", "bounds"), np.array([["2024-02-02", "2024-02-28"]], dtype="datetime64[ns]"))
            ds.time.attrs["bounds"] = "time_bounds"
            for variable in ("time", "time_bounds"):
                ds[variable].encoding["units"] = "days since 2024-01-01"
        ds.to_netcdf(path)

    def test_offline_grace_exports_signed_anomalies_mass_metadata_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = root / "raw"
            raw.mkdir()
            self.fixture(raw / "synthetic.nc", "grace")
            args = ["grace", "--offline", "--start", "2024-02-01", "--end", "2024-02-29",
                    "--raw-dir", str(raw), "--output-dir", str(root / "csv")]
            with patch("water_ice.grace_files", side_effect=AssertionError("Offline network access")):
                pipeline.main(args)
            path = next((root / "csv").rglob("*.csv"))
            frame = pd.read_csv(path)
            self.assertEqual(len(frame), 207936)
            np.testing.assert_allclose(frame.mass_anomaly_mm_we, -20)
            np.testing.assert_allclose(frame.native_uncertainty_mean_mm_we, 5)
            self.assertEqual(frame.time.unique().tolist(), ["2024-02-01 00:00:00"])
            self.assertTrue((frame.cell_mass_anomaly_gt < 0).all())
            metadata = json.loads(path.with_suffix(".metadata.json").read_text())
            self.assertEqual(metadata["csv_sha256"], pipeline.sha256(path))
            self.assertIn("2004", metadata["source_attributes"]["time_mean_removed"])
            self.assertEqual(len(metadata["source_time_bounds"]), 2)
            self.assertFalse(metadata["gain_factors_applied"])
            with self.assertRaises(FileExistsError):
                pipeline.main(args)

    def test_offline_altimetry_converts_meters_to_mm(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root / "synthetic.nc", "altimetry")
            pipeline.main(["altimetry", "--offline", "--start", "2024-02-01", "--end", "2024-02-29",
                           "--raw-dir", str(root), "--output-dir", str(root / "csv")])
            frame = pd.read_csv(next((root / "csv").rglob("*.csv")))
            np.testing.assert_allclose(frame.sea_level_anomaly_mm, -2000)

    def test_multiple_samples_per_month_rejected(self):
        ds = xr.Dataset(coords={"time": pd.to_datetime(["2025-01-01", "2025-01-15"])})
        with self.assertRaisesRegex(ValueError, "Multiple samples"):
            pipeline.selected_times(ds, pd.Timestamp("2025-01-01"), pd.Timestamp("2025-01-31"))

    def test_unknown_units_rejected(self):
        with self.assertRaises(ValueError):
            pipeline.millimeters(xr.DataArray([1], attrs={"units": "feet"}))


class SeaIceTests(unittest.TestCase):
    def fixture(self, path, code, crs="EPSG:3411"):
        import rasterio
        from rasterio.transform import from_origin
        with rasterio.open(path, "w", driver="GTiff", height=100, width=100, count=1,
                           dtype="uint8", crs=crs,
                           transform=from_origin(-5000000, 5000000, 100000, 100000)) as dst:
            dst.write(np.full((100, 100), code, dtype="uint8"), 1)

    def test_flags_land_and_outside_hemisphere(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic.tif"
            for code in [0, 1, 254, 255]:
                self.fixture(path, code)
                values = pipeline.sea_ice_fields(path, "N")["sea_ice_extent_flag"]
                self.assertTrue(np.isnan(values[:181]).all())
                if code in (0, 1):
                    np.testing.assert_allclose(values[-1], code)
                else:
                    self.assertTrue(np.isnan(values).all())

    def test_bad_flags_and_crs_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic.tif"
            self.fixture(path, 15)
            with self.assertRaisesRegex(ValueError, "codes"):
                pipeline.sea_ice_fields(path, "N")
            self.fixture(path, 1, "EPSG:3412")
            with self.assertRaisesRegex(ValueError, "CRS"):
                pipeline.sea_ice_fields(path, "N")

    def test_urls_are_locale_independent_and_versioned(self):
        url = pipeline.sea_ice_url(pd.Timestamp("2025-02-01"), "S")
        self.assertTrue(url.endswith("south/monthly/geotiff/02_Feb/S_202502_extent_v4.0.tif"))


class CatalogueTests(unittest.TestCase):
    def test_altimetry_plan_needs_no_credentials_and_does_not_download(self):
        import copernicusmarine
        available = {pd.Timestamp("2025-01-01")}
        with tempfile.TemporaryDirectory() as directory:
            raw = Path(directory) / "must-not-exist"
            with patch("water_ice.altimetry_catalogue", return_value=("202411", available)), \
                 patch.object(copernicusmarine, "subset", side_effect=AssertionError("Plan downloaded data")):
                files = pipeline.altimetry_files(SimpleNamespace(plan=True), pd.Timestamp("2025-01-01"),
                                                 pd.Timestamp("2025-02-28"), raw)
            self.assertEqual(files, [])
            self.assertFalse(raw.exists())

    def test_altimetry_does_not_request_unavailable_months(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch("water_ice.altimetry_catalogue", return_value=("202411", {pd.Timestamp("2024-01-01")})):
                files = pipeline.altimetry_files(SimpleNamespace(plan=False), pd.Timestamp("2025-01-01"),
                                                 pd.Timestamp("2025-01-31"), Path(directory))
            self.assertEqual(files, [])

    def test_grace_plan_is_read_only(self):
        import earthaccess
        granule = SimpleNamespace(data_links=lambda: ["https://example.invalid/GRCTellus.nc"])
        with patch.object(earthaccess, "search_data", return_value=[granule]), \
             patch.object(earthaccess, "login", side_effect=AssertionError("Plan authenticated")), \
             patch.object(earthaccess, "download", side_effect=AssertionError("Plan downloaded")):
            self.assertEqual(pipeline.grace_files(pd.Timestamp("2025-01-01"), pd.Timestamp("2025-01-31"),
                                                  Path("/not-created"), "interactive", plan=True), [])


if __name__ == "__main__":
    unittest.main()
