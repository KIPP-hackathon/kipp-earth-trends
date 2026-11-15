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

O primeiro build Vercel expôs um teste preexistente que herdava `VERCEL_ENV=preview` apesar de validar a rota privada de produção. Falha reproduzida localmente; o teste agora fixa seu próprio ambiente `production` e o restaura ao terminar. A suíte completa também é executada com `VERCEL_ENV=preview` antes do novo envio.

## Publicação conferida

Código `0bfc135` (jornada `b647eba`), deploy Preview `dpl_5mUS1GTEukcQngL9VZoYWLjNPGYX`, estado READY. [Alias da branch](https://kipp-earth-trends-lab-git-feat-g-3fe1ba-lucas-projects-62e8b289.vercel.app/). A Vercel protege esse domínio; um link compartilhável limitado a esse alias e válido por sete dias foi entregue no chat, sem versionar o segredo de compartilhamento. Acesso pelo link: página/configuração/catálogo HTTP200; catálogo real72variáveis, zero disponíveis no momento.

Produção conferida antes/depois: mesmo deploy `dpl_2kVo1FMEdxY9UUioYznn2Yk7jQeD`. Sem promoção, alteração de domínio produtivo ou deploy backend. Suíte final sob `VERCEL_ENV=preview`:94testes aprovados; builds frontend/backend aprovados com Node24. Browser local de preview confirmou compositor do assistente desabilitado, link para produção, Default desabilitado com duas variáveis mesmo ocultando curva, restauração do link com duas variáveis/Scale0–100 e Global funcionando após limpar o recorte, sem exceções JavaScript.


## Segunda rodada — agente central e página única (15/11/2026)

A pedido da equipe, a mesma branch agora usa uma página contínua: Introduction → Events → Trend Lab → Explore; Compare e Guide são ferramentas complementares. O header acompanha a seção visível e suas âncoras movem rolagem e foco do teclado até o destino. Seções próximas carregam sob demanda, estudos mantêm estado e leituras/reprodução pausam fora da etapa ativa. Links salvos continuam prevalecendo sobre os padrões.

KIPP passa a aparecer em destaque na entrada, no header e em cada etapa. Dicas de interface e próximos passos variam com seção, região e período do estudo de Explore; são regras locais, identificadas como orientação. Perguntas são preenchidas para revisão/envio pelo usuário, sem chamadas à IA a cada edição. O chat recebe os filtros de Explore/Compare; Introduction, Events, Guide e Trend Lab não herdam observações de outro estudo. O chat não recebe resultados do Trend Lab automaticamente.

O envio real de perguntas no Preview substitui a desabilitação da primeira rodada: origens são restritas aos hosts de deployment/branch fornecidos pela Vercel, corpo JSON até32KiB e destino fixo no serviço público existente. Nenhuma credencial Google, cookie do navegador ou autorização do cliente é encaminhada. Quotas do serviço público são compartilhadas pelo IP de saída do preview; isso pode limitar várias pessoas do time juntas. Produção continua em sua rota privada/autenticada, sem alteração de IAM. Perguntas do preview aceitam1500caracteres para incluir um prefixo de escopo sem ultrapassar o limite do serviço.

O agente público tem instruções anteriores ao retorno do gráfico Global. Por isso, perguntas sobre gráficos, Holm, legenda e Trend Lab são respondidas por um guia local de interface, com rótulo distinto das respostas de IA e sem entrar no histórico enviado ao modelo. Ele descreve corretamente Global + Selected area e a família Holm conjunta. Demais perguntas usam a IA para conceitos e consultas de fonte, com escopo explícito de não explicar o layout ou alegar leitura de inferência dos gráficos. Essa limitação permanece visível; um prefixo de mensagem não substitui as instruções de sistema do serviço.

Nos seletores, foram removidas as caixas de seleção de domínio inteiro; seleção individual e Apply/Cancel permanecem. O configurador de mapa mostra uma única variável escolhida por dropdown, sem remover outras curvas/camadas. Show only this layer fica ao lado do olho. Para contínuas, os números da legenda são editáveis e aplicam no blur/Enter; vazio, infinito, igualdade ou mínimo maior que máximo não alteram o mapa. Escape reverte o rascunho. Máscara fora da faixa e reset seguem visíveis; categorias continuam discretas. Cor/opacidade não alteram observações, séries, inferência ou exportações.

Conferência do catálogo desta rodada:205variáveis,87disponíveis, temperatura com321meses. Isso registra uma resposta pontual; a indisponibilidade anterior não foi contornada com dados simulados. Chromium com API real e WebGL conferiu ordem das seções, dois gráficos, escala persistida no link ao sair do campo, rejeição de valor invertido, edição sem recarregar frames, remoção das caixas de domínio, somente um cartão de configuração e Solo ao lado do olho. Viewports1440/390/360px sem overflow ou exceções JS. O teste de isolamento de contexto do chat local usou uma resposta sintética explicitamente identificada; chamada real no deployment será registrada separadamente.

Revisão independente encontrou foco de teclado e divergência do contrato antigo de gráficos; ambos tratados. Testes/builds e deploy final desta rodada serão registrados abaixo. OpenAI Codex assistiu conteúdo, código, CSS, testes e documentação; sem nova geração de imagens. Revisão humana da equipe e submissão Space Apps permanecem pendentes.

Validação antes da publicação da segunda rodada:103testes frontend sob `VERCEL_ENV=preview`, build frontend e build backend aprovados em Node24. Teste de teclado confirmou foco no destino, retorno ao topo ao clicar novamente na seção ativa e Escape revertendo o rascunho. O arquivo JS de entrada tem aproximadamente533kB, ainda com o aviso de chunk maior que500kB; não é uma medição do custo frio de dados.

Conferência fria adicional detectou deslocamento do explorador quando os cards anteriores terminavam de carregar. A navegação explícita agora mantém foco/âncora por ResizeObserver até a próxima interação manual (roda, toque, ponteiro ou teclado); scroll normal continua livre. O teste completo passou novamente com API real e sem exceções.

O push `f5f19de` recebeu status GitHub/Vercel failure: “Deployment rate limited — retry in 24 hours.” O código foi enviado à branch, mas esse status não comprova publicação. Tentativa explícita de preview e teste real do agente ficam pendentes até sua evidência; nenhum plano pago, quota ou produção foi alterado.


## Entrega local autorizada — segunda rodada

A publicação explícita no mesmo projeto foi bloqueada por `api-deployments-free-per-day` (mais de100deploys; tentar em24h). O usuário autorizou rodar localmente. O link hospedado da primeira rodada **não contém estas alterações**; não foi apresentado como se estivesse atualizado.

Servidor disponível em **http://127.0.0.1:5187/**. Para iniciar novamente, com Node24:

```sh
KIPP_PREVIEW_PRODUCTION_API=1 npm --prefix frontend run dev -- --port 5187
```

O plugin opt-in de desenvolvimento aceita somente Origin do loopback na porta do servidor e reutiliza o handler limitado de Preview. O teste real de Origin externo retornou403. Ele não instala credenciais, não muda IAM e não altera o serviço produtivo. Perguntas de interface usam o guia local; perguntas gerais/dados seguem para o serviço público existente, com o mesmo escopo e limites.

Chromium recebeu uma resposta real à pergunta sobre tendência climática e uma limitação: o modelo explicou padrão de longo prazo e limitações de registros curtos, sazonalidade, autocorrelação e causalidade. A mensagem apareceu como “KIPP AI · source-data assistant”, sem exceções JavaScript e sem fixture nessa chamada. O guia sobre Holm retornouHTTP200 com `interfaceGuide=true`, separadamente. As conferências funcionais anteriores usaram dados reais; a única fixture de chat local foi identificada no teste de isolamento de contexto.

Produção antes/depois desta rodada: mesmo deployment `dpl_5JMh9udoWVkSAM4M3DQvKdUTA5wt`. Sem merge emmain, troca de domínio, alteração de plano/cobrança ou deploy de backend. A branch permanece `feat/guided-user-journey`.
