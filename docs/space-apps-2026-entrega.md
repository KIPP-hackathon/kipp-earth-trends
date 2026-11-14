# Space Apps 2026 — checklist de entrega e evidências

> Diagnóstico baseado no checkout local `9f011a8` e nas alterações presentes em 14/11/2026. A `main` remota já continha commits posteriores no momento da publicação; revalidar os estados e pendências contra a versão atual antes de tratá-los como diagnóstico do produto publicado.

Revisão inicial: **14/11/2026**. Base: [requisitos e fontes](space-apps-2026-requisitos.md).
Checklist ainda **não aprovado**: itens só podem ser marcados com evidência verificável.
A revisão do repositório não confirma inscrição, recursos privados ou submissão.

## Identificação a completar pela equipe

| Campo | Valor |
| --- | --- |
| Nome | KIPP |
| Desafio | Be An Earth System Trend Detective! |
| URL pública da equipe / Project | Pendente |
| Evento e fuso efetivo da inscrição | Pendente; planejamento provisório: America/Sao_Paulo |
| Integrantes registrados e contribuições | Pendente; seguir 2–6 da orientação recebida |
| Responsável pela submissão e substituto | Pendente |
| Prazo efetivo e eventual prazo local anterior | Confirmar; mensagem recebida: 15/11/2026, 23h59 locais |
| Protótipo | https://kipp-earth-trends-lab.vercel.app/ — testar sem login |
| Código | https://github.com/KIPP-hackathon/kipp-earth-trends — confirmar visibilidade |
| Versão final: commit / deploy / arquivos | Pendente |
| Confirmação de submissão e horário com fuso | Pendente |

## Bloqueadores antes de declarar a entrega pronta

- [ ] **Cadastro:** cada integrante registrado, no mesmo evento; uma equipe por pessoa, um desafio por equipe; limites conferidos. Evidência: pendente.
- [ ] **Regras:** ler guias completos de submissão, julgamento, IA e termos da edição; registrar links, versão/data e divergências com as mensagens locais. Evidência: pendente.
- [ ] **Página oficial:** preencher todos os campos obrigatórios em inglês e atualizar a evolução durante o evento. Evidência: URL Project pendente.
- [ ] **Uso NASA:** identificar ao menos um recurso NASA listado no desafio efetivamente utilizado, produto/versão e contribuição; linkar evidência no código, dados ou análise. Não basta lista de fontes. Evidência: pendente.
- [ ] **Caso real completo:** variável, região, período, série temporal, taxa de mudança com unidade, significância e interpretação reproduzíveis. Frontend atual ainda simulado. Evidência: pendente.
- [ ] **Método:** documentar QA/nulos, agregação, histórico, sazonalidade, IC ou teste, pressupostos e limitações; conferir os números com referência reproduzível. Evidência: pendente.
- [ ] **Inglês:** página Project, demo/slides e percurso principal do protótipo compreensíveis aos jurados internacionais. Evidência: pendente.
- [ ] **Apresentação:** vídeo ≤30 segundos OU slides ≤7; medir, testar link e mostrar resultado real sem confundir simulação com observação. Evidência: pendente.
- [ ] **IA:** completar inventário abaixo, identificar conteúdos gerados e adaptar a declaração às regras oficiais e campos da plataforma. Evidência: pendente.
- [ ] **Créditos:** consolidar datasets, ferramentas, código, imagens, fontes, artigos, licenças e materiais reaproveitados, com uso real identificado. Evidência: pendente.
- [ ] **Links:** abrir Project, site, código, demo/slides e materiais em sessão sem login; nenhum deve pedir senha/permissão. Não usar links privados de jobs como única evidência pública. Evidência: pendente.
- [ ] **Validação:** executar testes/build com Node.js 24 após mudanças funcionais; verificar manualmente o caso apresentado e correspondência com a versão publicada. Evidência: pendente.
- [ ] **Submissão:** concluir o envio na plataforma antes do prazo efetivo e guardar confirmação/horário; rascunho não comprova envio. Evidência: pendente.
- [ ] **Congelamento:** registrar commit, deploy e versões públicas finais antes do prazo; interromper atualizações dos materiais vinculados, inclusive publicação automática, conforme alerta recebido. Evidência: pendente.

## Qualidade da candidatura — dicas dos avaliadores

- [ ] Problema, público beneficiado e conexão com o desafio explícitos.
- [ ] Contribuição concreta dos dados NASA demonstrada.
- [ ] Diferencial explicado por comparação e exemplo, sem alegações vagas.
- [ ] Protótipo demonstrável com caminho curto e estável.
- [ ] Impacto esperado separado de resultados já medidos.
- [ ] Documentação cobre descrição, tecnologias, dados, imagens, vídeos e links.
- [ ] Narrativa simples em inglês: problema → solução → método → resultado → limitações.
- [ ] Campos obrigatórios, critérios e prazos conferidos na plataforma.
- [ ] Responsabilidades e contribuições reais registradas.
- [ ] Aplicação em outros lugares/públicos descrita como realizada ou futura, conforme a evidência.

## Registro de fontes e materiais

Créditos existentes em [frontend/README.md](../frontend/README.md); inventário científico em [acompanhamento-fontes.md](acompanhamento-fontes.md). Completar e publicar as informações relevantes em inglês na entrega. Uma fonte candidata não deve aparecer como efetivamente utilizada.

| Material | Uso identificado nesta revisão | Pendência para entrega |
| --- | --- | --- |
| NASA Blue Marble Next Generation, janeiro de 2004 | Textura estática do globo; link nos créditos do frontend. | Crédito público em inglês; não apresentar a textura como observação mensal ou série analisada. |
| Natural Earth via world-atlas | Limites cartográficos; link no README do frontend. | Conferir atribuição e licença. |
| MERRA-2 / GPM IMERG / MODIS | Estudos, extrações e pipelines documentados. | Indicar produto, versão, variáveis e arquivos efetivamente consumidos pelo caso final; distinguir reanálise e estimativas. |
| Manrope / Instrument Serif / Lucide e dependências | Fontes, ícones e bibliotecas do frontend. | Consolidar ferramentas e licenças aplicáveis. |
| Catálogo de eventos e artigos | Referências em `frontend/src/lib/events.ts` e estudos. | Conferir todos os materiais usados na narrativa final e suas atribuições. |
| Recursos oficiais do desafio | Contexto documentado em `space-apps-2026-requisitos.md`. | Identificar qual recurso NASA listado foi efetivamente usado pela solução. |

Para cada dado real entregue, preencher: **produtor; produto/versão; URL/DOI; variável/unidade; região/máscara; período/resolução; acesso; QA/nulos; transformações; arquivo público ou resultado; licença/termos; responsável pela revisão**.

## Registro de IA

Evidência técnica adicional de 14/11/2026: a migração do backend para Lakebase
conferiu as quatro tabelas de MERRA-2 e IMERG, nomes/tipos de colunas,
20.793.600 registros e coberturas de 33/33/21/13 meses. O adaptador real retornou
catálogo, frames e séries para as quatro variáveis; detalhes em
[backend-lakebase.md](backend-lakebase.md). Isso comprova leitura técnica dos
dados e não encerra os itens de investigação científica, significância ou
submissão oficial acima.

Publicação verificada: revisão `kipp-earth-api-00013-zoh` com 100% do tráfego,
[CI/CD concluído](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43632060854).
O [catálogo público pelo aplicativo](https://kipp-earth-trends-lab.vercel.app/api/earth/v1/catalog)
confirmou `lakebase-postgres`; frames e séries das quatro variáveis também
foram consultados sem login pela rota Vercel. Isso é evidência de integração
dos dados, sem declarar concluída a investigação científica final.

Não confundir IA usada no desenvolvimento com IA executada dentro do produto. A declaração deve abranger ambas quando existirem. Não declarar o histórico completo como revisado a partir desta única sessão.

| Ferramenta/modelo | Data e finalidade | Conteúdo gerado/assistido | Revisão humana |
| --- | --- | --- | --- |
| OpenAI Codex; identificador exato do modelo não verificado | 14/11/2026 — leitura do repositório, consulta de páginas e organização de requisitos. | Documentos `docs/space-apps-2026-requisitos.md`, `docs/space-apps-2026-entrega.md` e seção de regras no `AGENTS.md`. | Pendente de revisão da equipe. |
| Outras ferramentas ou usos anteriores | A completar pela equipe. | Código, textos, traduções, imagens, dados sintéticos, slides ou vídeo, se aplicável. | Pendente. |
| OpenAI Codex; identificador exato do modelo não verificado | 14/11/2026 — migração da leitura backend para Lakebase e verificação das tabelas. | Configuração de deploy/smoke em `backend/scripts/`, exemplo de ambiente, README e documentação `docs/backend-lakebase.md` e plano/spec associados. | Validação automatizada e consultas reais executadas; revisão da equipe pendente. |

Rascunho **parcial** em inglês, para completar antes de publicar:

> AI use disclosure (partial draft): We used OpenAI Codex to assist with repository review, challenge research, and drafting the requirements and submission checklist on November 14, 2026. The generated documentation is identified in our AI-use register. Team review is pending. Additional AI-assisted code, text, translations, images, synthetic data, or presentation materials must be listed before submission. Synthetic prototype values are not NASA observations or scientific findings.

Registrar ferramenta/modelo quando conhecido, finalidade, arquivos/trechos gerados e revisão. Não inventar identificadores ou validação humana. A forma final de identificação precisa obedecer ao guia oficial, ainda pendente de conferência.

## Evidência incremental — faixa visual do mapa (14/11/2026)

A legenda permite mínimo/máximo em unidades da variável, Apply/Reset e opção de
ocultar células fora da faixa inclusiva. A mesma variável compartilha os limites
entre os painéis A/B; classes categóricas preservam seus rótulos. A operação é
apenas visual: não recalcula dados, QA, série, taxa de mudança, significância ou
exportações. Não encerra os bloqueadores científicos ou de submissão acima.

Build Node.js 24 e verificação de um quadro real de temperatura (51.840 células)
confirmaram 31.926 células visíveis na faixa 0–50 °C para janeiro de 2024,
limites inclusivos e arrays originais preservados. Essa contagem é de bins de
exibição, não de área terrestre nem resultado de investigação climática.

Uso de IA nesta alteração: OpenAI Codex assistiu a implementação de controles,
renderização e estado de escala nos componentes do frontend e neste registro.
Identificador exato do modelo não verificado; revisão humana da equipe pendente.
Os controles novos usam inglês; a tradução integral do percurso continua pendente.

## Evidência incremental — assistente v1 (14/11/2026)

OpenAI Codex assistiu a implementação do chat, contratos, ferramentas, autenticação
servidora e controles de uso. O produto executa Gemini 3.8 Flash no Vertex AI,
com ADC e processamento US multi-region, para interpretar perguntas e propor
comandos. Cálculos descritivos e acesso aos dados são feitos pelo backend.
Respostas são conteúdo gerado por IA, identificado na interface; revisão humana
da equipe pendente. Ver [arquitetura, limites e evidências](assistant-v1.md).

Consultas reais conferiram quatro variáveis Lakebase, comparação e períodos
sem observações. O navegador confirmou dois globos com temperatura MERRA-2
no Pantanal, janeiro–março e abril–junho de 2024. A resposta preserva o snapshot
do pedido e não apresenta diferenças descritivas como significância ou causa.
Essa integração não encerra os bloqueadores científicos e de submissão acima.
Atualização visual em 14/11/2026: paleta da interface inspirada na referência NASA fornecida pela equipe (azul #0B3D91, branco e vermelho #FC3D21), assistida por OpenAI Codex. Escalas científicas dos dados preservadas. Revisão humana pendente.

Publicação do assistente conferida em produção: código `b43559a`,
revisão Cloud Run `kipp-earth-api-00027-buk`,
[CI/CD aprovado](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43639597761).
O navegador configurou A/B em março/junho de 2024 e escala compartilhada
0–50 °C por pedido em linguagem natural. Acesso anônimo direto ao Cloud Run
retornou 403; varredura do bundle público não encontrou tokens, chaves privadas
ou implementação de autenticação servidora. Chat público com limites persistentes,
sem afirmar que Origin autentica cada visitante ou que IA comprova resultados científicos.

## Evidência incremental — câmera e header compacto (14/11/2026)

OpenAI Codex assistiu a transição de câmera (900 ms, arco curto de longitude,
zoom gradual e estado compartilhado A/B) e a navegação compacta. O navegador
confirmou posições intermediárias sincronizadas em um pedido real ao agente
e interrupção do voo por interação manual, sem interpolar observações.
Preferência de movimento reduzido é respeitada pelo frontend; a API e seus
controles de acesso não foram alterados.

As cinco tabs passaram para o header, ao lado do logo; título/subtítulo grandes
foram removidos. Fontes, guia e atualização de catálogo permanecem no rodapé.
A distinção entre dados derivados, imagem base estática e limites científicos
permanece nas fontes/proveniência e em nota abaixo do conteúdo. Em 390 px,
o header manteve as cinco tabs em barra rolável sem overflow horizontal da página.
Build Node.js 24 verificado; revisão humana da equipe pendente.
Revisão visual em 14/11/2026: tema claro solicitado pela equipe, com superfícies brancas, fundo cinza-azulado, azul NASA #0B3D91 e vermelho #FC3D21. Implementação assistida por OpenAI Codex; escalas dos dados preservadas.

Publicação conferida em `62c17eb`: cinco tabs no header, sem hero, conteúdo a
20 px do header. Um comando real de câmera ao Japão produziu posições
intermediárias sincronizadas A/B durante aproximadamente 900 ms. Os ajustes
de tema claro que chegaram pela `main` foram preservados. Isso registra UX,
sem modificar as observações ou encerrar os itens científicos pendentes.

## Evidência incremental — seleção espacial e workspaces (14/11/2026)

OpenAI Codex assistiu o desenho de retângulos, grade limitada por bbox, calendário
mensal, ambiente espacial decorativo e separação persistente de Explorar/Comparar.
Ver [fluxo, método e evidências](area-selection.md). O fundo de estrelas não é
um catálogo astronômico nem uma camada de observações. Nenhuma credencial ou
permissão de provedor foi adicionada. Revisão humana da equipe pendente.

O navegador confirmou o desenho com soltura aplicando o mesmo bbox à camada
e à série real (21×24 bins de exibição, 33 meses); calendário só com meses
disponíveis; ausência de seletor de recorte em Explorar; três canvases e filtros/
câmeras independentes entre workspaces. A troca feita pelo agente passou a
exigir área/período explícitos para evitar analisar um bbox e mostrar outro.
Builds Node.js 24 e 29 verificações preexistentes passaram; consulta real também
conferiu um recorte cruzando o antimeridiano. Esses controles não demonstram
significância, previsão ou causalidade, nem encerram a investigação/submissão.
