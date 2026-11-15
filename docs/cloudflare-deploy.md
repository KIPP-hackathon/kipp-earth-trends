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

Na integração Git: repositório `KIPP-hackathon/kipp-earth-trends`, branch `main`,
raiz `frontend`, Node.js 24, build `npm test && npm run build`, deploy
`npm run deploy:cloudflare`. Preview builds desabilitados. `vercel.json`
continua sendo a configuração independente da Vercel.

Publicação manual, com Wrangler autorizado na conta pessoal correta:

```sh
cd frontend
npm ci
npm test
npm run build
npm run check:cloudflare
npm run deploy:cloudflare
```

O domínio solicitado é `kipp-nasa.space`. Ativar Custom Domain somente após
conferir zona e DNS. A variável pública `WORKER_ORIGIN` deve conter exatamente
o endereço `https://<worker>.<conta>.workers.dev`, sem curingas. APIs de URLs de
preview não estão autorizadas. Salvos locais pertencem à origem e não migram
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
runtime local oficial. Conferidos: assets, rotas/métodos/parâmetros proibidos,
origem e site do assistente, assinatura RSA e cache de token com credencial
sintética temporária (sem dados reais). Publicação e DNS ainda em andamento.

Fontes: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/),
[Node HTTP em Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/),
[Secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[autenticação Cloud Run](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).
