# Space Apps 2026 — checklist de entrega e evidências

## Publicação do catálogo ampliado e IMERG — 15/11/2026

Alterações publicadas na `main` em `25802bb`, com verificação de deploy
atualizada em `7b5616e`. [Frontend Cloudflare](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43742042235)
e [API](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43742145646)
concluídos com sucesso. Vercel publicou o frontend de `25802bb`; o commit
seguinte altera apenas a verificação da API e encontrou limite de builds da Vercel.

Conferidos em [Vercel](https://kipp-earth-trends-lab.vercel.app/)
e [Cloudflare](https://kipp-earth-trends.lucas-henrique-tai.workers.dev/):
mesmo bundle frontend, catálogo real `databricks-sql`, revisão
`kipp-earth-api-00029-puv`, 224 definições e 106 disponíveis nas 11 tabelas.
Sem `tb_sea_ice_global` e sem opções Late duplicadas; catálogo mantém
setembro/2025 Final e outubro/2025 Late. Navegador na Cloudflare confirmou
as duas grandezas IMERG, aplicação da seleção e indicação de processamento Late.
Smoke de produção também aprovou frame, série, comparação e inferência existentes.

Validação com Node.js 24: 102 testes frontend, 24 backend, 4 testes Python,
builds frontend/API e dry run do Worker aprovados. Assistência OpenAI Codex.
Publicação técnica não substitui revisão científica humana nem submissão Project.

## Legibilidade dos grupos de variáveis — 15/11/2026

OpenAI Codex assistiu o ajuste CSS do seletor: ícone do grupo centralizado
nas duas linhas, nomes de itens em 14px, unidades em 13px e textos auxiliares
em 12px. Prévia no navegador confirmou centros coincidentes de ícone,
checkbox e bloco de texto; lista continua com rolagem. Atualização do Trend Lab
da main `ced5d3c` integrada. 96 testes frontend e build aprovados. Publicação
em verificação; sem alteração de dados, método estatístico ou seleção.

Ajuste posterior solicitado: removidos seleção de todas as variáveis e checkbox
de seleção do grupo; grupos continuam expansíveis com contagem e seleção
individual. Placeholder `Search variables`; explicação do rodapé removida.
Clear, Cancel e Apply preservados, com navegação por teclado para grupos
fechados. Navegador confirmou ausência dos controles removidos, fontes
14/13px e alinhamento central do ícone com o texto. 96 testes e build aprovados;
envio desta simplificação em andamento.

## Hospedagem alternativa Cloudflare — 15/11/2026

OpenAI Codex assistiu a preparação de uma segunda hospedagem solicitada pelo
usuário, preservando a Vercel, Cloud Run privado, fonte Warehouse e cálculos.
[Configuração, identidade dedicada, limites e operação](cloudflare-deploy.md).
95 testes frontend, builds frontend/API e verificações locais do Worker aprovados.
Cloudflare publicada com dados reais em [workers.dev](https://kipp-earth-trends.lucas-henrique-tai.workers.dev/).
Catálogo, frame e comparação regional HTTP 200; origem externa do assistente
e Cloud Run anônimo rejeitados (403). Proximidade `gcp:us-east4` aceita,
com `cf-placement: remote-IAD`. Credencial de invocação somente em secret
servidor; token de deploy limitado em secret GitHub, ambos autorizados pelo
usuário. Primeiro [workflow automático](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43739116784)
concluído com sucesso, incluindo smoke real. Domínio personalizado vinculado,
aguardando DNS da Spaceship. Sem upgrade pago. Os brilhos decorativos em forma de “+” foram
removidos do fundo, preservando estrelas em pontos e o controle de zoom.
Não altera conclusões científicas nem comprova submissão da página Project.

## IMERG Final + Late como uma base no app — 15/11/2026

Por solicitação do usuário, precipitação foi unificada no seletor: uma opção de
acumulado e outra de taxa, ambas lendo a tabela consolidada Final + Late.
Catálogo local: 224 definições, 106 habilitadas, 11 tabelas; 322 meses para cada
grandeza de precipitação, 2000-01–2026-10. Não houve alteração de observações
ou flags no Databricks nessa união. `processingRun` preserva o processamento
real por mês em catálogo, mapas, séries, comparações e exportações.

Consultas reais conferiram setembro/2025 (Final) e outubro/2025 (Late), com
valores preservados. Exportação CSV de investigação conservou os dois rótulos;
o app identifica a mudança de processamento, sem afirmar homogeneização.
[Política e limites](indicadores-cobertura-catalogo.md#união-de-imerg-no-seletor).
Prévia local atualizada em localhost:5173; 101 testes frontend, 24 backend e
builds aprovados com Node.js 24. Seleções ativas dos antigos IDs Late migram
para as variáveis combinadas, sem duplicar camadas. Assistência OpenAI Codex;
publicação conferida conforme registro acima; revisão científica humana pendente.


## Metadados e fontes ampliadas do app — 15/11/2026

Por decisão posterior do usuário, `tb_sea_ice_global` foi removida da lista do
app e seus dois campos receberam `valid_flag=false` no Databricks. A política
local impede reativação por futuras cargas. Observações e referência na dimensão
preservadas; concentração de gelo permanece ativa.

Por autorização do usuário, atualizadas no Databricks as tabelas
`trusted.tb_indicator_coverage` e `refined.tb_dim_indicators`. Dimensão com 253
nomes/IDs únicos e aliases físicos preservados; cobertura com 474 registros,
112 habilitados e 362 desabilitados. Os 25 campos numéricos das quatro fontes
adicionais estão habilitados, sem alterar flags das fontes anteriores ou
observações. `history_eligible` distingue a triagem histórica da habilitação;
COSP identificado como diagnóstico simulado e proveniência como metadado.

[Fontes, classificação, contagens, evidências e limitações](indicadores-cobertura-catalogo.md).
Implementação local de API/UI usa 11 tabelas selecionadas, classificação por
indicador e grupos por tema, preservando domínios científicos. Catálogo candidato
real atualizado conferiu 224 definições/106 habilitadas; séries reais verificaram
IMERG combinado com procedência por mês e concentração de gelo. Chromium conferiu 11 grupos
em desktop/mobile sem exceções JS/overflow. Atualizar dados não comprova
publicação da interface: backend/frontend e notebooks alterados ainda estão
locais. Validação: 4 testes Python, 98 frontend, 23 backend e ambos os builds
Node.js 24 aprovados. WebKit com perfil iPhone também conferiu os grupos e o
menu sem corte vertical. Assistência OpenAI Codex; revisão humana e submissão
não concluídas.


## Correção local de layout no iPhone — 15/11/2026

OpenAI Codex assistiu a correção dos filtros e da composição do globo após
capturas reais fornecidas pelo usuário. A versão anterior reproduziu em WebKit
os menus fora das bordas e o canvas WebGL ampliado/deslocado. O viewport ativo
passou a empilhar canvas HTML e SVG, com a mesma projeção; os filtros abrem para
dentro da tela e acompanham o espaço visível, incluindo calendários.

[Reprodução, alteração e limites da validação](iphone-safari-layout.md).
WebKit com perfil iPhone: 390×664, 320×568 e paisagem 844×390 aprovados;
WebKit também conferido em 1440×900. Chromium com perfil Pixel: 412×839 e desktop 1440×900 aprovados. País, período e ambos os calendários
conferidos, com zoom/rotação, alinhamento do raster/contornos e WebGL ativo;
sem exceções JS ou rolagem horizontal nesses testes. Redução do visualViewport
exercitada por evento de teste, sem teclado iOS nativo nem aparelho físico.
90 testes frontend e builds frontend/backend aprovados com Node.js 24.
Publicação na `main` autorizada pelo usuário; conferência de produção pendente.
Não modifica observações, estatística ou conclusão científica nem comprova
submissão. Revisão humana pendente.


## Migração para sete tabelas consolidadas — 15/11/2026

O usuário confirmou que as sete tabelas consolidadas MERRA-2 são as fontes
pretendidas. Registro local atualizado para 205 indicadores físicos, com 87
habilitados pelo inventário e 118 ocultos; só essas sete tabelas são consultadas
como observações. IDs MERRA-2 existentes e conversões preservados. Presets de
Events e Trend Lab usam precipitação modelada com ID, produto e unidade próprios,
sem reutilizar o ID de chuva IMERG. Diagnósticos COSP identificados como simulados
por modelo, distintos de observações diretas. Nenhuma flag ou dado alterado.

[Mapeamento, proveniência, consultas reais e limites](consolidated-indicators.md).
Validação real conferiu os 87 pares tabela/coluna, 321 meses por indicador, sete
casos de contexto e duas séries regionais. Node.js 24: 87 testes frontend,
suíte backend (incluindo regressões de mapeamento, largura das tabelas e
ausência de scans de indicadores ocultos) e ambos os builds aprovados.
Publicação concluída pelo [PR #29](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/29),
merge `d81e6689`: [backend CI/CD](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43728947821)
e Vercel aprovados. API pública confirmou revisão `kipp-earth-api-00024-gav`,
87 indicadores habilitados e 118 ocultos; todos os pares físicos conferem com o
inventário. Chromium em produção conferiu sete casos, Tōhoku desabilitado e
abertura de Pantanal com frame real da tabela consolidada de fluxos; 1440/390 px
sem exceções JavaScript ou overflow. Evidências em [indicadores consolidados](consolidated-indicators.md).
Assistência OpenAI Codex; revisão humana e submissão formal pendentes.

## Preparação de 16 jobs MERRA-2 adicionais — 15/11/2026

OpenAI Codex assistiu a criação de 16 jobs para as pastas de aerossóis (13),
química atmosférica (2) e deposição de carbono negro (1) sem ingestão localizada
na auditoria. Cada job tem notebook raw→transient, descrição de origem,
notebook transient→trusted e mapeamento com chave latitude/longitude/data,
deduplicação e proveniência. Definições em
`databricks/resources/merra2-aerosols-chemistry.jobs.yml`.

[Fontes, tabelas, unidades, comportamento e validações](ingestao-merra2-aerossois-quimica.md).
Cabeçalhos e amostras inicial/final dos CSVs reais conferidos; sintaxe Python,
contratos dos metadados/mapeamentos, caminhos, dependências e unicidade dos jobs
validados. `databricks bundle validate` aprovado no workspace KIPP, sem deploy
ou execução. BCDP001 tem cobertura histórica parcial no bucket e não deve ser
anunciado como série contínua desde 2000. Nenhum dado foi transformado nesta
preparação; ingestão efetiva, integração no produto e revisão humana continuam
etapas separadas. Estes novos jobs não comprovam investigação ou submissão.

Publicação posterior concluída por autorização do usuário: plano seletivo com
16 criações, deploy aprovado e conferência dos 16 jobs e dos 64 arquivos remotos
contra os locais. As configurações dos 221 jobs preexistentes permaneceram
iguais; nenhuma execução de ingestão foi iniciada. IDs e links registrados na
[documentação dos jobs](ingestao-merra2-aerossois-quimica.md#publicação-verificada--15112026).
A publicação no GitHub inclui os notebooks, metadados, recurso do bundle e
documentação, sem arquivos locais de dados ou credenciais.


### Auditoria das fontes de Events — 15/11/2026

Consultas somente de leitura ao SQL Warehouse e à API pública confirmaram as
sete tabelas trusted dos presets. Chuva, temperatura a 10 m, umidade específica
a 2 m, componentes U/V a 10 m e pressão têm `valid_flag=true`; NDVI/EVI têm
`false`, com cobertura apenas jan–mar/2024. O código local de Events passou a
omitir fontes ausentes, indisponíveis ou ocultas pelo flag. Textos históricos
que declaravam períodos já cobertos como indisponíveis foram corrigidos.
Sete casos têm contexto ambiental; Tōhoku segue sem camada adequada.

[Tabelas, períodos, SQL e IDs das consultas](event-investigations.md#events-source-audit--november-15-2026).
Node.js 24: 85 testes frontend, testes backend e ambos os builds aprovados;
replay do catálogo público conferiu sugestões sem NDVI/EVI. Assistência
OpenAI Codex; revisão humana e publicação pendentes. Sem escrita no warehouse,
novos dados ou conclusão de investigação científica/submissão.

Preparação para publicação: release isolado sobre `main` `ae24cf0`, branch
`fix/event-source-availability`, com 87 testes frontend, testes backend e ambos
os builds aprovados em Node.js 24. O usuário autorizou explicitamente `c0ffex`
para esta publicação após a conferência de identidade; autoria Git pessoal do
projeto preservada. Verificação de produção será registrada após o pipeline.
## Correção local — extensão gráfica do Trend Lab (15/11/2026)

OpenAI Codex assistiu a reconexão dos controles Project ahead/Explore past change
ao gráfico da investigação sazonal. O domínio inclui o ponto B, com marcadores
A/B, divisor do último mês válido e extensão âmbar tracejada quando B ultrapassa
os dados. Mantidos cálculo sazonal, proveniência, inferência, exportações e aviso
de extrapolação linear sem previsão. Não são geradas observações futuras nem
intervalos de previsão. Implementação isolada na branch `fix/trend-ahead-chart`,
preservando o checkout original com alterações locais.

Node.js 24: 88 testes frontend e builds frontend/backend aprovados. Três novos
testes de regressão conferem extensão em dois indicadores, último mês válido
anterior ao fim solicitado e ausência de extensão quando não há ajuste.
Chromium conferiu o componente com replay de dados reais já medidos do Pantanal:
duração de 12/60 meses, troca histórica/projetada, independência dos indicadores,
persistência ao mudar de vista e ausência de extensão em anomalias/relações.
1440/390/360 px sem overflow horizontal ou exceções JavaScript; marcadores dentro
do SVG e capturas inspecionadas. Replay focado no componente, sem nova consulta
científica ou validação integral da API publicada. Evidências locais em
`/tmp/kipp-ahead-browser-check.json` e `/tmp/kipp-ahead-*.png` (fora do Git).
Preview local em `http://localhost:5198/`. Sem publicação ou submissão.

Preparação autorizada para publicação: rebase sobre main `7d3e1ae`, preservando
o TrendChart restaurado em `7282ead` e as mudanças recentes de seletores/fontes.
Integração mantém estado dos controles entre vistas e restaura gráfico da fonte
quando não há ajuste. 90 testes frontend e ambos os builds aprovados em Node.js 24.
Conta efetiva `c0ffex`, conforme autorização anterior da sessão; autoria pessoal
Lucas Henrique preservada. Conferência final da publicação pendente.

## Configuração de indicadores trusted — implementação preparada em 15/11/2026

Consulta somente de leitura à `earth-trend-data.trusted.tb_indicator_coverage`
retornou 458 linhas `trusted`: 190 com `valid_flag=true` e 268 com `false`.
Por decisão do usuário, variáveis com coluna física correspondente e flag falso
ficam ocultas dos seletores; ausência de linha não significa falso. Falha de
leitura da configuração impede carregar o catálogo. A disponibilidade mensal
continua verificada nas tabelas de observação. Consultas de referência do
assistente usam tabelas `refined`, distintas das observações `trusted`.

Os limites padrão das cores contínuas usam p5–p95 do indicador correspondente,
convertidos à unidade exibida; percentis ausentes, duplicados ou inválidos usam
a faixa configurada. As estatísticas do inventário não necessariamente refletem
a região ou o período selecionados. Código e testes assistidos por OpenAI Codex;
revisão humana pendente. Publicação e leitura pela identidade da API ainda
precisam ser verificadas.
Primeira tentativa de publicação: o catálogo candidato leu o inventário, mas
o smoke test anterior exigia disponibilidade de todos os 72 indicadores e
provocou rollback automático. O smoke test foi ajustado para verificar o flag e
os percentis mantendo as verificações de observações e proveniência trusted.

> **Estado consolidado em 15/11/2026:** o KIPP atende ao núcleo técnico do desafio com dados reais, análise regional/temporal, taxa de mudança e significância reproduzidas. A entrega formal ainda não está comprovada. O checklist atual abaixo substitui o diagnóstico inicial de frontend simulado; os registros incrementais preservam o contexto e a data de cada verificação.

Registro técnico de 15/11/2026: configurações locais para ampliar as extrações de
concentração de gelo marinho, IMERG Final/Late e GRACE foram preparadas com
assistência do OpenAI Codex; ver [configurações de extração](configuracoes-extracao-fontes-reduzidas.md).
Período solicitado de 2000-01 a 2026-10, sujeito à cobertura real de cada fonte.
Nenhum dado novo foi extraído nessa preparação; consolidação de tabelas e
investigação científica permanecem etapas distintas. Revisão humana pendente.
Consulta posterior ao bucket confirmou 135 CSVs e 135 metadados desses cinco
prefixos. As configurações passaram a excluir os meses já presentes, com
checagem separada por hemisfério e processamento; não houve extração ou
sobrescrita de observações nessa mudança. Código e testes assistidos por Codex.
Na execução histórica paralela, o GRACE encontrou soluções múltiplas em 2012-01
e 2015-04. A opção explícita `--ambiguous-months skip` preserva essas lacunas e
registra a exclusão nos metadados, sem misturar intervalos nem afirmar que a
série está completa. Posteriormente, o usuário selecionou os intervalos nativos
2012-01-01–2012-01-31 e 2015-04-01–2015-04-30. Os dois CSVs foram gerados com
seleção única por limites de data, preservando índices e intervalos nos
metadados. A campanha histórica tem 226 meses disponíveis exportados, com
as demais lacunas da fonte preservadas; isso não encerra a investigação científica.
Upload posterior conferido: os 226 CSVs históricos e 226 metadados GRACE foram
publicados no prefixo de origem do bucket em 15/11/2026, com tamanho/CRC32C
correspondentes aos arquivos locais e preservação dos 66 objetos anteriores.
Total observado após o upload: 259 CSVs e 259 metadados; evidência em
`artifacts/grace-historico-upload-validation.json`. Não comprova ingestão no
Databricks nem consumo dessa ampliação pela aplicação.
Concentração de gelo também concluída e enviada: 576 CSVs históricos e 576
metadados (288 meses por polo, 2000-01–2023-12), com tamanho/CRC32C verificados
e 136 objetos anteriores preservados. Cada polo passou a ter 322 meses,
2000-01–2026-10, sem lacunas mensais. Evidência local:
`artifacts/sea-ice-historico-upload-validation.json`; ingestão UC e consumo pela
aplicação não foram executados nesta etapa.
IMERG Final também concluído e enviado: 288 CSVs e 288 metadados históricos
de 2000-01 a 2023-12, conferidos por tamanho/CRC32C, preservando os 42 objetos
anteriores. O prefixo `transient/GPM_3IMERGM/` passou a conter 309 meses,
2000-01–2025-09. Late permaneceu separado e foi pulado na extração por já
estar presente. Evidência: `artifacts/imerg-final-historico-upload-validation.json`.
Ingestão UC, integração na aplicação e análise científica não foram executadas
nesta publicação de arquivos.

> Os registros técnicos anteriores são históricos: evidência de upload não comprovava ingestão ou consumo naquela etapa. A auditoria de 15/11/2026, consolidada abaixo, verificou posteriormente o catálogo público e o exemplo estatístico real. Não atribui a esta sessão a execução dos deploys ou das ingestões intermediárias.

Revisão inicial: **14/11/2026**; consolidação de aderência: **15/11/2026**. Base: [requisitos e fontes](space-apps-2026-requisitos.md).
Entrega formal ainda **não aprovada**: itens técnicos marcados abaixo têm evidência; isso não equivale à revisão científica humana nem à submissão.
A revisão do repositório não confirma inscrição, recursos privados ou submissão.

## Identificação a completar pela equipe

| Campo | Valor |
| --- | --- |
| Nome | KIPP |
| Desafio | Be An Earth System Trend Detective! |
| URL pública da equipe / Project | Pendente |
| Evento e fuso efetivo da inscrição | Pendente; planejamento provisório: America/Sao_Paulo |
| Integrantes registrados e contribuições | Pendente; seguir 2–6 da orientação recebida |
| Responsável pela submissão e substituto | Pendente |
| Prazo efetivo e eventual prazo local anterior | Confirmar; mensagem recebida: 15/11/2026, 23h59 locais |
| Protótipo | https://kipp-earth-trends-lab.vercel.app/ — acesso anônimo HTTP 200 conferido em 15/11/2026 |
| Código | https://github.com/KIPP-hackathon/kipp-earth-trends — público na auditoria de 15/11/2026 |
| Versão final: commit / deploy / arquivos | Pendente |
| Confirmação de submissão e horário com fuso | Pendente |

## Núcleo técnico comprovado

- [x] **Dados reais integrados:** catálogo público com 72 variáveis, `databricks-sql`, camada `trusted` e `simulated=false`; cobertura e proveniência por variável. Consulta anônima novamente conferida nesta atualização.
- [x] **Região e período:** séries globais/regionais e seleção temporal; exemplo T10M de 321 meses, 2000-01–2026-09. Região por bbox, sem alegar máscara poligonal do país.
- [x] **Taxa e significância:** regressão mensal com efeitos sazonais, Newey–West HAC12, IC de 95%, valor-p aproximado e ajuste Holm na interface; retas e metadados de tendência disponíveis na comparação pública.
- [x] **Exemplo real reproduzível:** inclinação, erro-padrão e p de T10M conferidos independentemente com statsmodels para dois recortes. Método, IC e resultados versionados em [runtime-trends.md](runtime-trends.md).
- [x] **Percurso do protótipo em inglês:** tradução publicada, `lang="en"` e evidências de navegador registradas abaixo. Não inclui automaticamente os materiais externos da candidatura.
- [x] **Verificação técnica do checkout auditado:** 47 testes frontend e builds frontend/backend com Node.js 24 aprovados na sincronização; 60 testes Python da extração aprovados. Conferência adicional da API e do cálculo real na auditoria. Esta alteração apenas documental foi validada por revisão do diff, links locais e `git diff --check`.

## Pendências antes de declarar a entrega pronta

- [ ] **Cadastro:** comprovar integrantes, mesmo evento, limites e contribuições; indicar responsável pela submissão e substituto.
- [ ] **Regras:** conferir guias completos de submissão, julgamento, IA e termos da edição; registrar divergências e confirmar evento/fuso e eventual prazo local anterior.
- [ ] **Página oficial:** registrar URL Project e preencher campos obrigatórios em inglês; site e GitHub não substituem essa página.
- [ ] **Uso NASA na candidatura:** apresentar produto/versão efetivamente usados e sua contribuição; explicitar a ligação com o recurso indicado no desafio. Uso real de MERRA-2/GPM comprovado tecnicamente, mas a condição formal específica ainda precisa ser conferida.
- [ ] **Caso final revisado pela equipe:** aprovar pergunta, região, período, interpretação e limites do exemplo já reproduzido; guardar CSV/JSON e incorporar os resultados aos materiais finais. A validação numérica automatizada não substitui revisão científica humana.
- [ ] **Inglês dos materiais finais:** conferir página Project e demo/slides; o percurso principal do protótipo já está em inglês.
- [ ] **Apresentação:** confirmar material externo existente ou produzir vídeo ≤30 segundos OU slides ≤7; medir e testar link. Material final não encontrado no repositório nesta revisão não significa que inexista fora dele.
- [ ] **IA e créditos:** consolidar inventário de dados, ferramentas, assets, licenças e IA; separar desenvolvimento assistido de IA executada no produto, identificar conteúdo gerado e revisar a declaração em inglês conforme o guia.
- [ ] **Todos os links finais:** site/API e GitHub já conferidos; faltam Project, demo/slides e demais anexos sem senha/permissão.
- [ ] **Submissão:** efetivamente enviar na plataforma e guardar confirmação com horário/fuso; rascunho não comprova envio.
- [ ] **Congelamento:** registrar commit, deploy e arquivos finais; congelar materiais vinculados e deploys automáticos antes do prazo efetivo, conforme alerta recebido.

## Consolidação da auditoria — 15/11/2026

O diagnóstico antigo de frontend simulado, cálculo apenas anual com Student-t e inglês pendente foi superado. Em produção, o catálogo respondeu HTTP 200 com 72 variáveis trusted e `runtimeTrends=true`, revisão `kipp-earth-api-00006-hiz`. O site e as rotas `/api/earth/v1/catalog` e `/api/earth/v1/config` foram acessados sem login. Evidências históricas de Lakebase e versões anteriores abaixo não descrevem o provedor atual: esta auditoria observou Databricks SQL.

O catálogo auditado já expunha as ampliações: T10M com 321 meses (2000-01–2026-09), IMERG Final com 309 (2000-01–2025-09), GRACE com 259 (2002-04–2026-09, com lacunas) e concentração de gelo com 322 por polo (2000-01–2026-10). Isso comprova cobertura anunciada pela API, sem afirmar que cada arquivo/célula foi cientificamente validado. IMERG Late permanece separado. Outros produtos ainda têm séries curtas.

Caso candidato à apresentação: **como variou a temperatura do ar a 10 m no período 2000-01–2026-09?** Fonte: MERRA-2 M2TMNXSLV 5.12.4, tabela `earth-trend-data.trusted.tb_merra2_t10m`, 321 observações mensais por recorte. A região é o retângulo `[-73.98614, -33.76766, -34.73135, 5.24412]`, extensão do Brasil, incluindo áreas externas ao país; não deve ser anunciada como média territorial exata do Brasil.

| Recorte | Taxa (°C/ano) | IC de 95% da taxa (°C/ano) | p aproximado sem ajuste |
| --- | ---: | --- | ---: |
| Global | 0,01982424 | 0,01248293 a 0,02716555 | 1,20574 × 10⁻⁷ |
| Bbox do Brasil | 0,04024718 | 0,02348832 a 0,05700605 | 2,51459 × 10⁻⁶ |

Esses valores são estimativas condicionais ao modelo, dados e período; não são previsão nem atribuição causal. O IC é da inclinação, não de previsão. O valor-p ajustado exibido na UI depende de todas as variáveis/recortes da família selecionada, inclusive curvas ocultas. A referência de normalização 2001–2020 não deve ser chamada de normal climatológica de 30 anos. Detalhes de sazonalidade, agregação espacial, amostra mínima, lacunas e limitações: [metodologia](runtime-trends.md).

A conferência independente usou os valores reais retornados pela comparação pública e statsmodels OLS com efeitos mensais, HAC12, correção `n/(n−13)` e teste normal; inclinação, erro-padrão e p coincidiram nos dois recortes. Arquivos locais ignorados: `artifacts/auditoria-entrega/temperature-comparison.json` e `statistical-check.json`, com dois resultados `matched=true`. Os arquivos de auditoria não são anexos públicos; preservar exportações finais e links acessíveis na candidatura.

**Prioridade de fechamento:** confirmar evento/fuso e cadastro; concluir Project; revisar e apresentar um caso real já reproduzido; finalizar demo/slides, créditos e IA; testar links, enviar e registrar/congelar a versão final. Novas fontes ou funcionalidades não são necessárias para demonstrar o núcleo técnico. Prazo informado: **15/11/2026 às 23h59 locais**, ainda sujeito à confirmação do evento; America/Sao_Paulo é referência provisória. As páginas oficiais não puderam ser reconfirmadas na auditoria; esta consolidação não declara elegibilidade completa.

## Qualidade da candidatura — dicas dos avaliadores

- [ ] Problema, público beneficiado e conexão com o desafio explícitos.
- [ ] Contribuição concreta dos dados NASA demonstrada.
- [ ] Diferencial explicado por comparação e exemplo, sem alegações vagas.
- [ ] Protótipo demonstrável com caminho curto e estável.
- [ ] Impacto esperado separado de resultados já medidos.
- [ ] Documentação cobre descrição, tecnologias, dados, imagens, vídeos e links.
- [ ] Narrativa simples em inglês: problema → solução → método → resultado → limitações.
- [ ] Campos obrigatórios, critérios e prazos conferidos na plataforma.
- [ ] Responsabilidades e contribuições reais registradas.
- [ ] Aplicação em outros lugares/públicos descrita como realizada ou futura, conforme a evidência.

## Registro de fontes e materiais

Créditos existentes em [frontend/README.md](../frontend/README.md); inventário científico em [acompanhamento-fontes.md](inventario-fontes-ingestao-reduzida.md). Completar e publicar as informações relevantes em inglês na entrega. Uma fonte candidata não deve aparecer como efetivamente utilizada.

| Material | Uso identificado nesta revisão | Pendência para entrega |
| --- | --- | --- |
| NASA Blue Marble Next Generation, janeiro de 2004 | Textura estática do globo; link nos créditos do frontend. | Crédito público em inglês; não apresentar a textura como observação mensal ou série analisada. |
| Natural Earth via world-atlas | Limites cartográficos; link no README do frontend. | Conferir atribuição e licença. |
| MERRA-2 / GPM IMERG / MODIS | MERRA-2 e GPM IMERG efetivamente consumidos pela API pública; estudos e pipelines adicionais documentados. Não presumir integração de MODIS. | Indicar produto, versão, variáveis e arquivos efetivamente consumidos pelo caso final; distinguir reanálise e estimativas. |
| Manrope / Instrument Serif / Lucide e dependências | Fontes, ícones e bibliotecas do frontend. | Consolidar ferramentas e licenças aplicáveis. |
| Catálogo de eventos e artigos | Referências em `frontend/src/lib/events.ts` e estudos. | Conferir todos os materiais usados na narrativa final e suas atribuições. |
| Recursos oficiais do desafio | Contexto documentado em `space-apps-2026-requisitos.md`. | Identificar qual recurso NASA listado foi efetivamente usado pela solução. |

Para cada dado real entregue, preencher: **produtor; produto/versão; URL/DOI; variável/unidade; região/máscara; período/resolução; acesso; QA/nulos; transformações; arquivo público ou resultado; licença/termos; responsável pela revisão**.

## Registro de IA

Preparação da publicação do mascote em 15/11/2026: integração isolada a partir
da `main` remota `4c0281d`, preservando migração GCP, interface em inglês,
comparação/legenda interativa, remoção de ações/aviso de localização e posição
das camadas, legibilidade/tamanho de fonte, tendências/significância e extrações
incrementais já publicadas pelo time. Inclui os dois mascotes animados do
assistente, favicon GIF com PNG e alternativa de movimento reduzido, assets e
créditos em inglês. Header/rodapé mantêm o logo original. Ver [registro de
assets, ferramentas e IA](kipp-mascot.md). Publicação pela conta pessoal `Luckstai`,
conforme orientação explícita da equipe registrada no AGENTS.md. Não declara
deploy, submissão ou conclusão científica antes da verificação.
Validação integrada: 47 testes frontend e builds frontend/API aprovados com
Node.js 24; revisão independente sem problemas materiais. CUA conferiu desktop
e 390 px com interface em inglês, logos originais, dois mascotes animados e
layout atual do time preservados. Identidade pessoal configurada no escopo do
repositório. Publicação verificada em 15/11/2026: commit `8ce8177` na `main`,
[deploy Vercel READY em produção](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/5Es54WvvvQjsgzTT6KeHSvhWDMBR),
assets públicos HTTP 200 e Chrome em desktop/390 px com os dois mascotes
animados, logos originais, alternativa de movimento reduzido e sem overflow
horizontal. Favicon GIF configurado; animação nativa da aba não foi verificada.
Evidências detalhadas no [registro do mascote](kipp-mascot.md#verified-production-release).
Esta publicação técnica não equivale à submissão no Space Apps.

Evidência técnica adicional de 14/11/2026: a migração do backend para Lakebase
conferiu as quatro tabelas de MERRA-2 e IMERG, nomes/tipos de colunas,
20.793.600 registros e coberturas de 33/33/21/13 meses. O adaptador real retornou
catálogo, frames e séries para as quatro variáveis; detalhes em
[backend-lakebase.md](backend-lakebase.md). Isso comprova leitura técnica dos
dados e não encerra os itens de investigação científica, significância ou
submissão oficial acima.

Publicação verificada: revisão `kipp-earth-api-00013-zoh` com 100% do tráfego,
[CI/CD concluído](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43632060854).
O [catálogo público pelo aplicativo](https://kipp-earth-trends-lab.vercel.app/api/earth/v1/catalog)
confirmou `lakebase-postgres`; frames e séries das quatro variáveis também
foram consultados sem login pela rota Vercel. Isso é evidência de integração
dos dados, sem declarar concluída a investigação científica final.

Não confundir IA usada no desenvolvimento com IA executada dentro do produto. A declaração deve abranger ambas quando existirem. Não declarar o histórico completo como revisado a partir desta única sessão.

| Ferramenta/modelo | Data e finalidade | Conteúdo gerado/assistido | Revisão humana |
| --- | --- | --- | --- |
| OpenAI Codex; identificador exato do modelo não verificado | 14/11/2026 — leitura do repositório, consulta de páginas e organização de requisitos. | Documentos `docs/space-apps-2026-requisitos.md`, `docs/space-apps-2026-entrega.md` e seção de regras no `AGENTS.md`. | Pendente de revisão da equipe. |
| OpenAI Codex; identificador exato do modelo não verificado | 15/11/2026 — auditoria de aderência e atualização documental solicitada pela equipe. | Consolidação destes dois documentos a partir do código, API pública e reprodução independente com statsmodels; sem alteração de observações ou métodos. | Revisão humana do caso científico e da candidatura pendente. |
| Outras ferramentas ou usos anteriores | A completar pela equipe. | Código, textos, traduções, imagens, dados sintéticos, slides ou vídeo, se aplicável. | Pendente. |
| OpenAI Codex; identificador exato do modelo não verificado | 14/11/2026 — migração da leitura backend para Lakebase e verificação das tabelas. | Configuração de deploy/smoke em `backend/scripts/`, exemplo de ambiente, README e documentação `docs/backend-lakebase.md` e plano/spec associados. | Validação automatizada e consultas reais executadas; revisão da equipe pendente. |

Rascunho **parcial** em inglês, para completar antes de publicar:

> AI use disclosure (partial draft): We used OpenAI Codex to assist with repository review, challenge research, and drafting the requirements and submission checklist on November 14, 2026. The generated documentation is identified in our AI-use register. Team review is pending. Additional AI-assisted code, text, translations, images, synthetic data, or presentation materials must be listed before submission. Synthetic prototype values are not NASA observations or scientific findings.

Registrar ferramenta/modelo quando conhecido, finalidade, arquivos/trechos gerados e revisão. Não inventar identificadores ou validação humana. A forma final de identificação precisa obedecer ao guia oficial, ainda pendente de conferência.

## Evidência incremental — faixa visual do mapa (14/11/2026)

A legenda permite mínimo/máximo em unidades da variável, Apply/Reset e opção de
ocultar células fora da faixa inclusiva. A mesma variável compartilha os limites
entre os painéis A/B; classes categóricas preservam seus rótulos. A operação é
apenas visual: não recalcula dados, QA, série, taxa de mudança, significância ou
exportações. Não encerra os bloqueadores científicos ou de submissão acima.

Build Node.js 24 e verificação de um quadro real de temperatura (51.840 células)
confirmaram 31.926 células visíveis na faixa 0–50 °C para janeiro de 2024,
limites inclusivos e arrays originais preservados. Essa contagem é de bins de
exibição, não de área terrestre nem resultado de investigação climática.

Uso de IA nesta alteração: OpenAI Codex assistiu a implementação de controles,
renderização e estado de escala nos componentes do frontend e neste registro.
Identificador exato do modelo não verificado; revisão humana da equipe pendente.
Os controles novos usam inglês; a tradução integral do percurso continua pendente.

## Evidência incremental — assistente v1 (14/11/2026)

OpenAI Codex assistiu a implementação do chat, contratos, ferramentas, autenticação
servidora e controles de uso. O produto executa Gemini 3.8 Flash no Vertex AI,
com ADC e processamento US multi-region, para interpretar perguntas e propor
comandos. Cálculos descritivos e acesso aos dados são feitos pelo backend.
Respostas são conteúdo gerado por IA, identificado na interface; revisão humana
da equipe pendente. Ver [arquitetura, limites e evidências](assistant-v1.md).

Consultas reais conferiram quatro variáveis Lakebase, comparação e períodos
sem observações. O navegador confirmou dois globos com temperatura MERRA-2
no Pantanal, janeiro–março e abril–junho de 2024. A resposta preserva o snapshot
do pedido e não apresenta diferenças descritivas como significância ou causa.
Essa integração não encerra os bloqueadores científicos e de submissão acima.
Atualização visual em 14/11/2026: paleta da interface inspirada na referência NASA fornecida pela equipe (azul #0B3D91, branco e vermelho #FC3D21), assistida por OpenAI Codex. Escalas científicas dos dados preservadas. Revisão humana pendente.

Publicação do assistente conferida em produção: código `b43559a`,
revisão Cloud Run `kipp-earth-api-00027-buk`,
[CI/CD aprovado](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43639597761).
O navegador configurou A/B em março/junho de 2024 e escala compartilhada
0–50 °C por pedido em linguagem natural. Acesso anônimo direto ao Cloud Run
retornou 403; varredura do bundle público não encontrou tokens, chaves privadas
ou implementação de autenticação servidora. Chat público com limites persistentes,
sem afirmar que Origin autentica cada visitante ou que IA comprova resultados científicos.

## Evidência incremental — câmera e header compacto (14/11/2026)

OpenAI Codex assistiu a transição de câmera (900 ms, arco curto de longitude,
zoom gradual e estado compartilhado A/B) e a navegação compacta. O navegador
confirmou posições intermediárias sincronizadas em um pedido real ao agente
e interrupção do voo por interação manual, sem interpolar observações.
Preferência de movimento reduzido é respeitada pelo frontend; a API e seus
controles de acesso não foram alterados.

As cinco tabs passaram para o header, ao lado do logo; título/subtítulo grandes
foram removidos. Fontes, guia e atualização de catálogo permanecem no rodapé.
A distinção entre dados derivados, imagem base estática e limites científicos
permanece nas fontes/proveniência e em nota abaixo do conteúdo. Em 390 px,
o header manteve as cinco tabs em barra rolável sem overflow horizontal da página.
Build Node.js 24 verificado; revisão humana da equipe pendente.
Revisão visual em 14/11/2026: tema claro solicitado pela equipe, com superfícies brancas, fundo cinza-azulado, azul NASA #0B3D91 e vermelho #FC3D21. Implementação assistida por OpenAI Codex; escalas dos dados preservadas.

Publicação conferida em `62c17eb`: cinco tabs no header, sem hero, conteúdo a
20 px do header. Um comando real de câmera ao Japão produziu posições
intermediárias sincronizadas A/B durante aproximadamente 900 ms. Os ajustes
de tema claro que chegaram pela `main` foram preservados. Isso registra UX,
sem modificar as observações ou encerrar os itens científicos pendentes.

## Evidência incremental — seleção espacial e workspaces (14/11/2026)

OpenAI Codex assistiu o desenho de retângulos, grade limitada por bbox, calendário
mensal, ambiente espacial decorativo e separação persistente de Explorar/Comparar.
Ver [fluxo, método e evidências](area-selection.md). O fundo de estrelas não é
um catálogo astronômico nem uma camada de observações. Nenhuma credencial ou
permissão de provedor foi adicionada. Revisão humana da equipe pendente.

O navegador confirmou o desenho com soltura aplicando o mesmo bbox à camada
e à série real (21×24 bins de exibição, 33 meses); calendário só com meses
disponíveis; ausência de seletor de recorte em Explorar; três canvases e filtros/
câmeras independentes entre workspaces. A troca feita pelo agente passou a
exigir área/período explícitos para evitar analisar um bbox e mostrar outro.
Builds Node.js 24 e 29 verificações preexistentes passaram; consulta real também
conferiu um recorte cruzando o antimeridiano. Esses controles não demonstram
significância, previsão ou causalidade, nem encerram a investigação/submissão.

## Evidência incremental — recuperação de conexão (14/11/2026)

Após relato de `ERR_NETWORK_CHANGED`, consultas públicas a `/api/earth/v1/catalog`
e `/api/earth/v1/config` responderam HTTP 200; o catálogo continha 72 variáveis.
Essas consultas pontuais não reproduzem a falha no navegador do usuário nem
comprovam disponibilidade contínua. A leitura no frontend agora repete falhas
de rede de `fetch` até três vezes, com esperas de 0,5/1/2 segundos, respeitando
cancelamento e um único orçamento de 58 segundos. Mantém o tratamento de
429/503 e não repete erros HTTP de validação.

Validação local com Node.js 24: 37 testes aprovados e build do frontend aprovado,
incluindo checagem TypeScript da API Vercel. Correção ainda não publicada;
comportamento em produção permanece pendente de verificação após deploy.
OpenAI Codex assistiu a implementação, os testes em `earthApi.test.ts` e este
registro; revisão humana da equipe pendente. Não altera resultados científicos.

## Evidência incremental — abas, estrelas e caches (14/11/2026)

Explorar e Comparar mantêm seleções, câmera, escala, regiões personalizadas,
contexto histórico e comandos/snapshots do assistente separados. Os painéis
permanecem montados ao alternar abas; painéis ocultos pausam reprodução,
animações e leituras. Comparar preserva sincronização da câmera e da escala da
mesma variável entre A/B. Análise continua vinculada à investigação de Explorar.
O fundo decorativo tem estrelas SVG em três camadas, respeitando movimento
reduzido. Não altera dados, agregações ou resultados científicos.

Cache JSON apenas em memória: um minuto para catálogo/eventos/séries e cinco
para configuração; até 4 MiB de conteúdo serializado e 80 entradas. Deduplicação
com cancelamento por consumidor, cópias independentes e exclusão de erros.
Chaves de séries/frames incluem revisão e política da variável. Atualizar
catálogo invalida os caches, impede reaproveitamento de resultados antigos em
voo e preserva filtros. Detalhes em [frontend/README.md](../frontend/README.md).

Validação local: 46 testes aprovados e build com Node.js 24 aprovado. Chromium
com respostas sintéticas identificadas no roteiro de teste confirmou isolamento
e persistência entre abas, câmera/escala A/B sincronizadas, movimento das estrelas,
preferência de movimento reduzido, reutilização de consultas e atualização
explícita preservando filtros. Um comando sintético do assistente para abrir e
alterar Explorar preservou o estado de Comparar; viewport mobile de 390 px ficou
sem overflow horizontal. Não é validação científica dos valores nem
comprovação do deploy. Alterações ainda locais; publicação pendente.

OpenAI Codex assistiu a implementação, os testes e este registro; revisão humana
da equipe pendente. Não encerra os bloqueadores de investigação ou submissão.

Publicação verificada em 14/11/2026: commit `929841b`, integrado à seleção de
áreas, seletor de meses e câmera animada já presentes na `main`.
[Deploy Vercel concluído](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/8ekDL9B6KZV3Fqh62h7EEK1ZUWyG).
O site público entregou o bundle `index-yQgOKq1e.js` e catálogo HTTP 200 com
72 variáveis. Chromium em produção carregou dados reais, confirmou estrelas em
movimento e escala de Explorar preservada sem alterar Comparar, sem exceções
JavaScript. Isso comprova a integração publicada, sem concluir a investigação
científica ou a submissão oficial.


## Evidência incremental — país, contexto global e referências do agente (14/11/2026)

OpenAI Codex assistiu a geolocalização com resolução local do país e fallback no
Brasil, contorno Natural Earth, pares de gráficos regional/global, preservação
da camada global e fundo espacial de toda a janela. Coordenadas do dispositivo
não são enviadas à API nem ao modelo. A série do país usa seu bbox explicitamente
identificado, não uma máscara nacional exata. Ver [geometria e privacidade](country-location.md)
e [comportamento atualizado](area-selection.md).

O agente ganhou consultas tipadas e limitadas ao dicionário `tb_dim_indicators`
(467 registros) e às tendências pré-calculadas `tb_trend_merra2_ts` (35 resultados,
sete regiões e cinco métodos; temperatura de superfície, jan/2024–set/2026).
Referência de indicador não prova disponibilidade de camada; tendência armazenada
não é cálculo para um recorte arbitrário. Método, período, unidades, incerteza,
sazonalidade, autocorrelação e divergências entre métodos devem ser preservados.
Ver [dicionário](indicator-reference.md) e [tendências](trend-reference.md).

Builds Node.js 24, verificações preexistentes, consultas reais limitadas, revisão
de código e inspeção de fonte/bundle não encontraram novos segredos expostos.
Isso registra implementação e conferência técnica; revisão humana e investigação
científica reproduzível seguem pendentes. Não encerra submissão ou regras de IA.


## Evidência incremental — explorar, salvar e investigar eventos (14/11/2026)

OpenAI Codex assistiu o salvamento sem login com configuração versionada no
localStorage, links de filtros sem notas pessoais, exportação/importação JSON,
controles compactos, busca de países/variáveis e limpeza efetiva para Global.
O nome só aparece ao salvar e é opcional. São configurações, não dados congelados
ou um aplicativo offline; apagar dados do navegador remove os salvos. Ver
[investigações locais](investigations.md).

Presets sugerem variáveis revisadas cruzadas com meses válidos do catálogo,
separam janela histórica de período de contexto e mantêm a área editável.
Cobertura global do catálogo não garante cobertura regional. A tela Evidence
consulta tendências armazenadas apenas para variável, bbox e período exatamente
compatíveis; nenhuma significância é emprestada de outra região. Ver
[eventos e métodos](event-investigations.md). Resultados pré-calculados e séries
descritivas mantêm seus métodos/limitações distintos.

Conferências locais com Node.js 24: 46 verificações preexistentes do frontend,
seis de autenticação da API, builds, revisão independente e inspeção de segredos
aprovados. Navegador confirmou salvar sem nome, recarregar/reabrir, link em outra
aba, comparação com áreas distintas, exportar/importar e viewport 390 px sem
overflow. Revisão humana, investigação científica de histórico adequado e
submissão continuam pendentes; não se declara conformidade completa ou entrega
científica concluída.


## Evidência incremental — zoom e nomes cartográficos (14/11/2026)

OpenAI Codex assistiu zoom0,8–8×, renderização WebGL do trecho visível, nomes de
países progressivos com prevenção de sobreposição, fronteiras Natural Earth e
sensibilidade de arraste proporcional à aproximação. Configurações salvas e
contratos do agente usam o mesmo limite. Zoom não altera recorte científico nem
aumenta a resolução das observações. Ver [método e verificação](globe-zoom-labels.md).

Builds Node24,46 verificações preexistentes do frontend, seis da API e revisão
independente aprovados. O navegador confirmou nomes, teclado/limite8×, desenho de
bbox em8× e sua reabertura por link, reset e câmeras independentes/sincronizadas
conforme o workspace. Layout390px sem overflow; gesto físico de pinça não foi
exercitado. Permanecem as pendências científicas e de submissão do checklist.


## Evidência incremental — tema espacial translúcido, preview local (14/11/2026)

OpenAI Codex assistiu a aplicação de um fundo espacial contínuo e tema escuro
translúcido em painéis, campos, calendário, cards, modal e assistente. Os gráficos
usam linhas e rótulos com contraste para o fundo escuro; valores, agregações e
paletas científicas do globo permanecem os mesmos. Há respeito às preferências
de movimento reduzido e, quando suportada, transparência reduzida.

Preview local em `http://localhost:5180`, com proxy de desenvolvimento opcional
para a API pública existente, sem credenciais no navegador. Nenhuma publicação
deste tema foi realizada. 46 testes e build com Node.js 24 aprovados. Chromium
carregou dados reais e conferiu abas independentes, calendário, assistente aberto,
gráficos, guia e viewport de 390 px sem overflow horizontal ou exceções JS.
Capturas foram inspecionadas localmente; revisão humana da equipe pendente.
Esta alteração visual não encerra as pendências científicas ou de submissão.

Ajuste posterior no mesmo preview: fundo junto aos planetas quase preto,
estrelas mais visíveis e deslocamento local em três velocidades (14/18/25 s).
O movimento fica restrito ao céu decorativo e respeita movimento reduzido;
paletas, dados e câmera do planeta permanecem os mesmos.

Integração para publicação: tema aplicado sobre a `main` com zoom/nomes de
países, investigações salvas e controles compactos preservados. Menus novos,
ações de salvar e painel de evidências também receberam superfícies escuras.
46 testes e build Node.js 24 aprovados no checkout isolado; Chromium conferiu
API real, controles escuros, estrelas locais animadas, movimento reduzido e
layout de 390 px sem exceções JavaScript ou overflow horizontal. Edições locais
de outros trabalhos foram preservadas fora desta publicação.

Publicação confirmada: commit `bf8308a`,
[deploy Vercel aprovado](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/8JVB3rKaq2i2eYtKUH3d7R1pk3u6).
Site e catálogo públicos responderam HTTP 200, com 72 variáveis. Chromium em
produção confirmou fonte Manrope carregada, menus escuros, céu local quase preto,
movimento das estrelas, preferência de movimento reduzido e layout mobile sem
overflow ou exceções JavaScript. Bundle publicado: `index-ByxD8o4r.js`, CSS
`index-CSXaHGP5.css`. A publicação é visual; não altera observações científicas.

## Evidência incremental — camadas e fonte exclusiva (14/11/2026)

OpenAI Codex assistiu seleção múltipla com Apply/Cancel, cartões com visibilidade,
opacidade e escala própria, gráficos regionais/globais por variável em scroll,
composição WebGL em um contexto e salvamento/compartilhamento das camadas.
O tema translúcido do time (`cd8611e`) foi integrado; países/bandeiras locais,
transições de zoom e remoções de texto/botão foram incorporados. Ver
[método e limites](multivariable-layers.md) e [créditos cartográficos](country-location.md).

A decisão final do usuário mantém somente SQL Warehouse ativo, com observações
nas68tabelas trusted para72variáveis e duas referências revisadas explícitas no
mesmo Warehouse. Lakebase fica preservado e inativo para o futuro. Leituras M2M
reais confirmaram72/72variáveis,321meses de temperatura e quatro pares de
frame/série, além das referências. O catálogo frio levou42,236s; isso é evidência
operacional local e ainda exige conferência da identidade Google em produção.

Node24:46 verificações preexistentes do frontend, seis da API e builds passaram;
smokes efêmeros cobriram composição/alpha,72camadas,321meses com lacunas,
proveniência completa e dois painéis/72camadas em link limitado. Navegador local
confirmou Apply/Cancel, três variáveis reais, opacidades100/55/65%, salvar/reabrir,
link sem notas e seleção de72variáveis com gráficos próximos ao viewport.
Bandeiras: flag-icons7.6.0, MIT;168SVGs locais com licença e inspeção de conteúdo.
Isso não encerra revisão humana, investigação científica, significância ou entrega
Space Apps. Publicação e conferência da revisão Cloud Run/Vercel ficam registradas
separadamente após o CI.


### Evidência incremental — dois gráficos comparativos (15/11/2026)

OpenAI Codex implementou o toggle Historical deviation / Scale0–100 escolhido
pelo usuário. Dois gráficos (global e recorte) sobrepõem variáveis selecionadas;
a API Warehouse trusted agrega e pós-processa em tempo de execução, preservando
unidades, QA, cobertura e proveniência. Referência fixa2001–2020, mínimo10anos
por mês do calendário; normalização descritiva sem teste de significância ou
atribuição causal. [Método, fontes e evidências](comparison-charts.md).
Node24:46checks existentes do frontend,6de autenticação e builds aprovados;
verificação temporária de matemática/save e navegação com dados reais. Revisão
independente identificou preservação do modo e pontos isolados; corrigidos e
conferidos. Publicação conferida: release f17753a, bundle index-0MHaCikx.js, CI43671645405 aprovado e Cloud Run kipp-earth-api-00039-yiy com100% do tráfego. Browser em produção: dois gráficos com três curvas, restauração de Scale0–100 e troca para desvio histórico com lacunas explícitas. Acesso anônimo direto403; scan do bundle sem credencial privada/token.
Isso não conclui a investigação científica nem a submissão ao Space Apps.

## Evidência incremental — migração GCP em preparação (15/11/2026)

A equipe autorizou mover a API e dependências Google para `kipp-space-apps-2026`
(696766216489), conta `kipp.nasa@gmail.com`. Serviço novo privado, com identidades
runtime/invoker/deployer separadas, WIF restrita e sem chaves JSON. Revisão
`kipp-earth-api-00001-pb8` passou por consultas reais de catálogo72, frame, série,
comparação, tendência armazenada e chat. Vertex e Firestore novos foram conferidos
com a SA runtime. [Runbook e estado](gcp-migration.md).

Troca do proxy Vercel, preservação da quota, CI novo e limpeza das permissões
administrativas temporárias ainda pendentes nesta evidência. O serviço antigo
permanece disponível para reversão. OpenAI Codex assistiu a migração e os registros;
revisão técnica independente apontou proteção adicional da reversão de contadores,
corrigida antes do corte. Não comprova nova análise científica nem submissão oficial.


## Evidência incremental — migração GCP concluída (15/11/2026)

Proxy publicado no [PR #11](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/11)
e backend/CI no [PR #12](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/12),
merge `6cd2e5e`. [CI 43674601450 aprovado](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43674601450),
revisão `kipp-earth-api-00002-qay` a 100% em `kipp-space-apps-2026`. O site confirmou
catálogo 72/72, chat real e 321 meses no navegador. CI conferiu frame/série,
comparação e tendência armazenada, preservando proveniência e limites científicos.

IAM privado, WIF restrita, sem chaves JSON, identidades distintas, contadores
reconciliados e limites persistentes preservados. Concessões temporárias removidas;
Editor automático da SA Compute não usada removido; sete membros mantidos.
O serviço antigo foi preservado com invoker Vercel revogado. Ver [runbook,
reversão e limitação herdada no Databricks](gcp-migration.md): grants compartilhados
de `account users` incluem `MODIFY`, portanto não se afirma leitura exclusiva
efetiva da SA no Warehouse. A política compartilhada não foi modificada.

52 verificações preexistentes e builds Node.js 24 passaram; regressões temporárias
conferiram reversão da quota entre horas/dias e operação Bash 3. OpenAI Codex
assistiu configuração, código e documentação; revisão técnica independente
executada e achados corrigidos. Revisão humana e submissão Space Apps continuam
sob responsabilidade da equipe; esta evidência não conclui os itens científicos.



### Evidência incremental — primeira tela do Explore (15/11/2026)

OpenAI Codex assistiu a mudança de layout em `App.tsx` e
`compact-exploration.css`: ferramentas de preset, salvar/compartilhar e
localização foram movidas para depois da investigação. Variables/Country/Study
period iniciam o conteúdo abaixo do header. Globo e gráficos adaptam o tamanho
à altura do desktop; título e modo compartilham a linha quando há espaço.

Playwright Chromium foi usado por ausência de ferramenta Browser/IAB conectada.
Fixtures sintéticas locais serviram apenas ao QA, sem alteração dos dados do
produto. Com duas variáveis selecionadas, globo, playback e dois gráficos
couberam em 1854×759, 1366×768 e 1440×900; 390×844 manteve fluxo vertical sem
overflow horizontal. Seleção múltipla e troca para Scale 0–100 funcionaram,
sem exceções JavaScript. Referência: captura fornecida pelo usuário; comparação
visual por `view_image` com a captura renderizada no tamanho nativo 1854×759.

Conferência visual: (1) espaço anterior aos filtros removido; (2) dois gráficos
inteiros na primeira tela; (3) globo e playback inteiros; (4) tipografia,
ícones e paleta existentes preservados; (5) mobile mantém empilhamento e
controles acessíveis. Textos/ferramentas da faixa removida foram realocados,
sem novo conteúdo de produto. Diferenças intencionais: tamanho do globo e área
dos gráficos ajustados à altura; dados sintéticos nas capturas de QA. Nenhuma
publicação ou conclusão científica é comprovada por essa verificação.

Build frontend com Node.js 24 aprovado. A suíte existente retornou 46 testes
aprovados e uma falha em `earthApi.test.ts`, no caso de histórico trusted de
temperatura (`response.status` de resposta indefinida). Essa alteração de
layout não modifica o teste nem o cliente da API; esses arquivos já tinham
alterações locais no início do trabalho. Revisão humana da equipe pendente.


### Evidência incremental — inglês e legenda dos gráficos (15/11/2026)

Checkout atualizado por rebase sobre `origin/main` (`266408f`). Alterações locais
anteriores ao rebase foram preservadas no stash `pre-rebase local work 2026-11-15`;
conflitos de contratos e acesso a dados mantiveram a implementação mais recente
da main, sem reaplicar roteamento antigo.

OpenAI Codex assistiu a tradução do percurso ativo, metadados de variáveis,
configuração, eventos, mensagens de erro e formatos de data/número para inglês.
A documentação interna permanece em português. Textos e dados digitados pelo
usuário não são traduzidos automaticamente; o assistente continua respondendo
no idioma da pergunta. Revisão humana da equipe pendente.

A legenda permite ocultar/restaurar cada variável nos gráficos global e regional,
com estado acessível por teclado, sem alterar camadas do mapa ou refazer consultas.
O domínio vertical acompanha as séries visíveis. A explicação da escala foi
movida para um ícone de informação expansível, preservando referência, unidades
e limites científicos. Nenhuma observação ou cálculo estatístico foi modificado.

QA local com fixtures sintéticas identificadas: Chromium confirmou duas curvas
por gráfico, ocultação/restauração, todas ocultas, teclado, troca de escala sem
novas consultas, explicação expansível e viewport de 390 px sem overflow ou
texto da explicação fora da tela. Sem exceções JavaScript. Builds frontend e
backend com Node.js 24 aprovados; 47 testes do frontend aprovados. A conferência é local; não comprova publicação,
submissão nem conclusão da investigação científica.



Publicação conferida em 15/11/2026: implementação `714a25f`, fallback do proxy
`8b6568c`. [Vercel concluído](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/HT6mCCiWZoXFSApzNkdCaHimutEK)
e [Backend CI/CD aprovado](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43675707925).
O site público entregou `lang="en"` e bundle `index-8ykPuuGZ.js`; configuração,
eventos e catálogo responderam HTTP 200, com nomes em inglês e 72 variáveis.
Chromium em produção confirmou ocultação/restauração pela legenda, mensagem
quando todas as séries estão ocultas, explicação pelo ícone e viewport de
390 px sem overflow ou texto cortado. Nenhuma exceção JavaScript nessa sessão.
47 testes frontend, seis testes de autenticação e builds frontend/backend
aprovados com Node.js 24. O pipeline também executou seus testes e smoke checks.
Isso comprova a publicação técnica; não comprova submissão ao Space Apps.


### Ajuste solicitado — remover faixa de ações (15/11/2026)

OpenAI Codex assistiu a remoção da faixa de preset, Save/Saved/Share e seus
avisos, junto à mensagem de país inicial e botão Use my location em `App.tsx`.
O guia deixou de anunciar o salvamento removido. Eventos continuam acessíveis
pela aba existente; seleção de país e desenho de área continuam nos filtros.
Alteração de interface, sem mudança nos dados ou cálculos científicos.


### Ajuste solicitado — Map layers abaixo do globo (15/11/2026)

OpenAI Codex assistiu o reposicionamento de Map layers para a coluna do globo,
logo após o playback e antes da proveniência. O painel inicia expandido e mantém
visibilidade, opacidade e escalas existentes. Em telas estreitas os controles
seguem no fluxo vertical. Gráficos continuam na coluna direita em desktop.
Nenhuma alteração em observações, agregações ou interpretações científicas.

Validação: 47 testes e build frontend com Node.js 24 aprovados. Chromium local
com API pública confirmou Map layers a 12 px do playback na coluna esquerda,
proveniência abaixo, controles Show all/Hide all e viewport de 390 px sem
overflow horizontal ou exceções JavaScript. Capturas locais inspecionadas.


### Evidência incremental — tendências e significância em execução (15/11/2026)

OpenAI Codex implementou retas pontilhadas por variável nos dois gráficos e
valores-p de regressão com efeitos mensais e covariância robusta Newey–West
HAC12. A UI expõe taxa, p original e p ajustado por Holm para toda a família
selecionada, incluindo curvas ocultas. Referência independente statsmodels/SciPy
conferiu matemática e uma série real de temperatura com321meses em dois recortes.
[Metodologia, exemplo real reproduzível e limitações](runtime-trends.md).
Séries curtas/lacunas/variância degenerada não recebem significância inventada;
33meses de temperatura de superfície são apenas descritivos. Exportação CSV de
tendências contém bbox, datas, unidades, fontes e todos os testes selecionados.
47checks existentes de frontend,6de autenticação e builds Node24 aprovados.
Revisão independente e navegador conferiram clipping SVG, ajuste Holm,
exportação e layout móvel. Publicação6c97ac0 verificada por Vercel (bundle index-B8EFD-eQ.js), CI43680007057 aprovado e Cloud Run kipp-earth-api-00006-hiz a100%. API de produção conferida contra cálculo independente; acesso anônimo direto403. A conexão do navegador parou durante a conferência visual final; evidência local e validação API/artefatos publicadas são distintas.
Esta análise condicional não estabelece causalidade, previsão ou normalidade
climática nem comprova submissão/aderência completa ao desafio. Revisão
científica humana do caso, recursos NASA e submissão permanecem separados.


### Preview local — textos maiores (15/11/2026)

OpenAI Codex assistiu o aumento da tipografia: corpo de 15 px, controles de
14 px, textos auxiliares de 13 px, campos de 16 px e títulos dos painéis de
16–18 px. Legendas, proveniência, camadas e eixos dos gráficos também foram
ampliados, com ajustes de quebra de linha e altura dos controles. Alteração
local revisada pelo usuário, que autorizou a publicação em 15/11/2026.
Dados e cálculos preservados.

Preview em `http://localhost:5185`, com proxy para a API pública existente.
47 testes aprovados; build aprovado com Node.js 24. Chromium confirmou
posicionamento das camadas, tamanhos de texto maiores, controles funcionais e
390 px sem overflow horizontal ou exceções JS. Captura mobile inspecionada.


### Ajuste de interface — barra do globo (15/11/2026)

OpenAI Codex assistiu o alinhamento de Data layer, Draw area e Clear area em
um único grupo flexível, com altura mínima de40px, padding, espaçamento e
ícones uniformes. O mês fica acima e o recorte selecionado abaixo; os botões
quebram de linha sem sobreposição em áreas estreitas. Controles, dados e
cálculos preservados.47checks existentes e build frontend Node24 aprovados.
A conexão de automação do navegador estava indisponível nesta conferência;
não se declara verificação visual final nem publicação deste ajuste.


### Ajuste solicitado — remoção da página Evidence (15/11/2026)

OpenAI Codex assistiu a remoção da aba Evidence, seu painel e estilos exclusivos.
O guia deixou de anunciar a página e o contrato do assistente deixou de oferecer
a navegação para ela. Configurações antigas com a aba `analysis` são normalizadas
para Explore pelo validador. Consultas de tendências armazenadas continuam na
API e no assistente, com métodos, proveniência e limitações preservados.

Validação local com Node.js 24: 47 testes do frontend e builds do frontend e da
API aprovados. Publicação e conferência em navegador não realizadas nesta
alteração. Revisão humana e investigação científica reproduzível continuam
pendentes; esta remoção não conclui os requisitos científicos ou a submissão.


### Evidência incremental — setas de vento mensal no globo (15/11/2026)

Consultas reais de leitura ao SQL Warehouse ativo confirmaram os 12 componentes
trusted U/V do MERRA-2, nos níveis 2/10/50 m e 250/500/850 hPa. Os pares a 10 m
e 850 hPa têm 321 meses (jan/2000–set/2026); os demais, 33 meses
(jan/2024–set/2026). Proveniência, SQL reproduzível, identificadores das consultas,
fontes primárias, método e limites estão em [vento no globo](wind-arrows.md).

OpenAI Codex assistiu código, testes e documentação da visualização vetorial.
Selecionar uma componente carrega automaticamente a outra do mesmo nível.
Setas apontam para onde sopra a resultante das componentes médias mensais;
comprimento fixo e cor da componente selecionada, em m/s. Não se usa a tabela
SPEED com conversão incorreta. Faltas de par/cobertura são omitidas explicitamente;
reanálise mensal não é tempo instantâneo, rajada ou média mensal de velocidades.
Não houve geração de imagens ou dados científicos por IA nesta funcionalidade.

Node.js 24: 57 testes frontend e builds frontend/backend aprovados, inclusive
após integração de alterações paralelas. Chromium com dados reais conferiu
carregamento automático, probe, rotação, zoom8×, playback com meses coerentes,
deduplicação U/V do mesmo nível, opacidade/visibilidade e nível850hPa. Falha
de V50 injetada apenas no navegador de QA omitiu setas e recuperou com Retry.
390px sem overflow horizontal ou exceções JavaScript; capturas inspecionadas.
Preview5186 e cópia estável de QA5187. Esta evidência não comprova publicação,
submissão nem conclusão da investigação científica ou conformidade completa.

## Evidência incremental — Trend Lab (15/11/2026)

OpenAI Codex assistiu a nova aba em inglês com seleção independente de
região/bbox, indicador contínuo e período (todo o histórico por padrão),
regressão OLS mensal no navegador, pontos e reta, IC de 95% da inclinação,
significância condicional e controles de dois pontos para mudança em 1–60 meses.
Extensão tracejada identificada como projeção, com pressupostos e limitações
de sazonalidade/autocorrelação; classes categóricas desabilitadas. Não usa
série simulada como fallback nem atribui ao assistente o contexto de outra aba.
Ver [método, fontes, validação e limites](trend-lab.md).

Node.js 24: 69 testes frontend aprovados (23 da nova matemática), builds frontend
e backend aprovados. Fixtures Git executadas em diretórios temporários.
Revisão independente identificou e conferiu correções de legenda SVG, leitura
mobile e inferência degenerada em reta perfeita com meses faltantes. Chromium
com API pública real conferiu 321 meses de temperatura a 10 m no retângulo do
Brasil (jan/2000–set/2026), geração, controles, persistência entre abas e aviso
de filtros editados; 1440/390/360 px sem overflow e sem erros JavaScript.
Fixtures sintéticas identificadas conferiram erro/retry, insuficiência,
categóricos, teclado e bbox desenhado; não são evidência científica.

Implementação local, sem commit/deploy ou alteração da página Project.
Revisão humana, investigação científica reproduzível final e submissão
permanecem pendentes. Não declara conformidade completa ou elegibilidade.

Preparação para PRD autorizada pelo usuário em 15/11/2026: integração isolada
na main `0fcf9df`, com 80 testes frontend e builds frontend/API aprovados.
Recursos e remoções recentes da main preservados. Por orientação explícita
do usuário, este projeto usa exclusivamente a conta pessoal `Luckstai`,
com a identidade Git pessoal do projeto. Confirmação de publicação pendente.

## Publicação verificada — 15/11/2026 03:10 -03

Publicação pela conta pessoal `Luckstai`, PR [#16](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/16),
commit `e7c0693fb41479cf748ffccfee1386087009201d`. A Vercel informou
[deploy concluído](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/DZKjyHfJN6DyJLtiTPSRG1KtzLyK),
e o [domínio público](https://kipp-earth-trends-lab.vercel.app/) entregou
`index-Djm50shX.js`, correspondente ao build validado. Autoria do merge
conferida pela API: Lucas Henrique, identidade pessoal do projeto.

Chromium em produção confirmou Trend Lab entre Compare e Events, geração com
321 meses reais de temperatura a 10 m no retângulo do Brasil, controles de
24 meses, persistência entre abas e aviso de filtros alterados. Viewports
1440/390/360 px sem overflow horizontal nem exceções JavaScript.
80 testes frontend e builds frontend/API haviam passado na versão integrada.
Isso comprova a publicação e o fluxo funcional; revisão científica humana
e submissão na página Project continuam etapas distintas.

Integração posterior com a main atual preservou mascote, Trend Lab e setas de
vento do time.80checks existentes de frontend e builds frontend/backend
aprovados com Node24. Publicação do alinhamento autorizada pelo usuário.


### Simplificação solicitada — somente gráfico do recorte (15/11/2026)

OpenAI Codex assistiu a remoção do gráfico Global e dos botões CSV, JSON e
Trend CSV dos gráficos. O gráfico da área selecionada mantém multivariáveis,
toggle de escala, tendências, p-valores e Trends only. O ajuste Holm passa a
considerar apenas as variáveis selecionadas no recorte, incluindo as curvas
ocultas; a escala vertical usa somente os dados regionais. Sem recorte, a UI
pede selecionar um país ou desenhar uma área, sem consultar uma série global
como substituta. O contrato da API permanece compatível. Nenhum dado ou
modelo de tendência foi alterado. Publicação9b78a98 aprovada pela Vercel e
pelo CI43687636418, incluindo a atualização do contexto do agente.80checks
existentes e builds frontend/backend aprovados; verificação específica de
Holm confirmou exclusão dos testes globais. A main posterior9c5c9c7 manteve
apenas um ComparisonChart regional e o bundle público index-CeqgUBWO.js
confirmou os controles alinhados e ausência de Trend CSV. Navegação visual
automatizada não foi declarada; publicação conferida por código e artefatos.

### Controles da investigação — 15/11/2026

OpenAI Codex assistiu o agrupamento do seletor de variáveis por domínio/tag,
com grupos inicialmente recolhidos, expansão, seleção de todo o grupo disponível
e aplicação explícita. A busca expande os grupos correspondentes; selecionar
um grupo inclui seus itens disponíveis fora da busca, conforme aviso na UI.
Historical deviation, Scale 0–100 e Trends only passam ao cabeçalho do gráfico.
Checkboxes na tabela de tendências controlam a visibilidade das curvas e retas,
substituindo os botões superiores; as linhas da tabela e a família Holm completa
permanecem ao ocultar variáveis. Sem alteração dos dados ou do método estatístico.
80 testes existentes e build frontend aprovados; verificação de renderização
confirmou controles, checkbox, curvas ocultas e estatísticas preservadas.
Publicação verificada no commit `e66a525`, com
[deploy Vercel concluído](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/3dK6N3nHBD4RhtUBRskfBJ8dJsd7).
O domínio público entregou `index-D6rw6RTJ.js`, idêntico ao build validado,
com controles, checkboxes e grupos, sem os antigos botões de ocultação.
Sem declaração de navegação visual automatizada.

### Refinamento do gráfico do recorte — 15/11/2026

OpenAI Codex assistiu os três controles compactos e uniformes à direita do
cabeçalho, a ampliação da área útil do gráfico, a remoção da tabela Original
values e do bloco How these comparisons are calculated. Explicações,
cobertura, unidades, proveniência e razões de indisponibilidade ficam no nome
da variável por hover, foco ou toque, em popup fora da área de scroll da tabela.
Valores originais continuam no hover do gráfico e da variável. As tags de
domínio repetidas nos itens do seletor foram removidas; os grupos permanecem.
Sem alteração do método de tendência ou da família Holm.
Chrome isolado com fixture sintética identificada conferiu 1120/390 px,
alinhamento e estilos idênticos dos três controles, ausência das seções
removidas, hover, Escape, checkbox e ausência de overflow da página.
Capturas locais ignoradas; não são evidência científica. Versão integrada
aprovada em 85 testes frontend e builds frontend/API. Publicação `2c18404`
confirmada pela [Vercel](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/5D36iBKqWJWAuint4sYYYkq7hr8J)
e pelo bundle público `index-BhFMRo6n.js`, idêntico ao validado, com as seções
removidas ausentes. Revisão humana e submissão permanecem separadas.

### Campos de exploração e legendas do globo — 15/11/2026

OpenAI Codex assistiu o seletor com nomes das variáveis aplicadas, contagem,
detalhes de produto/unidade no próprio campo e contexto de área/cobertura no
seletor aberto. A linha redundante sob os campos foi removida. País e período
usam menos largura; variáveis ocupam o restante, com linha inteira em mobile.
O gráfico fica 24 px abaixo dos campos em desktop. Removidas as legendas
fixas de área selecionada, contorno e navegação sob o globo; instruções de
teclado permanecem no rótulo acessível, avisos de desenho/erro continuam e os
controles de zoom são preservados. Proveniência e limitação do bbox seguem
disponíveis em Source, quality & coordinates e no gráfico.
85 testes frontend e build aprovados. Chrome isolado com API real conferiu
1440/390 px, proporções dos campos, 24 px de separação, detalhes no seletor,
ausência das legendas e de overflow da página. Ambiente sem WebGL; conferência
limitada à interface, sem alegar validação da renderização das camadas.
Publicação `88604e2` confirmada pela
[Vercel](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/8GD1ba2E8auJuKdunnAj3zeKqomW)
e pelo bundle público `index-D4j8B6pk.js`, idêntico ao build validado.
Conferência adicional em 360 px manteve país e período compactos, sem overflow.
Investigação científica e submissão não alteradas.

Complemento solicitado: OpenAI Codex assistiu a remoção da data mensal que
ainda aparecia acima dos botões Data layer / Draw area / Clear area.
A seleção temporal permanece no campo e nos controles de reprodução.

### Ações de investigação restauradas no header — 15/11/2026

OpenAI Codex assistiu a restauração de Save, Saved e Share à direita do
header, incluindo os callbacks de captura e reabertura removidos anteriormente.
Reutiliza `kipp.investigations.v1`, validações e formato existentes; salvos
anteriores permanecem compatíveis. Captura Explore/Compare, com camadas,
região, período, câmera e escala; Saved abre de qualquer aba. Save/Share ficam
desabilitados em abas sem esse contrato. Não salva dados nem histórico do chat.
Links continuam sem nome/notas, e abrem dados atuais, não um snapshot congelado.
No mobile, ações ficam como ícones acessíveis na primeira linha e abas abaixo.
85 testes frontend e build aprovados. Chrome isolado com API real conferiu
salvar, listar, reabrir após trocar país, abrir link em página nova, exclusão
de nome/notas do link, reabrir a partir de Guide e compartilhar dois painéis.
1440/390/360 px sem overflow; fixture local removida ao finalizar. Ambiente
sem WebGL, portanto não valida renderização das camadas. Publicação `3f26e37`
confirmada pela [Vercel](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/FDRDWKGVvJFqEQzHD8jHkwoiCmr8)
e pelo bundle público `index-DUP677eb.js`, idêntico ao build validado.
Sem alteração da investigação científica ou submissão formal.

### Remoção do bloco de proveniência expandido — 15/11/2026

OpenAI Codex assistiu a remoção de Source, quality & coordinates dos painéis e
do parágrafo sobre agregação que aparecia abaixo na exploração, conforme
solicitação do usuário. Produto, unidade, cobertura, método e fonte continuam
nos detalhes por hover/foco/toque do nome da variável; regras e notas de
qualidade também foram reunidas ali. Sem alteração dos dados ou cálculos.
85 testes frontend e build aprovados; fonte e bundle conferidos quanto à
ausência dos textos removidos. Publicação `694f4a2` confirmada pela
[Vercel](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/F3TX6bHHEUzTvPuUpZSMqvqhw5XK)
e pelo bundle público `index-Cxfht65a.js`, idêntico ao validado.

### Entrada sem variável selecionada — 15/11/2026

OpenAI Codex assistiu a entrada de Explore/Compare sem seleção automática.
O globo permanece navegável e permite escolher país/desenhar região; leitores
de frames e séries só são montados após Apply ou abertura explícita de um
preset, salvo ou link. Seletor inicia com zero variáveis; período, camada,
reprodução, Save/Share e contexto do agente aguardam uma seleção real.
Saved continua disponível. A mensagem do agente orienta escolher variáveis.
O primeiro carregamento usa diretamente o preset aplicado, sem buscar
temperatura como variável intermediária. Nenhum dado ou método foi alterado.
85 testes frontend e build aprovados. Chrome isolado com API real registrou
zero consultas de frames/séries/comparação antes de Apply, inclusive durante
edição do seletor. Conferiu outra variável sem consulta intermediária de
temperatura, país escolhido preservado, comparação inicialmente independente,
seleção preservada entre abas e abertura de salvo/link a partir da tela vazia.
Nova visita comum continuou vazia mesmo com salvo local; fixture removida.
1440/390/360 px sem overflow. Ambiente sem WebGL: validação da interface e
consultas, não da renderização das camadas. Publicação `cdfed62` confirmada pela
[Vercel](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/AN3adVJSTNeWPLE22xregZhZPxGD)
e pelo bundle público `index-DZtDWBmn.js`, idêntico ao validado. Chrome em
produção confirmou zero variáveis/gráficos e zero consultas de dados de
variáveis na entrada, com Saved acessível e Save aguardando seleção.

### Explore: Default na unidade original — 15/11/2026

OpenAI Codex assistiu a visão Default com uma variável aplicada em Explore:
valores mensais regionais antes da normalização do gráfico, unidade do produto,
reta sazonal e taxa/p correspondentes a `trends.raw`, já retornados pela API.
Não significa dado bruto sem agregação/QA. Domínio vertical usa valores e reta,
com margem inclusive para séries constantes; lacunas continuam vazias.
Default fica desabilitado com mais de uma variável aplicada, mesmo ocultando
curvas. Adicionar outra variável à visão nativa ativa Historical deviation;
uma escala normalizada já escolhida permanece. Voltar a uma variável em Explore
restaura Default. O padrão da aba Compare continua normalizado.
Visão escolhida permanece em salvos/links; registros legados são aceitos.
O modo nativo não é enviado no campo opcional do contrato legado do assistente,
que aceita somente os modos normalizados. Sem alteração no backend ou nas bases.
85 testes frontend e build aprovados. Chrome isolado com fixtures sintéticas
identificadas, calculadas por `transformComparison` existente, conferiu as três
representações, taxa/p, ausência de novas consultas ao alternar, estados do botão,
persistência e 1440/390/360 px sem overflow. Não são observações ou descobertas.
Inicialmente a API pública tinha 72 indicadores com meses, todos
`available=false`; disponibilidade não foi forçada. Depois 37 indicadores
voltaram a estar disponíveis. Publicação `19dc594` confirmada pela
[Vercel](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/2oxNWzobz9e24pQf1aG2FE6LCNMb)
e pelo bundle público `index-BD9o81K8.js`, idêntico ao build validado.
Chrome em produção, sem fixtures, conferiu 321 meses reais de temperatura
a 10 m: coordenada SVG correspondente ao valor regional original, unidade °C,
taxa/p iguais a `trends.raw` e retorno ao Default sem novas consultas.

### Confirmações temporárias no header — 15/11/2026

OpenAI Codex corrigiu a confirmação de investigação compartilhada que ficava
indefinidamente aberta. Confirmações fora de modais desaparecem após seis
segundos e têm botão Dismiss notification. Erros permanecem até serem fechados;
mensagens dentro de modais não expiram durante uma revisão. Timer é cancelado
ao trocar a mensagem, abrir modal ou desmontar o componente.
90 testes frontend e builds frontend/API aprovados. Chrome isolado com fixture
do componente conferiu expiração real após seis segundos, fechamento manual
e persistência de erro, sem dados observados ou salvamentos alterados.
Correção na main em `2f61fcc`. A primeira tentativa foi recusada pela Vercel com
`build-rate-limit`. A publicação posterior do time em `a3e0239` já inclui a
correção, com [deploy concluído](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/44GNEkpXv71oDUeZ7HmuHuiW2sLe)
e bundle público `index-BzknWmfV.js`. Chrome isolado em produção abriu uma
configuração compartilhada válida, confirmou o botão de fechar e o aviso
desaparecendo após seis segundos. Nenhum salvo foi criado. Sem alteração de
plano/cobrança, API, dados ou submissão nesta tarefa. Evidência mantida local
para evitar uma publicação adicional somente de documentação.


### Ajustes do Trend Lab - 15/11/2026

OpenAI Codex assistiu o fluxo horizontal acima dos resultados, com quatro
etapas de area, indicador, periodo e execucao. O globo fica em painel
expansivel na etapa de area para reduzir a altura inicial. Em telas menores,
as etapas se reorganizam em duas colunas ou uma coluna.

A mudanca ajustada em X meses passa a preceder o grafico, com modos de
projecao linear e exploracao historica. O modo historico limita os dois pontos
ao intervalo com dados validos; a projecao inicia no ultimo mes valido.
Metodologia abre por hover, foco ou toque. Significancia, intervalos,
inclinacao, amostras, lacunas, R quadrado e graus de liberdade aparecem no
relatorio estatistico final. Interpretacao e pressupostos ficam no Guide,
acessivel diretamente pelo resultado. Calculo OLS existente reutilizado.

Validacao local com Node.js 24.22.1, 80 testes frontend e builds frontend/API
aprovados. Build mantem aviso de bundle acima de 500 kB. Conferencia visual
em navegador pendente nesta revisao. Revisao humana e submissao permanecem
pendentes. Alteracoes locais registradas neste checkout.

## Exploração de relações e anomalias — 15/11/2026

Consultas somente de leitura via Databricks CLI conferiram cobertura de sete
tabelas trusted e extraíram 2.667 médias mensais em três retângulos. O estudo
[Trend Lab: relações e anomalias](trend-lab-exploration.md) registra SQL,
análise reproduzível, correlações com remoção de sazonalidade/tendência,
intervalos exploratórios por bootstrap em blocos e limitações. Não comprova
causalidade, previsão de ENSO, ingestão de índice NOAA nem funcionalidade nova.
MODIS apresentou apenas três meses; NOAA RONI é uma fonte candidata futura.

OpenAI Codex assistiu consultas, script Python e documentação; análise executada
e ortogonalidade dos resíduos conferida, com revisão científica humana pendente.
Arquivos de resposta ficam em artifacts ignorados. Nenhum deploy, escrita no
warehouse ou submissão foi realizado; os itens formais seguem pendentes.


## Planejamento de evolução do Trend Lab — 15/11/2026

Plano assistido por OpenAI Codex em
[relações, anomalias e previsão](superpowers/plans/2026-11-15-trend-lab-relationships.md).
Primeira versão proposta: método sazonal unificado, anomalias com referência
explícita e relações entre duas variáveis com defasagens. GRACE com lacunas
permanece descritivo até validação de inferência compatível. ENSO, ampliação
MODIS e previsão são etapas futuras; nenhuma foi implementada nesta tarefa.
Plano inclui validação independente, proveniência, registro de IA e respeito
ao congelamento de materiais avaliados. Não altera o estado da submissão.


## Trend Lab: primeira versão de relações — implementação local (15/11/2026)

Implementadas as etapas 1–3 do plano: tendências sazonais pela API, anomalias
com referência explícita, seleção de dois indicadores, relações com defasagens
0–6 em suporte comum, ajuste Holm da família completa, presets, configuração
salva e exportação CSV/JSON. Lacunas de GRACE mantêm a relação descritiva e
suprimem inferência. Ver [métodos e evidências](trend-lab-relationships.md).

Node.js 24: 85 testes frontend, 14 backend e ambos os builds aprovados. Quatro
consultas somente de leitura ao Databricks produziram duas investigações reais;
comparação independente com statsmodels conferiu 14 relações, quatro tendências,
referências e ajustes Holm. Chromium com replay dos dados medidos confirmou o
fluxo em 1440/390/360 px, sem overflow/exceções, exportação, persistência e retry.
Não constitui teste da nova API publicada; deploy permanece não realizado.

OpenAI Codex assistiu código, testes, análise e documentação; revisão científica
humana pendente. ENSO, anomalias compostas, ampliação MODIS e previsão seguem
futuras. Não houve treinamento, escrita no warehouse, publicação ou submissão.


Preparação de publicação: integração isolada na branch
`feat/trend-lab-relationships`, sobre main `cefe451`, preservando configuração
horizontal, globo expansível, Guide e controles recentes. Controles de mudança
histórica/projetada usam a inclinação sazonal e IC robusto, sem alegar previsão.
85 testes frontend, 14 backend e ambos os builds novamente aprovados.
Após o bloqueio inicial por autenticação, o usuário autorizou explicitamente
usar a conta disponível `c0ffex` para esta publicação e solicitou rebase e
conferência de preservação da main. Autoria Git pessoal do projeto mantida.
Publicação concluída; verificação registrada abaixo.

### Publicação das relações do Trend Lab — 15/11/2026

Release rebased sobre main `1e054ac`, preservando o ajuste de vento e as mudanças
recentes da interface; [PR #23](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/23),
merge `beadd712`. 85 testes frontend, 14 backend e builds Node.js 24 aprovados.
[Vercel concluído](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/C8jeJc93iD96LTANDeLFc9sbgfRc)
e [CI/CD backend aprovado](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43690141300),
revisão `kipp-earth-api-00014-wos`. A conta `c0ffex` foi autorizada explicitamente
pelo usuário para esta publicação; autoria Git pessoal do projeto mantida.

Duas investigações públicas reais conferiram 14 relações contra a referência
independente. Chromium em produção, sem fixtures/interceptação, conferiu presets,
controles históricos, anomalias, defasagens, exportação, aviso de lacunas GRACE
e Guide em 1440/390/360 px, sem overflow/exceções, às 13:23 UTC (10:23 -03).
A verificação final inclui mudanças posteriores da main até `5655e01` e o catálogo
normal já atualizado após expirar seu cache. [Evidências e método](trend-lab-relationships.md#production-verification--2026-11-15).
OpenAI Codex assistiu integração, publicação e verificação. Revisão científica
humana, previsão ENSO e submissão na página Project continuam etapas distintas.


### Simplificacao dos controles do Trend Lab - 15/11/2026

OpenAI Codex assistiu a reutilizacao do seletor agrupado do Explore nos eixos
X/Y, com uma variavel por eixo e Y opcional. Exemplos ficam recolhidos.
Removidos os badges Real monthly data e as acoes Save settings/Restore saved.
Monthly period passa a definir tambem a referencia das anomalias, explicitada
nos resultados. Os controles A/B voltam a alimentar o TrendChart existente,
com delta quando ha espaco e cor de extrapolacao alem do ultimo mes observado.
O ajuste sazonal da API e suas estatisticas permanecem como fonte dos valores.

Validacao local com Node.js 24, testes frontend e builds frontend/API.
Conferencia visual em navegador pendente. Alteracao local, sem publicacao.


## Evidência incremental — Events, estudo visual local (15/11/2026)

OpenAI Codex assistiu uma proposta local para análise humana: capas vetoriais
conceituais por categoria (incêndio, El Niño, furacão e tsunami), ícones Lucide
nas variáveis, cores decorativas, busca e filtros por fenômeno. As ilustrações
SVG são geradas em código no componente `EventArtwork.tsx`, identificadas como
"CONCEPTUAL ILLUSTRATION"; não são imagens de satélite, medições, trajetórias ou
áreas atingidas. Lucide React já era dependência do projeto (licença ISC).
Não foram incorporadas fotografias nem fontes externas de imagens.

A tela mantém os eventos/fontes históricos da API, meses sobrepostos e unidades,
variáveis sem cobertura desabilitadas e as limitações de interpretação. Não
altera dados, cálculos de tendência, significância ou causalidade. Datas e unidades
da tela Events são apresentadas em inglês; o restante do checkout não foi traduzido
por esta proposta.

Preview em `http://localhost:5182/`, aba Events, usando o proxy público já existente.
Navegador com catálogo real confirmou filtros, busca sem resultado, caso Tōhoku
sem camada apropriada e ações desabilitadas, abertura de temperatura do Pantanal
em Explore e contexto Beryl em Compare. Layouts 1440, 390 e 360 px sem overflow
horizontal; limitações expansíveis conferidas. 69 testes frontend e builds
frontend/backend aprovados com Node.js 24. Captura de revisão local fora do Git.

Estudo visual local para discussão, sem commit, push, publicação ou alteração da
página Project. Revisão humana da proposta, investigação científica final e
submissão permanecem pendentes; não declara elegibilidade ou conformidade completa.

Preparação de publicação autorizada em 15/11/2026: grade com altura uniforme
para todos os cards e ações alinhadas na base. Integração limitada aos três
arquivos de Events e a este registro, sobre a main atual. Deploy pendente.

Validação sobre a main `a24acb8`: 85 testes frontend e builds frontend/backend
aprovados em Node.js24. Navegador mediu os sete cards disponíveis com767,98px
e ações com o mesmo deslocamento vertical no desktop1440px. Incluindo o oitavo
caso sem cobertura, os oito cards mediram955,33px no mobile390px, sem overflow.


### Publicação de Events conferida — 15/11/2026

Versão visual publicada na main pelo commit `aeb92f0`, exclusivamente com Events,
capas vetoriais, CSS e registro deste trabalho. [Deploy Vercel aprovado](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/7sz2h1gvPnDAbxBWNwoZgvQz15xo),
status GitHub/Vercel success. Site público carregou o bundle `index-Da2U7flF.js`.
Navegador em produção mediu os sete cards com782,48px e ações com o mesmo
deslocamento685,98px no desktop1440px. Incluindo Tōhoku, os oito cards mediram
972,83px no mobile390px, sem overflow horizontal ou erros JavaScript registrados.
85 testes frontend e builds frontend/backend aprovados antes do envio, Node.js24.
A captura de produção permanece fora do Git. A publicação visual não conclui
as pendências científicas, revisão humana e submissão da página Project.


Integracao dos controles do Trend Lab em 15/11/2026: conflito de anexos no
checklist resolvido preservando os registros do Trend Lab e Events. Main
`19dc594` integrada com 87 testes frontend e builds frontend/API aprovados
em Node.js 24. Conta `Marcelo-Kenji-Noda` autorizada pelo usuario nesta sessao.
