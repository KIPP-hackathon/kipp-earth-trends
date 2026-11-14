# Backend: CI/CD e identidade Google

Projeto `nasa-earth-trends-lab` (583662795760), região `us-east4`.
API: https://kipp-earth-api-583662795760.us-east4.run.app
Workflow: https://github.com/KIPP-hackathon/kipp-earth-trends/actions/workflows/backend.yml

## Publicação

O workflow testa autenticação e compila Node.js 24 em pull requests do backend.
Pushes na `main` que alterem `backend/` ou o workflow publicam a imagem marcada
com SHA, implantada por digest imutável. `workflow_dispatch` na `main` repete
a publicação. Não requer secrets GitHub ou chaves JSON.

Deploys são serializados. A nova revisão recebe a tag `candidate`, sem tráfego,
e passa por `/health`, `/ready` e `/v1/catalog`. O catálogo deve conter quatro
variáveis com meses reais, provando leitura das quatro tabelas. Após os checks
a revisão recebe 100% do tráfego e a URL estável é verificada. Falha anterior
à promoção preserva a produção; falha posterior deixa o job vermelho e pode
exigir rollback. O resumo do job registra revisão, imagem e URL.

## IAM

SA deploy: `kipp-earth-deployer@nasa-earth-trends-lab.iam.gserviceaccount.com`.

- `roles/run.developer` somente no serviço `kipp-earth-api`.
- `roles/artifactregistry.writer` somente no repositório `cloud-run-source-deploy` de `us-east4`.
- `roles/iam.serviceAccountUser` somente na SA runtime `kipp-earth-api`.
- `roles/iam.workloadIdentityUser` na SA deploy para repository_id 1457842425 do pool `kipp-github`.

Provider: `projects/583662795760/locations/global/workloadIdentityPools/kipp-github/providers/github`.
Issuer: `https://token.actions.githubusercontent.com`. Mapeia `google.subject`,
`attribute.repository_id`, `attribute.repository_owner_id` dos respectivos claims.
Condição:

```text
assertion.repository_id == '1457842425' &&
assertion.repository_owner_id == '356640671' &&
assertion.ref == 'refs/heads/main' &&
assertion.workflow_ref == 'KIPP-hackathon/kipp-earth-trends/.github/workflows/backend.yml@refs/heads/main' &&
assertion.event_name in ['push', 'workflow_dispatch']
```

SA runtime: `kipp-earth-api@nasa-earth-trends-lab.iam.gserviceaccount.com`.
`DATABRICKS_AUTH_TYPE=google-id` usa token do metadata server, com audience
`https://8259554586019913.3.gcp.databricks.com`. O cache renova antes de expirar
e agrupa renovações concorrentes. Databricks verifica a assinatura; a API
confere audience e expiração antes de guardar o token.

No workspace, a SA é o usuário `219688950583889`, com entitlement
`databricks-sql-access`, CAN USE no warehouse `74a8d94611137690`, USE CATALOG
em `earth-trend-data`, USE SCHEMA em `earth-trend-data.refined` e SELECT em:

- `tb_merra2_t10m`
- `tb_merra2_ts`
- `tb_gpm_imerg_precipitation`
- `tb_gpm_imerg_late_precipitation`

Sem admin ou escrita. Principal OAuth M2M e segredo anteriores permanecem para
rollback; a nova revisão não monta o segredo. Referências:
[Google ID no Databricks](https://docs.databricks.com/gcp/en/dev-tools/auth/authentication-google-id),
[OIDC GitHub/GCP](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).

## Operação

`bash backend/scripts/deploy.sh` constrói localmente com Docker e usa o mesmo
deploy com checks. Seleciona `GCP_ACCOUNT` (padrão `admin@kipptrend.space`)
explicitamente, sem trocar a conta padrão do gcloud. O perfil isolado citado
no deploy inicial não tinha login ativo nesta máquina. Não usar conta/projeto
corporativo. O usuário autorizou `c0ffex` para esta entrega. Git local permanece
Lucas Henrique / lucas.henrique.tai@gmail.com.

Rollback para uma revisão saudável conhecida:

```sh
gcloud run revisions list --service=kipp-earth-api --region=us-east4 \
  --project=nasa-earth-trends-lab --account=admin@kipptrend.space
gcloud run services update-traffic kipp-earth-api --to-revisions=REVISION=100 \
  --region=us-east4 --project=nasa-earth-trends-lab --account=admin@kipptrend.space
bash backend/scripts/smoke.sh https://kipp-earth-api-583662795760.us-east4.run.app
```

Substitua `REVISION` pela revisão escolhida na listagem. Revisões antigas M2M
dependem da validade do segredo original. Limites preservados: mínimo zero,
máximo três instâncias, CPU 1, memória 512 MiB, concorrência 32 e timeout 60 s.
A API mantém acesso público com `--no-invoker-iam-check`. Tabelas e identidades
continuam privadas. Frontend e Lakebase não foram alterados.

## Verificação

Uma consulta real usando Google ID token retornou a identidade da SA e uma
amostra de temperatura. Testes cobrem renovação, concorrência, expiração,
audience incorreta, resposta inválida, erro de metadata e compatibilidade M2M.
Builds backend/frontend e 29 testes de frontend passaram. O workflow verifica
novamente o acesso real na revisão candidata antes de promover tráfego.
