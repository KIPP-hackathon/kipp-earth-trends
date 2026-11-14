# KIPP — Earth Systems Lab

Protótipo exploratório, com a identidade provisória da equipe **KIPP**, de uma experiência didática para o desafio **Be An Earth System Trend Detective!**, do NASA Space Apps 2026.

## Dados reais

A entrada padrão **Dados reais** consome a API pública do Cloud Run:
`https://kipp-earth-api-583662795760.us-east4.run.app`.
Pode ser configurada com `VITE_EARTH_API_URL` antes do build. Essa URL é pública;
credenciais do Databricks permanecem no backend.

- Catálogo e meses reais vêm de `/v1/catalog`.
- Quadros globais Float32 vêm de `/v1/frames` e são desenhados como textura WebGL.
- Séries por bbox vêm de `/v1/series`, com nulos preservados e exportação CSV.
- Temperatura do ar a **10 m**, superfície e chuva Final/Late são seleções distintas.
- Dois painéis compartilham a câmera e mantêm filtros independentes e escalas fixas.
- Erros não acionam dados simulados como fallback. A demonstração nas outras abas
  continua identificada como simulação. Não há cálculo de tendência ou climatologia
  sobre as séries reais nesta integração inicial.

Para desenvolvimento, use a porta 5173, autorizada no CORS da API. Em produção,
a origem permitida é `https://kipp-earth-trends-lab.vercel.app`. Um novo domínio
de frontend precisa ser autorizado no backend antes do uso.

## Executar

Requer Node.js 24. A versão também está fixada em `package.json` para o ambiente da Vercel.

```sh
npm ci
npm run dev
```

Abra o endereço impresso pelo Vite, normalmente `http://127.0.0.1:5173/`.

```sh
npm test          # verificações de análise, exportação e reprodução temporal
npm run build    # TypeScript estrito e build de produção
npm run preview  # prévia do build
```

## Publicação automática na Vercel

Configuração do projeto `kipp-earth-trends-lab`, na conta do time KIPP:

Produção: **[kipp-earth-trends-lab.vercel.app](https://kipp-earth-trends-lab.vercel.app/)**.

| Campo             | Valor                                  |
| ----------------- | -------------------------------------- |
| Repositório       | `KIPP-hackathon/kipp-earth-trends` |
| Root Directory    | `frontend`                             |
| Production Branch | `main`                                 |
| Framework         | Vite                                   |
| Node.js           | 24.x                                   |
| Install Command   | `npm ci`                               |
| Build Command     | `npm test && npm run build`            |
| Output Directory  | `dist`                                 |

A integração Git da Vercel publica os pushes na `main`. O arquivo `vercel.json` concentra a configuração e limita os deploys automáticos a essa branch. Não há necessidade de armazenar um token Vercel no GitHub.

O comando `node scripts/vercel-ignore-build.mjs` compara o frontend com o commit do último deploy bem-sucedido (`VERCEL_GIT_PREVIOUS_SHA`). Assim, alterações apenas na documentação ou nos experimentos não recompilam o site, e um push com vários commits considera todas as mudanças acumuladas. No primeiro deploy ou quando o histórico não está disponível, a build é executada.

As credenciais e conexões de login são gerenciadas nas contas pessoais das plataformas. `.vercel/`, arquivos de ambiente, dependências e a pasta de build ficam fora do Git.

## Experiência

- Cinco abas: Explorar, Comparar, Eventos, Análise e Como funciona. Os filtros da investigação são preservados entre abas.
- Comparação A/B com filtros independentes, duplicação de cenário e sincronização opcional da rotação, zoom, camada e tempo (mesma data ou meses desde o início). Em celular, alternar A/B.
- Catálogo histórico pesquisável de queimadas, El Niño, furacões e tsunamis. Presets educativos de antes/durante/depois nas regiões disponíveis; fichas sem cobertura explicam os dados necessários.
- Três regiões brasileiras: São Francisco, Amazônia central e Pantanal.
- Três variáveis com séries mensais determinísticas e simuladas: temperatura do ar, precipitação e EVI.
- Seleção exata de mês inicial e final, com atalhos para um ano, cinco anos e o histórico completo.
- Globo com base NASA Blue Marble, limites Natural Earth, seleção de região, zoom e rotação por arraste ou setas do teclado. Home e Restaurar globo voltam à vista inicial. Campos espaciais simulados mudam mensalmente com escalas de cores fixas e valores quantitativos.
- Player com play/pausa, quadro anterior/seguinte, reinício, velocidade 0,5×/1×/2×/4× e repetição opcional. A reprodução para no fim do recorte e pausa quando a página fica oculta.
- Marcador do gráfico sincronizado com o globo; clicar na série escolhe o mês e pausa o player. Valores absolutos e anomalias podem ser alternados nos dois lugares.
- Recortes curtos continuam navegáveis, com indicação de insuficiência para a regressão anual.
- Investigação guiada em cinco passos, explicações de variáveis, sazonalidade e incerteza.
- Comparação de três períodos para testar a sensibilidade do resultado.
- Exportação da investigação em JSON e da série mensal em CSV, com declaração de dados simulados.
- Layout responsivo, navegação por teclado, diálogos nativos e preferência por movimento reduzido.

## Stack e desempenho

React **19.3.1**, React DOM **19.3.1**, TypeScript, Vite 8 e Lucide. Sem backend, credenciais ou serviços pagos. Fontes e assets são servidos localmente. A textura NASA Blue Marble é projetada em uma esfera com WebGL; d3-geo reprojeta o contorno geográfico, os marcadores e as células na mesma orientação. Um mapa vetorial mantém a rotação disponível quando WebGL não existe. O GeoJSON é carregado em um chunk separado. A textura visual continua sendo uma imagem de janeiro de 2004, independentemente do mês selecionado. O gráfico usa ResizeObserver para manter texto legível em telas pequenas.

Os presets não geram sinais artificiais que imitem eventos: somente selecionam datas e regiões nas séries educativas existentes. Não há observações atuais, classificação automática de similaridade ou previsão. O recorte de comparação em 2024 mantém os meses do calendário do preset, sem ser apresentado como dado atual.

## Organização

- `src/App.tsx`: fluxo da investigação, seleção e exportação.
- `src/components/LabTabs.tsx`: navegação acessível por abas.
- `src/components/ComparisonView.tsx`: filtros e visualização de cenários A/B.
- `src/components/EventCatalog.tsx`: busca, filtros, fichas históricas e presets.
- `src/lib/comparison.ts`: estado dos cenários e limites da reprodução vinculada.
- `src/lib/events.ts`: catálogo curado e recortes educativos.
- `src/components/Globe.tsx`: mapa interativo e navegação temporal ilustrativa.
- `src/components/GlobeSurface.tsx`: projeção da textura Blue Marble com WebGL.
- `src/lib/globeProjection.ts`: orientação, visibilidade e movimento do globo.
- `src/lib/land.geo.json`: continentes Natural Earth para reprojeção.
- `scripts/generate-interactive-globe.mjs`: baixa a textura original NASA e gera o GeoJSON dos continentes. Requer rede somente ao regenerar assets.
- `src/components/TimeSeries.tsx`: gráfico SVG, anomalias, cursor temporal e intervalo da média estimada.
- `src/components/PlaybackControls.tsx`: controles de reprodução mensal.
- `src/lib/playback.ts`: máquina de estados temporal, recorte mensal, campos espaciais e escalas fixas.
- `src/lib/playback.test.ts`: limites, parada/repetição, climatologia e coerência entre campo espacial e série regional.
- `src/components/Modal.tsx`: diálogo nativo acessível.
- `src/lib/analysis.ts`: dados simulados, agregação anual, regressão e exportação.
- `src/lib/analysis.test.ts`: verificações da análise.
- `src/lib/mapGeometry.ts`: coordenadas pré-projetadas das regiões.
- `public/assets/boundaries.svg`: limites e gratícula pré-projetados.
- `scripts/generate-map.mjs`: regeneração de limites e coordenadas com d3-geo/world-atlas.
- `scripts/generate-globe.py`: projeção ortográfica da base cartográfica; requer Pillow e NumPy apenas para regenerar o asset.

## Referências e créditos

- NASA Blue Marble Next Generation, janeiro de 2004: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/
- Natural Earth, via world-atlas 2: https://github.com/topojson/world-atlas
- MERRA-2: https://gmao.gsfc.nasa.gov/gmao-products/merra-2/
- GPM IMERG: https://gpm.nasa.gov/data/imerg
- MOD13Q1.061: https://cmr.earthdata.nasa.gov/search/concepts/C1748066515-LPCLOUD
- Manrope e Instrument Serif, Fontsource; licenças SIL OFL incluídas nos pacotes.
- Lucide, licença ISC.

Projeto independente, sem afiliação institucional à NASA.
