# CI/CD do backend e identidade de execução

Projeto GCP: `nasa-earth-trends-lab` (583662795760). Cloud Run existente:
`kipp-earth-api`, região `us-east4`. Repositório: `KIPP-hackathon/kipp-earth-trends`.

## Desenho proposto

GitHub Actions compila o backend Node.js 24 em pull requests e publica imagens
imutáveis pelo SHA do commit em pushes para `main` que alterem `backend/` ou a
pipeline. Execução manual permite repetir a publicação. Builds concorrentes
de produção são serializados. Após publicar, verificar saúde e uma consulta
real para demonstrar acesso à fonte. Uma falha mantém o job vermelho e registra
a revisão afetada; rollback usa uma revisão anterior do Cloud Run.

O GitHub autentica no GCP com OIDC e Workload Identity Federation, restrita aos
IDs numéricos deste repositório e organização, branch `main` e evento de push
ou execução manual. A SA dedicada ao deploy recebe escrita somente no
repositório de imagens, atualização somente neste serviço e permissão para
usar a SA de execução. Ela não recebe acesso aos dados Databricks ou segredos.

A SA existente `kipp-earth-api@nasa-earth-trends-lab.iam.gserviceaccount.com`
executa o backend. O acesso Databricks usa token Google de curta duração
obtido pelo metadata server do Cloud Run, com audience do workspace GCP.
Cadastrar essa SA como identidade no workspace, dar CAN USE no warehouse
`74a8d94611137690`, USE CATALOG/SCHEMA e SELECT somente nas quatro tabelas
expostas pela API. Não conceder admin, escrita ou acesso geral ao catálogo.
Validar a compatibilidade desse modo com a autenticação do workspace antes
de publicar a revisão. O código mantém OAuth M2M para uso local e rollback.

Limites de execução existentes: CPU 1, memória 512 MiB, mínimo zero, máximo
três instâncias, concorrência 32, timeout 60 s. Preservar o acesso público
atual à API e o contrato HTTP. Frontend e Lakebase fora desta mudança.

## Alternativas consideradas

1. GitHub Actions + OIDC + token Google para Databricks (recomendado): sem
   chave JSON ou segredo de aplicação no caminho de produção.
2. GitHub Actions + OIDC + OAuth M2M existente: menos alteração no runtime,
   mas exige rotação do segredo Databricks de 30 dias.
3. Cloud Build com trigger GitHub: centraliza a execução no GCP, mas exige
   conexão adicional do repositório e permissões próprias do Cloud Build.

## Verificação

Compilar a API e executar testes focados na seleção e renovação da autenticação.
Validar YAML/shell, conferir IAM e condição OIDC, construir o Dockerfile, publicar
e chamar saúde e consulta real. Executar as verificações de frontend exigidas
pelo AGENTS.md. Não imprimir tokens, credenciais ou respostas com segredos.

## Estado observado

O perfil isolado citado na documentação não contém login ativo nesta máquina.
A configuração gcloud disponível lista `admin@kipptrend.space`; todas as operações
de infraestrutura devem selecionar explicitamente essa conta e este projeto.
O usuário autorizou explicitamente `c0ffex` para esta entrega, substituindo a
regra de conta GitHub do AGENTS.md. A identidade Git local foi configurada como
Lucas Henrique / lucas.henrique.tai@gmail.com conforme o AGENTS.md.
