# Cloudflare e Vercel

Configuração adicional solicitada em 15/11/2026, assistida por OpenAI Codex.
A Vercel permanece ativa; nenhuma alteração no Warehouse ou na estatística.

## Componentes

- Worker `kipp-earth-trends`, conta Cloudflare
  `3e63b6e6a2abfe1cd84373737a65b54f`, raiz `frontend/`.
- Vite gera somente assets públicos em `dist/`; `cloudflare/worker.mjs` é
  compilado e publicado separadamente como código servidor.
- `server/earthProxy.ts` e `server/assistantProxy.ts` são os handlers comuns
  das funções Vercel e do Worker; allowlists, limites de corpo/resposta,
  timeouts, cache e validações são preservados.
- Vercel mantém OIDC/WIF. Cloudflare usa a identidade dedicada
  `kipp-cloudflare-invoker@kipp-space-apps-2026.iam.gserviceaccount.com`, somente
  `roles/run.invoker` no serviço `kipp-earth-api`, região `us-east4`.
- A chave dessa identidade fica exclusivamente no secret servidor
  `GOOGLE_SERVICE_ACCOUNT_JSON`. Nunca usar prefixo `VITE_`, build variable,
  `.env` versionado, asset público ou log para credenciais. O Worker troca
  a asserção assinada por ID token Google temporário, com audience fixa.
- A quota persistente do assistente continua no backend. O Worker sobrescreve
  `x-real-ip` com o IP entregue pela borda Cloudflare; hashes usam o mesmo
  algoritmo da Vercel. Origin e Sec-Fetch-Site são conferidos antes de invocar.
  Não há autenticação individual do visitante: ambos os sites são públicos.

## Publicação

GitHub Actions: workflow `.github/workflows/frontend-cloudflare.yml`, repositório
`KIPP-hackathon/kipp-earth-trends`, branch `main`, raiz `frontend`, Node.js 24.
Build `npm test && npm run build`, validação e deploy `npm run deploy:cloudflare`.
O secret de repositório `CLOUDFLARE_API_TOKEN` tem somente Workers Scripts Edit
e Account Settings Read na conta Cloudflare pessoal. Expira em 15/11/2027,
conforme pedido do usuário. Sua expiração impede novos deploys, não encerra a
versão já publicada. O token padrão amplo do assistente Cloudflare não foi criado.
`vercel.json` continua sendo a configuração independente da Vercel.

O workflow bloqueia produção após 15/11/2026 às 23h59 America/Sao_Paulo,
referência provisória do AGENTS.md. Confirmar evento/fuso da equipe. Trabalho
posterior deve usar Worker e URL separados; validade do token não autoriza
alterar os materiais vinculados durante a avaliação. Preservar também a Vercel.

Publicação manual, com Wrangler autorizado na conta pessoal correta:

```sh
cd frontend
npm ci
npm test
npm run build
npm run check:cloudflare
npm run deploy:cloudflare
```

Publicado: https://kipp-earth-trends.lucas-henrique-tai.workers.dev/ . A variável
pública `WORKER_ORIGIN` fixa essa origem exata, sem curingas. `placement.region`
usa `gcp:us-east4`: o proxy roda na rede Cloudflare próxima à região GCP; não
dentro do GCP. Resposta real conferida com `cf-placement: remote-IAD`.
Assets seguem distribuição global sem passar pelo proxy de API.

O domínio solicitado é `kipp-nasa.space`. A zona Free preserva o TXT Google
existente e aguarda nameservers na Spaceship: `christina.ns.cloudflare.com` e
`nick.ns.cloudflare.com`. Vincular Custom Domain e conferir TLS após ativação.
APIs de URLs de preview não estão autorizadas. Salvos locais pertencem à origem e não migram
automaticamente entre provedores; links compartilhados transportam a seleção.

## Rotação e reversão

Rotacionar a chave de invocação: criar outra chave da mesma identidade, passar
seu conteúdo via stdin a `wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON`,
conferir `/api/earth/v1/catalog` e só então revogar a chave antiga no GCP.
Não imprimir o conteúdo nem manter cópia em disco após a transferência.
O backend permanece privado e a Vercel funciona durante a rotação.

Para reverter, usar a versão anterior do Worker ou o endereço Vercel existente;
não liberar `allUsers` no Cloud Run. Se desativar Cloudflare definitivamente,
revogar suas chaves e o vínculo específico `run.invoker`.

## Verificação

Build frontend e 95 testes existentes aprovados; bundle Worker validado no
runtime local oficial e build backend aprovados. Conferidos: assets, rotas/métodos/parâmetros proibidos,
origem e site do assistente, assinatura RSA e cache de token com credencial
sintética temporária (sem dados reais). Produção retornou catálogo real
`databricks-sql`, frame temperatura em graus Celsius e comparação regional
HTTP 200. Ambas as hospedagens consultam o mesmo catálogo. Cloud Run direto
retorna 403; a política contém somente os invokers Vercel e Cloudflare. Origem
externa/cross-site do assistente retorna 403; corpo inválido de mesma origem
chega à validação backend e retorna 400, sem chamada de IA. Nenhuma chave ou
binding privado encontrado nos assets públicos; secret confirmado como
`secret_text`. DNS personalizado ainda pendente; workflow CI em verificação.

Workers não aceita `redirect: error`: os handlers compartilhados usam `manual`
com rejeição explícita de 3xx (exceto 304 no catálogo). Não seguem URLs de
redirecionamento com a identidade. Vercel mantém a mesma garantia.

Fontes: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/),
[Node HTTP em Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/),
[Secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[autenticação Cloud Run](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).
