# Extração de dados no Databricks

## Objetivo

Carregar os conjuntos publicados em `gs://nasa-earth-trends-lab-raw/` como tabelas Delta no schema `earth-trend-data.refined`, seguindo o padrão de pastas por tabela, notebook e YAML de descrições.

O [acompanhamento das fontes](../../docs/acompanhamento-fontes.md) registra o inventário atualizado, períodos, arquivos, jobs e tabelas observadas. O mapeamento de cinco fontes abaixo preserva o levantamento inicial.

## Formato dos notebooks

- Arquivos Python exportáveis para o Databricks, iniciados por `# Databricks notebook source`.
- Células separadas por `# COMMAND ----------`, com instalação de PyYAML, configuração, leitura e gravação com comentários.
- `TABLE` define a tabela de destino e `STORAGE_PATH` define a pasta de origem.
- Leitura CSV com `spark.read`, `pathGlobFilter` e cabeçalho. Os novos conjuntos usam schema explícito e leitura recursiva para subpastas anuais. Os cinco notebooks iniciais preservam sua leitura original.
- MOD13C2 usa `binaryFile` e `mapInPandas` com PyHDF para ler HDF4 por blocos, calibrar NDVI/EVI e preservar os campos de qualidade da grade nativa.
- Gravação com `df.write.format("delta").saveAsTable(TABLE)`.
- Cada notebook preserva as colunas recebidas do CSV e seleciona apenas seu produto pelo nome do arquivo.
- Cada tabela possui uma pasta `<nome-da-tabela>/` com o notebook e `description_schema.yaml`. O módulo `table_metadata.py` valida as descrições e publica comentários da tabela e de todas as colunas.
- Cada execução realiza a carga inicial e aplica as descrições da tabela e das colunas definidas no YAML.
- Consulte [o guia de descrições](../../docs/descricao-tabelas-fontes.md) para proveniência e critérios de documentação.

## Mapeamento verificado em 14/11/2026

Inventário obtido por listagem do bucket e inspeção dos cabeçalhos dos CSVs e dos metadados GPM. Os caminhos abaixo são relativos a `gs://nasa-earth-trends-lab-raw/transient/`. As tabelas de destino usam o prefixo `` `earth-trend-data`.refined. ``. Os nomes das quatro novas tabelas seguem a convenção do notebook existente.

| Produto | Pasta | Filtro CSV | Tabela Delta | Arquivos | Período disponível |
| --- | --- | --- | --- | --- | --- |
| Temperatura de superfície MERRA-2, existente | `M2TMNXSLV/` | `M2TMNXSLV_TS_*.csv` | `tb_merra2_ts` | 33 | 2024-01 a 2026-09 |
| Temperatura a 10 m MERRA-2 | `M2TMNXSLV_T10M/` | `M2TMNXSLV_T10M_*.csv` | `tb_merra2_t10m` | 33 | 2024-01 a 2026-09 |
| Velocidade do vento MERRA-2 | `M2TMNXFLX_SPEED/` | `M2TMNXFLX_SPEED_*.csv` | `tb_merra2_speed` | 33 | 2024-01 a 2026-09 |
| Precipitação IMERG Final mensal | `GPM_3IMERGM/` | `GPM_3IMERGM_precipitation_*.csv` | `tb_gpm_imerg_precipitation` | 21 | 2024-01 a 2025-09 |
| Precipitação IMERG Late agregada por mês | `GPM_3IMERGDL/` | `GPM_3IMERGDL_Late_precipitation_*.csv` | `tb_gpm_imerg_late_precipitation` | 1 | 2025-10 |

O inventário representa a consulta nessa data. Novos CSVs compatíveis serão incluídos pela leitura da pasta na próxima execução. A pasta `M2TMNXFLX/` contém somente um marcador de diretório.

### Colunas observadas

| Tabela | Cabeçalho CSV |
| --- | --- |
| `tb_merra2_ts` | `lat, lon, time, TS_K, TS_C` |
| `tb_merra2_t10m` | `lat, lon, time, T10M_K, T10M_C` |
| `tb_merra2_speed` | `lat, lon, time, SPEED_K, SPEED_C` |
| `tb_gpm_imerg_precipitation` | `lat, lon, time, precipitation_mm_h, precipitation_mm_month, native_random_error_mean_mm_h, valid_area_fraction` |
| `tb_gpm_imerg_late_precipitation` | `lat, lon, time, precipitation_mm_month, precipitation_mm_h, native_daily_random_error_mean_mm_day, valid_day_count, valid_area_fraction, mean_halfhourly_sample_fraction, source_product, source_run, source_processing_versions` |

### Qualidade e proveniência

- O CSV de vento apresenta `SPEED_K` e `SPEED_C`. Na amostra de janeiro de 2024, os valores são `5.4070334` e `-267.74295`, compatíveis com a subtração de 273,15 aplicada pelo exportador de temperatura em `data/main.py`. A ingestão preserva esses campos para rastreabilidade. A correção dos nomes e das unidades depende da revisão do exportador e dos atributos da fonte original.
- Os metadados de `GPM_3IMERGM` identificam a execução Final, versão 07, com precipitação em mm/h e mm/mês e reamostragem por área para a grade de 0,5° × 0,625°.
- Os metadados de `GPM_3IMERGDL` identificam a execução Late, versão 07, com agregação de arquivos diários. A cobertura exige todos os dias do mês e amostragem completa. Valores vazios e os indicadores de cobertura devem ser preservados.
- As tabelas Final e Late têm proveniência, cobertura e medidas de erro próprias. Uma série conjunta exige avaliação das diferenças de processamento. As colunas de erro descrevem médias dos erros nativos, com limitações registradas nos arquivos `.metadata.json`.
- Os arquivos `.metadata.json` permanecem no bucket e são excluídos da leitura pelos filtros `*.csv`.
- Estes dados derivam de produtos NASA. Os números simulados do frontend devem continuar identificados como simulação.

## Execução

1. Executar `databricks/CREATE SCHEMA.py` em um workspace com acesso ao catálogo `earth-trend-data`.
2. Garantir permissões de leitura no GCS e de criação de tabelas no schema `refined`.
3. Importar e executar o notebook correspondente ao produto.
4. Conferir o schema inferido, os meses carregados, a cobertura e a contagem de registros no Databricks.

A gravação segue o comportamento padrão do notebook original e falha quando a tabela já existe. Para atualizar uma tabela existente, definir a estratégia de recarga ou ingestão incremental antes de executar novamente. Os notebooks fazem uma carga inicial de todos os arquivos correspondentes na pasta.

## Outros objetos encontrados no bucket

`kipp/catalog/` contém documentação e catálogo de fontes. `kipp/processed/` contém rasters `field.tif` de temperatura, vegetação e precipitação, além de versões de `summaries/summary.parquet`. `kipp/serving/` contém manifests e arquivos binários `frame.f32` e `coverage.f32`. Esses formatos requerem contratos de leitura próprios. Os notebooks equivalentes criados aqui cobrem os cinco conjuntos CSV de `transient/`.

## Validação local

O inventário e os cabeçalhos foram consultados no GCS. A estrutura dos novos notebooks foi validada localmente com uma implementação simulada da interface Spark. A execução real, a inferência completa dos tipos e a criação das tabelas precisam ser verificadas no Databricks.
