# Extração de dados no Databricks

O [catálogo CSV](../../docs/fontes-transient-dados.csv) é a fonte da verdade para o inventário, a origem, as descrições dos dados, as unidades, os períodos e a proveniência. Atualize o CSV ao incorporar fontes ou revisar essas informações.

## Organização

Cada tabela possui uma pasta `<nome-da-tabela>/` com o notebook `raw2refined-tb-<produto-variavel>.py` e `description_schema.yaml`. O YAML fornece o contrato executado para publicar os comentários da tabela e das colunas e deve acompanhar as definições do CSV.

Os notebooks usam `# Databricks notebook source` e células separadas por `# COMMAND ----------`, com dependências, configuração, leitura e gravação com comentários. `TABLE` define o destino e `STORAGE_PATH` define a origem.

A leitura deve corresponder ao formato da fonte. Use filtros específicos para os arquivos de dados e leitura recursiva quando houver subpastas anuais. O módulo `table_metadata.py` valida a correspondência das colunas e aplica os comentários.

A gravação usa `df.write.format("delta").mode("overwrite").saveAsTable(TABLE)`. Cada execução substitui os dados da tabela pelos arquivos selecionados e reaplica as descrições do YAML.

## Operação

Execute `CREATE SCHEMA.py` uma única vez na preparação do ambiente. Cada job mantém uma única tarefa `extract`, com permissões para ler a origem, gravar a tabela e aplicar comentários.

Confira o plano antes de publicar o bundle. Após executar um job, valide schema, período, contagem, nulos e comentários no Databricks.

Consulte [o guia de deploy](../../docs/databricks-bundle.md) e [o guia de descrições](../../docs/descricao-tabelas-fontes.md).
