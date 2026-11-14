# Concentração de gelo e probabilidade de fase líquida no Databricks

Três tabelas independentes foram adicionadas ao bundle a partir dos CSVs já
extraídos e enviados ao GCS. A sincronização dos jobs não executa as cargas.

| Pasta em `transient/` | Tabela em `earth-trend-data.refined` | Chave do job | CSVs / período |
| --- | --- | --- | --- |
| `GPM_3IMERGM_LIQUID_PROBABILITY_V07/` | `tb_gpm_imerg_liquid_probability` | `gpm_imerg_liquid_probability` | 21 / 2024-01 a 2025-09 |
| `SEA_ICE_CONCENTRATION_G02135_V4_N/` | `tb_sea_ice_concentration_arctic` | `sea_ice_concentration_arctic` | 34 / 2024-01 a 2026-10 |
| `SEA_ICE_CONCENTRATION_G02135_V4_S/` | `tb_sea_ice_concentration_antarctic` | `sea_ice_concentration_antarctic` | 34 / 2024-01 a 2026-10 |

Os notebooks leem os cinco campos em ordem, com schema explícito: `lat double`,
`lon double`, `time timestamp`, a variável científica `double` e
`valid_area_fraction double`. O timestamp é interpretado no formato
`yyyy-MM-dd HH:mm:ss`, em UTC. Leitura recursiva e filtros por produto aceitam a
estrutura plana do bucket e futuras subpastas anuais, excluindo os metadados JSON.
Cabeçalhos divergentes e valores malformados provocam erro; vazios permanecem
nulos e zeros são preservados.

A probabilidade `liquid_precipitation_probability_pct` descreve a fase líquida,
não a chance de chover. A concentração `sea_ice_concentration_pct` é um percentual,
diferente das tabelas existentes `tb_sea_ice_arctic` e `tb_sea_ice_antarctic`, que
armazenam classes de extensão. Todas usam a grade mensal 0,5° × 0,625°.
As descrições YAML registram as unidades, a cobertura, o remapeamento aproximado
da concentração e as limitações das fontes, conforme
[o contrato do exportador](phase-concentration-extraction.md).

Os notebooks seguem a política atual do bundle: `mode("overwrite")` cria ou
recarrega a tabela Delta e reaplica seus comentários. O deploy e a execução da
carga são etapas distintas; os comandos estão no
[guia do bundle](databricks-bundle.md).
