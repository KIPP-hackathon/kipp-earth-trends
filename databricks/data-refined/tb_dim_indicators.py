# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Indicator dimension table (tb_dim_indicators)
# MAGIC
# MAGIC Catalogs every analysis-ready indicator (one row per data column) across physical tables in `earth-trend-data.trusted`. Exactly one row per `indicator_name`; application combined tables take precedence and `source_tables` retains upstream aliases. Each row carries the thematic classification (domain, theme, sub-theme), provenance (source, collection, data_type), physical context (vertical_level, unit), educational accessibility (core / intermediate / scientific), table stage (combined / individual / variance), and the source table/column.
# MAGIC
# MAGIC This is a dimension table: it does not contain time-series data. Use indicator_name for the unique indicator; source_table is canonical and source_tables lists other physical aliases.

# COMMAND ----------

# DBTITLE 1,Define indicator catalog
from pyspark.sql import types as T
from pathlib import Path
import sys
sys.path.insert(0, str(Path.cwd().parent))
from indicator_catalog import ADDITIONAL_INDICATORS, canonical_indicators, APP_TABLES

CATALOG = "earth-trend-data"
TARGET_TABLE = f"`{CATALOG}`.refined.tb_dim_indicators"

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def ind(column_name, short_code, label, domain, theme, sub_theme,
         source, collection, data_type, vertical_level, unit,
         source_table, role="measurement", description=""):
    return dict(
        indicator_name=column_name,
        short_code=short_code,
        indicator_label=label,
        domain=domain,
        theme=theme,
        sub_theme=sub_theme,
        source=source,
        collection=collection,
        data_type=data_type,
        vertical_level=vertical_level,
        unit=unit,
        source_table=source_table,
        role=role,
        description=description,
    )

# Common constants
ATM = "atmosphere"
HYDRO = "hydrosphere"
CRYO = "cryosphere"
BIO = "biosphere"
GEO = "geosphere"
M2 = "merra2"
GPM = "gpm_imerg"
GRACE = "grace"
MODIS = "modis"
NSIDC = "nsidc"
COOLR = "coolr"
REAN = "reanalysis"
OBS = "observation"
SAT = "satellite_product"
NA = "n/a"

# Source table names (trusted)
T_TEMP  = "tb_merra2_temperatura"
T_WIND  = "tb_merra2_vento"
T_HUM   = "tb_merra2_umidade"
T_PRESS = "tb_merra2_pressao_altura"
T_CLOUD = "tb_merra2_nuvens"
T_FLUX  = "tb_merra2_fluxos"
T_GPM   = "tb_gpm_imerg_precipitation_final_late"
T_LPROB = "tb_gpm_imerg_liquid_probability"
T_GRACE = "tb_grace_jpl_mass_anomaly"
T_MODIS = "tb_modis_mod13c2_vegetation"
T_SEAICE_CONC = "tb_sea_ice_concentration_global"
T_SEAICE_MASK = "tb_sea_ice_global"
T_COOLR_EVT = "tb_coolr_events_points_monthly_records"
T_COOLR_REP = "tb_coolr_reports_points_monthly_records"

# ---------------------------------------------------------------------------
# MERRA-2  ·  Temperature  (tb_merra2_temperatura)
# ---------------------------------------------------------------------------
rows = []

temp_rows = [
    ind("air_temperature_at_2_meters_kelvin", "T2M", "Air temperature at 2 m", ATM, "temperature", "near_surface", M2, "slv", REAN, "2m", "K", T_TEMP, description="Monthly mean 2-meter air temperature"),
    ind("air_temperature_at_10_meters_kelvin", "T10M", "Air temperature at 10 m", ATM, "temperature", "near_surface", M2, "slv", REAN, "10m", "K", T_TEMP, description="Monthly mean 10-meter air temperature"),
    ind("air_temperature_at_10_meters_celsius", "T10M_C", "Air temperature at 10 m (Celsius)", ATM, "temperature", "near_surface", M2, "slv", REAN, "10m", "degC", T_TEMP, description="Derived Celsius from T10M"),
    ind("air_temperature_at_250_hpa_kelvin", "T250", "Air temperature at 250 hPa", ATM, "temperature", "upper_air", M2, "slv", REAN, "250hpa", "K", T_TEMP, description="Monthly mean air temperature at 250 hPa"),
    ind("air_temperature_at_500_hpa_kelvin", "T500", "Air temperature at 500 hPa", ATM, "temperature", "upper_air", M2, "slv", REAN, "500hpa", "K", T_TEMP, description="Monthly mean air temperature at 500 hPa"),
    ind("air_temperature_at_850_hpa_kelvin", "T850", "Air temperature at 850 hPa", ATM, "temperature", "upper_air", M2, "slv", REAN, "850hpa", "K", T_TEMP, description="Monthly mean air temperature at 850 hPa"),
    ind("surface_skin_temperature_kelvin", "TS", "Surface skin temperature", ATM, "temperature", "surface_skin", M2, "slv", REAN, "surface", "K", T_TEMP, description="Monthly mean surface skin temperature (TS)"),
    ind("surface_skin_temperature_celsius", "TS_C", "Surface skin temperature (Celsius)", ATM, "temperature", "surface_skin", M2, "slv", REAN, "surface", "degC", T_TEMP, description="Derived Celsius from TS"),
    ind("dew_point_temperature_at_2_meters_kelvin", "T2MDEW", "Dew point temperature at 2 m", ATM, "temperature", "dew_point", M2, "slv", REAN, "2m", "K", T_TEMP, description="Monthly mean dew point at 2 m"),
    ind("wet_bulb_temperature_at_2_meters_kelvin", "T2MWET", "Wet bulb temperature at 2 m", ATM, "temperature", "wet_bulb", M2, "slv", REAN, "2m", "K", T_TEMP, description="Monthly mean wet bulb at 2 m"),
    ind("tropopause_temperature_kelvin", "TROPT", "Tropopause temperature", ATM, "temperature", "tropopause", M2, "slv", REAN, "tropopause", "K", T_TEMP, description="Monthly mean tropopause temperature"),
    ind("surface_air_temperature", "TLML", "Surface air temperature (FLX)", ATM, "temperature", "surface_layer", M2, "flx", REAN, "surface", "K", T_TEMP, description="Surface air temperature from FLX collection"),
    ind("effective_surface_skin_temperature", "TSH", "Effective surface skin temperature", ATM, "temperature", "surface_skin", M2, "flx", REAN, "surface", "K", T_TEMP, description="Effective surface skin temperature from FLX"),
    ind("surface_temperature_scale", "TSTAR", "Surface temperature scale", ATM, "temperature", "scale", M2, "flx", REAN, "surface", "K", T_TEMP, description="Surface temperature scale from FLX"),
]
rows.extend(temp_rows)

# ---------------------------------------------------------------------------
# MERRA-2  ·  Wind  (tb_merra2_vento)
# ---------------------------------------------------------------------------
for lev_tag, lev_label, lev_code, vl in [
    ("10_meters", "10 m", "10M", "10m"),
    ("2_meters", "2 m", "2M", "2m"),
    ("50_meters", "50 m", "50M", "50m"),
    ("250_hpa", "250 hPa", "250", "250hpa"),
    ("500_hpa", "500 hPa", "500", "500hpa"),
    ("850_hpa", "850 hPa", "850", "850hpa"),
]:
    rows.append(ind(f"eastward_wind_at_{lev_tag}_meters_per_second", f"U{lev_code}", f"Eastward wind at {lev_label}", ATM, "wind", "horizontal_wind", M2, "slv", REAN, vl, "m/s", T_WIND, description=f"Monthly mean eastward wind at {lev_label}"))
    rows.append(ind(f"northward_wind_at_{lev_tag}_meters_per_second", f"V{lev_code}", f"Northward wind at {lev_label}", ATM, "wind", "horizontal_wind", M2, "slv", REAN, vl, "m/s", T_WIND, description=f"Monthly mean northward wind at {lev_label}"))

rows.extend([
    ind("vertical_pressure_velocity_at_500_hpa_pascals_per_second", "OMEGA500", "Vertical pressure velocity at 500 hPa", ATM, "wind", "vertical_motion", M2, "slv", REAN, "500hpa", "Pa/s", T_WIND, description="Vertical velocity in pressure coordinates at 500 hPa"),
    ind("surface_eastward_wind", "ULML", "Surface eastward wind", ATM, "wind", "surface", M2, "flx", REAN, "surface", "m/s", T_WIND, description="Surface eastward wind from FLX"),
    ind("surface_northward_wind", "VLML", "Surface northward wind", ATM, "wind", "surface", M2, "flx", REAN, "surface", "m/s", T_WIND, description="Surface northward wind from FLX"),
    ind("surface_wind_speed", "SPEED", "Surface wind speed", ATM, "wind", "speed", M2, "flx", REAN, "surface", "m/s", T_WIND, description="Surface wind speed from FLX"),
    ind("surface_velocity_scale", "USTAR", "Surface velocity scale", ATM, "wind", "scale", M2, "flx", REAN, "surface", "m/s", T_WIND, description="Surface velocity scale (friction velocity) from FLX"),
    ind("eastward_surface_stress", "TAUX", "Eastward surface stress", ATM, "wind", "stress", M2, "flx", REAN, "surface", "Pa", T_WIND, description="Eastward surface wind stress from FLX"),
    ind("northward_surface_stress", "TAUY", "Northward surface stress", ATM, "wind", "stress", M2, "flx", REAN, "surface", "Pa", T_WIND, description="Northward surface wind stress from FLX"),
    ind("surface_eastward_gravity_wave_stress", "TAUGWX", "Eastward gravity wave stress", ATM, "wind", "gravity_wave_stress", M2, "flx", REAN, "surface", "Pa", T_WIND, description="Eastward surface gravity wave stress from FLX"),
    ind("surface_northward_gravity_wave_stress", "TAUGWY", "Northward gravity wave stress", ATM, "wind", "gravity_wave_stress", M2, "flx", REAN, "surface", "Pa", T_WIND, description="Northward surface gravity wave stress from FLX"),
])

# ---------------------------------------------------------------------------
# MERRA-2  ·  Humidity  (tb_merra2_umidade)
# ---------------------------------------------------------------------------
for lev_tag, lev_label, lev_code, vl in [
    ("250_hpa", "250 hPa", "250", "250hpa"),
    ("500_hpa", "500 hPa", "500", "500hpa"),
    ("850_hpa", "850 hPa", "850", "850hpa"),
    ("2_meters", "2 m", "V2M", "2m"),
    ("10_meters", "10 m", "V10M", "10m"),
]:
    rows.append(ind(f"specific_humidity_at_{lev_tag}_kilograms_per_kilogram", f"Q{lev_code}", f"Specific humidity at {lev_label}", ATM, "humidity", "specific_humidity", M2, "slv", REAN, vl, "kg/kg", T_HUM, description=f"Monthly mean specific humidity at {lev_label}"))

rows.extend([
    ind("tropopause_specific_humidity_kilograms_per_kilogram", "TROPQ", "Tropopause specific humidity", ATM, "humidity", "tropopause", M2, "slv", REAN, "tropopause", "kg/kg", T_HUM, description="Tropopause specific humidity"),
    ind("total_column_water_vapor_kilograms_per_square_meter", "TQV", "Total column water vapor", ATM, "humidity", "total_column", M2, "slv", REAN, "column_total", "kg/m²", T_HUM, description="Total precipitable water vapor"),
    ind("total_column_ice_water_kilograms_per_square_meter", "TQI", "Total column ice water", ATM, "humidity", "total_column", M2, "slv", REAN, "column_total", "kg/m²", T_HUM, description="Total precipitable ice water"),
    ind("total_column_liquid_water_kilograms_per_square_meter", "TQL", "Total column liquid water", ATM, "humidity", "total_column", M2, "slv", REAN, "column_total", "kg/m²", T_HUM, description="Total precipitable liquid water"),
    ind("surface_specific_humidity", "QLML", "Surface specific humidity", ATM, "humidity", "surface", M2, "flx", REAN, "surface", "kg/kg", T_HUM, description="Surface specific humidity from FLX"),
    ind("effective_surface_specific_humidity", "QSH", "Effective surface specific humidity", ATM, "humidity", "surface", M2, "flx", REAN, "surface", "kg/kg", T_HUM, description="Effective surface specific humidity from FLX"),
    ind("surface_moisture_scale", "QSTAR", "Surface moisture scale", ATM, "humidity", "scale", M2, "flx", REAN, "surface", "kg/kg", T_HUM, description="Surface moisture scale from FLX"),
])

# ---------------------------------------------------------------------------
# MERRA-2  ·  Pressure & Height  (tb_merra2_pressao_altura)
# ---------------------------------------------------------------------------
press_rows = [
    ind("surface_pressure_pascals", "PS", "Surface pressure", ATM, "pressure", "surface", M2, "slv", REAN, "surface", "Pa", T_PRESS, description="Surface atmospheric pressure"),
    ind("sea_level_pressure_pascals", "SLP", "Sea level pressure", ATM, "pressure", "sea_level", M2, "slv", REAN, "sea_level", "Pa", T_PRESS, description="Sea level pressure"),
    ind("geopotential_height_at_1000_hpa_meters", "H1000", "Geopotential height at 1000 hPa", ATM, "pressure", "geopotential", M2, "slv", REAN, "1000hpa", "m", T_PRESS, description="Geopotential height at 1000 hPa"),
    ind("geopotential_height_at_250_hpa_meters", "H250", "Geopotential height at 250 hPa", ATM, "pressure", "geopotential", M2, "slv", REAN, "250hpa", "m", T_PRESS, description="Geopotential height at 250 hPa"),
    ind("geopotential_height_at_500_hpa_meters", "H500", "Geopotential height at 500 hPa", ATM, "pressure", "geopotential", M2, "slv", REAN, "500hpa", "m", T_PRESS, description="Geopotential height at 500 hPa"),
    ind("geopotential_height_at_850_hpa_meters", "H850", "Geopotential height at 850 hPa", ATM, "pressure", "geopotential", M2, "slv", REAN, "850hpa", "m", T_PRESS, description="Geopotential height at 850 hPa"),
    ind("planetary_boundary_layer_top_pressure_pascals", "PBLTOP", "PBL top pressure", ATM, "pressure", "boundary_layer", M2, "slv", REAN, "boundary_layer", "Pa", T_PRESS, description="Planetary boundary layer top pressure"),
    ind("blended_tropopause_pressure_pascals", "TROPPB", "Blended tropopause pressure", ATM, "pressure", "tropopause", M2, "slv", REAN, "tropopause", "Pa", T_PRESS, description="Tropopause pressure (blended estimate)"),
    ind("thermal_tropopause_pressure_pascals", "TROPPT", "Thermal tropopause pressure", ATM, "pressure", "tropopause", M2, "slv", REAN, "tropopause", "Pa", T_PRESS, description="Tropopause pressure (thermal estimate)"),
    ind("potential_vorticity_tropopause_pressure_pascals", "TROPPV", "PV tropopause pressure", ATM, "pressure", "tropopause", M2, "slv", REAN, "tropopause", "Pa", T_PRESS, description="Tropopause pressure (potential vorticity estimate)"),
    ind("zero_plane_displacement_height_meters", "DISPH", "Zero plane displacement height", ATM, "pressure", "displacement", M2, "slv", REAN, "surface", "m", T_PRESS, description="Zero plane displacement height"),
    ind("lifting_condensation_level", "ZLCL", "Lifting condensation level", ATM, "pressure", "condensation", M2, "slv", REAN, "surface", "m", T_PRESS, description="Lifting condensation level"),
    ind("total_column_ozone_dobson_units", "TO3", "Total column ozone", ATM, "ozone", "total_column", M2, "slv", REAN, "column_total", "Dobson", T_PRESS, description="Total column ozone in Dobson units"),
    ind("total_column_odd_oxygen_kilograms_per_square_meter", "TOX", "Total column odd oxygen", ATM, "ozone", "total_column", M2, "slv", REAN, "column_total", "kg/m²", T_PRESS, description="Total column odd oxygen"),
]
rows.extend(press_rows)

# ---------------------------------------------------------------------------
# MERRA-2  ·  Clouds  (tb_merra2_nuvens)
# ---------------------------------------------------------------------------
cloud_rows = [
    ind("cloud_top_pressure_pascals", "CLDPRS", "Cloud top pressure", ATM, "cloud", "cloud_top", M2, "slv", REAN, "column_total", "Pa", T_CLOUD, description="Cloud top pressure"),
    ind("cloud_top_temperature_kelvin", "CLDTMP", "Cloud top temperature", ATM, "cloud", "cloud_top", M2, "slv", REAN, "column_total", "K", T_CLOUD, description="Cloud top temperature"),
    ind("simulated_isccp_cloud_albedo", "ISCCPALB", "ISCCP cloud albedo", ATM, "cloud", "albedo", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated ISCCP cloud albedo"),
    ind("simulated_isccp_total_cloud_area_fraction", "ISCCPCLDFRC", "ISCCP total cloud fraction", ATM, "cloud", "cloud_fraction", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated ISCCP total cloud area fraction"),
    ind("simulated_modis_cloud_fraction_water_mean", "MDSCLDFRCH2O", "MODIS cloud fraction (water)", ATM, "cloud", "cloud_fraction", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS cloud fraction water mean"),
    ind("simulated_modis_cloud_fraction_high_mean", "MDSCLDFRCHI", "MODIS cloud fraction (high)", ATM, "cloud", "cloud_fraction", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS cloud fraction high mean"),
    ind("simulated_modis_cloud_fraction_ice_mean", "MDSCLDFRCICE", "MODIS cloud fraction (ice)", ATM, "cloud", "cloud_fraction", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS cloud fraction ice mean"),
    ind("simulated_modis_cloud_fraction_low_mean", "MDSCLDFRCLO", "MODIS cloud fraction (low)", ATM, "cloud", "cloud_fraction", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS cloud fraction low mean"),
    ind("simulated_modis_cloud_fraction_mid_mean", "MDSCLDFRCMID", "MODIS cloud fraction (mid)", ATM, "cloud", "cloud_fraction", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS cloud fraction mid mean"),
    ind("simulated_modis_cloud_fraction_total_mean", "MDSCLDFRCTTL", "MODIS cloud fraction (total)", ATM, "cloud", "cloud_fraction", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS cloud fraction total mean"),
    ind("simulated_modis_cloud_particle_size_water_mean", "MDSCLDSZH20", "MODIS particle size (water)", ATM, "cloud", "particle_size", M2, "csp", REAN, "column_total", "µm", T_CLOUD, description="Simulated MODIS cloud particle size water mean"),
    ind("simulated_modis_cloud_particle_size_ice_mean", "MDSCLDSZICE", "MODIS particle size (ice)", ATM, "cloud", "particle_size", M2, "csp", REAN, "column_total", "µm", T_CLOUD, description="Simulated MODIS cloud particle size ice mean"),
    ind("simulated_modis_cloud_top_pressure_total_mean", "MDSCLDTOPPS", "MODIS cloud top pressure", ATM, "cloud", "cloud_top", M2, "csp", REAN, "column_total", "Pa", T_CLOUD, description="Simulated MODIS cloud top pressure total mean"),
    ind("simulated_modis_liquid_water_path_mean", "MDSH2OPATH", "MODIS liquid water path", ATM, "cloud", "water_path", M2, "csp", REAN, "column_total", "kg/m²", T_CLOUD, description="Simulated MODIS liquid water path mean"),
    ind("simulated_modis_ice_water_path_mean", "MDSICEPATH", "MODIS ice water path", ATM, "cloud", "water_path", M2, "csp", REAN, "column_total", "kg/m²", T_CLOUD, description="Simulated MODIS ice water path mean"),
    ind("simulated_modis_optical_thickness_water_mean", "MDSOPTHCKH2O", "MODIS optical thickness (water)", ATM, "cloud", "optical_thickness", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS optical thickness water mean"),
    ind("simulated_modis_optical_thickness_water_logmean", "MDSOPTHCKH2OLG", "MODIS optical thickness (water logmean)", ATM, "cloud", "optical_thickness", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS optical thickness water logmean"),
    ind("simulated_modis_optical_thickness_ice_mean", "MDSOPTHCKICE", "MODIS optical thickness (ice)", ATM, "cloud", "optical_thickness", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS optical thickness ice mean"),
    ind("simulated_modis_optical_thickness_ice_logmean", "MDSOPTHCKICELG", "MODIS optical thickness (ice logmean)", ATM, "cloud", "optical_thickness", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS optical thickness ice logmean"),
    ind("simulated_modis_optical_thickness_total_mean", "MDSOPTHCKTTL", "MODIS optical thickness (total)", ATM, "cloud", "optical_thickness", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS optical thickness total mean"),
    ind("simulated_modis_optical_thickness_total_logmean", "MDSOPTHCKTTLLG", "MODIS optical thickness (total logmean)", ATM, "cloud", "optical_thickness", M2, "csp", REAN, "column_total", "1", T_CLOUD, description="Simulated MODIS optical thickness total logmean"),
]
rows.extend(cloud_rows)

# ---------------------------------------------------------------------------
# MERRA-2  ·  Surface fluxes  (tb_merra2_fluxos)
# ---------------------------------------------------------------------------
flux_rows = [
    ind("surface_buoyancy_scale", "BSTAR", "Surface buoyancy scale", ATM, "flux", "turbulence", M2, "flx", REAN, "surface", "m/s²", T_FLUX, description="Surface buoyancy scale"),
    ind("surface_exchange_coefficient_for_heat", "CDH", "Exchange coefficient for heat", ATM, "flux", "turbulence", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Surface exchange coefficient for heat"),
    ind("surface_exchange_coefficient_for_momentum", "CDM", "Exchange coefficient for momentum", ATM, "flux", "turbulence", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Surface exchange coefficient for momentum"),
    ind("surface_exchange_coefficient_for_moisture", "CDQ", "Exchange coefficient for moisture", ATM, "flux", "turbulence", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Surface exchange coefficient for moisture"),
    ind("surface_neutral_drag_coefficient", "CN", "Neutral drag coefficient", ATM, "flux", "turbulence", M2, "flx", REAN, "surface", "1", T_FLUX, description="Surface neutral drag coefficient"),
    ind("total_latent_energy_flux", "EFLUX", "Total latent energy flux", ATM, "flux", "heat_flux", M2, "flx", REAN, "surface", "W/m²", T_FLUX, description="Total latent energy flux"),
    ind("evaporation_from_turbulence", "EVAP", "Evaporation from turbulence", ATM, "flux", "evaporation", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Evaporation from turbulence"),
    ind("areal_fraction_of_anvil_showers", "FRCAN", "Anvil shower fraction", ATM, "flux", "precipitation_fraction", M2, "flx", REAN, "surface", "1", T_FLUX, description="Areal fraction of anvil showers"),
    ind("areal_fraction_of_convective_showers", "FRCCN", "Convective shower fraction", ATM, "flux", "precipitation_fraction", M2, "flx", REAN, "surface", "1", T_FLUX, description="Areal fraction of convective showers"),
    ind("areal_fraction_of_nonanvil_large_scale_showers", "FRCLS", "Large-scale shower fraction", ATM, "flux", "precipitation_fraction", M2, "flx", REAN, "surface", "1", T_FLUX, description="Areal fraction of non-anvil large-scale showers"),
    ind("ice_covered_fraction_of_tile", "FRSEAICE", "Ice-covered fraction", ATM, "flux", "surface_fraction", M2, "flx", REAN, "surface", "1", T_FLUX, description="Ice-covered fraction of tile"),
    ind("ground_heating_for_skin_temp", "GHTSKIN", "Ground heating for skin temp", ATM, "flux", "heat_flux", M2, "flx", REAN, "surface", "W/m²", T_FLUX, description="Ground heating for skin temperature"),
    ind("sensible_heat_flux_from_turbulence", "HFLUX", "Sensible heat flux", ATM, "flux", "heat_flux", M2, "flx", REAN, "surface", "W/m²", T_FLUX, description="Sensible heat flux from turbulence"),
    ind("surface_layer_height", "HLML", "Surface layer height", ATM, "flux", "boundary_layer", M2, "flx", REAN, "surface", "m", T_FLUX, description="Surface layer height"),
    ind("surface_downwelling_nearinfrared_diffuse_flux", "NIRDF", "NIR diffuse flux", ATM, "flux", "radiation", M2, "flx", REAN, "surface", "W/m²", T_FLUX, description="Surface downwelling near-infrared diffuse flux"),
    ind("surface_downwelling_nearinfrared_beam_flux", "NIRDR", "NIR beam flux", ATM, "flux", "radiation", M2, "flx", REAN, "surface", "W/m²", T_FLUX, description="Surface downwelling near-infrared beam flux"),
    ind("planetary_boundary_layer_height", "PBLH", "PBL height", ATM, "flux", "boundary_layer", M2, "flx", REAN, "boundary_layer", "m", T_FLUX, description="Planetary boundary layer height"),
    ind("total_column_production_of_precipitation", "PGENTOT", "Total precipitation production", ATM, "flux", "precipitation_production", M2, "flx", REAN, "column_total", "kg/m²/s", T_FLUX, description="Total column production of precipitation"),
    ind("anvil_precipitation", "PRECANV", "Anvil precipitation", ATM, "flux", "precipitation", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Anvil precipitation"),
    ind("convective_precipitation", "PRECCON", "Convective precipitation", ATM, "flux", "precipitation", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Convective precipitation"),
    ind("nonanvil_large_scale_precipitation", "PRECLSC", "Large-scale precipitation", ATM, "flux", "precipitation", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Non-anvil large-scale precipitation"),
    ind("snowfall", "PRECSNO", "Snowfall", ATM, "flux", "precipitation", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Snowfall"),
    ind("total_precipitation_from_atm_model_physics", "PRECTOT", "Total precipitation (model)", ATM, "flux", "precipitation", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Total precipitation from atmospheric model physics"),
    ind("bias_corrected_total_precipitation", "PRECTOTCORR", "Bias-corrected precipitation", ATM, "flux", "precipitation", M2, "flx", REAN, "surface", "kg/m²/s", T_FLUX, description="Bias-corrected total precipitation"),
    ind("total_column_re_evap_subl_of_precipitation", "PREVTOT", "Re-evaporation of precipitation", ATM, "flux", "evaporation", M2, "flx", REAN, "column_total", "kg/m²/s", T_FLUX, description="Total column re-evaporation/sublimation of precipitation"),
    ind("air_density_at_surface", "RHOA", "Surface air density", ATM, "flux", "surface_properties", M2, "flx", REAN, "surface", "kg/m³", T_FLUX, description="Air density at surface"),
    ind("surface_bulk_richardson_number", "RISFC", "Surface bulk Richardson number", ATM, "flux", "turbulence", M2, "flx", REAN, "surface", "1", T_FLUX, description="Surface bulk Richardson number"),
    ind("transcom_planetary_boundary_layer_height", "TCZPBL", "Transcom PBL height", ATM, "flux", "boundary_layer", M2, "flx", REAN, "boundary_layer", "m", T_FLUX, description="Transcom planetary boundary layer height"),
    ind("surface_roughness_for_heat", "Z0H", "Surface roughness for heat", ATM, "flux", "surface_properties", M2, "flx", REAN, "surface", "m", T_FLUX, description="Surface roughness for heat"),
    ind("surface_roughness", "Z0M", "Surface roughness", ATM, "flux", "surface_properties", M2, "flx", REAN, "surface", "m", T_FLUX, description="Surface roughness"),
]
rows.extend(flux_rows)

# ---------------------------------------------------------------------------
# Non-MERRA-2  ·  GPM IMERG precipitation (combined Final + Late)
# ---------------------------------------------------------------------------
rows.extend([
    ind("monthly_precipitation_millimeters", "IMERG_PRECIP_MM", "Monthly precipitation", HYDRO, "precipitation", "total", GPM, NA, OBS, "surface", "mm", T_GPM, description="Monthly precipitation total from IMERG Final+Late"),
    ind("precipitation_rate_millimeters_per_hour", "IMERG_PRECIP_RATE", "Precipitation rate", HYDRO, "precipitation", "rate", GPM, NA, OBS, "surface", "mm/h", T_GPM, description="Monthly mean precipitation rate from IMERG"),
    ind("native_precipitation_random_error_mean_millimeters_per_hour", "IMERG_ERR_HOURLY", "Precipitation random error (hourly)", HYDRO, "precipitation", "uncertainty", GPM, NA, OBS, "surface", "mm/h", T_GPM, role="uncertainty", description="Native random error mean (Final, mm/h)"),
    ind("native_daily_precipitation_random_error_mean_millimeters_per_day", "IMERG_ERR_DAILY", "Precipitation random error (daily)", HYDRO, "precipitation", "uncertainty", GPM, NA, OBS, "surface", "mm/day", T_GPM, role="uncertainty", description="Native random error mean (Late, mm/day)"),
    ind("mean_half_hourly_sample_fraction", "IMERG_SAMPLE_FRAC", "Half-hourly sample fraction", HYDRO, "precipitation", "quality_control", GPM, NA, OBS, "surface", "1", T_GPM, role="quality_control", description="Mean half-hourly sample fraction"),
    ind("valid_day_count", "IMERG_VALID_DAYS", "Valid day count", HYDRO, "precipitation", "quality_control", GPM, NA, OBS, "surface", "days", T_GPM, role="quality_control", description="Number of valid days in the month"),
    ind("valid_area_fraction", "IMERG_VALID_AREA", "Valid area fraction", HYDRO, "precipitation", "quality_control", GPM, NA, OBS, "surface", "1", T_GPM, role="quality_control", description="Fraction of cell area with valid data"),
])

# GPM IMERG liquid probability
rows.extend([
    ind("liquid_precipitation_probability_percent", "IMERG_LIQUID_PROB", "Liquid precipitation probability", HYDRO, "precipitation", "phase_probability", GPM, NA, OBS, "surface", "%", T_LPROB, description="Probability of liquid precipitation phase"),
    ind("valid_area_fraction", "IMERG_LPROB_AREA", "Valid area fraction (liquid prob)", HYDRO, "precipitation", "quality_control", GPM, NA, OBS, "surface", "1", T_LPROB, role="quality_control", description="Fraction of cell area with valid data"),
])

# ---------------------------------------------------------------------------
# Non-MERRA-2  ·  GRACE mass anomaly
# ---------------------------------------------------------------------------
rows.extend([
    ind("surface_mass_anomaly_millimeters_water_equivalent", "GRACE_MASS_ANOM", "Surface mass anomaly", GEO, "mass_gravity", "mass_anomaly", GRACE, NA, SAT, "surface", "mm w.e.", T_GRACE, description="Surface mass anomaly relative to 2004-2009 baseline"),
    ind("cell_mass_anomaly_gigatonnes", "GRACE_CELL_GT", "Cell mass anomaly", GEO, "mass_gravity", "mass_anomaly", GRACE, NA, SAT, "surface", "Gt", T_GRACE, description="Cell mass anomaly in gigatonnes"),
    ind("native_mass_uncertainty_mean_millimeters_water_equivalent", "GRACE_UNCERTAINTY", "Mass anomaly uncertainty", GEO, "mass_gravity", "uncertainty", GRACE, NA, SAT, "surface", "mm w.e.", T_GRACE, role="uncertainty", description="Native uncertainty mean"),
    ind("valid_area_fraction", "GRACE_VALID_AREA", "Valid area fraction", GEO, "mass_gravity", "quality_control", GRACE, NA, SAT, "surface", "1", T_GRACE, role="quality_control", description="Fraction of cell area with valid data"),
])

# ---------------------------------------------------------------------------
# Non-MERRA-2  ·  MODIS vegetation
# ---------------------------------------------------------------------------
rows.extend([
    ind("normalized_difference_vegetation_index", "NDVI", "NDVI", BIO, "vegetation", "vegetation_index", MODIS, NA, OBS, "surface", "1", T_MODIS, description="Normalized Difference Vegetation Index (calibrated)"),
    ind("enhanced_vegetation_index", "EVI", "EVI", BIO, "vegetation", "vegetation_index", MODIS, NA, OBS, "surface", "1", T_MODIS, description="Enhanced Vegetation Index (calibrated)"),
    ind("normalized_difference_vegetation_index_raw", "NDVI_RAW", "NDVI (raw)", BIO, "vegetation", "vegetation_index", MODIS, NA, OBS, "surface", "1", T_MODIS, role="raw", description="Raw integer NDVI before scale factor"),
    ind("enhanced_vegetation_index_raw", "EVI_RAW", "EVI (raw)", BIO, "vegetation", "vegetation_index", MODIS, NA, OBS, "surface", "1", T_MODIS, role="raw", description="Raw integer EVI before scale factor"),
    ind("vegetation_index_quality_bits", "NDVI_QA_BITS", "VI quality bits", BIO, "vegetation", "quality_control", MODIS, NA, OBS, "surface", "bitfield", T_MODIS, role="quality_control", description="CMG Monthly VI Quality bitfield"),
    ind("pixel_reliability_rank", "NDVI_RELIABILITY", "Pixel reliability", BIO, "vegetation", "quality_control", MODIS, NA, OBS, "surface", "rank", T_MODIS, role="quality_control", description="Pixel reliability rank (-1 fill, 0 good, 1 marginal, 2 snow/ice, 3 cloud, 4 estimated)"),
])

# ---------------------------------------------------------------------------
# Non-MERRA-2  ·  Sea ice (NSIDC)
# ---------------------------------------------------------------------------
rows.extend([
    ind("sea_ice_concentration_percent", "SEAICE_CONC", "Sea ice concentration", CRYO, "sea_ice", "concentration", NSIDC, NA, SAT, "surface", "%", T_SEAICE_CONC, description="Sea ice concentration (NSIDC G02135 v4, 15% threshold)"),
    ind("valid_area_fraction", "SEAICE_CONC_AREA", "Valid area fraction", CRYO, "sea_ice", "quality_control", NSIDC, NA, SAT, "surface", "1", T_SEAICE_CONC, role="quality_control", description="Fraction of cell area with valid data"),
    ind("sea_ice_extent_flag", "SEAICE_EXTENT", "Sea ice extent flag", CRYO, "sea_ice", "extent", NSIDC, NA, SAT, "surface", "flag", T_SEAICE_MASK, description="Sea ice extent flag (1=ice, 0=open water)"),
    ind("valid_sample", "SEAICE_VALID_SAMPLE", "Valid sample", CRYO, "sea_ice", "quality_control", NSIDC, NA, SAT, "surface", "1", T_SEAICE_MASK, role="quality_control", description="Valid sample flag"),
])

# ---------------------------------------------------------------------------
# Non-MERRA-2  ·  COOLR landslide records
# ---------------------------------------------------------------------------
rows.extend([
    ind("reported_landslide_catalog_record_count", "COOLR_EVENTS_COUNT", "Landslide event count", GEO, "landslide", "event_count", COOLR, NA, OBS, "surface", "count", T_COOLR_EVT, description="Monthly count of COOLR event records at nearest grid cell"),
    ind("reported_landslide_catalog_record_count", "COOLR_REPORTS_COUNT", "Landslide report count", GEO, "landslide", "report_count", COOLR, NA, OBS, "surface", "count", T_COOLR_REP, description="Monthly count of COOLR report records at nearest grid cell"),
])

print(f"Total indicators defined: {len(rows)}")
print(f"  Measurements: {sum(1 for r in rows if r['role'] == 'measurement')}")
print(f"  Uncertainty:   {sum(1 for r in rows if r['role'] == 'uncertainty')}")
print(f"  Quality ctrl:   {sum(1 for r in rows if r['role'] == 'quality_control')}")
print(f"  Raw:           {sum(1 for r in rows if r['role'] == 'raw')}")

# COMMAND ----------

# DBTITLE 1,Scan all trusted tables for full coverage
# ---------------------------------------------------------------------------
# Programmatic scan: add all remaining trusted tables not in manual definitions
# ---------------------------------------------------------------------------

for table, column, code, label, collection, unit in ADDITIONAL_INDICATORS:
    rows.append(ind(column, code, label, ATM, "aerosol" if collection in ("aer", "adg") else "chemistry",
                    "surface" if collection == "adg" or "concentration" in column else "column_total",
                    M2, collection, REAN, "surface" if collection == "adg" or "concentration" in column else "column_total",
                    unit, table, description=f"Monthly MERRA-2 {collection.upper()} reanalysis; native units {unit}."))

defined_pairs = set((r["source_table"], r["indicator_name"]) for r in rows)

all_cols = spark.sql("""
    SELECT table_name, column_name, data_type, comment
    FROM `earth-trend-data`.information_schema.columns
    WHERE table_schema = 'trusted'
      AND table_name <> 'tb_indicator_coverage'
      AND column_name NOT IN ('time', 'latitude', 'longitude', 'lat', 'lon', 'lat_idx', 'lon_idx')
    ORDER BY table_name, ordinal_position
""").collect()

COMBINED_TABLES = {
    T_TEMP, T_WIND, T_HUM, T_PRESS, T_CLOUD, T_FLUX,
    T_GPM, T_GRACE, T_MODIS, T_SEAICE_CONC, T_SEAICE_MASK,
    T_COOLR_EVT, T_COOLR_REP, T_LPROB,
    "tb_merra2_variancias",
}

THEME_DOMAIN = {
    "temperature": ATM, "wind": ATM, "humidity": ATM, "pressure": ATM,
    "cloud": ATM, "flux": ATM, "ozone": ATM, "variance": ATM,
    "precipitation": HYDRO, "sea_ice": CRYO, "vegetation": BIO,
    "mass_gravity": GEO, "landslide": GEO,
}

COMBINED_THEMES = {
    T_TEMP: "temperature", T_WIND: "wind", T_HUM: "humidity",
    T_PRESS: "pressure", T_CLOUD: "cloud", T_FLUX: "flux",
    "tb_merra2_variancias": "variance",
}

def classify_table(tbl):
    if tbl.startswith("tb_merra2") or tbl == "merra2_ts":
        src = M2
    elif tbl.startswith("tb_gpm_imerg"):
        src = GPM
    elif tbl.startswith("tb_grace"):
        src = GRACE
    elif tbl.startswith("tb_modis"):
        src = MODIS
    elif tbl.startswith("tb_sea_ice"):
        src = NSIDC
    elif tbl.startswith("tb_coolr"):
        src = COOLR
    else:
        src = "unknown"

    if "_flx_" in tbl:
        coll = "flx"
    elif "_csp_" in tbl:
        coll = "csp"
    elif "_slv_" in tbl:
        coll = "slv"
    elif tbl in (T_TEMP, T_WIND, T_HUM, T_PRESS, T_CLOUD, "tb_merra2_variancias"):
        coll = "mixed"
    elif tbl == T_FLUX:
        coll = "flx"
    elif tbl.startswith("tb_merra2"):
        coll = "slv"
    else:
        coll = NA

    if tbl in COMBINED_THEMES:
        theme = COMBINED_THEMES[tbl]
    elif "_flx_" in tbl:
        theme = "flux"
    elif "_csp_" in tbl:
        theme = "cloud"
    elif tbl.startswith("tb_gpm_imerg"):
        theme = "precipitation"
    elif tbl.startswith("tb_grace"):
        theme = "mass_gravity"
    elif tbl.startswith("tb_modis"):
        theme = "vegetation"
    elif tbl.startswith("tb_sea_ice"):
        theme = "sea_ice"
    elif tbl.startswith("tb_coolr"):
        theme = "landslide"
    elif tbl.startswith("tb_merra2"):
        vc = tbl.replace("tb_merra2_", "")
        for pfx in ("slv_var_", "flx_var_", "csp_var_", "var_", "slv_"):
            if vc.startswith(pfx):
                vc = vc[len(pfx):]
                break
        vc = vc.upper()
        if vc.startswith("T") and not vc.startswith(("TQ", "TO")):
            theme = "temperature"
        elif vc.startswith(("U", "V", "OMEGA", "SPEED")):
            theme = "wind"
        elif vc.startswith(("Q", "TQV", "TQI", "TQL")):
            theme = "humidity"
        elif vc.startswith(("PS", "SLP", "H", "PBL", "TROP", "DISPH", "ZLCL")):
            theme = "pressure"
        elif vc.startswith(("TO3", "TOX")):
            theme = "ozone"
        elif vc.startswith("CLD"):
            theme = "cloud"
        else:
            theme = "flux"
    else:
        theme = "unknown"

    domain = THEME_DOMAIN.get(theme, "unknown")

    is_var = ("_var_" in tbl or tbl.startswith("tb_merra2_var_")
              or tbl.replace("tb_merra2_", "").startswith("var_"))
    if tbl in COMBINED_TABLES and tbl != "tb_merra2_variancias":
        stage = "combined"
    elif tbl == "tb_merra2_variancias":
        stage = "variance_combined"
    elif is_var:
        stage = "variance_individual"
    else:
        stage = "individual"

    return src, coll, theme, domain, stage

def extract_short_code(tbl, col):
    if tbl == "tb_merra2_variancias":
        base = col.replace("_variance", "").upper()
        return base + "_VAR"
    if tbl.startswith("tb_merra2_"):
        parts = tbl.replace("tb_merra2_", "")
        for pfx in ("slv_var_", "flx_var_", "csp_var_", "var_", "slv_", "flx_", "csp_"):
            if parts.startswith(pfx):
                parts = parts[len(pfx):]
                break
        if parts.startswith("var_"):
            parts = parts[4:] + "_var"
        return parts.upper()
    return col.upper()[:40]

added = 0
for row in all_cols:
    tbl = row.table_name
    col = row.column_name
    if (tbl, col) in defined_pairs:
        continue
    src, coll, theme, domain, stage = classify_table(tbl)
    short = extract_short_code(tbl, col)
    dtype = row.data_type
    cmt = row.comment or ""
    col_low = col.lower()

    if dtype == "STRING":
        role = "metadata"
    elif any(kw in col_low for kw in ("valid_area", "valid_sample", "valid_day", "quality", "reliability", "source_file")):
        role = "quality_control"
    elif "variance" in col_low or col_low.startswith("var_"):
        role = "variance"
    elif "raw" in col_low and "index" not in col_low:
        role = "raw"
    elif "error" in col_low or "uncertainty" in col_low:
        role = "uncertainty"
    else:
        role = "measurement"

    unit = "unknown"
    for pat in ("Unidade:", "na unidade", "em "):
        if pat in cmt:
            idx = cmt.index(pat) + len(pat)
            unit = cmt[idx:idx + 40].strip().split(".")[0].split(",")[0].strip()
            break

    rows.append(ind(
        column_name=col, short_code=short,
        label=col.replace("_", " ").title(),
        domain=domain, theme=theme, sub_theme=stage if stage != "combined" else "",
        source=src, collection=coll,
        data_type=REAN if src == M2 else (SAT if src in (GRACE, NSIDC) else OBS),
        vertical_level="unknown", unit=unit,
        source_table=tbl, role=role,
        description=cmt[:200] if cmt else "",
    ))
    added += 1

physical_columns = {(r.table_name, r.column_name) for r in all_cols}
rows = canonical_indicators(rows, physical_columns)
print(f"Manually defined: {len(defined_pairs)}")
print(f"Programmatically added: {added}")
print(f"Total indicators: {len(rows)}")

# COMMAND ----------

# DBTITLE 1,Create Spark DataFrame and write to refined
from pyspark.sql import functions as F
from datetime import datetime, timezone

# Build Spark DataFrame
schema = T.StructType([
    T.StructField("indicator_name", T.StringType(), False),
    T.StructField("short_code", T.StringType(), True),
    T.StructField("indicator_label", T.StringType(), True),
    T.StructField("domain", T.StringType(), False),
    T.StructField("theme", T.StringType(), False),
    T.StructField("sub_theme", T.StringType(), True),
    T.StructField("source", T.StringType(), False),
    T.StructField("collection", T.StringType(), True),
    T.StructField("data_type", T.StringType(), False),
    T.StructField("vertical_level", T.StringType(), True),
    T.StructField("unit", T.StringType(), True),
    T.StructField("source_table", T.StringType(), False),
    T.StructField("role", T.StringType(), False),
    T.StructField("description", T.StringType(), True),
    T.StructField("source_tables", T.ArrayType(T.StringType()), False),
])

indicators_sdf = spark.createDataFrame(rows, schema=schema)

# Add stage column (combined / individual / variance_combined / variance_individual)
COMBINED_TABLES_LIST = [
    "tb_merra2_temperatura", "tb_merra2_vento", "tb_merra2_umidade",
    "tb_merra2_pressao_altura", "tb_merra2_nuvens", "tb_merra2_fluxos",
    "tb_merra2_aerossois", "tb_merra2_quimica",
    "tb_gpm_imerg_precipitation_final_late", "tb_grace_jpl_mass_anomaly",
    "tb_modis_mod13c2_vegetation", "tb_sea_ice_concentration_global",
    "tb_sea_ice_global", "tb_coolr_events_points_monthly_records",
    "tb_coolr_reports_points_monthly_records", "tb_gpm_imerg_liquid_probability",
]

indicators_sdf = indicators_sdf.withColumn(
    "stage",
    F.when(F.col("source_table").isin(COMBINED_TABLES_LIST), F.lit("combined"))
     .when(F.col("source_table") == "tb_merra2_variancias", F.lit("variance_combined"))
     .when(F.col("source_table").rlike("tb_merra2_(slv_)?var_|_var_"), F.lit("variance_individual"))
     .otherwise(F.lit("individual"))
)

# Generate indicator_id: source_short_code for combined, source_table_short_code for others
indicators_sdf = indicators_sdf.withColumn(
    "indicator_id",
    F.when(F.col("stage") == "combined",
           F.concat_ws("_", F.col("source"), F.col("short_code")))
     .otherwise(F.concat_ws("_", F.col("source_table"), F.col("short_code")))
).withColumn(
    "created_at",
    F.lit(datetime.now(timezone.utc)).cast("timestamp"),
)

# Resolve duplicate indicator_id values (tables with multiple data columns sharing same short_code)
from pyspark.sql import Window as W
_dup_w = W.partitionBy("indicator_id").orderBy("indicator_name")
indicators_sdf = indicators_sdf.withColumn("_rn", F.row_number().over(_dup_w)) \
    .withColumn("indicator_id",
        F.when(F.col("_rn") > 1, F.concat_ws("_", F.col("indicator_id"), F.col("_rn")))
         .otherwise(F.col("indicator_id"))) \
    .drop("_rn")

# Keep existing IDs stable when choosing a different canonical source table.
if spark.catalog.tableExists(TARGET_TABLE):
    previous = spark.table(TARGET_TABLE).select(
        "indicator_name", F.col("indicator_id").alias("_previous_id"),
        F.col("created_at").alias("_previous_created_at"),
    )
    previous = previous.withColumn("_pick", F.row_number().over(
        W.partitionBy("indicator_name").orderBy("_previous_id")
    )).where("_pick = 1").drop("_pick")
    indicators_sdf = indicators_sdf.join(previous, "indicator_name", "left").withColumn(
        "indicator_id", F.coalesce("_previous_id", "indicator_id")
    ).withColumn("created_at", F.coalesce("_previous_created_at", "created_at")).drop(
        "_previous_id", "_previous_created_at"
    )

# Classify accessibility: core (self-explanatory), intermediate (1-2 sentences), scientific (domain expertise)
CORE_CODES = [
    "T2M", "T10M", "T10M_C", "TS", "TS_C",
    "PRECTOT", "PRECTOTCORR", "PRECSNO",
    "TO3",
    "IMERG_PRECIP_MM", "IMERG_PRECIP_RATE",
    "NDVI", "EVI",
    "SEAICE_CONC", "SEAICE_EXTENT",
    "GRACE_MASS_ANOM", "GRACE_CELL_GT",
    "COOLR_EVENTS_COUNT", "COOLR_REPORTS_COUNT",
]
INTERMEDIATE_CODES = [
    "T250", "T500", "T850", "T2MDEW", "T2MWET",
    "U2M", "V2M", "U10M", "V10M", "SPEED",
    "QV2M", "QV10M", "TQV",
    "SLP", "H500", "H850",
    "ISCCPCLDFRC", "MDSCLDFRCTTL",
    "EVAP", "HFLUX", "EFLUX", "FRSEAICE",
    "IMERG_LIQUID_PROB",
]

indicators_sdf = indicators_sdf.withColumn(
    "accessibility",
    F.when(F.col("short_code").isin(CORE_CODES), F.lit("core"))
     .when(F.col("short_code").isin(INTERMEDIATE_CODES), F.lit("intermediate"))
     .otherwise(F.lit("scientific"))
)

display(indicators_sdf.groupBy("accessibility", "domain", "theme").count().orderBy("accessibility", "domain", "theme"))

# COMMAND ----------

# DBTITLE 1,Write to refined.tb_dim_indicators
assert indicators_sdf.count() == indicators_sdf.select("indicator_name").distinct().count()
assert not indicators_sdf.groupBy("indicator_id").count().where("count > 1").limit(1).count()
assert all((r["source_table"], r["indicator_name"]) in physical_columns for r in rows)
indicators_sdf.createOrReplaceTempView("vw_dim_indicators")

spark.sql(f"""
CREATE OR REPLACE TABLE {TARGET_TABLE}
COMMENT 'Dimension table of analysis-ready indicators across physical trusted sources. Exactly one row per indicator_name; source_table is canonical and source_tables retains all physical aliases. Classifies each indicator by domain, theme, sub-theme, source, collection, data_type, vertical_level, unit, role, accessibility (core/intermediate/scientific), and stage (combined/individual/variance). Join fact tables on source_table + indicator_name to look up classification.'
AS SELECT * FROM vw_dim_indicators
""")

# Column comments
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN indicator_id COMMENT 'Unique identifier: source + short_code'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN indicator_name COMMENT 'Unique physical column name; one dimension row per indicator_name'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN short_code COMMENT 'Original MERRA-2 variable code or descriptive slug'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN indicator_label COMMENT 'Human-readable label'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN domain COMMENT 'Earth system domain: atmosphere, hydrosphere, cryosphere, biosphere, geosphere'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN theme COMMENT 'Thematic category: temperature, wind, humidity, pressure, cloud, flux, variance, aerosol, chemistry, precipitation, sea_ice, vegetation, mass_gravity, ozone, landslide'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN sub_theme COMMENT 'Sub-category within the theme'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN source COMMENT 'Data source/mission: merra2, gpm_imerg, grace, modis, nsidc, coolr'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN collection COMMENT 'MERRA-2 collection: slv, flx, csp, or n/a for non-MERRA-2'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN data_type COMMENT 'Nature of data: reanalysis, observation, satellite_product'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN vertical_level COMMENT 'Atmospheric vertical level: surface, 2m, 10m, 50m, 850hpa, 500hpa, 250hpa, 1000hpa, tropopause, column_total, boundary_layer, sea_level'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN unit COMMENT 'Physical unit of the indicator'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN source_table COMMENT 'Canonical trusted table; source_tables retains all physical aliases'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN role COMMENT 'Role: measurement, uncertainty, quality_control, raw'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN description COMMENT 'Brief description of the indicator'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN accessibility COMMENT 'Accessibility level for educational use: core (self-explanatory), intermediate (needs 1-2 sentences), scientific (requires domain expertise)'
""")
spark.sql(f"""
ALTER TABLE {TARGET_TABLE}
ALTER COLUMN stage COMMENT 'Table stage: combined (main wide table), individual (single-variable upstream table), variance_combined (tb_merra2_variancias), variance_individual (per-variable variance table)'
""")

print(f"Created {TARGET_TABLE}")
spark.sql(f"SELECT COUNT(*) AS n_rows FROM {TARGET_TABLE}").display()

# COMMAND ----------

# DBTITLE 1,Validate indicators against source tables
# Validation: every indicator_name must exist as a column in its source_table
from pyspark.sql import functions as F

source_tables = indicators_sdf.select("source_table").distinct().collect()
all_cols = set()
for row in source_tables:
    tbl = row.source_table
    cols = spark.sql(f"""
        SELECT column_name
        FROM `earth-trend-data`.information_schema.columns
        WHERE table_schema = 'trusted' AND table_name = '{tbl}'
    """).collect()
    for c in cols:
        all_cols.add((tbl, c.column_name))

defined = set((r["source_table"], r["indicator_name"]) for r in rows)
missing = defined - all_cols
if missing:
    print(f"WARNING: {len(missing)} indicators not found in their source table columns:")
    for tbl, col in sorted(missing):
        print(f"  {tbl}.{col}")
else:
    print(f"All {len(defined)} indicator columns verified against information_schema.")

# Check for duplicate indicator_id
dupes = indicators_sdf.groupBy("indicator_id").count().where("count > 1").collect()
if dupes:
    print(f"WARNING: duplicate indicator_id values:")
    for d in dupes:
        print(f"  {d.indicator_id}: {d['count']}")
else:
    print("No duplicate indicator_id values.")

# Summary by role
print("\nBreakdown by role:")
indicators_sdf.groupBy("role").count().orderBy("role").show()

print("Breakdown by accessibility:")
indicators_sdf.groupBy("accessibility").count().orderBy(F.desc("count")).show()

print("Breakdown by stage:")
indicators_sdf.groupBy("stage").count().orderBy(F.desc("count")).show()

print("Tables covered:")
indicators_sdf.groupBy("source_table", "stage").count().orderBy("source_table").show(50, truncate=False)

print("Core indicators (easy to understand):")
indicators_sdf.where(F.col("accessibility") == "core").select("short_code", "indicator_label", "theme").orderBy("theme").show(truncate=False)