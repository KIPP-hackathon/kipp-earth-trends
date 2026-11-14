# Catálogo de fontes de transient

O inventário é mantido em [fontes-transient-dados.csv](fontes-transient-dados.csv), a fonte da verdade para os dados disponíveis em `gs://nasa-earth-trends-lab-raw/transient/`.

O CSV registra pasta, origem, dados, unidades, quantidade de arquivos e metadados, meses distintos, período, cabeçalho amostrado, caminhos das amostras e observações de proveniência.

Ao atualizar o inventário, confira os objetos no GCS e registre a evidência nas colunas de amostra e observação. Períodos inferidos dos nomes dos arquivos e validação do conteúdo devem ser documentados conforme a inspeção realizada.

Para criar ou atualizar os comentários no Databricks, consulte [o guia de publicação das descrições](descricao-tabelas-fontes.md). Para publicar e executar os jobs, consulte [o guia de deploy](databricks-bundle.md).
