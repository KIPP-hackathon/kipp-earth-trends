# Contexto do Databricks

O catálogo de fontes do projeto é mantido em [fontes-transient-dados.csv](../docs/fontes-transient-dados.csv). Consulte esse arquivo para origem, dados, unidades, arquivos, períodos, amostras e observações de proveniência.

O bundle está em `databricks.yml` e os jobs em `resources/data-extraction.jobs.yml`. Os notebooks e seus contratos de publicação ficam em `data-extraction/<nome-da-tabela>/`.

Consulte [o contexto de extração](data-extraction/CONTEXT.md) e [o guia de deploy](../docs/databricks-bundle.md) para a operação dos jobs.
