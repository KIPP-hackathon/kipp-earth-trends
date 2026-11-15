import unittest
from indicator_catalog import canonical_indicators, coverage_enabled


class IndicatorCatalogTests(unittest.TestCase):
    def test_combined_source_wins_without_losing_aliases_or_order_dependence(self):
        base = dict(indicator_name="temperature", role="measurement", theme="temperature", domain="atmosphere")
        rows = [{**base, "source_table": "tb_merra2_t2m"},
                {**base, "source_table": "tb_merra2_temperatura"},
                {**base, "source_table": "missing_table"}]
        physical = {(r["source_table"], "temperature") for r in rows[:-1]}
        a = canonical_indicators(rows, physical)
        b = canonical_indicators(list(reversed(rows)), physical)
        self.assertEqual(a, b)
        self.assertEqual(len(a), 1)
        self.assertEqual(a[0]["source_table"], "tb_merra2_temperatura")
        self.assertEqual(a[0]["source_tables"], ["tb_merra2_t2m", "tb_merra2_temperatura"])

    def test_ozone_products_stay_distinct_and_variances_use_combined_source(self):
        rows = [dict(indicator_name=name, source_table=table, theme="ozone", domain="atmosphere", role="measurement")
                for name, table in [("total_column_ozone_dobson_units", "tb_merra2_pressao_altura"),
                                    ("total_column_ozone_chm_dobson_units", "tb_merra2_quimica"),
                                    ("temperature_variance", "tb_merra2_variancias")]]
        result = canonical_indicators(rows, {(r["source_table"], r["indicator_name"]) for r in rows})
        self.assertEqual(len(result), 3)
        variance = next(r for r in result if r["indicator_name"] == "temperature_variance")
        self.assertEqual((variance["role"], variance["stage"]), ("variance", "variance_combined"))

    def test_model_simulator_and_provenance_cannot_become_observations(self):
        model = dict(indicator_name="simulated_modis_cloud_fraction_total_mean", source_table="tb_merra2_nuvens",
                     theme="cloud", domain="atmosphere", role="measurement", data_type="reanalysis",
                     indicator_label="MODIS cloud fraction")
        provenance = dict(indicator_name="source_file", source_table="tb_merra2_adg_bcdp001",
                          theme="flux", domain="atmosphere", role="measurement", unit="unparsed comment")
        result = canonical_indicators([model, provenance], {(r["source_table"], r["indicator_name"]) for r in [model, provenance]})
        by_name = {r["indicator_name"]: r for r in result}
        self.assertEqual(by_name[model["indicator_name"]]["data_type"], "model_simulated_diagnostic")
        self.assertTrue(by_name[model["indicator_name"]]["indicator_label"].startswith("Simulated "))
        self.assertEqual(by_name["source_file"]["role"], "metadata")
        self.assertIsNone(by_name["source_file"]["unit"])

    def test_short_or_polar_app_sources_are_enabled_without_relabeling_history(self):
        self.assertTrue(coverage_enabled("tb_sea_ice_concentration_global", True, False))
        self.assertFalse(coverage_enabled("tb_sea_ice_global", True, True))
        self.assertTrue(coverage_enabled("tb_gpm_imerg_precipitation_final_late", True, False))
        self.assertFalse(coverage_enabled("tb_sea_ice_global", False, False))
        self.assertFalse(coverage_enabled("tb_merra2_temperatura", True, False))
        self.assertTrue(coverage_enabled("tb_merra2_temperatura", True, True))


if __name__ == "__main__":
    unittest.main()
