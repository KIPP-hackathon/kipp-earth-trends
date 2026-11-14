# KIPP — Earth Systems Lab

Laboratório de exploração de campos mensais derivados de produtos NASA.
Frontend React/TypeScript/Vite, Node.js 24. As cinco abas operacionais usam
os dados reais da API: Explorar, Comparar, Eventos, Análise e Como funciona.

O catálogo publica variáveis, unidades, disponibilidade, QA e escalas de cores.
Regiões e presets históricos vêm de `/v1/config` e `/v1/events` no backend.
Eventos fora do histórico permanecem indisponíveis. Campos mensais mostram
contexto ambiental, sem detecção de fenômenos, inferência causal ou previsão.

O navegador chama `/api/earth` na Vercel. A função server-side autentica no
Cloud Run por OIDC/WIF; tokens e credenciais não chegam ao cliente. A API
pública da aplicação continua acessível aos visitantes; o Cloud Run recusa
chamadas diretas sem identidade autorizada.

## Executar

```sh
npm ci
npm run dev
npm run build
```

Execute também o backend local na porta 8080 com suas próprias credenciais.
O proxy Vite encaminha `/api/earth` para ele. Nunca coloque credenciais em
variáveis `VITE_*`. O build verifica frontend e função TypeScript da Vercel.

## Visualização

Frames Float32 são texturas WebGL, com ausências transparentes e escala fixa
por variável. Dois globos no máximo, câmera sincronizada e filtros independentes.
Contorno regional identifica o bbox da série, sem representar área atingida
por evento. Arraste, use as setas ou os controles de zoom para navegar.

Cache de frames de 32 MiB e cinco minutos, até dois downloads, deduplicação e
prefetch. O quadro compatível permanece até o próximo estar pronto; a data sobre
o globo identifica o mês visível. Atualizar o catálogo invalida o cache.
Séries preservam lacunas; classes discretas não são interpoladas. CSV e JSON
incluem produto, unidade, método e proveniência.

Módulos antigos de simulação e suas verificações foram preservados como material
histórico, mas não são usados pelo fluxo operacional do App.

## Publicação

[Produção](https://kipp-earth-trends-lab.vercel.app/) · projeto Vercel
`kipp-earth-trends-lab`, Root Directory `frontend`, Production Branch `main`.
A integração Git publica os pushes; `frontend/vercel.json` concentra configuração.

Veja [dados reais e Lakebase](../docs/dados-reais-playback-lakebase.md) e
[acesso ao Cloud Run](../docs/acesso-vercel-cloud-run.md).

## Créditos

A imagem de base é NASA Blue Marble, janeiro de 2004, e não muda com o mês.
A camada colorida representa o campo mensal indicado. Continentes Natural Earth
via world-atlas; fontes locais Manrope e Instrument Serif.
