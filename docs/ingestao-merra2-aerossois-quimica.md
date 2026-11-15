# Ingestão MERRA-2 — aerossóis, química e deposição

Preparação local em 15/11/2026 para as 16 pastas sem correspondência localizada na auditoria. Não constitui deploy, execução nem confirmação de dados ingeridos.

Cada job usa o padrão existente: CSVs GCS → Delta `earth-trend-data.transient` → Delta `earth-trend-data.trusted`. O bundle inclui automaticamente `resources/merra2-aerosols-chemistry.jobs.yml`.

| Pasta GCS em `transient/` | Tabela nas duas camadas | Chave do job | Unidade preservada |
|---|---|---|---|
| `M2TMNXADG_BCDP001` | `tb_merra2_adg_bcdp001` | `merra2_adg_bcdp001` | kg m-2 s-1 |
| `M2TMNXAER_BCEXTTAU` | `tb_merra2_aer_bcexttau` | `merra2_aer_bcexttau` | 1 |
| `M2TMNXAER_BCSMASS` | `tb_merra2_aer_bcsmass` | `merra2_aer_bcsmass` | kg m-3 |
| `M2TMNXAER_DUEXTTAU` | `tb_merra2_aer_duexttau` | `merra2_aer_duexttau` | 1 |
| `M2TMNXAER_DUSMASS` | `tb_merra2_aer_dusmass` | `merra2_aer_dusmass` | kg m-3 |
| `M2TMNXAER_OCEXTTAU` | `tb_merra2_aer_ocexttau` | `merra2_aer_ocexttau` | 1 |
| `M2TMNXAER_OCSCATAU` | `tb_merra2_aer_ocscatau` | `merra2_aer_ocscatau` | 1 |
| `M2TMNXAER_OCSMASS` | `tb_merra2_aer_ocsmass` | `merra2_aer_ocsmass` | kg m-3 |
| `M2TMNXAER_SO4SMASS` | `tb_merra2_aer_so4smass` | `merra2_aer_so4smass` | kg m-3 |
| `M2TMNXAER_SSEXTTAU` | `tb_merra2_aer_ssexttau` | `merra2_aer_ssexttau` | 1 |
| `M2TMNXAER_SSSMASS` | `tb_merra2_aer_sssmass` | `merra2_aer_sssmass` | kg m-3 |
| `M2TMNXAER_SUEXTTAU` | `tb_merra2_aer_suexttau` | `merra2_aer_suexttau` | 1 |
| `M2TMNXAER_TOTEXTTAU` | `tb_merra2_aer_totexttau` | `merra2_aer_totexttau` | 1 |
| `M2TMNXAER_TOTSCATAU` | `tb_merra2_aer_totscatau` | `merra2_aer_totscatau` | 1 |
| `M2TMNXCHM_COEM` | `tb_merra2_chm_coem` | `merra2_chm_coem` | kg m-2 s-1 |
| `M2TMNXCHM_TO3` | `tb_merra2_chm_to3` | `merra2_chm_to3` | Dobsons |

## Comportamento

- Leitura recursiva de CSVs com prefixo exato da fonte, incluindo subpastas anuais. Sem filtro que exclua 2000; sem síntese ou interpolação de meses ausentes.
- Os 15 produtos AER/CHM tinham 321 meses (2000-01–2026-09) no snapshot auditado. BCDP001 tinha 42 meses: 9 de 2000 e 33 de 2024–2026; portanto não é uma série contínua desde 2000. A execução lerá o conteúdo disponível naquele momento.
- Esquema explícito `lat,lon,time,<variável>`; cabeçalhos divergentes ou CSVs malformados falham (`enforceSchema=false`, `FAILFAST`).
- Proveniência preservada em `source_file` e `source_file_modified_at`. A trusted mantém latitude/longitude/data, converte referência temporal para DATE UTC e prefere o arquivo mais recente ao deduplicar a chave.
- Escrita Delta em `overwrite`, como os jobs existentes: uma nova execução substitui a tabela correspondente pelo conjunto lido. `max_concurrent_runs=1`; etapa trusted depende do sucesso da ingestão.
- Não converte kg/m³ para µg/m³, não calcula PM2.5, não integra fluxos no mês e não combina TO3 de CHM com TO3 de SLV. Profundidade óptica é adimensional; estes valores são reanálise, não medições diretas.

## Proveniência e validação

Cabeçalhos conferidos por requisições parciais aos CSVs privados no GCS; registro local ignorado em `artifacts/auditoria-ingestao-databricks/source-headers.json`. Significados e unidades seguem [NASA GMAO — MERRA-2 File Specification, Office Note No. 9, v1.1](https://gmao.gsfc.nasa.gov/pubs/docs/Bosilovich785.pdf). O NetCDF original não foi inspecionado nesta implementação.

Validações de preparação: sintaxe Python, contratos dos YAMLs pelos helpers existentes, correspondência entre cabeçalhos reais/esquemas/mapeamentos e resolução dos caminhos/tarefas do bundle. O comando `databricks bundle validate --target kipp --profile kipp-gcp` foi aprovado no workspace KIPP em 15/11/2026, com os 16 novos jobs incluídos. Resultado local ignorado em `artifacts/auditoria-ingestao-databricks/bundle-validation-new-jobs.json`. As amostras do primeiro e último CSV de cada fonte tiveram cabeçalhos compatíveis e coordenadas/data/valor parseáveis. Nenhuma execução Spark ou verificação científica deve ser inferida dessas checagens.

Para publicar ou executar, usar o perfil do workspace KIPP e selecionar somente os jobs desejados; essa etapa é separada da criação local solicitada. Após execução, repetir a auditoria mensal em transient/trusted. As três tabelas antigas com histórico incompleto são uma pendência distinta destes 16 novos jobs.

## Publicação verificada — 15/11/2026

Deploy seletivo concluído no workspace KIPP, com exatamente 16 jobs criados.
As configurações dos 221 jobs preexistentes permaneceram iguais na conferência
antes/depois. Os 32 notebooks e 32 YAMLs de metadados/mapeamento publicados
foram recuperados e comparados ao conteúdo local. Não foi iniciada nenhuma
execução de ingestão; tabelas e cobertura deverão ser conferidas após a execução.

| Job | ID / link no workspace |
|---|---|
| `kipp-raw2trusted-merra2-adg-bcdp001` | [436107885331536](https://8259554586019913.3.gcp.databricks.com/jobs/436107885331536) |
| `kipp-raw2trusted-merra2-aer-bcexttau` | [180132647619139](https://8259554586019913.3.gcp.databricks.com/jobs/180132647619139) |
| `kipp-raw2trusted-merra2-aer-bcsmass` | [176347497706434](https://8259554586019913.3.gcp.databricks.com/jobs/176347497706434) |
| `kipp-raw2trusted-merra2-aer-duexttau` | [335106332488005](https://8259554586019913.3.gcp.databricks.com/jobs/335106332488005) |
| `kipp-raw2trusted-merra2-aer-dusmass` | [1002458295642415](https://8259554586019913.3.gcp.databricks.com/jobs/1002458295642415) |
| `kipp-raw2trusted-merra2-aer-ocexttau` | [448948491089514](https://8259554586019913.3.gcp.databricks.com/jobs/448948491089514) |
| `kipp-raw2trusted-merra2-aer-ocscatau` | [825800129306862](https://8259554586019913.3.gcp.databricks.com/jobs/825800129306862) |
| `kipp-raw2trusted-merra2-aer-ocsmass` | [994608268626834](https://8259554586019913.3.gcp.databricks.com/jobs/994608268626834) |
| `kipp-raw2trusted-merra2-aer-so4smass` | [975676563680609](https://8259554586019913.3.gcp.databricks.com/jobs/975676563680609) |
| `kipp-raw2trusted-merra2-aer-ssexttau` | [13120395200011](https://8259554586019913.3.gcp.databricks.com/jobs/13120395200011) |
| `kipp-raw2trusted-merra2-aer-sssmass` | [722209839599433](https://8259554586019913.3.gcp.databricks.com/jobs/722209839599433) |
| `kipp-raw2trusted-merra2-aer-suexttau` | [957598727746725](https://8259554586019913.3.gcp.databricks.com/jobs/957598727746725) |
| `kipp-raw2trusted-merra2-aer-totexttau` | [621108701620131](https://8259554586019913.3.gcp.databricks.com/jobs/621108701620131) |
| `kipp-raw2trusted-merra2-aer-totscatau` | [145567630391398](https://8259554586019913.3.gcp.databricks.com/jobs/145567630391398) |
| `kipp-raw2trusted-merra2-chm-coem` | [359102970771453](https://8259554586019913.3.gcp.databricks.com/jobs/359102970771453) |
| `kipp-raw2trusted-merra2-chm-to3` | [1079255944049312](https://8259554586019913.3.gcp.databricks.com/jobs/1079255944049312) |

Plano, log e verificação locais (ignorados): `artifacts/auditoria-ingestao-databricks/deploy-16-plan.json`, `deploy-16-deploy.log` e `deploy-16-verification.json`. A documentação de preparação acima descreve o estado anterior ao deploy; estes registros confirmam a publicação, sem afirmar ingestão ou integração no produto.
