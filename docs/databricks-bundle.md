# Deploy manual dos jobs Databricks

O bundle em `databricks/databricks.yml` publica os notebooks e os jobs de ingestão no workspace `https://8259554586019913.3.gcp.databricks.com`, usando o target `kipp`.

Cada job executa o notebook de extração do produto em uma única tarefa `extract`. Execute `CREATE SCHEMA.py` manualmente uma única vez na preparação do ambiente. O compute escolhido é serverless, definido pela ausência de configuração de cluster nas tarefas de notebook. O workspace precisa disponibilizar serverless para jobs e acesso ao bucket GCS por esse compute.

Os jobs são executados sob a identidade de quem faz o deploy. Essa identidade precisa acessar o catálogo `earth-trend-data`, criar tabelas nos schemas existentes e ler as pastas de origem em `gs://nasa-earth-trends-lab-raw/`, incluindo `transient/` e `kipp/raw/nasa/MOD13C2/`. O catálogo e os schemas devem existir previamente.

## Preparação

Instale a CLI Databricks moderna, versão 0.270.0 ou superior. No Windows, a instalação pode ser feita pelo WinGet.

```powershell
winget install Databricks.DatabricksCLI
databricks version
databricks auth login --host https://8259554586019913.3.gcp.databricks.com --profile kipp-gcp
```

As credenciais são armazenadas pela CLI no perfil local. Use esse mesmo perfil nos deploys seguintes para atualizar os mesmos recursos. O caminho remoto inclui o usuário autenticado, o nome do bundle e o target.

## Validação e deploy

Execute a partir da raiz deste repositório.

```powershell
Set-Location databricks
databricks bundle validate --target kipp --profile kipp-gcp
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

O módulo `table_metadata.py` valida as colunas e publica os comentários da tabela e de todas as colunas após a gravação. Os notebooks usam `mode("overwrite")` para reprocessar os dados.

O leitor HDF4 normaliza `OPENSSL_FORCE_FIPS_MODE=0` antes de importar PyHDF nos workers, devido à compatibilidade da biblioteca nativa com o ambiente Databricks.

## Referências

- [Configuração de bundles](https://docs.databricks.com/gcp/en/dev-tools/bundles/settings)
- [Exemplos e jobs serverless](https://docs.databricks.com/gcp/en/dev-tools/bundles/examples)
- [Instalação da CLI](https://docs.databricks.com/gcp/en/dev-tools/cli/install)
