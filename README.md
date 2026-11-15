# KIPP - Earth Trend

Repositório do time KIPP para explorar o desafio **Be An Earth System Trend Detective!**, do NASA Space Apps 2026.

**[Abrir o protótipo publicado](https://kipp-earth-trends-lab.vercel.app/)**

[Versão Cloudflare](https://kipp-earth-trends.lucas-henrique-tai.workers.dev/) ·
[operação e deploy nas duas hospedagens](docs/cloudflare-deploy.md).

## Estrutura

- [`frontend/`](frontend/): protótipo React, assets, testes e configuração de publicação na Vercel.
- [`backend/`](backend/): API TypeScript/Fastify, integração Databricks e deploy no Cloud Run.
- [`context/`](context/): referências e contexto do desafio.
- [`ml_experiments/`](ml_experiments/): experimentos, variáveis e fontes de dados.
- [`databricks/`](databricks/): notebooks, descrições de tabelas e bundle dos jobs de ingestão.
- [Catálogo de fontes em CSV](docs/fontes-transient-dados.csv): fonte da verdade para origem, dados, unidades, arquivos, períodos e proveniência.
- [`data/`](data/): extração dos dados NASA; veja o [pipeline mensal do IMERG](docs/imerg-extraction.md).
  Para o período posterior a setembro de 2025, veja o [pipeline IMERG Late diário → mensal](docs/imerg-late.md).
  Para GRACE/GRACE-FO, gelo marinho e altimetria, veja a [extração mensal de água e gelo](docs/water-ice-extraction.md).
  Para tabelas separadas de concentração de gelo e probabilidade de fase líquida, veja a [nova extração mensal](docs/phase-concentration-extraction.md).

## Rodar o frontend

Requer Node.js 24.

```sh
cd frontend
npm ci
npm run dev
```

Para validar a versão de produção:

```sh
cd frontend
npm test
npm run build
npm run preview
```

Consulte a [documentação do frontend](frontend/README.md) para conhecer a experiência, os métodos e as limitações dos dados simulados.

## Rodar o backend

Requer Node.js 24 e as variáveis de ambiente descritas em [`backend/.env.example`](backend/.env.example).

```sh
cd backend
npm ci
# Configure .env com as credenciais da fonte de dados.
npm run dev
```

Build: `npm --prefix backend run build`. Publicação no Cloud Run:
`bash backend/scripts/deploy.sh`. Consulte a [documentação da API](backend/README.md)
para endpoints, configuração e migração para Lakebase/PostgreSQL.

## Publicação

O projeto da Vercel deve estar conectado a `KIPP-hackathon/kipp-earth-trends`, com **Root Directory** `frontend` e **Production Branch** `main`.

Cada push na `main` que modificar o frontend publica uma nova versão após os testes e a build. Mudanças apenas em `context/`, `ml_experiments/` ou neste README não precisam reconstruir o site. A configuração versionada está em [`frontend/vercel.json`](frontend/vercel.json).
