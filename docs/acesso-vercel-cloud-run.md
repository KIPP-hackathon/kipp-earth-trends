# Vercel para Cloud Run autenticado

O navegador chama `/api/earth` na aplicação KIPP da Vercel. Uma função server-side
obtém o OIDC token da execução, troca-o no Google STS e gera um ID token com
audience igual à URL do Cloud Run. Não há chave privada Google nem token de
Databricks no navegador, no bundle Vite ou no Git.

O pool `kipp-vercel`, no projeto `nasa-earth-trends-lab` (583662795760), confia
somente no issuer `https://oidc.vercel.com/lucas-projects-62e8b289`, com audience
`https://vercel.com/lucas-projects-62e8b289` e subject exato:

```
owner:lucas-projects-62e8b289:project:kipp-earth-trends-lab:environment:production
```

Esse subject pode assumir a service account
`kipp-vercel-invoker@nasa-earth-trends-lab.iam.gserviceaccount.com` por
`roles/iam.workloadIdentityUser`. A service account recebe `roles/run.invoker`
apenas no serviço `kipp-earth-api`, em `us-east4`. Ela não recebe acesso ao
Databricks, ao Lakebase, ao Secret Manager ou a outros serviços Cloud Run.

O proxy só admite GET/HEAD em rotas de consulta conhecidas, com parâmetros
permitidos. Não aceita URL de destino, SQL ou Authorization do cliente. Tokens
curtos são mantidos apenas na memória server-side; logs não incluem credenciais.

## Publicação sem interrupção

1. Criar a federação e a identidade invoker com as permissões restritas.
2. Publicar o proxy Vercel e verificar catálogo, frames e séries por `/api/earth`.
3. Reativar o Invoker IAM check no Cloud Run e manter sem `allUsers`/`allAuthenticatedUsers`.
4. Confirmar 401/403 no acesso anônimo direto e 200 pelo proxy da aplicação.
5. Remover os papéis administrativos temporários usados para configurar a federação.

Os administradores do projeto continuam sujeitos às permissões administrativas
que já possuem. A restrição trata dos chamadores da aplicação; os visitantes
continuam podendo usar a API de leitura oferecida pelo site público. Um frontend
público não esconde seus dados dos próprios visitantes.

Referências: https://vercel.com/docs/oidc/gcp e
https://docs.cloud.google.com/iam/docs/workload-identity-federation.

## Validação em produção · 14/11/2026

Verificação IAM ativa; sem vínculos allUsers/allAuthenticatedUsers. As URLs
canônica, numérica e de revisão candidata retornaram 403 sem autenticação.
O proxy de produção retornou 200 para catálogo, frame binário KIPP e série
regional reais. O frontend abriu o campo global e a série no navegador.
O CI/CD voltou a publicar com a API privada (execução 43630916254), preservando
a política. A identidade de deploy não recebeu run.invoker. Os papéis temporários
workloadIdentityPoolAdmin e serviceAccountAdmin foram removidos do administrador.
