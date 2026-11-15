# Inventário proposto para reduzir a ingestão

Revisado em 2026-11-14. Este documento mapeia as fontes selecionadas, as tabelas transient e os notebooks de extração existentes. Não altera notebooks, schemas, jobs nem dados.

O mapa considera a proposta de consolidar as fontes que formam uma única variável lógica **já na extração**. Se a decisão for manter uma transient por prefixo e unir apenas na camada trusted, os notebooks de extração podem permanecer separados.

## Mapa de fontes e extrações

| Tabela lógica proposta | Prefixo de origem | Tabela transient atual | Notebook de extração atual | Mudança prevista |
| --- | --- | --- | --- | --- |
| `tb_merra2_temperatura` | `transient/M2TMNXSLV_T2M/` | `tb_merra2_t2m` | [notebook](../databricks/data-extraction/tb_merra2_t2m/raw2transient-tb-merra2-t2m.py) · [contrato](../databricks/data-extraction/tb_merra2_t2m/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_merra2_t2m/column_mapping.yaml) | Combinar como coluna T2M com T10M por latitude, longitude e mês; são alturas diferentes, não substitutas. |
| `tb_merra2_temperatura` | `transient/M2TMNXSLV_T10M/` | `tb_merra2_t10m` | [notebook](../databricks/data-extraction/tb_merra2_t10m/raw2transient-tb-merra2-temperature-t10m.py) · [contrato](../databricks/data-extraction/tb_merra2_t10m/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_merra2_t10m/column_mapping.yaml) | Incluir T10M como coluna distinta de T2M na tabela de temperatura; alinhar unidades e chaves mensais. |
| `tb_merra2_umidade` | `transient/M2TMNXSLV_QV2M/` | `tb_merra2_qv2m` | [notebook](../databricks/data-extraction/tb_merra2_qv2m/raw2transient-tb-merra2-qv2m.py) · [contrato](../databricks/data-extraction/tb_merra2_qv2m/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_merra2_qv2m/column_mapping.yaml) | Uma fonte. QV2M é umidade específica a 2 m; ajustar nome e contrato se necessário. |
| `tb_merra2_pressao_altura` | `transient/M2TMNXSLV_SLP/` | `tb_merra2_slp` | [notebook](../databricks/data-extraction/tb_merra2_slp/raw2transient-tb-merra2-slp.py) · [contrato](../databricks/data-extraction/tb_merra2_slp/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_merra2_slp/column_mapping.yaml) | Uma fonte selecionada: SLP. Não inclui PS nem variáveis de altura; ajustar nome e contrato se necessário. |
| `tb_merra2_vento` | `transient/M2TMNXSLV_U10M/` | `tb_merra2_u10m` | [notebook](../databricks/data-extraction/tb_merra2_u10m/raw2transient-tb-merra2-u10m.py) · [contrato](../databricks/data-extraction/tb_merra2_u10m/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_merra2_u10m/column_mapping.yaml) | Consolidar com V10M pela chave espacial e temporal; manter U e V como componentes distintas. |
| `tb_merra2_vento` | `transient/M2TMNXSLV_V10M/` | `tb_merra2_v10m` | [notebook](../databricks/data-extraction/tb_merra2_v10m/raw2transient-tb-merra2-v10m.py) · [contrato](../databricks/data-extraction/tb_merra2_v10m/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_merra2_v10m/column_mapping.yaml) | Consolidar com U10M. Não descartar nenhum dos componentes do vetor. |
| `tb_sea_ice_concentration_global` | `transient/SEA_ICE_CONCENTRATION_G02135_V4_N/` | `tb_sea_ice_concentration_arctic` | [notebook](../databricks/data-extraction/tb_sea_ice_concentration_arctic/raw2transient-tb-sea-ice-concentration-arctic.py) · [contrato](../databricks/data-extraction/tb_sea_ice_concentration_arctic/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_sea_ice_concentration_arctic/column_mapping.yaml) | Consolidar com a fonte antártica, preservando a indicação do hemisfério/produto. |
| `tb_sea_ice_concentration_global` | `transient/SEA_ICE_CONCENTRATION_G02135_V4_S/` | `tb_sea_ice_concentration_antarctic` | [notebook](../databricks/data-extraction/tb_sea_ice_concentration_antarctic/raw2transient-tb-sea-ice-concentration-antarctic.py) · [contrato](../databricks/data-extraction/tb_sea_ice_concentration_antarctic/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_sea_ice_concentration_antarctic/column_mapping.yaml) | Consolidar com a fonte ártica. Os contratos atuais usam a mesma grade de destino; validar máscara e cobertura ao unir. |
| `tb_gpm_imerg_precipitation_final_late` | `transient/GPM_3IMERGM/` | `tb_gpm_imerg_precipitation` | [notebook](../databricks/data-extraction/tb_gpm_imerg_precipitation/raw2transient-tb-gpm-imerg-precipitation.py) · [contrato](../databricks/data-extraction/tb_gpm_imerg_precipitation/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_gpm_imerg_precipitation/column_mapping.yaml) | Unir à série Late somente após harmonizar schema e metadados de origem. |
| `tb_gpm_imerg_precipitation_final_late` | `transient/GPM_3IMERGDL/` | `tb_gpm_imerg_late_precipitation` | [notebook](../databricks/data-extraction/tb_gpm_imerg_late_precipitation/raw2transient-tb-gpm-imerg-late-precipitation.py) · [contrato](../databricks/data-extraction/tb_gpm_imerg_late_precipitation/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_gpm_imerg_late_precipitation/column_mapping.yaml) | Unir à série Final preservando produto, execução e indicadores de qualidade próprios. |
| `tb_grace_jpl_mass_anomaly` | `transient/GRACE_JPL_CRI_RL06.3Mv04/` | `tb_grace_jpl_mass_anomaly` | [notebook](../databricks/data-extraction/tb_grace_jpl_mass_anomaly/raw2transient-tb-grace-jpl-mass-anomaly.py) · [contrato](../databricks/data-extraction/tb_grace_jpl_mass_anomaly/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_grace_jpl_mass_anomaly/column_mapping.yaml) | Uma fonte; manter a extração existente. |
| `tb_modis_mod13c2_vegetation` | `kipp/raw/nasa/MOD13C2/version=061/` | `tb_modis_mod13c2_vegetation` | [notebook](../databricks/data-extraction/tb_modis_mod13c2_vegetation/raw2transient-tb-modis-mod13c2-vegetation.py) · [contrato](../databricks/data-extraction/tb_modis_mod13c2_vegetation/description_schema.yaml) · [mapeamento](../databricks/data-standardization/tb_modis_mod13c2_vegetation/column_mapping.yaml) | Uma fonte; manter a extração existente. |

## Mapa explícito de migração de tabelas

Os nomes abaixo são sufixos: cada tabela listada atualmente existe tanto em `earth-trend-data.transient` quanto em `earth-trend-data.trusted`. O destino proposto aplica-se às duas camadas. Mudanças nas duas camadas precisam ser coordenadas para manter o fluxo extract → standardize consistente.

O plano reduz 12 sufixos de tabelas atuais a 8 destinos lógicos: 10 sufixos serão consolidados ou renomeados em 6 destinos; GRACE e MOD13C2 permanecem sem migração de nome/schema neste recorte.

| Tabelas atuais (transient e trusted) | Destino lógico proposto (transient e trusted) | Tipo de migração |
| --- | --- | --- |
| `tb_merra2_t2m` + `tb_merra2_t10m` | `tb_merra2_temperatura` | Consolidar como tabela larga: alinhar por latitude, longitude e mês; manter T2M e T10M em colunas separadas e unidades explícitas. |
| `tb_merra2_qv2m` | `tb_merra2_umidade` | Renomear a tabela e atualizar os contratos; uma fonte selecionada. |
| `tb_merra2_slp` | `tb_merra2_pressao_altura` | Renomear a tabela e atualizar os contratos; manter SLP, sem incluir PS ou níveis de altura. |
| `tb_merra2_u10m` + `tb_merra2_v10m` | `tb_merra2_vento` | Consolidar em colunas U10M e V10M, alinhadas pela chave espacial e temporal. |
| `tb_sea_ice_concentration_arctic` + `tb_sea_ice_concentration_antarctic` | `tb_sea_ice_concentration_global` | Consolidar as grades preservando valores, máscara e procedência de cada hemisfério. |
| `tb_gpm_imerg_precipitation` + `tb_gpm_imerg_late_precipitation` | `tb_gpm_imerg_precipitation_final_late` | Unir os períodos e harmonizar o schema, mantendo produto e campos de qualidade específicos. |
| `tb_grace_jpl_mass_anomaly` | `tb_grace_jpl_mass_anomaly` | Sem mudança de nome nem consolidação; permanece como está. |
| `tb_modis_mod13c2_vegetation` | `tb_modis_mod13c2_vegetation` | Sem mudança de nome nem consolidação; permanece como está. |

## Códigos que precisarão de mudança

Se a consolidação acontecer na camada transient:

- **Unificação estrutural de fontes — 8 notebooks:** T2M e T10M; U10M e V10M; gelo marinho do Ártico e da Antártida; IMERG Final e Late. Cada grupo alimenta uma tabela lógica; a consolidação de temperatura é uma junção por coordenadas e mês, enquanto IMERG é uma série temporal com schemas harmonizados.
- **Renomeação/ajuste de contrato — 2 notebooks:** QV2M e SLP. Cada um tem apenas um prefixo selecionado; não precisa combinar fontes.
- **Sem mudança de extração prevista — 2 notebooks:** GRACE e MOD13C2, enquanto seus nomes e schemas atuais forem mantidos.

Além dos notebooks, a implementação precisará alinhar os `description_schema.yaml`, os mapeamentos em `data-standardization/` e os recursos de jobs do bundle com os novos nomes e schemas. Nenhum desses arquivos foi alterado nesta revisão.

Antes de consolidar os pares:

- **Vento:** alinhar U e V por latitude, longitude e período mensal, sem perder componente nem proveniência.
- **Temperatura:** T2M e T10M são variáveis distintas medidas a 2 m e 10 m. Unir como colunas na chave espacial e mensal; não empilhar uma como se fosse continuação da outra. O catálogo registra cobertura de 2000-01 a 2026-09 para ambas.
- **Gelo marinho:** as saídas atuais declaram a mesma grade de destino de 0,5° × 0,625°. Preservar a diferença entre hemisférios e confirmar que os nulos/máscaras de cada domínio não são interpretados como ausência de observação global.
- **IMERG:** o inventário vai de 2024-01 a 2025-09 para Final e de 2025-10 a 2026-10 para Late. Os intervalos inventariados não se sobrepõem, mas os schemas e os campos de erro/qualidade diferem. Não tratar os indicadores de incerteza dos dois produtos como equivalentes sem validação metodológica; manter produto e execução como proveniência.

## Inventário de cobertura

Períodos observados no [catálogo transient](fontes-transient-dados.csv), atualizado em 2026-11-14:

| Fonte | Período no catálogo |
| --- | --- |
| MERRA-2 T2M, QV2M e SLP | 2000-01 a 2026-09 |
| MERRA-2 U10M e V10M | 2024-01 a 2026-09 |
| Gelo marinho, Ártico e Antártida | 2024-01 a 2026-10 |
| IMERG Final | 2024-01 a 2025-09 |
| IMERG Late | 2025-10 a 2026-10 |
| GRACE JPL | 2024-01 a 2026-09 |
| MOD13C2 | Os objetos do inventário local revisado incluem janeiro a março de 2024; confirmar a cobertura completa no bucket antes de planejar tendências históricas. |

## Outras fontes de vegetação

- **Disponível no bucket/catalogado para ingestão:** MOD13C2 coleção 061. O contrato atual extrai NDVI, EVI e campos de qualidade dos HDF; o prefixo de origem está listado acima.
- **Derivado, não uma fonte independente:** o inventário do bucket também contém GeoTIFFs sob `kipp/processed/vegetation/`. Esses arquivos são produtos processados do fluxo de vegetação já existente, não outra coleção de observações.
- **Candidato ainda não encontrado no inventário do bucket:** MOD13A2 coleção 061 aparece no catálogo exploratório em [datasets.yaml](../ml_experiments/datasets.yaml), como NDVI de 1 km e composição de 16 dias. Não há prefixo/raw nem pipeline correspondente no inventário local atual. Pode ser avaliado como alternativa de maior resolução temporal/espacial, mas não está pronto para ingestão neste recorte.
- A busca nos inventários locais não encontrou outra coleção de índices de vegetação (por exemplo, NDVI/EVI/LAI/FPAR) além do MOD13C2. MOD13A2 é a única alternativa de vegetação identificada nos materiais do repositório, e permanece apenas como candidata.
