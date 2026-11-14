# KIPP Earth Data API

Backend de leitura para o globo e séries regionais. Node.js 24, TypeScript,
Fastify e Cloud Run em `us-east4`. Lê tabelas pelo Databricks SQL Statement API;
o adaptador Lakebase/PostgreSQL mantém o contrato HTTP na migração.
Não usa `kipp/serving`, GCS ou credenciais no navegador.

## Dados e comportamento

Tabelas permitidas em `earth-trend-data.refined`:

| ID HTTP | Tabela | Campo | Unidade |
|---|---|---|---|
| temperature | tb_merra2_t10m | T10M_C | °C, ar a 10 m |
| surface_temperature | tb_merra2_ts | TS_C | °C, superfície |
| rainfall | tb_gpm_imerg_precipitation | precipitation_mm_month | mm/mês, Final |
| rainfall_late | tb_gpm_imerg_late_precipitation | precipitation_mm_month | mm/mês, Late |

Não expõe vento com unidade inconsistente ou vegetação sem tabela disponível.
Não mistura Final/Late. Não produz anomalias, tendências ou previsões.

As tabelas atuais têm 576 × 361 amostras espaciais por mês, totalizando 18,9
milhões de registros no inventário consultado. A grade HTTP agrupa amostras em
bins de visualização, com passos nominais de 0,625° × 0,5° multiplicados por `factor`. Os passos efetivos são ajustados à extensão e ao número inteiro de células para manter a grade uniforme; ambos constam nos metadados.
Os limites polares são agrupados nos bins de borda. Resoluções mais finas que a
fonte não são criadas. Médias usam cos(latitude) e cobertura válida como pesos.
Séries usam as amostras originais em um bbox, não polígonos exatos de bacias.

## Endpoints

- `GET /health`: processo saudável, sem consulta ao banco.
- `GET /ready`: verifica conexão real com a fonte.
- `GET /v1`: contrato resumido.
- `GET /v1/catalog`: variáveis, unidades e meses efetivamente disponíveis.
- `GET /v1/availability/temperature`: cobertura temporal da variável.
- `GET /v1/frames/temperature/2024-01?factor=4&format=f32`.
- `GET /v1/frames/rainfall/2024-01?bbox=-60,-22,-54,-16&factor=1&format=json`.
- `GET /v1/series/temperature?start=2024-01&end=2024-12&bbox=-60,-22,-54,-16`.

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

Futuros campos reais devem ser enviados a uma textura/camada GPU, não a um
elemento SVG para cada posição. A integração visual permanece uma etapa separada.

## Performance e operação

- Cache LRU de 64 MiB / 256 respostas por instância, TTL de cinco minutos.
- Requisições idênticas simultâneas compartilham uma consulta.
- ETag, respostas 304 e Cache-Control para cache do navegador/intermediário.
- Compressão gzip/deflate, inclusive para frames binários.
- Até quatro consultas SQL simultâneas por instância; excesso retorna 503 com
  Retry-After. Timeout e cancelamento de consultas pendentes no Databricks.
- Paginação do Statement API até completar o resultado, sem truncamento silencioso.
- Em produção, Google ID token da SA anexada ao Cloud Run, obtido do metadata
  server com audience do workspace e renovado antes de expirar.
  OAuth M2M continua disponível para desenvolvimento e revisões antigas.
  Logs não incluem credenciais ou erros SQL detalhados.
- Cloud Run: mínimo zero, máximo três instâncias, 1 CPU / 512 MiB, concorrência 32.
  Cada instância tem cache próprio. Cold start do warehouse é distinto do da API.

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
`GCP_ACCOUNT=admin@kipptrend.space` (ou `lucas.henrique.tai@gmail.com`), sem
trocar a conta padrão do gcloud. Projeto `nasa-earth-trends-lab`.
O Dockerfile compila TypeScript; a imagem final executa Node 24 sem privilégios.
Detalhes de IAM, operação e rollback em `docs/backend-cicd.md`.

## Migração para Lakebase/PostgreSQL

Configure `DATA_PROVIDER=lakebase-postgres`, `PGHOST`, `PGDATABASE`, `PGUSER` e
`DATA_SCHEMA`. Mantenha as tabelas/colunas do contrato ou ajuste os mapeamentos
configurados. PostgreSQL exige nomes de colunas com caixa compatível com a origem.
`TABLE_TEMPERATURE`, `TABLE_SURFACE_TEMPERATURE`, `TABLE_RAINFALL` e
`TABLE_RAINFALL_LATE` podem mudar os nomes de tabela sem mudar endpoints.

Para OAuth, mantenha DATABRICKS_HOST e DATABRICKS_CREDENTIALS e configure
LAKEBASE_ENDPOINT. A credencial Postgres é solicitada a cada nova conexão, com
pool limitado e rotação das conexões antes de expirar. Alternativamente use
PGPASSWORD via Secret Manager para um papel Postgres somente leitura.
O pool usa TLS com verificação de certificado; não desabilite a validação.

O adaptador está preparado para essa configuração. Uma instância Lakebase,
migração das tabelas e concessões de acesso ainda precisam existir antes de
trocar o modo. Não foi criado um banco paralelo ou uma cópia dos dados.

## Publicação atual

URL: https://kipp-earth-api-583662795760.us-east4.run.app

O deploy administrativo usa o perfil isolado `~/.config/gcloud-kipp-nasa` e a
conta `admin@kipptrend.space`. O CI usa sua identidade dedicada. A SA de execução
autentica no Databricks com Google ID token, sem montar segredo na nova revisão.

O serviço exige autenticação IAM. Somente a identidade de produção do aplicativo
Vercel pode assumir a SA invoker. O navegador chama `/api/earth` no próprio site;
a função Vercel autentica a chamada ao Cloud Run, sem credenciais no cliente.
Veja [o desenho de acesso](../docs/acesso-vercel-cloud-run.md). O deploy preserva
a política e recusa publicar se encontrar a verificação IAM desativada.
