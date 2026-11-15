# Jornada guiada — preview isolado

Solicitação: 15/11/2026. Branch: `feat/guided-user-journey`. Base atualizada da main: `2838950`. Sem merge, deploy da API ou promoção de produção.

## Percurso

Start apresenta em inglês o desafio **Be An Earth System Trend Detective!**, com atalhos para eventos históricos, Trend Lab e exploração livre. A sequência científica continua variável → região → período → série → taxa → significância → interpretação. Eventos são contexto curado, não detecção automática. Correlação não estabelece causa; projeções são extrapolações condicionais, não previsões validadas.

Explore começa com temperatura real a 10 m quando disponível, ou outra variável com cobertura válida. Seleção automática nunca reativa fontes ocultas nem inventa meses. Datas válidas são ordenadas; meses sem dados não entram na seleção inicial. Compare continua com seleção explícita; links e investigações salvas prevalecem sobre o padrão.

Os gráficos Global e Selected area usam a mesma resposta de comparação, com domínio compartilhado que inclui ambos os recortes e endpoints de tendência. Default usa as unidades da variável e fica desabilitado com múltiplas variáveis, mesmo quando uma curva é ocultada. Historical deviation e Scale 0–100 preservam os métodos existentes. Escala, Trends only, visibilidade das curvas e cursor são compartilhados; cliques/Enter selecionam o mesmo mês do globo. O eixo horizontal continua temporal; as três opções controlam o eixo dos valores. Sem recorte, Global permanece disponível e Selected area solicita um país/retângulo.

A família Holm inclui todas as variáveis aplicadas nos dois escopos mostrados (2N), inclusive curvas ocultas; sem recorte, inclui somente Global (N). Não foram alterados estimadores, QA, proveniência, unidades, baseline 2001–2020, lacunas ou condições de inferência.

## Carregamento e diagnóstico

A introdução não depende da resposta do catálogo. O indicador de espera mostra as etapas reais de catálogo/configuração e tempo decorrido, sem percentual inventado; mensagens de demora explicam o acesso à fonte. Movimento reduzido desativa a rotação do indicador. Explore, Compare e Trend Lab só são montados quando visitados; depois preservam estado e pausam consultas quando ocultos. Os três módulos são baixados sob demanda.

Medição aquecida da API pública: catálogo HTTP 200, 216 ms, 866.518 bytes; configuração HTTP 200, 42 ms. O backend faz consultas agrupadas ao Warehouse com dois workers e memo de cinco minutos; o registro anterior de catálogo frio foi 42,236 s. O frontend não elimina esse custo de origem. Entry JS: 693,45 → 525,48 kB (gzip 234,81 → 179,87 kB); a métrica é do arquivo de entrada, não do total de chunks ou do tempo até todas as observações estarem prontas. O build ainda avisa sobre entry maior que 500 kB.

## Publicação e limites do preview

Somente esta branch foi adicionada à lista de builds Git habilitados em `frontend/vercel.json`. Em `VERCEL_ENV=preview`, `/api/earth` mantém a lista restrita de rotas/parâmetros e GET/HEAD, consultando a API pública já existente em domínio fixo. Não encaminha token Google nem usa a federação restrita a produção. Produção mantém seu caminho autenticado privado sem alteração de IAM.

O assistente não é habilitado no preview: o painel explica a limitação e oferece link normal para produção, sem enviar contexto ou notas do preview. Seus controles de origem, identidade e quotas não foram modificados.

Durante a validação, o catálogo público mudou de 37 variáveis disponíveis para todas as 72 ocultas por `HIDDEN_BY_COVERAGE_FLAG`, inclusive temperatura. Essa mudança de fonte é externa ao preview e foi comunicada à equipe. O preview preserva a indisponibilidade e permite tentar novamente. Não usa a captura de testes como fallback de produção.

## Evidências

- Node.js 24: suíte frontend e builds frontend/backend; resultados finais no checklist de entrega.
- Testes unitários verificam seleção apenas de fontes/meses válidos, fallback sem simulação e domínio que não corta extremos globais. Testes de proxy verificam leitura pública no preview, produção autenticada, bloqueio de métodos de escrita e URLs/SQL arbitrários.
- Chromium 1440/390/360 px: Start, Events, Trend Lab e Explore; temperatura pré-selecionada, dois gráficos e um único pedido de comparação, escalas/Trends only sincronizados sem novas consultas, sem overflow ou exceções JavaScript. O catálogo de testes foi uma captura real anterior à mudança das flags, explicitamente reproduzida como fixture de metadados; respostas de comparação foram consultas reais. Isso não comprova disponibilidade contínua do catálogo nem valida cientificamente os estimadores.
- Capturas de teste ficam fora do Git. Revisão independente conferiu restauração de estudos e controles; encontrou assistente indisponível no preview, tratado com compositor desabilitado e explicação.

OpenAI Codex assistiu planejamento, texto da jornada, CSS, implementação, testes e este registro. Ilustração decorativa da entrada usa Earth/Lucide já existente (ISC), sem nova imagem de satélite ou observação. A revisão humana da equipe, investigação científica reproduzível final e submissão Space Apps permanecem pendentes. Links avaliados e produção não são substituídos por este preview.
