# Space Apps 2026 — checklist de entrega e evidências

> Diagnóstico baseado no checkout local `9f011a8` e nas alterações presentes em 14/11/2026. A `main` remota já continha commits posteriores no momento da publicação; revalidar os estados e pendências contra a versão atual antes de tratá-los como diagnóstico do produto publicado.

Revisão inicial: **14/11/2026**. Base: [requisitos e fontes](space-apps-2026-requisitos.md).
Checklist ainda **não aprovado**: itens só podem ser marcados com evidência verificável.
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
| Protótipo | https://kipp-earth-trends-lab.vercel.app/ — testar sem login |
| Código | https://github.com/KIPP-hackathon/kipp-earth-trends — confirmar visibilidade |
| Versão final: commit / deploy / arquivos | Pendente |
| Confirmação de submissão e horário com fuso | Pendente |

## Bloqueadores antes de declarar a entrega pronta

- [ ] **Cadastro:** cada integrante registrado, no mesmo evento; uma equipe por pessoa, um desafio por equipe; limites conferidos. Evidência: pendente.
- [ ] **Regras:** ler guias completos de submissão, julgamento, IA e termos da edição; registrar links, versão/data e divergências com as mensagens locais. Evidência: pendente.
- [ ] **Página oficial:** preencher todos os campos obrigatórios em inglês e atualizar a evolução durante o evento. Evidência: URL Project pendente.
- [ ] **Uso NASA:** identificar ao menos um recurso NASA listado no desafio efetivamente utilizado, produto/versão e contribuição; linkar evidência no código, dados ou análise. Não basta lista de fontes. Evidência: pendente.
- [ ] **Caso real completo:** variável, região, período, série temporal, taxa de mudança com unidade, significância e interpretação reproduzíveis. Frontend atual ainda simulado. Evidência: pendente.
- [ ] **Método:** documentar QA/nulos, agregação, histórico, sazonalidade, IC ou teste, pressupostos e limitações; conferir os números com referência reproduzível. Evidência: pendente.
- [ ] **Inglês:** página Project, demo/slides e percurso principal do protótipo compreensíveis aos jurados internacionais. Evidência: pendente.
- [ ] **Apresentação:** vídeo ≤30 segundos OU slides ≤7; medir, testar link e mostrar resultado real sem confundir simulação com observação. Evidência: pendente.
- [ ] **IA:** completar inventário abaixo, identificar conteúdos gerados e adaptar a declaração às regras oficiais e campos da plataforma. Evidência: pendente.
- [ ] **Créditos:** consolidar datasets, ferramentas, código, imagens, fontes, artigos, licenças e materiais reaproveitados, com uso real identificado. Evidência: pendente.
- [ ] **Links:** abrir Project, site, código, demo/slides e materiais em sessão sem login; nenhum deve pedir senha/permissão. Não usar links privados de jobs como única evidência pública. Evidência: pendente.
- [ ] **Validação:** executar testes/build com Node.js 24 após mudanças funcionais; verificar manualmente o caso apresentado e correspondência com a versão publicada. Evidência: pendente.
- [ ] **Submissão:** concluir o envio na plataforma antes do prazo efetivo e guardar confirmação/horário; rascunho não comprova envio. Evidência: pendente.
- [ ] **Congelamento:** registrar commit, deploy e versões públicas finais antes do prazo; interromper atualizações dos materiais vinculados, inclusive publicação automática, conforme alerta recebido. Evidência: pendente.

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

Créditos existentes em [frontend/README.md](../frontend/README.md); inventário científico em [acompanhamento-fontes.md](acompanhamento-fontes.md). Completar e publicar as informações relevantes em inglês na entrega. Uma fonte candidata não deve aparecer como efetivamente utilizada.

| Material | Uso identificado nesta revisão | Pendência para entrega |
| --- | --- | --- |
| NASA Blue Marble Next Generation, janeiro de 2004 | Textura estática do globo; link nos créditos do frontend. | Crédito público em inglês; não apresentar a textura como observação mensal ou série analisada. |
| Natural Earth via world-atlas | Limites cartográficos; link no README do frontend. | Conferir atribuição e licença. |
| MERRA-2 / GPM IMERG / MODIS | Estudos, extrações e pipelines documentados. | Indicar produto, versão, variáveis e arquivos efetivamente consumidos pelo caso final; distinguir reanálise e estimativas. |
| Manrope / Instrument Serif / Lucide e dependências | Fontes, ícones e bibliotecas do frontend. | Consolidar ferramentas e licenças aplicáveis. |
| Catálogo de eventos e artigos | Referências em `frontend/src/lib/events.ts` e estudos. | Conferir todos os materiais usados na narrativa final e suas atribuições. |
| Recursos oficiais do desafio | Contexto documentado em `space-apps-2026-requisitos.md`. | Identificar qual recurso NASA listado foi efetivamente usado pela solução. |

Para cada dado real entregue, preencher: **produtor; produto/versão; URL/DOI; variável/unidade; região/máscara; período/resolução; acesso; QA/nulos; transformações; arquivo público ou resultado; licença/termos; responsável pela revisão**.

## Registro de IA

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
exportação e layout móvel. Publicação em produção será registrada após o deploy.
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
