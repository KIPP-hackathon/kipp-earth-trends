# Backend CI/CD Implementation Plan

> Execute nesta sessão com superpowers:executing-plans, uma tarefa por vez.

**Goal:** Publicar automaticamente o backend no Cloud Run com SA e acesso Databricks sem segredo permanente.
**Architecture:** GitHub OIDC assume SA de deploy; runtime separado usa Google ID token do metadata server.
**Tech Stack:** Node.js 24, GitHub Actions, Workload Identity Federation, Cloud Run, Databricks SQL.

## Tasks

- [x] Criar branch `feat/backend-cicd-service-account`, conferir GitHub `c0ffex` autorizado pelo usuário e configurar autor Git local conforme AGENTS.md.
- [x] Escrever `backend/src/providers/oauth.test.ts`: em modo google-id não exigir client secret, obter token do metadata server com audience do workspace, compartilhar renovação concorrente e rejeitar resposta inválida; preservar OAuth M2M. Executar `node --test backend/src/providers/oauth.test.ts` e observar falha antes da implementação.
- [x] Alterar `backend/src/providers/oauth.ts`: modo explícito `DATABRICKS_AUTH_TYPE=google-id` usa metadata server fixo, timeout e validação de JWT/expiração/audience; cache e renovação compartilhados. Modo `oauth-m2m` preserva implementação atual. Repetir testes e build.
- [x] Cadastrar email da SA runtime no workspace Databricks, CAN USE no warehouse existente, USE CATALOG/SCHEMA e SELECT apenas nas quatro tabelas. Verificar token Google com impersonação temporária e consulta real, sem imprimir tokens.
- [x] Criar SA `kipp-earth-deployer`, pool `kipp-github`, provider `github`; restringir por repository_id 1457842425, repository_owner_id 356640671, refs/heads/main e eventos push/workflow_dispatch. Conceder workloadIdentityUser para o repositório, run.developer neste serviço, artifactregistry.writer neste repositório e iam.serviceAccountUser somente na SA runtime. Habilitar STS se necessário.
- [x] Criar `.github/workflows/backend.yml`: PR compila/testa backend sem OIDC; push main/manual compila imagem SHA, autentica google-github-actions/auth, faz push, deploy sem tráfego, verifica /ready e disponibilidade na URL da revisão, promove tráfego após sucesso e verifica URL estável. Serializar produção.
- [x] Criar `backend/scripts/deploy-image.sh` para deploy reproduzível da imagem com SA runtime, google-id, limites existentes e remoção da variável de segredo apenas na nova revisão. Atualizar script manual e documentação.
- [x] Validar scripts, YAML, testes e build API com Node 24; rodar testes/build frontend exigidos pelo AGENTS.md. Revisar diff por credenciais e permissões excessivas.
- [x] Commitar e enviar branch com c0ffex; integrar main, acompanhar GitHub Actions e conferir revisão pronta, consulta real e IAM. Registrar resultados em docs/backend-cicd.md, vinculado de docs/backend-cloud-run-access.md.

## Decisões

Usuário autorizou explicitamente c0ffex em resposta à revisão do desenho.
Manter identidade Git Lucas Henrique / lucas.henrique.tai@gmail.com no repositório.
Não usar conta ou projeto corporativo. Todas as chamadas gcloud selecionam
`--account=admin@kipptrend.space --project=nasa-earth-trends-lab` explicitamente.
Não remover segredo ou principal M2M antigos, permitindo rollback de revisões.

Autorização GitHub renovada com escopo workflow e PR #2 integrado à main. Primeiro deploy automático concluído com sucesso: https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43629093341. Revisão kipp-earth-api-00006-huh com 100% do tráfego, smoke checks de saúde e leitura das quatro tabelas aprovados. Permissões administrativas temporárias removidas.
