-- Run only after authorizing the dedicated OAuth service principal role.
-- No owner membership, write access or future-table default privileges.
BEGIN;
GRANT CONNECT ON DATABASE databricks_postgres TO "ddff4031-232c-4ab9-99a1-96a19adf91ec";
GRANT USAGE ON SCHEMA "default" TO "ddff4031-232c-4ab9-99a1-96a19adf91ec";
GRANT SELECT ON TABLE
  "default"."merra2_ts",
  "default"."tb_gpm_imerg_late_precipitation",
  "default"."tb_gpm_imerg_liquid_probability",
  "default"."tb_gpm_imerg_precipitation",
  "default"."tb_grace_jpl_mass_anomaly",
  "default"."tb_merra2_cldprs",
  "default"."tb_merra2_cldtmp",
  "default"."tb_merra2_disph",
  "default"."tb_merra2_h1000",
  "default"."tb_merra2_h250",
  "default"."tb_merra2_h500",
  "default"."tb_merra2_h850",
  "default"."tb_merra2_omega500",
  "default"."tb_merra2_pbltop",
  "default"."tb_merra2_ps",
  "default"."tb_merra2_q250",
  "default"."tb_merra2_q500",
  "default"."tb_merra2_q850",
  "default"."tb_merra2_qv10m",
  "default"."tb_merra2_qv2m",
  "default"."tb_merra2_slp",
  "default"."tb_merra2_speed",
  "default"."tb_merra2_t10m_trusted",
  "default"."tb_merra2_t250",
  "default"."tb_merra2_t2m",
  "default"."tb_merra2_t2mdew",
  "default"."tb_merra2_t2mwet",
  "default"."tb_merra2_t500",
  "default"."tb_merra2_troppv",
  "default"."tb_merra2_ts",
  "default"."tb_merra2_var_ps",
  "default"."tb_sea_ice_concentration_arctic"
TO "ddff4031-232c-4ab9-99a1-96a19adf91ec";
COMMIT;
