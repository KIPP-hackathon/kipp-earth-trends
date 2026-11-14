# Dados reais em todas as telas e reprodução contínua

Objetivo autorizado: ampliar as fontes, manter o globo contínuo durante o play,
usar a API em exploração/comparação/análise/eventos e retirar catálogos do frontend.

## Limites

- Inspeção do novo Lakebase autorizada somente em leitura com admin.
- O usuário autorizou posteriormente CONNECT/USAGE/SELECT nas 32 tabelas para a identidade dedicada; acesso aplicado e validado. Sem DDL de dados/índices ou escrita.
- Não publicar o backend com a identidade admin do banco.
- Preservar fontes e tabelas; manter SQL como fonte publicada até validar o acesso de execução ao RT.
- Dados inválidos ou indisponíveis continuam ausentes; não simular observações.
- Não executar suítes de testes nesta etapa, conforme preferência do usuário; compilar e verificar consultas reais e navegador.

## Entregas

1. Inspecionar Lakebase, schema, índices, dados e latência com consultas limitadas.
2. Registro de variáveis completo na API, com unidade, qualidade, agregação,
   escala, disponibilidade e razão de bloqueio. Catálogo não faz 70 consultas sequenciais.
3. Configuração/regiões/eventos no backend, com fontes e indicação de cobertura temporal.
4. Frame cacheado e prefetch limitado no frontend; quadro atual permanece até o próximo estar pronto.
5. Navegação única em dados reais; eventos fora do histórico mostram indisponibilidade,
   análises usam séries observadas sem conclusões de previsão/climatologia inventadas.
6. Build, revisão independente, smoke real, publicação Cloud Run e Vercel.

## Reprodução

HTTP binário com cache e buffer de próximos quadros é a primeira abordagem.
Streaming não elimina consulta lenta nem corrige descartar a textura anterior.
O mês mostrado deve sempre corresponder ao quadro visível; espera pelo buffer não
apaga o mapa. Troca de variável/dataset não pode reaproveitar quadro incompatível.

## Integração concluída

- 72 variáveis revisadas; catálogo em lotes e QA/agregação por fonte.
- O time carregou posteriormente as quatro fontes principais no RT. Roteamento
  híbrido explícito preserva essas quatro no Lakebase e as demais no Warehouse.
- Configuração e oito fichas históricas na API, com três presets dentro da cobertura.
- Cinco abas reais, buffer/prefetch, contorno do bbox e exportações com proveniência.
- Revisões independentes: cache com TTL/invalidação; classes discretas sem
  interpolação; catálogo não cacheia saturação como ausência. Correções aplicadas.
- Builds Node 24 e consultas reais às duas origens passaram; 72/72 fontes disponíveis
  em produção no catálogo híbrido. Verificação de segurança: endpoints diretos403,
  proxy200. Publicação final do frontend e sua conferência seguem abaixo na entrega.
