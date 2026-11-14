"""Offline extraction checks; all test fixtures are synthetic, not observations."""

import json
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

import numpy as np
import pandas as pd
import xarray as xr
from scipy.sparse import csr_matrix

import phase_concentration as pipeline


class ProbabilityTests(unittest.TestCase):
    def test_real_zero_and_hundred_preserved_fills_excluded(self):
        actual = pipeline.percent([0, 100, -9999, 101, np.nan])
        np.testing.assert_equal(actual, [0, 100, np.nan, np.nan, np.nan])

    def test_spatial_area_average_keeps_phase_not_occurrence(self):
        weights = (pipeline.imerg.overlap_weights([-45, 45], [-90, 0, 90], True),
                   pipeline.imerg.overlap_weights([-135, -45, 45, 135], [-180, 0]))
        result, coverage = pipeline.signed_average(np.array([[100, 0, 0, 0], [100, 0, 0, 0]]), weights)
        np.testing.assert_allclose(result[:, 0], 50)
        np.testing.assert_allclose(result[:, 1], 0)
        np.testing.assert_allclose(coverage, 1)

    def test_offline_monthly_field_has_own_table_and_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = root / "raw"
            raw.mkdir()
            values = np.full((1, 3600, 1800), 30, dtype="float32")
            ds = xr.Dataset({"probabilityLiquidPrecipitation": (("time", "lon", "lat"), values,
                                                                {"units": "percent"})},
                            coords={"time": [pd.Timestamp("2024-02-15")],
                                    "lat": np.arange(1800) * 0.1 - 89.95,
                                    "lon": np.arange(3600) * 0.1 - 179.95})
            path = raw / "synthetic.HDF5"
            ds.to_netcdf(path, group="Grid", engine="netcdf4", encoding={
                "probabilityLiquidPrecipitation": {"zlib": True}})
            args = ["liquid-probability", "--offline", "--start", "2024-02-01", "--end", "2024-02-29",
                    "--raw-dir", str(raw), "--output-dir", str(root / "csv")]
            with patch.object(pipeline.imerg, "search_and_download", side_effect=AssertionError("Offline network")):
                pipeline.main(args)
            exported = next((root / "csv").rglob("*.csv"))
            self.assertIn(pipeline.PHASE_PRODUCT, str(exported))
            frame = pd.read_csv(exported)
            self.assertEqual(len(frame), 207936)
            self.assertNotIn("precipitation_mm_month", frame)
            np.testing.assert_allclose(frame.liquid_precipitation_probability_pct, 30)
            np.testing.assert_allclose(frame.valid_area_fraction, 1)
            self.assertTrue(frame.time.eq("2024-02-01 00:00:00").all())
            metadata = json.loads(exported.with_suffix(".metadata.json").read_text())
            self.assertEqual(metadata["source_sha256"], pipeline.imerg.sha256(path))
            self.assertEqual(metadata["csv_sha256"], pipeline.imerg.sha256(exported))
            original_mtime = exported.stat().st_mtime_ns
            pipeline.main(args + ["--resume"])
            self.assertEqual(exported.stat().st_mtime_ns, original_mtime)
            with self.assertRaises(FileExistsError):
                pipeline.main(args)
            exported.write_text("tampered fixture")
            with self.assertRaisesRegex(ValueError, "Resume validation failed"):
                pipeline.main(args + ["--resume"])


class ConcentrationTests(unittest.TestCase):
    def fixture(self, path, code, crs="EPSG:3411", dtype="uint16"):
        import rasterio
        from rasterio.transform import from_origin
        with rasterio.open(path, "w", driver="GTiff", height=100, width=100, count=1,
                           dtype=dtype, crs=crs,
                           transform=from_origin(-5000000, 5000000, 100000, 100000)) as dst:
            dst.write(np.full((100, 100), code, dtype=dtype), 1)

    def test_scale_flags_and_native_low_concentrations(self):
        values = pipeline.concentration_values(np.array([0, 150, 755, 1000, 2510, 2530, 2540, 2550, 100]))
        np.testing.assert_equal(values, [0, 15, 75.5, 100, np.nan, np.nan, np.nan, np.nan, np.nan])
        with self.assertRaisesRegex(ValueError, "codes"):
            pipeline.concentration_values(np.array([1234]))

    def test_partial_ocean_is_not_zero_and_strict_coverage_is_enforced(self):
        weights = csr_matrix([[0.5, 0.5], [0, 1], [1, 0]])
        with patch.object(pipeline, "LATITUDES", np.array([-90, 0, 90])), \
             patch.object(pipeline, "LONGITUDES", np.array([0])):
            strict, coverage = pipeline.concentration_average(np.array([np.nan, 80]), weights)
            np.testing.assert_equal(strict.ravel(), [np.nan, 80, np.nan])
            np.testing.assert_allclose(coverage.ravel(), [0.5, 1, 0])
            partial, _ = pipeline.concentration_average(np.array([np.nan, 80]), weights, 0.5)
            np.testing.assert_equal(partial.ravel(), [80, 80, np.nan])

    def test_quadrature_constant_field_and_hemisphere_and_pole(self):
        import rasterio
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic.tif"
            for hemisphere, crs in [("N", "EPSG:3411"), ("S", "EPSG:3412")]:
                self.fixture(path, 800, crs=crs)
                with patch.object(pipeline, "LATITUDES", np.array([-90, -45, 0, 45, 90])), \
                     patch.object(pipeline, "LONGITUDES", np.array([-180, -90, 0, 90])):
                    with rasterio.open(path) as source:
                        weights = pipeline.concentration_weights(source, hemisphere, 4)
                    values, _ = pipeline.read_concentration(path, hemisphere)
                    result, coverage = pipeline.concentration_average(values, weights)
                    pole = -1 if hemisphere == "N" else 0
                    np.testing.assert_allclose(result[pole], 80)
                    np.testing.assert_allclose(coverage[pole], 1)
                    opposite = slice(0, 3) if hemisphere == "N" else slice(2, 5)
                    self.assertTrue(np.isnan(result[opposite]).all())

    def test_coarse_mean_may_be_below_native_ice_threshold(self):
        weights = csr_matrix([[0.5, 0.5]])
        with patch.object(pipeline, "LATITUDES", np.array([90])), \
             patch.object(pipeline, "LONGITUDES", np.array([0])):
            result, _ = pipeline.concentration_average(np.array([0, 20]), weights)
            np.testing.assert_allclose(result, 10)

    def test_metadata_grid_changes_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "synthetic.tif"
            self.fixture(path, 1000)
            with self.assertRaisesRegex(ValueError, "grid changed"):
                pipeline.export_concentration(path, pd.Timestamp("2024-01-01"), "N", root,
                                               cached=((1, 1, (), "wrong"), csr_matrix((1, 1))))
            self.fixture(path, 1000, crs="EPSG:3412")
            with self.assertRaisesRegex(ValueError, "polar"):
                pipeline.read_concentration(path, "N")

    def test_transient_download_retried_and_success_validated(self):
        class Response(io.BytesIO):
            @property
            def headers(self):
                return {"Content-Length": str(len(self.getvalue()))}
        class InterruptedResponse(Response):
            def read(self, size=-1):
                if self.tell():
                    raise TimeoutError("synthetic timeout after partial transfer")
                return super().read(64)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture = root / "synthetic.tif"
            self.fixture(fixture, 750)
            content = fixture.read_bytes()
            output = root / "raw" / "N_202401_concentration_v4.0.tif"
            with patch.object(pipeline, "urlopen", side_effect=[InterruptedResponse(content), Response(content)]), \
                 patch.object(pipeline.time, "sleep"):
                self.assertTrue(pipeline.download_concentration("https://example.invalid/test", output, "N"))
            self.assertEqual(output.read_bytes(), content)

    def test_missing_remote_file_is_not_cached_or_retried(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "missing.tif"
            error = HTTPError("https://example.invalid", 404, "not found", None, None)
            with patch.object(pipeline, "urlopen", side_effect=error) as request:
                self.assertFalse(pipeline.download_concentration("https://example.invalid", output, "N"))
                self.assertEqual(request.call_count, 1)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
