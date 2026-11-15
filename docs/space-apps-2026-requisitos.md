# Space Apps 2026 — requisitos e contexto do KIPP

> Estado técnico atualizado em 15/11/2026, após a auditoria do checkout `4c0281d` e da aplicação pública. O KIPP atende ao núcleo técnico do desafio; a entrega formal ainda tem pendências. O diagnóstico inicial de 14/11 sobre frontend simulado e regressão anual foi superado pelas evidências abaixo. Esta revisão não confirma inscrição, elegibilidade ou submissão.

Revisado em **15/11/2026**. Desafio: **Be An Earth System Trend Detective!**
Este documento orienta planejamento, código, dados, conteúdo e apresentação.
O [checklist de entrega](space-apps-2026-entrega.md) registra o que ainda precisa ser comprovado.

## Fontes e autoridade

| Referência | Uso e situação da consulta |
| --- | --- |
| [Details oficial](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=details) | Objetivos e sugestões do desafio; conteúdo recuperado dos dados de renderização da página oficial em 14/11/2026. |
| [Resources oficial](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources) | Lista de recursos abaixo, recuperada da mesma página oficial. |
| [Hackathon 2026](https://www.spaceappschallenge.org/2026/) | Inscrição, máximo de seis integrantes e submissão na aba Project; encerramento em 15/11 às 23h59 locais. |
| [Participant FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/) | Equipes locais: 1–6; Universal: 2–6; integrantes no mesmo evento, uma equipe por pessoa e um desafio por equipe. |
| Mensagens dos avaliadores fornecidas pelo usuário em 14/11/2026 | Checklist de elegibilidade e dez recomendações, sintetizados neste documento. Não há permalink ou identificação do evento local nas mensagens. |
| [Participant Guides](https://www.spaceappschallenge.org/resources/) | Página consultada, mas os guias completos de submissão, julgamento e IA não ficaram disponíveis na resposta recuperada. Sua conferência continua pendente. |

O acesso pelo navegador de pesquisa falhou; a página oficial do desafio foi recuperada por HTTP e seus blocos de texto embutidos foram lidos. A consulta HTTP precisou contornar um erro local de certificado; não constitui validação criptográfica da origem. Não foram usadas páginas de staging como autoridade: uma delas apresentou conteúdo de outro desafio. Não foi arquivada uma cópia integral do portal neste repositório.

Distinguir sempre **objetivos oficiais do desafio**, **orientações recebidas dos avaliadores** e **decisões técnicas do KIPP**. Não apresentar uma interpretação interna como regra global confirmada. Se houver divergência, registrar as duas fontes e confirmar com a organização antes de declarar elegibilidade; até lá, manter a orientação recebida mais restritiva compatível com o projeto.

## Objetivo e escopo oficial

A ferramenta deve permitir investigar variáveis terrestres, adquirir dados para uma região, gerar uma série temporal suficientemente longa e apresentar taxa de mudança e teste de significância. O resultado precisa responder: **o que muda, onde, quanto e com que evidência estatística**. Visualização e análise juntas completam o escopo.

O desafio cita MODIS, OMI, AIRS, GPM, MERRA-2 e GLDAS como exemplos; não exige integrar todos. Teste t, Mann–Kendall e intervalos de confiança são alternativas, não exigências cumulativas. Tendências lineares já atendem ao escopo inicial.

As sugestões incluem definições simples, investigação guiada, exemplos demonstráveis, dados diários ou mensais e atenção à sazonalidade. IA é opcional. O público sugerido inclui estudantes do ensino médio, universitários e pessoas com alguma formação científica. Ausência de significância também é um resultado válido.

Globo 3D, catálogo de desastres, previsão, tempo real, cobertura mundial, todos os produtos e modelos de IA não são entregas obrigatórias do desafio. No KIPP, ampliar essas frentes deve vir depois de fechar uma investigação real e reproduzível.

## Matriz de aderência ao repositório

Auditoria em 15/11/2026: inspeção do código, consultas anônimas à aplicação/API e reprodução independente do exemplo estatístico. O catálogo público retornou HTTP 200, 72 variáveis, `provider=databricks-sql`, `sourceLayer=trusted`, `simulated=false` e `runtimeTrends=true`, revisão `kipp-earth-api-00006-hiz`. Estados abaixo descrevem evidências técnicas, não aprovação formal do projeto.

| ID | Requisito / origem | Evidência atual | Lacuna / aceite necessário |
| --- | --- | --- | --- |
| D1 | Escolher variável terrestre — Details | **Implementado:** catálogo público com 72 variáveis reais e metadados de produto, unidade e origem trusted. | Escolher e registrar a variável principal da candidatura; distinguir reanálise de observação e estimativa de satélite. |
| D2 | Adquirir dados da região — Details | **Implementado:** API pública retorna séries globais e regionais; agregação ponderada por área e recorte por bbox documentados. | Explicitar que a extensão retangular de um país não é sua máscara poligonal; registrar o recorte usado no caso final. |
| D3 | Série e recorte temporal — Details | **Implementado:** seleção de período e séries reais; T10M tem 321 meses, 2000-01–2026-09. IMERG Final, GRACE e concentração de gelo também expõem históricos ampliados. | Conferir cobertura por variável; nem todo produto tem histórico longo. Não juntar Final e Late implicitamente. |
| D4 | Quantificar taxa de mudança — Details | **Implementado e reproduzido:** regressão mensal com efeitos sazonais; inclinação por ano/década, retas nos gráficos e exportação. Exemplo real em [runtime-trends.md](runtime-trends.md). | Revisão científica humana e narrativa do caso escolhido; taxa condicional ao modelo e período, sem atribuição causal. |
| D5 | Testar significância — Details | **Implementado e reproduzido:** Newey–West HAC12, teste Wald normal aproximado, IC de 95% e ajuste Holm na UI para a família selecionada. Duas séries reais conferidas com statsmodels. | Preservar pressupostos, limites e critérios de amostra; p ajustado depende da família completa e não corrige todas as escolhas exploratórias. |
| E1 | Recurso NASA indicado — avaliadores | **Parcial:** MERRA-2 e GPM são efetivamente usados na aplicação; produto e exemplo real identificados. | Explicar relação exata com Details/Resources na candidatura. Não declarar uso de Giovanni/AppEEARS sem evidência, nem dar esta condição como formalmente aprovada. |
| E2 | Principalmente inglês — avaliadores | **Protótipo publicado em inglês:** documento HTML com `lang="en"`, interface e metadados traduzidos; evidências de produção no checklist. | Conferir inglês da página Project e da demo/slides finais, ainda não comprovadas. |
| E3 | Demo ≤30 s OU apresentação ≤7 slides — avaliadores | **Pendente de comprovação:** material final não identificado no repositório nesta revisão. | Confirmar se existe externamente ou produzir uma alternativa, medir e testar acesso público. |
| E4 | Declaração de IA e créditos — avaliadores | **Parcial:** créditos de dados/assets/dependências, registro Codex e identificação do assistente de IA na interface. | Consolidar inventário e declaração final em inglês, revisão humana e regras completas de identificação. |
| E5 | Submissão e links públicos — avaliadores | **Parcial:** site/API acessíveis sem login e repositório GitHub público na auditoria. | URL Project, links finais de apresentação e confirmação de envio não comprovados. |
| E6 | Equipe e prazo — avaliadores / FAQ / portal | **Pendente de comprovação:** sem registro de evento, integrantes, fuso efetivo ou confirmação de submissão nos documentos. | Conferir orientação de 2–6 membros, mesmo evento, responsáveis e prazo efetivo; não inferir inscrição pela existência do site. |

O [exemplo real reproduzível](runtime-trends.md#verification-and-one-real-data-check) cobre o percurso variável → região → período → série → taxa → significância. Para fechar a candidatura, a equipe ainda precisa revisar sua interpretação e incorporá-lo à página Project e à apresentação. Não falta implementar outro teste estatístico para completar esse percurso técnico.

Evidências locais da auditoria: `artifacts/auditoria-entrega/catalog.json`, `temperature-comparison.json` e `statistical-check.json` (duas comparações com `matched=true`). São arquivos ignorados, não anexos públicos da candidatura; a metodologia e os resultados estão versionados em `runtime-trends.md`. Catálogo e configuração foram novamente consultados ao atualizar estes documentos. As páginas oficiais não puderam ser reconfirmadas na auditoria; regras formais continuam sujeitas à conferência dos guias/evento.

### Critérios técnicos adotados pelo KIPP

Estas são decisões internas para tornar os objetivos verificáveis, não obrigações adicionais atribuídas à NASA:

- Manter uma investigação completa: variável → região → período → série → taxa → significância → interpretação e exportação.
- Para cada conjunto: produtor, missão/modelo, produto/versão, URL/DOI quando disponível, variável, unidade, resolução, cobertura, data de acesso, qualidade e transformações.
- Documentar máscara regional e ponderação espacial; tratar fill, nulos, QA e escalas antes de agregar. Não equiparar ponto da grade a média de uma região.
- Distinguir observações, estimativas de satélite, reanálises e simulações. Não renomear NDVI como EVI, TS como T2M, concentração de gelo como extensão, ou probabilidade de fase líquida como probabilidade de chuva.
- IMERG Final e Late têm tratamentos distintos: documentar origem e eventual junção antes de calcular tendências.
- Justificar período e número de amostras. Parte dos produtos já tem histórico desde 2000; outros continuam em 2024–2026. Conferir a cobertura efetivamente retornada por variável e limitar a conclusão ao período observado; série curta não comprova tendência climática de longo prazo.
- Explicar agregação anual/mensal, sazonalidade, baseline de anomalias, método de tendência, IC/limiar e pressupostos. Considerar autocorrelação e comparações múltiplas quando aplicáveis; registrar limitações se não tratadas.
- Não interpretar significância como importância prática, causalidade ou previsão. Não escolher períodos só para obter significância. Não chamar um IC da média estimada de intervalo de previsão.
- Sem cobertura ou evidência suficiente, indicar indisponibilidade/insuficiência. Presets de eventos não demonstram ocorrência, impacto ou causalidade nos dados simulados.
- A investigação final deve funcionar por link público, sem exigir acesso ao Databricks, bucket privado ou credenciais NASA do avaliador. Exportações previamente processadas são uma opção interna, com proveniência.

## Recursos efetivamente listados na aba Resources

A presença na lista não implica que todos sejam NASA, datasets ou requisitos obrigatórios. Os artigos externos são referências sugeridas pelo portal; não foram usados aqui como autoridade estatística.

| Recurso e link oficial da lista | Papel possível / distinção |
| --- | --- |
| [NASA Giovanni](https://giovanni.gsfc.nasa.gov/) | Selecionar variáveis, gerar e baixar séries; candidato para comprovar uso de recurso NASA indicado. |
| [NASA GES DISC — Hydrology Time Series](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series) | Séries hidrológicas; candidato NASA. |
| [NASA AppEEARS](https://appeears.earthdatacloud.nasa.gov/) | Extração e transformação geoespacial, incluindo séries; candidato NASA. |
| [NOAA Climate Data Online](https://www.ncei.noaa.gov/cdo-web/) | Histórico meteorológico e estações; está na seção NASA Data & Resources, mas o produtor é NOAA. Não rotular como NASA. |
| [SeaWiFS: análise de clorofila costeira](https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf) | Artigo no NASA NTRS sobre séries e significância; referência metodológica indicada. |
| [KNMI Climate Explorer](https://climexp.knmi.nl/) | Exploração e análise climática; recurso parceiro. |
| [Statistical test methods to detect trends in time series data](https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b) | Artigo externo sugerido; não substitui validação do método. |
| [A Comprehensive Guide to Statistical Significance](https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance) | Guia externo sugerido. |
| [CSA — RADARSAT Constellation Mission data](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm) | Dados de observação da Terra; parceiro canadense. |
| [Geo.ca](http://geo.ca/) | Catálogo geoespacial canadense. |
| [CSA — SWOT Mission](https://www.asc-csa.gc.ca/eng/satellites/swot/) | Contexto da missão conjunta sobre águas superficiais; não equivale a dados já integrados. |
| [CSA — Monitoring and protecting our ecosystem from space](https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp) | Contextualização ambiental. |
| [CSA — Synthetic Aperture Radar Tutorial](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial) | Tutorial de SAR com Python/QGIS. |

MERRA-2, GPM e MODIS aparecem no texto de Details e já são candidatos do projeto. Para a condição mais específica dos avaliadores sobre recurso **indicado no desafio**, registrar exatamente a relação entre recurso listado, produto usado e resultado entregue; não presumir que apenas citar NASA atende. Não é necessário usar todos os recursos.

## Orientações recebidas dos avaliadores

Aplicar como critérios operacionais do KIPP enquanto se confere o guia completo:

1. Responder a um desafio oficial NASA; desafio livre não atende ao checklist recebido.
2. Usar pelo menos uma fonte de dados ou recurso NASA indicado no desafio e explicar seu uso.
3. Apresentar o projeto principalmente em inglês.
4. Entregar demonstração de até 30 segundos **ou** apresentação de até 7 slides.
5. Declarar uso de IA e identificar conteúdos gerados conforme as regras; as instruções completas de identificação ainda precisam ser conferidas.
6. Citar fontes, ferramentas, imagens e materiais utilizados.
7. Garantir links públicos e acessíveis sem senha.
8. Manter equipe registrada com 2–6 integrantes segundo a mensagem recebida. A FAQ oficial distingue equipes locais (1–6) de Universal (2–6); não atribuir mínimo global universal de dois à FAQ.
9. Submeter até **15/11/2026 às 23h59, horário local**. Os avaliadores alertaram que arquivos alterados após o horário serão desclassificados; tratar como congelamento de todos os materiais submetidos e vinculados, incluindo deploy automático. Essa formulação veio da mensagem, não de um guia global completo verificado nesta revisão.
10. A avaliação local acompanha a **página Project no Space Apps**. Atualizá-la durante o evento; GitHub, Vercel e apresentação presencial não substituem submissão oficial.

O contexto do usuário é `America/Sao_Paulo` (UTC−03:00). Usar 15/11/2026 às 23h59 nesse fuso como planejamento provisório; confirmar o evento/fuso efetivo da equipe na plataforma e eventual prazo local anterior. Não assumir confirmação da inscrição a partir do fuso do computador.

As dez dicas recebidas orientam a qualidade: entender o desafio; demonstrar uso NASA; explicar inovação; mostrar protótipo funcional; definir beneficiários e impacto; documentar tecnologias e materiais; comunicar com clareza ao público internacional; completar campos e respeitar prazos; distribuir responsabilidades e reconhecer contribuições; mostrar possibilidade de aplicação em outros locais e públicos. Nenhuma delas autoriza prometer funcionalidades ou impacto ainda não demonstrados.

## Ordem de trabalho recomendada

1. **Elegibilidade:** confirmar cadastro/evento, URL Project, prazo, guias e responsáveis; começar a preencher a página oficial agora.
2. **Demonstração científica:** selecionar e revisar o exemplo real já reproduzido (ou outro caso conferido), registrar a pergunta, o recorte, proveniência, taxa, IC, significância e limitações; guardar CSV/JSON e aprovação humana.
3. **Comunicação:** usar o percurso já publicado em inglês para finalizar a página Project e demo/slides; consolidar créditos e declaração de IA. Priorizar a entrega sobre novas fontes ou funcionalidades.
4. **Entrega:** testar links sem login, conferir checklist, submeter com folga, registrar versão e congelar materiais até terminar a avaliação conforme orientação recebida.

Consultar também [fontes e cargas](inventario-fontes-ingestao-reduzida.md), [experiência e limitações](../frontend/README.md) e [estudos exploratórios](../ml_experiments/EXPERIMENTS.md). Esses estudos não substituem os requisitos atuais nem comprovam integração no produto.
