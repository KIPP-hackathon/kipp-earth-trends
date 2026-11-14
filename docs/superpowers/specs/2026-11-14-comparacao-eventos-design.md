# Navegação, comparação e eventos

O frontend deve reduzir a densidade da página atual com cinco abas: Explorar,
Comparar, Eventos, Análise e Como funciona. A investigação mantém região,
variável, período e modo entre abas. A aba Análise reúne gráfico e resultados.

## Abordagem

Foi proposta e autorizada a comparação de dois globos, em vez de quatro mapas
menores ou de uma aba por bloco. Cada cenário tem filtros próprios. Duplicar um
cenário facilita alterar apenas uma condição; sincronização opcional de zoom e
camada, data absoluta ou deslocamento em meses permite comparação controlada.
Datas comuns usam a interseção dos períodos; comparação relativa usa a duração
do menor período. Sem interseção, a sincronização por data fica indisponível.
No celular, alternar entre A e B mantém os filtros dos dois cenários.

## Eventos e limites desta entrega

Catálogo curado com contexto histórico, datas, região, fontes oficiais e camadas
necessárias. Presets de antes/durante/depois só carregam regiões cobertas pelo
protótipo. El Niño é apresentado com um recorte regional de contexto, sem
confundir temperatura do ar e do mar. Furacões e tsunamis têm fichas educativas
que explicam as camadas e a resolução ainda indisponíveis.

Decisão de implementação: manter a fonte simulada existente (três regiões
brasileiras, meses de 2001–2024), explicitando que os presets não reproduzem
os fenômenos reais. Não integrar dados atuais, inferência de similaridade,
previsões ou cobertura global fictícia nesta atualização de frontend. A
comparação com 2024 é identificada como recorte simulado, nunca como atual.

## Restrições e verificação

React/TypeScript e identidade visual existentes; Node.js 24; configuração da
Vercel em frontend/vercel.json. Conteúdo, controles e abas acessíveis por teclado.
Preservar os materiais em context/ e ml_experiments/. Testar sincronização,
limites de períodos, independência dos cenários e presets; executar testes e
build do frontend e verificar os fluxos em desktop e celular.


## Interação do globo

A solicitação também inclui recuperar a rotação. A base anterior era uma imagem
ortográfica fixa e desabilitava os eventos de ponteiro no SVG. A implementação
usa uma textura Blue Marble fixa sobre projeção ortográfica com orientação
controlável, reprojetando a camada e os marcadores juntos. Arraste, setas e
restauração da vista funcionam em cada cenário; a vinculação inclui a orientação.
O mapa vetorial fornece alternativa quando WebGL não está disponível.
