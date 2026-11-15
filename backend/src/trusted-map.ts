// Reviewed physical contract from databricks/data-standardization/*/column_mapping.yaml.
// These names alone never establish availability or trusted lineage.
export const trustedColumns: Record<string, Record<string, string>> = {
  "tb_merra2_cldprs": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "CLDPRS": "cloud_top_pressure_pascals"
  },
  "tb_merra2_cldtmp": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "CLDTMP": "cloud_top_temperature_kelvin"
  },
  "tb_merra2_disph": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "DISPH": "zero_plane_displacement_height_meters"
  },
  "tb_merra2_h1000": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "H1000": "geopotential_height_at_1000_hpa_meters"
  },
  "tb_merra2_h250": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "H250": "geopotential_height_at_250_hpa_meters"
  },
  "tb_merra2_h500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "H500": "geopotential_height_at_500_hpa_meters"
  },
  "tb_merra2_h850": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "H850": "geopotential_height_at_850_hpa_meters"
  },
  "tb_merra2_omega500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "OMEGA500": "vertical_pressure_velocity_at_500_hpa_pascals_per_second"
  },
  "tb_merra2_pbltop": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "PBLTOP": "planetary_boundary_layer_top_pressure_pascals"
  },
  "tb_merra2_ps": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "PS": "surface_pressure_pascals"
  },
  "tb_merra2_q250": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Q250": "specific_humidity_at_250_hpa_kilograms_per_kilogram"
  },
  "tb_merra2_q500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Q500": "specific_humidity_at_500_hpa_kilograms_per_kilogram"
  },
  "tb_merra2_q850": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Q850": "specific_humidity_at_850_hpa_kilograms_per_kilogram"
  },
  "tb_merra2_qv10m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "QV10M": "specific_humidity_at_10_meters_kilograms_per_kilogram"
  },
  "tb_merra2_qv2m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "QV2M": "specific_humidity_at_2_meters_kilograms_per_kilogram"
  },
  "tb_merra2_slp": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "SLP": "sea_level_pressure_pascals"
  },
  "tb_merra2_t10m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "T10M_C": "air_temperature_at_10_meters_celsius"
  },
  "tb_merra2_t250": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "T250": "air_temperature_at_250_hpa_kelvin"
  },
  "tb_merra2_t2m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "T2M": "air_temperature_at_2_meters_kelvin"
  },
  "tb_merra2_t2mdew": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "T2MDEW": "dew_point_temperature_at_2_meters_kelvin"
  },
  "tb_merra2_t2mwet": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "T2MWET": "wet_bulb_temperature_at_2_meters_kelvin"
  },
  "tb_merra2_t500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "T500": "air_temperature_at_500_hpa_kelvin"
  },
  "tb_merra2_t850": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "T850": "air_temperature_at_850_hpa_kelvin"
  },
  "tb_merra2_to3": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TO3": "total_column_ozone_dobson_units"
  },
  "tb_merra2_tox": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TOX": "total_column_odd_oxygen_kilograms_per_square_meter"
  },
  "tb_merra2_tqi": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TQI": "total_column_ice_water_kilograms_per_square_meter"
  },
  "tb_merra2_tql": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TQL": "total_column_liquid_water_kilograms_per_square_meter"
  },
  "tb_merra2_tqv": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TQV": "total_column_water_vapor_kilograms_per_square_meter"
  },
  "tb_merra2_troppb": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TROPPB": "blended_tropopause_pressure_pascals"
  },
  "tb_merra2_troppt": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TROPPT": "thermal_tropopause_pressure_pascals"
  },
  "tb_merra2_troppv": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TROPPV": "potential_vorticity_tropopause_pressure_pascals"
  },
  "tb_merra2_tropq": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TROPQ": "tropopause_specific_humidity_kilograms_per_kilogram"
  },
  "tb_merra2_tropt": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TROPT": "tropopause_temperature_kelvin"
  },
  "tb_merra2_ts": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "TS_C": "surface_skin_temperature_celsius"
  },
  "tb_merra2_u10m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "U10M": "eastward_wind_at_10_meters_meters_per_second"
  },
  "tb_merra2_u250": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "U250": "eastward_wind_at_250_hpa_meters_per_second"
  },
  "tb_merra2_u2m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "U2M": "eastward_wind_at_2_meters_meters_per_second"
  },
  "tb_merra2_u500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "U500": "eastward_wind_at_500_hpa_meters_per_second"
  },
  "tb_merra2_u50m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "U50M": "eastward_wind_at_50_meters_meters_per_second"
  },
  "tb_merra2_u850": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "U850": "eastward_wind_at_850_hpa_meters_per_second"
  },
  "tb_merra2_v10m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "V10M": "northward_wind_at_10_meters_meters_per_second"
  },
  "tb_merra2_v250": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "V250": "northward_wind_at_250_hpa_meters_per_second"
  },
  "tb_merra2_v2m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "V2M": "northward_wind_at_2_meters_meters_per_second"
  },
  "tb_merra2_v500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "V500": "northward_wind_at_500_hpa_meters_per_second"
  },
  "tb_merra2_v50m": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "V50M": "northward_wind_at_50_meters_meters_per_second"
  },
  "tb_merra2_v850": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "V850": "northward_wind_at_850_hpa_meters_per_second"
  },
  "tb_merra2_var_cldprs": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_CLDPRS": "cloud_top_pressure_pascals_variance"
  },
  "tb_merra2_var_cldtmp": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_CLDTMP": "cloud_top_temperature_kelvin_variance"
  },
  "tb_merra2_var_disph": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_DISPH": "zero_plane_displacement_height_meters_variance"
  },
  "tb_merra2_var_h1000": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_H1000": "geopotential_height_at_1000_hpa_meters_variance"
  },
  "tb_merra2_var_h250": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_H250": "geopotential_height_at_250_hpa_meters_variance"
  },
  "tb_merra2_var_h500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_H500": "geopotential_height_at_500_hpa_meters_variance"
  },
  "tb_merra2_var_h850": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_H850": "geopotential_height_at_850_hpa_meters_variance"
  },
  "tb_merra2_var_omega500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_OMEGA500": "vertical_pressure_velocity_at_500_hpa_pascals_per_second_variance"
  },
  "tb_merra2_var_pbltop": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_PBLTOP": "planetary_boundary_layer_top_pressure_pascals_variance"
  },
  "tb_merra2_var_ps": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_PS": "surface_pressure_pascals_variance"
  },
  "tb_merra2_var_q250": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_Q250": "specific_humidity_at_250_hpa_kilograms_per_kilogram_variance"
  },
  "tb_merra2_var_q500": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_Q500": "specific_humidity_at_500_hpa_kilograms_per_kilogram_variance"
  },
  "tb_merra2_var_q850": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "Var_Q850": "specific_humidity_at_850_hpa_kilograms_per_kilogram_variance"
  },
  "tb_gpm_imerg_precipitation": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "precipitation_mm_month": "monthly_precipitation_millimeters",
    "valid_area_fraction": "valid_area_fraction",
    "precipitation_mm_h": "precipitation_rate_millimeters_per_hour"
  },
  "tb_gpm_imerg_late_precipitation": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "precipitation_mm_month": "monthly_precipitation_millimeters",
    "valid_area_fraction": "valid_area_fraction",
    "precipitation_mm_h": "precipitation_rate_millimeters_per_hour"
  },
  "tb_gpm_imerg_liquid_probability": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "liquid_precipitation_probability_pct": "liquid_precipitation_probability_percent",
    "valid_area_fraction": "valid_area_fraction"
  },
  "tb_grace_jpl_mass_anomaly": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "mass_anomaly_mm_we": "surface_mass_anomaly_millimeters_water_equivalent",
    "valid_area_fraction": "valid_area_fraction",
    "cell_mass_anomaly_gt": "cell_mass_anomaly_gigatonnes"
  },
  "tb_modis_mod13c2_vegetation": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "ndvi": "normalized_difference_vegetation_index",
    "pixel_reliability": "pixel_reliability_rank",
    "vi_quality": "vegetation_index_quality_bits",
    "evi": "enhanced_vegetation_index"
  },
  "tb_sea_ice_arctic": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "sea_ice_extent_flag": "sea_ice_extent_flag",
    "valid_sample": "valid_sample"
  },
  "tb_sea_ice_concentration_arctic": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "sea_ice_concentration_pct": "sea_ice_concentration_percent",
    "valid_area_fraction": "valid_area_fraction"
  },
  "tb_sea_ice_antarctic": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "sea_ice_extent_flag": "sea_ice_extent_flag",
    "valid_sample": "valid_sample"
  },
  "tb_sea_ice_concentration_antarctic": {
    "lat": "latitude",
    "lon": "longitude",
    "time": "time",
    "sea_ice_concentration_pct": "sea_ice_concentration_percent",
    "valid_area_fraction": "valid_area_fraction"
  }
};

export type TrustedSource = {
  schema: string;
  table: string;
  upstream: string;
};
// Add an entry only after verifying the actual sync lineage and PostgreSQL schema.
// Existing unsuffixed default tables are not trusted by this manifest.
export const trustedSources: Readonly<Record<string, TrustedSource>> = {
  tb_merra2_t10m: {
    schema: "default",
    table: "tb_merra2_t10m_trusted",
    upstream: "merra2_shared.trusted.tb_merra2_t10m",
  },
};
