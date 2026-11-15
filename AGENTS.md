# Instruções do projeto KIPP

## Identidade e Git

- Este repositório pertence ao projeto pessoal do time KIPP.
- Use exclusivamente a conta pessoal GitHub `Luckstai` neste projeto. Nunca use
  conta ou identidade da CERC para operações deste repositório.
- Identidade Git local do projeto: `Lucas Henrique` e `lucas.henrique.tai@gmail.com`.
- Antes de autenticar, criar commits ou enviar código, confira a conta efetiva com `gh api user` e a identidade Git local. Use a conta autorizada pelo usuário para a sessão.
- Configure identidade e credenciais no escopo deste repositório. Não copie configurações, credenciais, dados ou documentos de projetos de trabalho.
- Use nomes de branches descritivos com prefixos `feat/`, `fix/` ou `docs/` quando uma nova branch for necessária.

## Organização

- Código, dependências, assets, testes e configuração do frontend ficam em `frontend/`.
- Código, dependências e configuração da API ficam em `backend/`, na raiz do monorepo.
- Estudos e documentação compartilhada ficam em `docs/`.
- Preserve os materiais existentes em `context/` e `ml_experiments/`.
- Não versione `node_modules/`, `dist/`, `.vercel/`, arquivos de ambiente, credenciais ou capturas em `artifacts/`.

## Validação e publicação

- Use Node.js 24.
- Valide alterações funcionais com `npm --prefix frontend test` e `npm --prefix frontend run build`.
- Valide o build da API com `npm --prefix backend run build`.
- A publicação usa a conta do time KIPP na Vercel, o projeto `kipp-earth-trends-lab`, Root Directory `frontend` e Production Branch `main`.
- Mantenha a configuração de build em `frontend/vercel.json`. A publicação automática ocorre pela integração Git da Vercel.
- Diferencie dados simulados de observações reais. Nunca apresente os números do protótipo como descobertas científicas.

## Aderência ao NASA Space Apps 2026

- Antes de planejar ou alterar código, dados, conteúdo, apresentação ou publicação, leia [os requisitos do desafio](docs/space-apps-2026-requisitos.md) e [o checklist de entrega](docs/space-apps-2026-entrega.md). Aplique os pontos relevantes e atualize evidências e pendências quando o trabalho mudar o estado da entrega.
- Priorize o fluxo do desafio oficial **Be An Earth System Trend Detective!**: variável terrestre → dados da região → período e série temporal → taxa de mudança → significância e interpretação. Novas funcionalidades devem apoiar esse fluxo; não substitua análise por visualização.
- Feche ao menos uma investigação reproduzível com dados reais e documente uso efetivo de recurso NASA indicado no desafio. Imagem de fundo, referência bibliográfica, pipeline ou job publicado isoladamente não comprovam a investigação final.
- Preserve a distinção entre observações, estimativas, reanálises e simulações em telas, gráficos, exportações e apresentações. Exponha proveniência, unidades, cobertura, método e limitações; não invente dados, significância, causalidade, funcionalidades prontas ou elegibilidade.
- A entrega e o percurso principal para avaliação devem ser principalmente em inglês, conforme orientação recebida; português pode ser complementar. A documentação interna pode permanecer em português.
- Registre fontes, ferramentas, imagens, licenças e uso de IA; identifique conteúdos gerados e mantenha o registro de IA no checklist. Confira o guia oficial antes de declarar conformidade completa.
- Prepare demonstração de até 30 segundos OU apresentação de até 7 slides; mantenha links públicos sem senha. A entrega avaliada é a página Project no Space Apps, que precisa ser atualizada e efetivamente submetida; GitHub/Vercel não a substituem.
- Siga a orientação recebida de equipe registrada com 2–6 integrantes. A FAQ distingue equipes locais (1–6) de Universal (2–6); registre divergências e confirme o evento da equipe sem apresentar a orientação local como regra global universal.
- Prazo informado: **15/11/2026 às 23h59 locais**. Confirme evento/fuso efetivo e eventual prazo anterior; America/Sao_Paulo é apenas a referência provisória deste projeto. Conforme alerta recebido dos avaliadores, congele materiais submetidos e vinculados antes do prazo, inclusive deploys automáticos. Após o prazo, não altere esses materiais; trabalho posterior deve ficar em versão/branch separada sem atualizar os links avaliados.
- Distingua requisitos oficiais, instruções dos avaliadores e escolhas internas. Não marque itens concluídos sem evidência verificável; registre dúvidas e fontes conflitantes nos documentos acima.
