# Trend Lab — runtime monthly regression

Implementação local de 15/11/2026. A aba **Trend Lab** tem seleção independente
de indicador, região, câmera e período; não altera Explore/Compare.
A interface é em inglês e reutiliza o globo, países, calendário e a API de
séries reais. O período padrão inclui todo o histórico disponível do indicador.
**Generate trend** aplica os filtros; editar a configuração mantém o resultado
anterior identificado até executar novamente.

## Dados e limites espaciais

`loadSeries` lê `/api/earth/v1/series/:variable` usando os mesmos produtos e QA
das outras abas. Divide históricos longos em consultas de até 120 meses e
preserva lacunas. Não há fallback simulado. Classes categóricas e agregações
`weighted_mode` ficam desabilitadas para regressão. O catálogo não garante
cobertura regional; falhas e menos de três meses válidos têm estados explícitos.

Países usam o retângulo de extensão, não uma máscara nacional. O globo permite
desenhar um bbox, inclusive cruzando o antimeridiano; o bbox enviado e o retornado
estão disponíveis na proveniência. O mapa desta aba serve à seleção da região;
a imagem base é estática e não representa os valores ajustados.

O ajuste usa valores da série na unidade retornada, sem multiplicador de
renderização. Produto, tipo de dado, unidade, agregação, cobertura, método,
notas de QA e identificadores de proveniência ficam em **Data, coverage & method**.
Temperatura padrão é do ar a **10 m**, conforme o catálogo, não T2M nem temperatura
de superfície. MERRA-2 é reanálise; outros produtos incluem estimativas e
retrievals derivados de satélite.

## Método

`frontend/src/lib/trendLab.ts` aplica mínimos quadrados ordinários a valores
mensais brutos em função de meses de calendário. Meses ausentes não se tornam
zero nem encurtam a distância temporal. Nulos, valores não finitos, ausência
de amostras e cobertura explicitamente nula/negativa são excluídos; cobertura
`null` significa desconhecida. Linhas duplicadas no mesmo mês não aumentam n.
São necessários ao menos três meses válidos distintos.

O cálculo centraliza o tempo em relação ao primeiro mês e escala internamente
a resposta para estabilidade numérica, devolvendo resultados nas unidades
originais. Expõe inclinação por mês, n, R² e IC bilateral de 95% da inclinação,
com distribuição Student-t e **n−2** graus de liberdade. O quantil é calculado
por beta incompleta regularizada e bisseção; não limita graus de liberdade a 30.
Um IC que exclui zero corresponde à significância condicional em α = 0,05.
Dados constantes e retas perfeitas/variância residual numericamente degenerada
mantêm a reta descritiva e apresentam inferência indisponível.

Referência metodológica: [Penn State STAT 501 — SLR Model Evaluation](https://online.stat.psu.edu/stat501/Lesson02).
Os testes incluem referências numéricas independentes em df = 1, 4 e 40,
lacunas, recorte temporal, duplicatas, cobertura, unidades pequenas e reta
perfeita com meses não consecutivos.

O gráfico distingue pontos da fonte, reta ajustada no período observado,
IC de 95% da **média ajustada** e extensão linear tracejada. A faixa não é
intervalo de previsão. Point A pode percorrer o período observado; Point B
fica de 1 a 60 meses depois de A. A mudança ajustada é `inclinação × meses`;
seu IC usa o mesmo fator positivo. Os pontos destacados pertencem à reta,
não às observações individuais. Valores projetados não são limitados a
restrições físicas da variável.

Não há remoção de sazonalidade, correção de autocorrelação ou ajuste por
comparações múltiplas. Normalidade, independência e variância residual constante
são pressupostos não verificados pelo protótipo. A tela explicita que essas
condições podem distorcer a significância e a inclinação; registros curtos
não estabelecem tendência climática de longo prazo. Significância não implica
importância, causalidade ou capacidade preditiva. A extensão é uma projeção
da reta, não uma previsão de série temporal.

## Validação local

- Node.js 24.18.0; 69 testes frontend aprovados, incluindo 23 novos testes
  da regressão; builds frontend e backend aprovados. A suíte foi executada
  com `--no-file-parallelism` nas fixtures Git temporárias. O build mantém aviso de bundle acima de 500 kB.
- Chromium com API pública real: Brasil, temperatura a 10 m, janeiro/2000 a
  setembro/2026, 321 valores válidos; geração, gráfico, mudança para 24 meses,
  preservação entre abas e aviso de filtros alterados conferidos. Isso é uma
  verificação funcional pontual, não uma investigação científica final validada.
- Viewports 1440, 390 e 360 px: sem overflow horizontal da página; eixos usam
  dimensões responsivas para preservar leitura. A revisão independente encontrou
  e a implementação corrigiu legenda SVG, leitura mobile e falsa significância
  de uma reta perfeita com lacuna, com teste de regressão RED → GREEN.
- Fixtures efêmeras identificadas como sintéticas: falha de dados e retry,
  insuficiência de valores, bloqueio de classes categóricas, teclado nos sliders,
  preservação de A e duração entre abas e bbox desenhado enviado à consulta.
  Sem exceções JavaScript; esses valores não validam resultados científicos.

OpenAI Codex assistiu design, código, testes e documentação. Nenhum novo serviço
de IA é executado nesta aba. Revisão humana da equipe e investigação científica
reproduzível continuam pendentes. Sem commit, deploy, alteração da página Project
ou submissão oficial nesta tarefa.

## Preparação para produção — 15/11/2026

A pedido do usuário, o Trend Lab foi integrado isoladamente à `main`
`0fcf9df`, preservando a remoção de Evidence
e os recursos mais recentes. Node.js 24: 80 testes frontend e builds frontend/API
aprovados. O usuário determinou uso exclusivo da conta pessoal `Luckstai`
neste projeto. O commit de publicação usa a identidade Git pessoal do projeto;
confirmação da publicação permanece pendente.

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
