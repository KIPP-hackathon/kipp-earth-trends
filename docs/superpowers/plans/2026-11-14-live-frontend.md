# Integração do frontend com a API publicada

Objetivo autorizado: operar o frontend com dados reais do Cloud Run e publicar.
Entrega inicial usa o contrato v1 existente, sem esperar a normalização Gold.

- Entrada padrão Dados reais, separada da demonstração educacional.
- Catálogo e meses obtidos da API; nenhuma substituição silenciosa por simulação.
- Quadro global Float32 em textura WebGL; comparação com dois painéis e câmera compartilhada.
- Série mensal por bbox, sem tendência ou climatologia inferida deste histórico.
- Erros, ausência e carregamento explícitos; requisições canceláveis e respostas obsoletas descartadas.
- Escalas iguais para a mesma grandeza; Final/Late e ar a 10 m/superfície identificados.
- Preservar a demonstração e os presets como simulação educacional.
- Não executar suítes de testes, conforme preferência do usuário; validar build e fluxo real no navegador.

Arquivos: lib/earthApi.ts, components/RealDataView.tsx, components/RealGlobe.tsx,
components/RealSeries.tsx; adaptar GlobeSurface, LabTabs, App e estilos.

Verificação: build Node 24; navegador → catálogo → quadro binário/serie → GPU;
comparação, alteração de mês, rotação e estado sem dados/erro; deploy Vercel na main.

Revisão independente: três achados importantes corrigidos (catálogo sem meses,
lacunas de calendário e modal de fontes). As suítes automatizadas foram dispensadas
pelo usuário; a validação desta entrega usa build e smoke real no navegador.
