# Space Apps 2026 — requisitos e contexto do KIPP

> Diagnóstico baseado no checkout local `9f011a8` e nas alterações presentes em 14/11/2026. A `main` remota já continha commits posteriores no momento da publicação; revalidar os estados e pendências contra a versão atual antes de tratá-los como diagnóstico do produto publicado.

Revisado em **14/11/2026**. Desafio: **Be An Earth System Trend Detective!**
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

Inspeção estática em 14/11/2026; não comprova o estado do deploy, do bucket, do workspace ou da inscrição. “Parcial” significa que existe implementação ou documentação, mas falta evidência da entrega completa.

| ID | Requisito / origem | Evidência atual | Lacuna / aceite necessário |
| --- | --- | --- | --- |
| D1 | Escolher variável terrestre — Details | `frontend/src/App.tsx`, `frontend/src/lib/analysis.ts`; temperatura, precipitação e EVI simulados. | Selecionar ao menos uma variável real, com produto, versão, significado e unidade. |
| D2 | Adquirir dados da região — Details | `data/`, `databricks/data-extraction/`, `docs/acompanhamento-fontes.md`; pipelines e inventário documentados. | Comprovar extração e agregação regional usadas pela aplicação. Job publicado ou tabela catalogada não prova integração no frontend. |
| D3 | Série e recorte temporal — Details | Seleção de região/período, gráfico, player e comparação no frontend. | Alimentar o fluxo com dados reais e expor cobertura, lacunas e resolução. |
| D4 | Quantificar taxa de mudança — Details | Regressão sobre agregados anuais em `frontend/src/lib/analysis.ts`. | Validar unidade por tempo, agregação e cálculo com uma série real reproduzível. |
| D5 | Testar significância — Details | Intervalo de 95% com Student-t; classificação pelo intervalo da inclinação excluir zero. | Conferir pressupostos e limitações no dado real; não é obrigatório adicionar todos os testes ou valor-p se o IC estiver adequado. |
| E1 | Recurso NASA indicado — avaliadores | Produtos NASA em estudos/pipelines; Blue Marble como imagem no frontend. | Registrar uso efetivo de recurso listado em Resources e sua contribuição. Blue Marble isolado não comprova a análise pedida nem esta condição. |
| E2 | Principalmente inglês — avaliadores | Interface e documentação principal em português. | Entregar página Project, demonstração/slides e percurso principal avaliável em inglês; português pode ser complementar. |
| E3 | Demo ≤30 s OU apresentação ≤7 slides — avaliadores | Não identificada entrega final nesta revisão. | Produzir uma alternativa, medir duração/contagem e conferir acesso público. |
| E4 | Declaração de IA e créditos — avaliadores | Créditos parciais em `frontend/README.md`; declaração desta revisão no checklist. | Completar inventário de todo o projeto, identificar conteúdos gerados e conferir regras completas. |
| E5 | Submissão e links públicos — avaliadores | README aponta protótipo e repositório. | Testar sem login; preencher e efetivamente submeter na plataforma; registrar URL e confirmação. |
| E6 | Equipe e prazo — avaliadores / FAQ / portal | Sem comprovantes de cadastro ou submissão nesta revisão. | Conferir 2–6 membros conforme orientação recebida, mesmo evento e prazo efetivo da equipe. |

### Critérios técnicos adotados pelo KIPP

Estas são decisões internas para tornar os objetivos verificáveis, não obrigações adicionais atribuídas à NASA:

- Manter uma investigação completa: variável → região → período → série → taxa → significância → interpretação e exportação.
- Para cada conjunto: produtor, missão/modelo, produto/versão, URL/DOI quando disponível, variável, unidade, resolução, cobertura, data de acesso, qualidade e transformações.
- Documentar máscara regional e ponderação espacial; tratar fill, nulos, QA e escalas antes de agregar. Não equiparar ponto da grade a média de uma região.
- Distinguir observações, estimativas de satélite, reanálises e simulações. Não renomear NDVI como EVI, TS como T2M, concentração de gelo como extensão, ou probabilidade de fase líquida como probabilidade de chuva.
- IMERG Final e Late têm tratamentos distintos: documentar origem e eventual junção antes de calcular tendências.
- Justificar período e número de amostras. Os recortes de cerca de 2024–2026 do inventário não comprovam, por si, tendências climáticas de longo prazo; ampliar o histórico ou limitar a conclusão ao período observado.
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
2. **Demonstração científica:** escolher uma pergunta e fechar um caso real completo, com histórico adequado, proveniência, taxa e significância verificadas.
3. **Comunicação:** disponibilizar percurso em inglês, créditos e declaração de IA; produzir demo/slides mostrando o que funciona.
4. **Entrega:** testar links sem login, conferir checklist, submeter com folga, registrar versão e congelar materiais até terminar a avaliação conforme orientação recebida.

Consultar também [fontes e cargas](acompanhamento-fontes.md), [experiência e limitações](../frontend/README.md) e [estudos exploratórios](../ml_experiments/EXPERIMENTS.md). Esses estudos não substituem os requisitos atuais nem comprovam integração no produto.
