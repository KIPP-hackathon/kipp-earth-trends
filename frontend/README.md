# KIPP - Earth Trend

Laboratório de exploração de campos mensais derivados de produtos NASA.
Frontend React/TypeScript/Vite, Node.js 24. As seis abas operacionais usam
os dados reais da API: Explore, Compare, Trend Lab, Events, Catalog e Guide.

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

Para revisar apenas a interface localmente, usando a API pública já publicada:

```sh
KIPP_PREVIEW_PRODUCTION_API=1 npm run dev -- --port 5180
```

Abra `http://localhost:5180`. Essa opção afeta apenas o proxy do servidor de
desenvolvimento; as observações vêm da aplicação pública, sem credenciais locais
e sem publicar as alterações da interface. O modo padrão continua usando 8080.

## Visualização

Frames Float32 são texturas WebGL, com ausências transparentes e escala fixa
por variável. Explorar e Comparar preservam estados separados: filtros, períodos,
região, câmera, escalas, contexto histórico e comandos do assistente. Comparar
mantém câmera e escala da mesma variável sincronizadas apenas entre A/B. A aba
Análise usa a investigação de Explorar. Painéis ocultos pausam reprodução,
animações e consultas; as escolhas permanecem ao retornar.
Contorno regional identifica o bbox da série, sem representar área atingida
por evento. Arraste, use as setas ou os controles de zoom para navegar.

Cache de frames de 64 MiB e cinco minutos, até quatro downloads (a
pré-busca usa no máximo dois), deduplicação e prefetch. Ao selecionar dados, o
globo já pede em segundo plano um lote de `playback.lookAhead` (8) meses seguintes;
quando restam `playback.initialBuffer` (4) meses pedidos à frente, pede o próximo
lote (lote + limite cabem em 24 frames em cache, somando as camadas visíveis). Ao
tocar em Play, espera os primeiros `playback.initialBuffer` meses do lote; a
animação só avança quando o mês seguinte já está carregado.
Todas as camadas do mês são baixadas em paralelo, e as séries de estudo das
variáveis selecionadas vão em uma única requisição `/v1/comparisons`, com
retorno automático à rota por variável se a API ainda não a tiver. O quadro compatível permanece até o próximo estar pronto; a data sobre
o globo identifica o mês visível. Catálogo, eventos e séries têm cache em memória
de um minuto; configuração, cinco minutos. O cache JSON limita o conteúdo
serializado a 4 MiB/80 entradas, deduplica requisições e entrega cópias separadas
aos consumidores. Não guarda erros, credenciais ou conversas e não persiste em
localStorage ou service worker. Cancelar uma aba não cancela outra consumidora
da mesma consulta. Chaves de dados incluem produto, unidade, política e revisão
publicada pelo catálogo; a expiração limita a reutilização quando a revisão não
muda. Atualizar o catálogo invalida ambos os caches e refaz as consultas sem
apagar os filtros.
Entre recarregamentos, o reaproveitamento vem do cache HTTP do navegador, regido
pelo Cache-Control da API (sem armazenamento próprio). O `index.html` pré-carrega
catálogo e configuração para que as primeiras requisições comecem junto do
download do bundle. O Worker da Cloudflare mantém no edge as rotas públicas de
leitura (`cloudflare/edgeCache.mjs`) respeitando `s-maxage`; o cabeçalho
`X-Edge-Cache` indica `HIT` ou `MISS`. O Cache API só armazena em domínio
próprio, não em `workers.dev`.
Séries preservam lacunas; classes discretas não são interpoladas. CSV e JSON
incluem produto, unidade, método e proveniência.

O céu decorativo usa estrelas SVG com deslocamento em três camadas e variação
suave de brilho. Respeita `prefers-reduced-motion`; não representa observações
astronômicas nem interfere na camada científica.

A interface usa fundo espacial contínuo e painéis azuis escuros translúcidos.
Campos, calendário, chat e modais seguem a mesma paleta; gráficos têm uma
superfície mais opaca e cores de linha/texto próprias para leitura em fundo
escuro. As escalas científicas do globo não são modificadas pelo tema.

Módulos antigos de simulação e suas verificações foram preservados como material
histórico, mas não são usados pelo fluxo operacional do App.

## Trend Lab

Workspace em inglês para escolher região/bbox, um indicador contínuo e período
(todo o histórico por padrão). **Generate trend** ajusta regressão linear mensal
no navegador e mostra pontos, reta, IC da inclinação e significância condicional.
Dois controles percorrem a reta e calculam a mudança em 1–60 meses. A extensão
tracejada é projeção da tendência, não previsão; sazonalidade e autocorrelação
não são corrigidas. Filtros e controles permanecem ao alternar abas. O assistente
das outras abas não recebe esse contexto.
Ver [método, fontes, limites e validação](../docs/trend-lab.md).

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

The KIPP mascot is AI-generated artwork inspired by the robot in *Interstellar*
(2014), created with OpenAI ImageGen and Codex. Its forward/backward arm animation
was authored with Three.js (MIT), captured with Playwright (Apache-2.0) and encoded
with FFmpeg. It is not official film artwork; the screen graphics are decorative
and are not scientific results. Two animated appearances remain in the assistant:
its chat header and floating control, including while open. Header/footer keep
the original Earth icon and KIPP text. The favicon provides the robot GIF with a
PNG fallback; animation depends on the browser. Reduced motion selects still
images. See [assets, credits and validation](../docs/kipp-mascot.md).

## Multivariable layers and country flags

Variable selection uses draft checkboxes and Apply. Each applied variable keeps
its own regional/global charts, map visibility, opacity and scale. See
[behavior and validation](../docs/multivariable-layers.md). The live map composites
layers in one cached WebGL texture; camera movement remains one render pass.
Country-only choices use bundled Natural Earth metadata and local flag-icons7.6.0
SVGs ([MIT license](public/flags/LICENSE.txt)); no flag CDN or geocoder is called.
The team's translucent space theme is preserved.


## Catalog

Guia didático em inglês com12fichas, relações explicadas e dez percursos por
ecossistema. O inventário completo e a disponibilidade vêm do catálogo real.
Até6variáveis podem abrir uma investigação no Explore atual, com região e
interseção de meses válidos. Perfil educativo não cria camada ou indicador novo.
Carregamento sob demanda, sem novas dependências.
Ver [fontes, experiência e validação](../docs/variable-catalog.md).

Study context reúne três grupos recolhíveis no padrão de Variables — Countries, Places e Events — em Explore, Compare e Trend Lab. Places inclui dez ecossistemas e recortes personalizados; Events aplica presets históricos com área, período, variável e limites explícitos. No Trend Lab, prepara um rascunho antes de Generate. As fichas do Catalog exibem tags dos processos e variáveis revisadas, medições importantes ainda não vinculadas e atalho para abrir só a região, preservando dados/período quando já selecionados. Presets seguem retângulos, não máscaras de biomas.
