# Comparação e eventos — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement in this session.

**Goal:** Separar o laboratório em abas e permitir comparação educativa de dois cenários e presets históricos.
**Architecture:** Estado da investigação preservado no App; comparação isolada em reducer testável; catálogo tipado de eventos e componentes de navegação e comparação. Reutilizar Globe e TimeSeries.
**Tech Stack:** React 19, TypeScript, CSS, Vitest, Node.js 24.
**Spec:** docs/superpowers/specs/2026-11-14-comparacao-eventos-design.md

## Global Constraints

- Dados simulados de 2001–2024; nenhuma descoberta científica ou previsão.
- Dois cenários independentes; datas sincronizadas somente na interseção.
- Manter frontend/vercel.json e os materiais de contexto existentes.
- Não fazer push, publicação ou operações com identidades de trabalho.

## Review Focus

- Períodos sem interseção não podem sincronizar por data.
- Períodos de tamanhos diferentes devem parar juntos no modo relativo.
- Alterar ou duplicar A não deve alterar filtros independentes de B.
- Trocar abas ou ocultar a página deve pausar animações sem perder filtros.
- Presets sem cobertura não podem carregar outra região como se fosse a original.

### Task 1: Estado da comparação e presets

**Files:** criar frontend/src/lib/comparison.ts, comparison.test.ts, events.ts, events.test.ts.
**Interfaces:** Scenario, ComparisonState, comparisonReducer, comparisonTimeline; NaturalEvent, eventScenario.
- [x] Testar primeiro independência, clone, limites, sincronização por data/posição e presets sem cobertura.
- [x] Implementar reducer e catálogo com fontes verificadas; executar a suíte.

### Task 2: Navegação e interface

**Files:** App.tsx, styles.css, components/LabTabs.tsx, ComparisonView.tsx, EventCatalog.tsx, Globe.tsx.
**Interfaces:** componentes consomem o estado e presets da tarefa 1.
- [x] Separar mapa, análise e aprendizado em painéis acessíveis; manter controles compartilhados.
- [x] Criar comparação com filtros A/B, duplicação, zoom/camada vinculados e playback opcionalmente vinculado.
- [x] Criar catálogo pesquisável com fases e ações de investigar/comparar, distinguindo contexto de dados simulados.
- [x] Usar IDs SVG únicos e verificar navegação, preservação de estado e layout responsivo no navegador.

### Task 3: Validação e revisão

- [x] Executar npm --prefix frontend test e npm --prefix frontend run build.
- [x] Revisar o diff e solicitar revisão independente; corrigir problemas relevantes e validar novamente.
- [x] Entregar as alterações locais na branch feat/comparacao-eventos, sem publicação.


## Resultado da execução

- Execução local na branch `feat/comparacao-eventos`; identidade pessoal KIPP conferida no Git e GitHub. Sem push ou publicação.
- Testes: 29 casos em 6 arquivos; TypeScript e build de produção verificados.
- Navegador: arraste gira a Terra até o Pacífico e oculta corretamente os marcadores no hemisfério oposto; Home restaura a orientação. Rotação vinculada e avanço mensal sincronizado conferidos nos dois cenários.
- Desktop 1440 px; celular 390 px e 360 px sem overflow horizontal da página. Abas por teclado, alternância A/B, gráficos, busca vazia e presets antes/durante/depois conferidos.
- Revisão independente: nenhum problema crítico ou importante; ajuste de identificação do ponteiro ativo aplicado para impedir interferência de um segundo toque.
- Imagem de verificação em `artifacts/frontend-comparison.jpg` (ignorada pelo Git).
- Decisão: preservar as séries simuladas e manter furacão/tsunami como fichas históricas até haver cobertura adequada. Nenhuma similaridade ou previsão foi inventada.
