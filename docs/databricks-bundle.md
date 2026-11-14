# Deploy manual dos jobs Databricks

O bundle em `databricks/databricks.yml` publica os notebooks e os jobs de ingestão no workspace `https://8259554586019913.3.gcp.databricks.com`, usando o target `kipp`.

Cada job executa o notebook de extração na tarefa `extract`, seguido da padronização na tarefa `standardize`, que depende do sucesso da primeira. Execute `CREATE SCHEMA.py` manualmente uma única vez na preparação do ambiente. O compute escolhido é serverless, definido pela ausência de configuração de cluster nas tarefas de notebook. O workspace precisa disponibilizar serverless para jobs e acesso ao bucket GCS por esse compute.

Os 69 jobs usam o prefixo `kipp-raw2trusted-`. A extração grava em `earth-trend-data.transient`; a padronização usa notebooks em `data-standardization/` e grava em `earth-trend-data.trusted`.

Os jobs são executados sob a identidade de quem faz o deploy. Essa identidade precisa acessar o catálogo `earth-trend-data`, criar tabelas nos schemas existentes e ler as pastas de origem em `gs://nasa-earth-trends-lab-raw/`, incluindo `transient/` e `kipp/raw/nasa/MOD13C2/`. O catálogo e os schemas devem existir previamente.

## Preparação

Instale a CLI Databricks moderna, versão 0.270.0 ou superior. No Windows, a instalação pode ser feita pelo WinGet.

```powershell
winget install Databricks.DatabricksCLI
databricks version
databricks auth login --host https://8259554586019913.3.gcp.databricks.com --profile kipp-gcp
```

As credenciais são armazenadas pela CLI no perfil local. O caminho remoto usa a variável `workspace_root`, cujo padrão aponta para o estado do deploy KIPP já existente. Membros do time com permissão nesse diretório sincronizam os mesmos recursos, preservando os IDs dos jobs. Use `--var workspace_root=...` somente quando for necessário selecionar outro estado de deploy.

## Validação e deploy

Execute a partir da raiz deste repositório.

```powershell
Set-Location databricks
databricks bundle validate --target kipp --profile kipp-gcp
databricks bundle plan --target kipp --profile kipp-gcp
databricks bundle deploy --target kipp --profile kipp-gcp
databricks bundle summary --target kipp --profile kipp-gcp
```

O deploy cria ou atualiza os jobs e publica os notebooks. A execução é manual, pela interface do workspace ou por `bundle run`.

## Execução dos produtos

O [catálogo CSV](fontes-transient-dados.csv) reúne as definições e o inventário das fontes. Consulte `databricks bundle summary --target kipp --profile kipp-gcp` para os jobs publicados e seus links.

Por exemplo, para carregar a temperatura a 10 m, execute a partir de `databricks/`.

```powershell
databricks bundle run --target kipp --profile kipp-gcp merra2_temperature_t10m
```

Os notebooks usam `mode("overwrite")` por padrão e substituem os dados da tabela a cada execução, reaplicando as descrições do YAML. A tabela é criada quando ainda não existe. O limite de uma execução simultânea se aplica a cada job.

O [catálogo CSV](fontes-transient-dados.csv) é a fonte da verdade para origem, dados, unidades, arquivos, períodos e proveniência.

## Estrutura dos notebooks

Cada tabela possui uma pasta em `databricks/data-extraction/<nome-da-tabela>/`, com seu notebook e `description_schema.yaml`. O YAML fornece as descrições publicadas no Databricks e deve acompanhar as definições do catálogo CSV.

Os notebooks de ingestão são nomeados `raw2transient-<produto-variavel>.py`. O nome da tabela e as colunas recebidas da fonte são definidos pelo contrato de ingestão.

O módulo `table_metadata.py` valida as colunas e publica os comentários da tabela e de todas as colunas após a gravação. Os notebooks usam `mode("overwrite")` para reprocessar os dados.

O leitor HDF4 normaliza `OPENSSL_FORCE_FIPS_MODE=0` antes de importar PyHDF nos workers, devido à compatibilidade da biblioteca nativa com o ambiente Databricks.

## Fluxos até trusted

Todos os jobs executam duas tarefas. `extract` lê os arquivos de origem e grava na transient. Após seu sucesso, `standardize` aplica o mapeamento YAML e grava na trusted.

Cada pasta em `data-standardization/<nome-da-tabela>/` contém `column_mapping.yaml` e o notebook `transient2trusted-*.py`. O módulo `column_standardization.py` valida os nomes e aplica os aliases e as descrições derivados do contrato de origem.

Todos os mapeamentos usam `write_enabled: true`. A escrita usa `overwrite` e `overwriteSchema`, seguida da publicação dos comentários. O destino de cada tabela é `earth-trend-data.trusted.<nome-da-tabela>`.

Execute `CREATE SCHEMA.py` na preparação do ambiente para disponibilizar o schema trusted. Para executar um fluxo completo, use a chave do job correspondente, a partir de `databricks/`.

```powershell
databricks bundle run --target kipp --profile kipp-gcp merra2_surface_temperature
databricks bundle run --target kipp --profile kipp-gcp gpm_imerg_precipitation
databricks bundle run --target kipp --profile kipp-gcp gpm_imerg_late_precipitation
```

## Referências

- [Configuração de bundles](https://docs.databricks.com/gcp/en/dev-tools/bundles/settings)
- [Exemplos e jobs serverless](https://docs.databricks.com/gcp/en/dev-tools/bundles/examples)
- [Instalação da CLI](https://docs.databricks.com/gcp/en/dev-tools/cli/install)

Nas tabelas trusted, `constraints` no YAML declara a PK composta `(latitude, longitude, time)` e `NOT NULL` nessas colunas. O notebook rejeita nulos e chaves duplicadas antes do overwrite e aplica as constraints após a escrita. `NOT NULL` é imposto pelo Delta; a PK no Unity Catalog é informacional, por isso a validação de unicidade é executada em cada carga. A reaplicação reconhece uma PK existente com as mesmas colunas.

## Fluxo completo para todas as fontes

Os 69 jobs executam `extract` → `standardize`, com nomes `kipp-raw2trusted-*` e IDs preservados. Não existem jobs exclusivos de raw → transient. A primeira tarefa continua usando os notebooks em `data-extraction/`; a segunda usa o YAML e o notebook de cada tabela em `data-standardization/`. Os recursos ficam em `resources/data-standardization.jobs.yml`.

Todos os mapeamentos definem latitude/longitude, `time: date`, PK composta e NOT NULL em latitude/longitude/time. A sessão usa UTC no cast. A validação das chaves ocorre após o cast e antes do overwrite; medidas ausentes continuam permitidas. Descrições são herdadas do contrato da fonte. O CSV continua sendo o catálogo das fontes.

A fonte SPEED conserva dois campos problemáticos com nomes explícitos: `source_wind_speed_value_pending_validation` e `invalid_temperature_conversion_of_wind_speed`. O segundo preserva uma conversão inválida do produtor para rastreabilidade e não representa temperatura. Consulte o status nos metadados da fonte.
