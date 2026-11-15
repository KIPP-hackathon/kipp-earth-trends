# Correção de layout no iPhone — 15/11/2026

Estado: correção validada localmente e autorizada para publicação na `main`.
Conferência da versão em produção pendente.

## Reprodução e causa

As capturas fornecidas pela equipe mostravam filtros de país/período cortados e
a camada de dados ampliada/deslocada sobre o globo. A versão anterior ao ajuste
foi servida separadamente e reproduziu os três problemas em WebKit com perfil
iPhone: em 390 px de largura, país começava em x≈−185 e período terminava em
x≈465. A imagem WebGL não acompanhava a escala e a posição dos contornos SVG.

O canvas GPU estava dentro de um `foreignObject` do SVG. A reprodução é
compatível com o [problema de composição/escala registrado no WebKit](https://bugs.webkit.org/show_bug.cgi?id=23113).
Isso é uma explicação apoiada na reprodução, não identificação da versão exata
do Safari ou do aparelho usado nas capturas.

## Alteração

- O globo de dados reais agora empilha uma base SVG, canvas HTML e SVG de
  contornos/interação dentro do mesmo viewport CSS. Projeção, shaders, dados,
  cores e controles de interação mantêm os cálculos existentes.
- Em telas estreitas, país abre alinhado à esquerda e período à direita.
- A lista de países usa a altura do `visualViewport` e rolagem interna quando
  o teclado ou as barras do navegador reduzem o espaço visível.
- O período e os calendários ajustam a posição vertical ao espaço disponível.
  Calendários longos podem rolar internamente.
- A largura mínima da página passa de 360 para 320 px para evitar rolagem
  horizontal em iPhones menores.

## Validação

Playwright 1.56.1 com WebKit 26.0 e Chromium, em Linux. Perfis móveis são
emulação; não houve teste em um iPhone físico nem interação com teclado iOS
nativo. A redução do espaço pelo teclado foi exercitada por evento de alteração
do `visualViewport`, com altura de 430 px.

As consultas usaram a API pública real, por proxy local, com geopotencial a
1000 hPa e recorte do Brasil. Não foram criadas observações sintéticas nem
alterados cálculos ou conclusões científicas.

Foram conferidos país, período, calendários inicial/final, alinhamento entre
canvas e SVG, contexto WebGL ativo, zoom, rotação e ausência de exceções JS ou
rolagem horizontal. Evidências e scripts temporários permanecem ignorados em
`artifacts/iphone-safari-layout/`. WebKit aprovado em 390×664, 320×568, 844×390 (paisagem) e 1440×900;
Chromium aprovado em 412×839 e 1440×900.

Node.js 24: 90 testes frontend e builds frontend/backend aprovados. Há aviso
preexistente de tamanho do bundle, sem falha de build. Alteração assistida por
OpenAI Codex; revisão humana e publicação permanecem separadas da validação local.
