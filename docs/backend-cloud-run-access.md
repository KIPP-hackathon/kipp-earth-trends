# Acesso e publicação da API

> Migração concluída em 15/11/2026: o destino ativo é `kipp-space-apps-2026`
> (696766216489), com runtime, invoker e CI próprios. Ver
> [estado e operação atuais](gcp-migration.md). As seções abaixo preservam
> a configuração e evidências históricas do projeto anterior.


Atualização: o acesso público descrito no histórico abaixo foi substituído por
[IAM restrito ao proxy Vercel](acesso-vercel-cloud-run.md).
O CI/CD e o acesso por Google SA são descritos em
[backend-cicd.md](backend-cicd.md). O texto abaixo registra o deploy inicial
com OAuth M2M, mantido nas revisões antigas para rollback.

Projeto: `nasa-earth-trends-lab`, região `us-east4`.
URL: https://kipp-earth-api-583662795760.us-east4.run.app

Em 14/11/2026, o login `admin@kipptrend.space` foi concluído no perfil isolado
`~/.config/gcloud-kipp-nasa`. O projeto padrão desse perfil é o hackathon.
O perfil gcloud corporativo não foi alterado. Git/GitHub continuam com a
identidade pessoal KIPP definida no AGENTS.md.

A conta já tinha `roles/resourcemanager.projectIamAdmin`, mas não estava
listada com `roles/owner`. Para operar o deploy foram concedidos à conta
`roles/run.admin`, `roles/secretmanager.admin`, `roles/iam.serviceAccountUser`
e `roles/artifactregistry.writer`. Não é necessário promover a Owner.

A identidade de execução
`kipp-earth-api@nasa-earth-trends-lab.iam.gserviceaccount.com` recebeu
`roles/secretmanager.secretAccessor` apenas no segredo
`kipp-earth-api-databricks`. Seu conteúdo não foi versionado.

A política da organização rejeita o vínculo `allUsers`. O serviço foi
publicado com `--no-invoker-iam-check`, mecanismo recomendado pelo Google para
este cenário. Isso permite consultas HTTP públicas à API; as credenciais do
Databricks continuam privadas e as tabelas consultáveis estão fixadas no código.
Referência: https://docs.cloud.google.com/run/docs/authenticating/public

O deploy usa uma imagem Docker local enviada ao Artifact Registry, evitando
a necessidade de conceder novas permissões ao Cloud Build. Para repetir:

```sh
bash backend/scripts/deploy.sh
```

A credencial OAuth de aplicação do Databricks criada para o hackathon tem
validade de 30 dias. Deve ser rotacionada no Databricks e no Secret Manager,
atualizando a versão referenciada no deploy. A renovação automática do access
token de curta duração não renova esse segredo de aplicação.
