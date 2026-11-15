-- Reviewed consolidated trusted observation tables. No future-table grants.
GRANT SELECT ON TABLE `earth-trend-data`.`trusted`.`tb_merra2_fluxos` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
GRANT SELECT ON TABLE `earth-trend-data`.`trusted`.`tb_merra2_nuvens` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
GRANT SELECT ON TABLE `earth-trend-data`.`trusted`.`tb_merra2_pressao_altura` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
GRANT SELECT ON TABLE `earth-trend-data`.`trusted`.`tb_merra2_temperatura` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
GRANT SELECT ON TABLE `earth-trend-data`.`trusted`.`tb_merra2_umidade` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
GRANT SELECT ON TABLE `earth-trend-data`.`trusted`.`tb_merra2_variancias` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
GRANT SELECT ON TABLE `earth-trend-data`.`trusted`.`tb_merra2_vento` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;

-- Explicit reviewed reference sources; observations never fall back to refined.
GRANT SELECT ON TABLE `earth-trend-data`.`trusted`.`tb_indicator_coverage` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
GRANT SELECT ON TABLE `earth-trend-data`.`refined`.`tb_dim_indicators` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
GRANT SELECT ON TABLE `earth-trend-data`.`refined`.`tb_trend_merra2_ts` TO `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com`;
