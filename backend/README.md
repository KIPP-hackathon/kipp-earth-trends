# KIPP Earth Data API

Backend de leitura para o globo e séries regionais. Node.js 24, TypeScript,
Fastify e Cloud Run em `us-east4`. A fonte ativa é **somente SQL Warehouse**.
Lakebase permanece preparado para migração futura, sem execução híbrida ou
fallback automático. Credenciais ficam exclusivamente no servidor.

## Dados e comportamento

O catálogo mantém 72 IDs revisados, apoiados em 68 tabelas
`earth-trend-data.trusted`. O inventário de metadados confirmou a presença de
todas as tabelas e colunas necessárias, incluindo coordenadas `latitude`/
`longitude`, QA/cobertura e `time` DATE. O runtime usa esse contrato trusted
explicitamente e não redireciona observações à refined.

`src/registry.ts` preserva IDs, unidades, conversões e critérios científicos;
`src/trusted-map.ts` contém os nomes físicos padronizados. Temperatura de ar a
10 m usa `air_temperature_at_10_meters_celsius`, sem subtrair Kelvin novamente.
A grade HTTP agrega para visualização sem criar resolução; séries usam bbox,
não máscaras poligonais exatas. Ausências permanecem ausentes.

Dicionário e tendências pré-calculadas usam suas duas referências revisadas e
fixas no mesmo SQL Warehouse: `earth-trend-data.refined.tb_dim_indicators` e
`earth-trend-data.refined.tb_trend_merra2_ts`. Essa escolha explícita não é um
fallback de observações nem usa Lakebase. As tendências armazenadas preservam
seu período de 33 meses e método; não são recalculadas para os 321 meses do
histórico trusted. O contrato de seleção exata continua exigindo correspondência
de variável, bbox e período.

`src/lakebase-data.ts`, `src/providers/postgres.ts`, os adaptadores de referência
Lakebase, a allowlist trusted e a configuração comentada em `.env.example`
permanecem preservados para o futuro. O servidor e o deploy atuais rejeitam
`lakebase-postgres` e `hybrid`. Ver [contrato ativo](../docs/backend-warehouse.md)
e [preparação futura Lakebase](../docs/lakebase-only.md).

## Endpoints

- `GET /health`: processo saudável, sem consulta ao banco.
- `GET /ready`: verifica conexão real com a fonte.
- `GET /v1`: contrato resumido.
- `GET /v1/catalog`: variáveis, unidades e meses efetivamente disponíveis.
- `GET /v1/availability/temperature`: cobertura temporal da variável.
- `GET /v1/frames/temperature/2024-01?factor=4&format=f32`.
- `GET /v1/frames/rainfall/2024-01?bbox=-60,-22,-54,-16&factor=1&format=json`.
- `GET /v1/series/temperature?start=2024-01&end=2024-12&bbox=-60,-22,-54,-16`.
- `GET /v1/comparisons?variables=temperature,rainfall&start=2024-01&end=2024-12&bbox=-60,-22,-54,-16`:
  séries de estudo de até seis variáveis em uma requisição. Cada variável reutiliza
  o cache de `/v1/comparison/:variable`; no máximo três varreduras correm ao mesmo
  tempo, deixando uma vaga do warehouse livre. A resposta é
  `{version, results:{id:…}, errors:{id:{code,message}}}`: uma variável com falha
  não esconde as demais e a resposta parcial nunca é armazenada em cache.

`bbox=oeste,sul,leste,norte`. Oeste maior que leste cruza o antimeridiano;
o leste retornado pode exceder 180° para preservar uma grade contínua.
`factor` aceita 1, 2, 4, 8, 16 e 32; padrão 4. Até 210 mil células por frame,
65 mil em JSON; séries limitadas a 120 meses. Valores ausentes são NaN em
binário e null em JSON; cobertura ausente é zero, sem transformar valor em zero.
Não há rota para SQL arbitrário, URL externa ou tabela fornecida pelo cliente.

## Formato binário KIPP v1

1. Bytes 0–3: ASCII `KIPP`.
2. Bytes 4–7: tamanho do cabeçalho JSON em uint32 little-endian.
3. Cabeçalho JSON UTF-8: grade, limites, mês, variável, unidade, produto,
   orientação, cobertura e método.
4. Padding zero até múltiplo de 4.
5. `width × height` valores Float32 little-endian, linha a linha de norte a sul
   e oeste a leste.
6. `width × height` frações de cobertura Float32 no mesmo arranjo.

Exemplo para o frontend (arquivo binário é resposta pública, não credencial):

```ts
const response = await fetch(`${api}/v1/frames/temperature/2024-01?factor=4`);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const bytes = await response.arrayBuffer();
const view = new DataView(bytes);
if (view.getUint32(0, false) !== 0x4b495050) throw new Error("Formato inválido");
const headerBytes = view.getUint32(4, true);
const metadata = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 8, headerBytes)));
const offset = Math.ceil((8 + headerBytes) / 4) * 4;
const count = metadata.grid.width * metadata.grid.height;
// Navegadores atuais usam little-endian. Em outra arquitetura, decodifique com DataView.
const values = new Float32Array(bytes, offset, count);
const coverage = new Float32Array(bytes, offset + count * 4, count);
```

O frontend desenha os campos como textura GPU, sem um elemento SVG por ponto.
Somas e classes usam os métodos publicados nos metadados de cada variável.

## Performance e operação

- Cache LRU de 64 MiB / 256 respostas por instância, TTL de cinco minutos.
- Requisições idênticas simultâneas compartilham uma consulta.
- ETag, respostas 304 e Cache-Control para cache do navegador/intermediário.
  Catálogo, configuração, eventos e disponibilidade: `max-age=300, s-maxage=300,
  stale-while-revalidate=3600`. Frames, séries, comparações e investigações
  (observações por mês/região/revisão): `max-age=3600, s-maxage=21600,
  stale-while-revalidate=86400`. `X-Cache` e `X-Cache-Layer`
  (`memory`, `store` ou `origin`) indicam de onde veio a resposta.
- Segundo nível compartilhado no Firestore (opcional, desligado por padrão).
  Ativado com `PERSISTENT_CACHE=firestore`, usa a coleção `kipp_response_cache`
  do banco `(default)` já usado pela cota do assistente. Sobrevive a
  scale-to-zero e é compartilhado entre instâncias. Falha aberta: qualquer erro
  do Firestore vira miss. Entradas são isoladas por revisão do Cloud Run
  (`K_REVISION`), limitadas a ~800 KB (limite de 1 MiB por documento) e,
  por instância e por dia UTC, a 12.000 leituras e 1.000 escritas
  (`PERSISTENT_CACHE_DAILY_READS` / `PERSISTENT_CACHE_DAILY_WRITES`), com
  pausa de 60 s após três falhas seguidas. Entradas ficam frescas por 1 h
  (catálogo) ou 24 h (observações) e são servidas obsoletas, com atualização em
  segundo plano, por até 24 h ou 3 dias. Os orçamentos protegem a cota gratuita
  do Firestore, compartilhada com os contadores do assistente, que falham
  fechados.
  Antes de ativar, habilite a política de TTL para que documentos expirados
  sejam removidos (exige permissão de administrador do banco):

  ```bash
  gcloud firestore fields ttls update expiresAt \
    --collection-group=kipp_response_cache --enable-ttl \
    --project=kipp-space-apps-2026
  ```

  Depois, publique com a variável: `gcloud run services update kipp-earth-api
  --update-env-vars PERSISTENT_CACHE=firestore`. Para desligar, remova a
  variável; as respostas voltam a vir apenas da memória e do Warehouse.
- Compressão gzip/deflate, inclusive para frames binários.
- Até quatro consultas SQL Warehouse simultâneas por instância; excesso retorna 503
  com Retry-After. Conexões e consultas possuem timeout e orçamento limitado.
- Em produção, Google ID token da SA anexada ao Cloud Run, obtido do metadata
  server com audience do workspace e renovado antes de expirar.
  OAuth M2M continua disponível para desenvolvimento e revisões antigas.
  Logs não incluem credenciais ou erros SQL detalhados.
- Cloud Run: mínimo zero, máximo três instâncias, 1 CPU / 512 MiB, concorrência 32.
  Cada instância tem cache próprio em memória (compartilhado só com o nível Firestore, se ativado); o Warehouse tem seu próprio ciclo de inicialização.

## Desenvolvimento e publicação

```sh
npm ci
# Configure .env a partir de .env.example, sem versionar valores secretos.
npm run dev
npm test
npm run build
bash scripts/deploy.sh
```

O workflow `.github/workflows/backend.yml` testa e compila o backend em PRs.
Pushes na `main` que alterem `backend/` ou o próprio workflow publicam via OIDC,
usando uma SA dedicada ao deploy. Também existe execução manual na `main`.
A imagem usa SHA do commit e é implantada pelo digest imutável. A revisão
`candidate` passa pela startup probe HTTP `/ready` antes de receber tráfego.
Após a promoção, o catálogo real é conferido pelo proxy Vercel; falha restaura
a revisão anterior. O CI não recebe permissão para invocar a API diretamente.

O filtro `backend/**` inclui este README: uma alteração nele também permite
verificar o trigger completo após integrar a branch à `main`. Alterações somente
em `docs/` não publicam o backend. O resultado aparece em GitHub Actions,
workflow **Backend CI/CD**, nos jobs `check` e `deploy`.

O script manual constrói e envia a imagem linux/amd64 usando Docker local e
reutiliza o mesmo deploy com smoke checks. Seleciona explicitamente
`GCP_ACCOUNT=kipp.nasa@gmail.com` (ou `lucas.henrique.tai@gmail.com`), sem
trocar a conta padrão do gcloud. Projeto `kipp-space-apps-2026`.
O Dockerfile compila TypeScript; a imagem final executa Node 24 sem privilégios.
Detalhes de IAM, operação e rollback em `docs/backend-cicd.md`.

## Configuração Lakebase preservada para o futuro

Os exemplos comentados em `.env.example`, o provider PostgreSQL, o adaptador
`lakebase-data.ts`, o manifesto de sincronizações e o helper de descoberta
permanecem disponíveis para revisão futura. Alterar apenas `DATA_PROVIDER` não
ativa essa migração: servidor e deploy atuais aceitam exclusivamente
`databricks-sql`. Ver [contrato futuro](../docs/lakebase-only.md).

O deploy ativo usa Google ID token da SA do Cloud Run com audience do workspace
SQL Warehouse e remove envs PostgreSQL ativos da revisão candidata. Continua
sem segredo M2M montado, com Cloud Run privado e smoke pelo proxy Vercel.

## Publicação atual

URL: https://kipp-earth-api-696766216489.us-east4.run.app

O deploy administrativo usa o perfil isolado `~/.config/gcloud-kipp-nasa` e a
conta `kipp.nasa@gmail.com`. O CI usa sua identidade dedicada. A SA de execução
autentica no Databricks com Google ID token, sem montar segredo na nova revisão.

O serviço exige autenticação IAM. Somente a identidade de produção do aplicativo
Vercel pode assumir a SA invoker. O navegador chama `/api/earth` no próprio site;
a função Vercel autentica a chamada ao Cloud Run, sem credenciais no cliente.
Veja [o desenho de acesso](../docs/acesso-vercel-cloud-run.md). O deploy preserva
a política e recusa publicar se encontrar a verificação IAM desativada.
