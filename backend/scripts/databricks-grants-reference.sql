-- Referência para recriar acesso após uma migração.
-- O principal atual já consultou as quatro tabelas; não há concessão pendente aqui.
-- Principal dedicado: kipp-earth-api (somente consultas).
GRANT USE CATALOG ON CATALOG `earth-trend-data` TO `ddff4031-232c-4ab9-99a1-96a19adf91ec`;
GRANT USE SCHEMA ON SCHEMA `earth-trend-data`.refined TO `ddff4031-232c-4ab9-99a1-96a19adf91ec`;
GRANT SELECT ON TABLE `earth-trend-data`.refined.tb_merra2_t10m TO `ddff4031-232c-4ab9-99a1-96a19adf91ec`;
GRANT SELECT ON TABLE `earth-trend-data`.refined.tb_merra2_ts TO `ddff4031-232c-4ab9-99a1-96a19adf91ec`;
GRANT SELECT ON TABLE `earth-trend-data`.refined.tb_gpm_imerg_precipitation TO `ddff4031-232c-4ab9-99a1-96a19adf91ec`;
GRANT SELECT ON TABLE `earth-trend-data`.refined.tb_gpm_imerg_late_precipitation TO `ddff4031-232c-4ab9-99a1-96a19adf91ec`;
