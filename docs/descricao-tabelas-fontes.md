# Publicação das descrições de tabelas e colunas

O [catálogo CSV](fontes-transient-dados.csv) é a fonte da verdade para as fontes, descrições dos dados, unidades, períodos, amostras e observações de proveniência.

Cada tabela possui uma pasta em `databricks/data-extraction/`, com o notebook e `description_schema.yaml`. O YAML é o contrato usado na execução para publicar os comentários no Databricks. Ao revisar uma definição no CSV, sincronize o YAML correspondente.

## Contrato de publicação

O YAML contém `table.name`, `table.description` e `columns.<nome>.description`. Os campos de unidade, referência e revisão registram a proveniência da definição publicada.

O notebook carrega o YAML da própria pasta com `load_description`, valida as colunas com `validate_columns` e grava a tabela com `mode("overwrite")`. Em seguida, `apply_comments` publica a descrição da tabela e das colunas.

A identidade de execução precisa de permissões para criar ou atualizar a tabela e modificar seus comentários. Os comandos usados são `COMMENT ON TABLE` e `ALTER TABLE ... ALTER COLUMN ... COMMENT`. [Documentação Databricks](https://docs.databricks.com/gcp/en/sql/language-manual/sql-ref-syntax-ddl-comment)

Os YAMLs são publicados junto dos notebooks pelo bundle. A resolução dos caminhos usa o diretório atual do notebook e seu módulo compartilhado na pasta superior. [Diretório de trabalho no Databricks](https://docs.databricks.com/gcp/en/files/cwd-dbr-14)

## Revisão das definições

Use atributos dos arquivos originais, especificações da coleção e versão e metadados do processamento para revisar o catálogo CSV. Para campos derivados, confira o código produtor e seus arquivos de metadados. Registre pendências de validação nas observações do CSV e sincronize as limitações relevantes com o comentário publicado.

## Compatibilidade do leitor HDF4

A wheel Linux de PyHDF 0.11.7 inclui `libcrypto 1.1.1k`. No worker Databricks, `OPENSSL_FORCE_FIPS_MODE=0` pode provocar falha durante o import nativo. O leitor normaliza esse valor para variável ausente antes do import em cada worker e preserva o valor explícito `1`. [Referência técnica](https://github.com/voxel51/fiftyone-teams-app-deploy/blob/main/docs/orchestrators/configuring-databricks-orchestrator.md#openssl-error)
