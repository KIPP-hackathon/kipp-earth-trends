// Reviewed against live trusted schemas and producer descriptions, 2026-11-15.
export const newMerraIndicators: [string,string,string,string,string,string][] = [
  [
    "merra2_adg_bcdp001",
    "tb_merra2_aerossois",
    "black_carbon_dry_deposition_bin_001_kilograms_per_square_meter_per_second",
    "Black carbon dry deposition (bin 001)",
    "kg m-2 s-1",
    "M2TMNXADG"
  ],
  [
    "merra2_aer_bcexttau",
    "tb_merra2_aerossois",
    "black_carbon_extinction_aerosol_optical_depth_550nm",
    "Black carbon extinction optical depth at 550 nm",
    "1",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_bcsmass",
    "tb_merra2_aerossois",
    "black_carbon_surface_mass_concentration_kilograms_per_cubic_meter",
    "Black carbon surface mass concentration",
    "kg m-3",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_duexttau",
    "tb_merra2_aerossois",
    "dust_extinction_aerosol_optical_depth_550nm",
    "Dust extinction optical depth at 550 nm",
    "1",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_dusmass",
    "tb_merra2_aerossois",
    "dust_surface_mass_concentration_kilograms_per_cubic_meter",
    "Dust surface mass concentration",
    "kg m-3",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_ocexttau",
    "tb_merra2_aerossois",
    "organic_carbon_extinction_aerosol_optical_depth_550nm",
    "Organic carbon extinction optical depth at 550 nm",
    "1",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_ocscatau",
    "tb_merra2_aerossois",
    "organic_carbon_scattering_aerosol_optical_depth_550nm",
    "Organic carbon scattering optical depth at 550 nm",
    "1",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_ocsmass",
    "tb_merra2_aerossois",
    "organic_carbon_surface_mass_concentration_kilograms_per_cubic_meter",
    "Organic carbon surface mass concentration",
    "kg m-3",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_so4smass",
    "tb_merra2_aerossois",
    "sulfate_surface_mass_concentration_kilograms_per_cubic_meter",
    "Sulfate surface mass concentration",
    "kg m-3",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_ssexttau",
    "tb_merra2_aerossois",
    "sea_salt_extinction_aerosol_optical_depth_550nm",
    "Sea salt extinction optical depth at 550 nm",
    "1",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_sssmass",
    "tb_merra2_aerossois",
    "sea_salt_surface_mass_concentration_kilograms_per_cubic_meter",
    "Sea salt surface mass concentration",
    "kg m-3",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_suexttau",
    "tb_merra2_aerossois",
    "sulfate_extinction_aerosol_optical_depth_550nm",
    "Sulfate extinction optical depth at 550 nm",
    "1",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_totexttau",
    "tb_merra2_aerossois",
    "total_aerosol_extinction_optical_depth_550nm",
    "Total aerosol extinction optical depth at 550 nm",
    "1",
    "M2TMNXAER"
  ],
  [
    "merra2_aer_totscatau",
    "tb_merra2_aerossois",
    "total_aerosol_scattering_optical_depth_550nm",
    "Total aerosol scattering optical depth at 550 nm",
    "1",
    "M2TMNXAER"
  ],
  [
    "merra2_chm_coem",
    "tb_merra2_quimica",
    "carbon_monoxide_emission_kilograms_per_square_meter_per_second",
    "Carbon monoxide emission flux",
    "kg m-2 s-1",
    "M2TMNXCHM"
  ],
  [
    "merra2_chm_to3",
    "tb_merra2_quimica",
    "total_column_ozone_chm_dobson_units",
    "Total column ozone (CHM)",
    "Dobson",
    "M2TMNXCHM"
  ]
];

export const sourceThemes: Record<string,string> = {
  "tb_merra2_temperatura": "temperature",
  "tb_merra2_vento": "wind",
  "tb_merra2_umidade": "humidity",
  "tb_merra2_pressao_altura": "pressure",
  "tb_merra2_nuvens": "cloud",
  "tb_merra2_fluxos": "flux",
  "tb_merra2_variancias": "variance",
  "tb_merra2_aerossois": "aerosol",
  "tb_merra2_quimica": "chemistry",
  "tb_gpm_imerg_precipitation_final_late": "precipitation",
  "tb_sea_ice_concentration_global": "sea_ice"
};
