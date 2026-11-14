# Deploy manual dos jobs Databricks

O bundle em `databricks/databricks.yml` publica os notebooks e cinco jobs no workspace `https://8259554586019913.3.gcp.databricks.com`, usando o target `kipp`.

Cada job executa `CREATE SCHEMA.py` e, em seguida, o notebook de extração do produto. O compute escolhido é serverless, definido pela ausência de configuração de cluster nas tarefas de notebook. O workspace precisa disponibilizar serverless para jobs e acesso ao bucket GCS por esse compute.

Os jobs são executados sob a identidade de quem faz o deploy. Essa identidade precisa acessar o catálogo `earth-trend-data`, criar tabelas nos schemas existentes e ler `gs://nasa-earth-trends-lab-raw/transient/`. O catálogo deve existir previamente.

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

| Chave do job | Produto |
| --- | --- |
| `merra2_surface_temperature` | Temperatura de superfície TS |
| `merra2_temperature_t10m` | Temperatura a 10 m T10M |
| `merra2_wind_speed` | Vento SPEED |
| `gpm_imerg_precipitation` | Precipitação IMERG Final |
| `gpm_imerg_late_precipitation` | Precipitação IMERG Late |

Por exemplo, para carregar a temperatura a 10 m, execute a partir de `databricks/`.

```powershell
databricks bundle run --target kipp --profile kipp-gcp merra2_temperature_t10m
```

Os notebooks fazem uma carga inicial e usam o modo padrão de `saveAsTable`. Uma execução com a tabela já existente falha. A estratégia de atualização dos dados precisa ser definida para recargas. O limite de uma execução simultânea se aplica a cada job.

O mapeamento de arquivos, tabelas e limitações dos dados está em [CONTEXT.md](../databricks/data-extraction/CONTEXT.md).

## Referências

- [Configuração de bundles](https://docs.databricks.com/gcp/en/dev-tools/bundles/settings)
- [Exemplos e jobs serverless](https://docs.databricks.com/gcp/en/dev-tools/bundles/examples)
- [Instalação da CLI](https://docs.databricks.com/gcp/en/dev-tools/cli/install)
