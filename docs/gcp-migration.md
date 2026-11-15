# Migração Cloud Run para o GCP da equipe

Migração concluída e verificada em 15/11/2026. Produção na revisão
`kipp-earth-api-00002-qay`, com 100% do tráfego no projeto novo. O CI concluiu
em 15/11/2026 às 00:58:33 (America/Sao_Paulo, UTC−03).

| Recurso | Destino |
| --- | --- |
| Projeto | `kipp-space-apps-2026` (696766216489) |
| Conta administrativa GCP | `kipp.nasa@gmail.com` |
| Região e serviço | `us-east4` / `kipp-earth-api` |
| URL canônica | `https://kipp-earth-api-adsg5m6pua-uk.a.run.app` |
| URL numérica | `https://kipp-earth-api-696766216489.us-east4.run.app` |
| Runtime | `kipp-earth-api@kipp-space-apps-2026.iam.gserviceaccount.com` |
| Deployer | `kipp-earth-deployer@kipp-space-apps-2026.iam.gserviceaccount.com` |
| Invoker | `kipp-vercel-invoker@kipp-space-apps-2026.iam.gserviceaccount.com` |
| Imagens | `us-east4-docker.pkg.dev/kipp-space-apps-2026/cloud-run-source-deploy/kipp-earth-api` |
| Firestore | `projects/kipp-space-apps-2026/databases/(default)`, `us-east4` |

## Controles preservados

- Cloud Run exige IAM, sem `allUsers` ou `allAuthenticatedUsers`.
- Vercel troca OIDC por tokens temporários; não há chave privada Google no
  frontend ou no repositório. URL, provider e e-mail da SA são identificadores
  públicos; a credencial permanece apenas na função servidora.
- Pool `kipp-vercel`, provider `production`: issuer
  `https://oidc.vercel.com/lucas-projects-62e8b289`, audience
  `https://vercel.com/lucas-projects-62e8b289`, subject exato
  `owner:lucas-projects-62e8b289:project:kipp-earth-trends-lab:environment:production`.
- Pool `kipp-github`, provider `github`: repositório 1457842425, organização
  356640671, `main`, workflow exato `.github/workflows/backend.yml`, eventos
  `push` ou `workflow_dispatch`. Deployer sem invocação da API ou mudança de IAM.
- Invoker tem somente `run.invoker` no serviço; deployer tem `run.developer`
  no serviço, escrita no único repositório de imagens e `serviceAccountUser`
  somente na identidade runtime.
- Runtime acessa Vertex AI no projeto novo e Firestore condicionado ao banco
  `(default)`. O modelo permanece `gemini-3.8-flash`, processamento `us`.
- Databricks continua no mesmo workspace e Warehouse, sem copiar observações:
  nova identidade Google, SQL entitlement, CAN USE, USE CATALOG/SCHEMA e SELECT
  explícito nas mesmas 70 tabelas. Não se alteram grupos/políticas compartilhados.
- Limites: 1 CPU, 512 MiB, concorrência 32, 0–3 instâncias por revisão, timeout
  de 60 s. Quota persistente do chat: 120 pedidos/dia e 12 por cliente/hora;
  os documentos guardam contadores e hash, sem prompts ou IPs brutos.
- Allowlist de rotas/parâmetros, validação de corpo, limite de tamanho,
  timeouts, limitação de ferramentas e proibição de SQL arbitrário preservados.
  Origin restringe o fluxo esperado; não autentica individualmente visitantes.

## Operação local

```sh
export CLOUDSDK_CONFIG="$HOME/.config/gcloud-kipp-nasa"
gcloud config configurations activate kipp-hackathon-2026
gcloud auth list
gcloud config list
bash backend/scripts/deploy.sh
```

Os scripts passam a selecionar a conta `kipp.nasa@gmail.com` e o projeto novo.
A operação manual aceita o Bash3 do macOS, além do Bash atual usado pelo CI.
O perfil corporativo padrão permanece separado. GitHub pessoal `Luckstai`
foi exigido explicitamente pelo usuário nesta conversa.

## Transição e reversão

Antes de trocar o proxy, bloquear novas reservas do chat antigo por transação
no contador diário, salvar seu valor real, copiar os contadores ativos somando
reservas já feitas nos testes do destino, e conferir os documentos copiados.
Transações concorrentes anteriores ao bloqueio conflitam, sem perder incrementos.
A operação é recusada a menos de 20 minutos da meia-noite UTC e deve terminar no
mesmo dia UTC. Após confirmar o proxy novo, remover `run.invoker` do invoker antigo
no serviço antigo: o recurso é preservado, mas a Vercel antiga deixa de chamá-lo.
Esse vínculo é restaurado explicitamente em uma reversão; o contador diário
bloqueado sozinho não constitui uma interrupção permanente do serviço antigo.
A limitação temporária afeta o chat; as leituras de dados continuam no serviço
antigo até a publicação do proxy novo. Backups dos contadores ficam privados,
fora do Git; valores e hashes não são registrados aqui.

Publicar primeiro somente a troca do proxy e documentos: alterações de backend
não podem acionar o workflow antigo enquanto o site ainda usa o projeto antigo.
Depois que a Vercel serve o destino novo, atualizar backend/workflow e aguardar
o CI completo. Um CI que exige a revisão nova não pode validar o proxy antigo.

O serviço antigo permanece em `nasa-earth-trends-lab`, revisão saudável
`kipp-earth-api-00039-yiy`, URL `https://kipp-earth-api-2md4zr4rcq-uk.a.run.app`.
Reverter a troca de `frontend/server/cloudRunAuth.ts` ou restaurar o deployment
Vercel anterior retorna o roteamento. Antes de reabrir o chat antigo, bloquear
primeiro as reservas no destino por transação, capturar seus totais reais e
reconciliar os contadores do dia e da hora vigentes no serviço antigo, subtraindo
apenas a parcela que já havia sido copiada. Reautorizar o invoker antigo antes
de restaurar o deployment Vercel anterior. Não excluir o projeto,
imagens ou identidades antigos nesta tarefa.

## Evidências e pendências

- Baseline Node 24: 46 testes frontend, seis testes backend e ambos os builds
  aprovados. Identificadores mudados; contratos e controles mantidos.
- Runtime novo fez chamada real ao Vertex e transação/rollback no Firestore;
  startup `/ready` com Databricks passou. Sem upgrade da avaliação gratuita.
- Revisão inicial: `kipp-earth-api-00001-pb8`.
- Imagem inicial: `sha256:2297dc22ffd50dd91914c96f5972d4e7593208eccb44b8cedd9285176bc173c9`.
- Smoke do serviço novo aprovado: catálogo com 72 variáveis, frame, série,
  tendência armazenada e comparação reais; chat real HTTP 200.
- Quota ativa copiada e verificada antes da troca do proxy; o uso dos testes
  no destino foi somado. Backup privado e helper de reversão (modo 600), fora do
  Git, em `$HOME/.config/gcloud-kipp-nasa/migrations/2026-11-15/`.
- [PR11: troca do proxy](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/11),
  merge `96eec4b`, e [Vercel aprovado](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/2WH9c23jeW7gJQcc9Ni9Kmmx8yRm).
  Site público retornou 72 variáveis reais e chat HTTP 200/no-store; método e origem
  indevidos recusados. Navegador carregou globo e dois gráficos com 321 meses.
- [PR12: backend e CI](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/12),
  merge `6cd2e5e`, e [CI aprovado](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43674601450).
  Revisão `kipp-earth-api-00002-qay` promovida a 100% após startup e smoke completo.
- Imagem publicada pelo CI: `sha256:f3c621c9bc81c5308b3a9dfe20d56c19c2b73a652621d785c5d74587790538f7`.
- Conferência final: IAM obrigatório; zero invokers públicos; zero chaves de
  usuário nas três SAs; zero concessões temporárias de impersonação; remoção
  do acesso Firestore temporário do operador antigo e do Editor automático na
  SA Compute padrão, que não é usada pela API. Os sete membros permanecem Editores.
- Invoker Vercel antigo removido do serviço antigo; recursos e revisão 00039-yiy
  preservados para reversão. Nenhuma credencial privada encontrada pelo scan do
  bundle público; a implementação de STS/IAM também não está no bundle cliente.

## Limitação herdada no Databricks

A consulta de permissões efetivas mostrou grants de `account users` herdados
no catálogo, incluindo `MODIFY`, além do `SELECT` explícito da SA. Essa política
já existia para a identidade antiga e foi preservada; portanto, o conjunto
**efetivo** de privilégios Databricks não deve ser descrito como somente leitura.
A API continua executando consultas fixas de leitura e recusando SQL arbitrário.
Não se alterou a política compartilhada, que pode sustentar cargas de outros
integrantes. Uma redução desses grants precisa considerar seus consumidores.
A [API de permissões efetivas](https://docs.databricks.com/api/uc-grants/v1/get-effective-permissions)
explica a inclusão das heranças; a evidência foi consultada no workspace real.

Para uma reversão, o operador administrativo antigo precisa receber novamente
`roles/datastore.user` condicionado ao banco antigo, temporariamente. Executar
primeiro o helper privado `quota_cutover.py rollback` bloqueia as reservas do
novo banco, reconcilia os contadores atuais e reabre o banco antigo. Depois,
restaurar `run.invoker` de `kipp-vercel-invoker@nasa-earth-trends-lab.iam.gserviceaccount.com`
no serviço antigo, reverter somente os três identificadores do proxy e conferir
os dados/chat. Remover a concessão temporária de Firestore após a recuperação.

OpenAI Codex assistiu o inventário, a configuração e esta documentação;
identificador exato do modelo não verificado. Revisão técnica independente do
desenho executada; revisão humana da equipe continua necessária. A migração não
constitui uma nova análise científica nem comprova submissão ao Space Apps.
