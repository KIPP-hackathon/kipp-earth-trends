"""Canonical indicator metadata and explicit application source policy."""

APP_TABLES = (
    "tb_merra2_temperatura", "tb_merra2_vento", "tb_merra2_umidade",
    "tb_merra2_pressao_altura", "tb_merra2_nuvens", "tb_merra2_fluxos",
    "tb_merra2_variancias", "tb_merra2_aerossois", "tb_merra2_quimica",
    "tb_gpm_imerg_precipitation_final_late", "tb_sea_ice_concentration_global",
)
# The retired mask remains reference metadata, never an active app source.
EXCLUDED_APP_TABLES = frozenset(("tb_sea_ice_global",))
CANONICAL_TABLES = APP_TABLES + ("tb_sea_ice_global",)
NEW_APP_TABLES = frozenset(APP_TABLES[7:])
TABLE_THEMES = dict(zip(CANONICAL_TABLES, (
    "temperature", "wind", "humidity", "pressure", "cloud", "flux",
    "variance", "aerosol", "chemistry", "precipitation", "sea_ice", "sea_ice",
)))
COORDINATES = frozenset(("time", "latitude", "longitude", "lat", "lon", "lat_idx", "lon_idx"))

# Units and source symbols: NASA GMAO MERRA-2 File Specification, v1.1.
ADDITIONAL_INDICATORS = (
    ("tb_merra2_aerossois", "black_carbon_dry_deposition_bin_001_kilograms_per_square_meter_per_second", "BCDP001", "Black carbon dry deposition (bin 001)", "adg", "kg m-2 s-1"),
    ("tb_merra2_aerossois", "black_carbon_extinction_aerosol_optical_depth_550nm", "BCEXTTAU", "Black carbon extinction optical depth at 550 nm", "aer", "1"),
    ("tb_merra2_aerossois", "black_carbon_surface_mass_concentration_kilograms_per_cubic_meter", "BCSMASS", "Black carbon surface mass concentration", "aer", "kg m-3"),
    ("tb_merra2_aerossois", "dust_extinction_aerosol_optical_depth_550nm", "DUEXTTAU", "Dust extinction optical depth at 550 nm", "aer", "1"),
    ("tb_merra2_aerossois", "dust_surface_mass_concentration_kilograms_per_cubic_meter", "DUSMASS", "Dust surface mass concentration", "aer", "kg m-3"),
    ("tb_merra2_aerossois", "organic_carbon_extinction_aerosol_optical_depth_550nm", "OCEXTTAU", "Organic carbon extinction optical depth at 550 nm", "aer", "1"),
    ("tb_merra2_aerossois", "organic_carbon_scattering_aerosol_optical_depth_550nm", "OCSCATAU", "Organic carbon scattering optical depth at 550 nm", "aer", "1"),
    ("tb_merra2_aerossois", "organic_carbon_surface_mass_concentration_kilograms_per_cubic_meter", "OCSMASS", "Organic carbon surface mass concentration", "aer", "kg m-3"),
    ("tb_merra2_aerossois", "sulfate_surface_mass_concentration_kilograms_per_cubic_meter", "SO4SMASS", "Sulfate surface mass concentration", "aer", "kg m-3"),
    ("tb_merra2_aerossois", "sea_salt_extinction_aerosol_optical_depth_550nm", "SSEXTTAU", "Sea salt extinction optical depth at 550 nm", "aer", "1"),
    ("tb_merra2_aerossois", "sea_salt_surface_mass_concentration_kilograms_per_cubic_meter", "SSSMASS", "Sea salt surface mass concentration", "aer", "kg m-3"),
    ("tb_merra2_aerossois", "sulfate_extinction_aerosol_optical_depth_550nm", "SUEXTTAU", "Sulfate extinction optical depth at 550 nm", "aer", "1"),
    ("tb_merra2_aerossois", "total_aerosol_extinction_optical_depth_550nm", "TOTEXTTAU", "Total aerosol extinction optical depth at 550 nm", "aer", "1"),
    ("tb_merra2_aerossois", "total_aerosol_scattering_optical_depth_550nm", "TOTSCATAU", "Total aerosol scattering optical depth at 550 nm", "aer", "1"),
    ("tb_merra2_quimica", "carbon_monoxide_emission_kilograms_per_square_meter_per_second", "COEM", "Carbon monoxide emission flux", "chm", "kg m-2 s-1"),
    ("tb_merra2_quimica", "total_column_ozone_chm_dobson_units", "TO3_CHM", "Total column ozone (CHM)", "chm", "Dobson"),
)


def canonical_indicators(rows, physical_columns):
    """One deterministic row per column name, retaining all physical source aliases.

    Prefer an application combined table over an individual upstream table. Do
    not manufacture missing source columns or collapse CHM and SLV ozone names.
    """
    physical = set(physical_columns)
    priority = {table: index for index, table in enumerate(CANONICAL_TABLES)}
    by_name = {}
    for row in rows:
        if (row["source_table"], row["indicator_name"]) in physical:
            by_name.setdefault(row["indicator_name"], []).append(dict(row))
    result = []
    for name, candidates in sorted(by_name.items()):
        # Manual rows precede discovered ones when the physical source is equal.
        chosen = min(candidates, key=lambda r: (priority.get(r["source_table"], 1000), r["source_table"]))
        chosen["source_tables"] = sorted({table for table, column in physical if column == name})
        table = chosen["source_table"]
        if name.startswith("simulated_"):
            chosen["data_type"] = "model_simulated_diagnostic"
            if not chosen["indicator_label"].lower().startswith("simulated"):
                chosen["indicator_label"] = "Simulated " + chosen["indicator_label"]
        if name in ("source_file", "source_file_modified_at", "source_product", "source_processing_versions", "imerg_run", "hemisphere"):
            chosen["role"], chosen["unit"] = "metadata", None
        if table in TABLE_THEMES:
            chosen["stage"] = "variance_combined" if table == "tb_merra2_variancias" else "combined"
            if table == "tb_merra2_variancias":
                chosen["theme"], chosen["role"] = "variance", "variance"
            elif table in NEW_APP_TABLES:
                chosen["theme"] = TABLE_THEMES[table]
                chosen["domain"] = ("cryosphere" if table.startswith("tb_sea_ice") else
                                    "hydrosphere" if table.startswith("tb_gpm") else "atmosphere")
        result.append(chosen)
    assert len(result) == len({r["indicator_name"] for r in result})
    return result


def coverage_enabled(table, has_data, history_eligible):
    """New app sources may be short/polar; enabled does not assert climate quality."""
    return bool(table not in EXCLUDED_APP_TABLES and has_data and (table in NEW_APP_TABLES or history_eligible))
