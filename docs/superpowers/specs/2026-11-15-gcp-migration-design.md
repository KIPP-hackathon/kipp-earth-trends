# Migração GCP do backend KIPP

Data: 15/11/2026 (America/Sao_Paulo). Estado: desenho aprovado em chat; execução em andamento.

## Objetivo e autorização

Migrar a API Cloud Run hoje no projeto `nasa-earth-trends-lab` (583662795760)
para `kipp-space-apps-2026` (696766216489), criado nesta conversa com a conta
`kipp.nasa@gmail.com`. Preservar o funcionamento do site, dados reais, chat,
autenticação privada e publicação automática.

## Estado conferido

- Serviço `kipp-earth-api`, região `us-east4`, revisão `kipp-earth-api-00039-yiy`.
- Imagem ativa: digest `sha256:66360d8bb958780125f006922c6d521d146ed0996e267e41446f24023b37a5bf`.
- 1 CPU, 512 MiB, concorrência 32, mínimo zero, máximo três instâncias por revisão,
  timeout 60 segundos, startup probe `/ready`.
- Runtime atual usa Google ID para o Warehouse `74a8d94611137690` no workspace
  `https://8259554586019913.3.gcp.databricks.com`.
- Dados: `earth-trend-data.trusted`, 72 variáveis, e duas referências explícitas
  em `earth-trend-data.refined`. Sem migração do Warehouse ou dos dados.
- Vertex AI e Firestore do chat têm o projeto antigo fixo no código.
- Proxy Vercel tem URL, provider WIF e invoker antigos fixos no código.
- GitHub Actions usa WIF e deployer do projeto antigo.
- O checkout principal contém alterações locais de frontend de outros trabalhos.

## Abordagem

Usar migração paralela, com preparação e validação do novo serviço antes da
troca do proxy. A reversão mantém o serviço antigo e uma versão anterior do
frontend disponíveis. Uma troca antes de validar Databricks, IA e federação
não oferece a mesma possibilidade de checagem sem interromper o percurso atual.

Decisões propostas pelo agente: manter `us-east4`, nome `kipp-earth-api`, limites
de execução e contratos HTTP; criar identidades dedicadas no projeto novo;
usar o código da `main` publicada como base em workspace isolado. Sem redesign,
mudança de modelo, cópia de credenciais privadas ou alterações científicas.

## Componentes

1. Habilitar Cloud Run, Artifact Registry, IAM Credentials, STS, Vertex AI e
   Firestore no projeto novo, sem ativar upgrade de conta paga.
2. Criar Artifact Registry e SAs `kipp-earth-api`, `kipp-earth-deployer` e
   `kipp-vercel-invoker` no projeto novo. Não criar chaves JSON.
3. Registrar a nova SA runtime como usuário Google no mesmo Databricks e conceder
   apenas SQL access, CAN USE no Warehouse, USE CATALOG/SCHEMA e SELECT nas
   tabelas já revisadas. Preservar todos os acessos existentes.
4. Dar ao runtime `aiplatform.user` e acesso ao único banco Firestore utilizado
   para contadores do chat. Criar o banco em região compatível e copiar apenas
   os contadores necessários na troca, sem registrar seus valores no Git/logs.
   Coordenar a transição para não perder incrementos em requisições em voo:
   bloquear reservas no banco antigo por transação, salvar o total real e copiar
   contadores ativos antes da troca do proxy, somando o uso dos testes no destino.
   Na reversão, bloquear primeiro o destino e reconciliar o dia e a hora atuais.
   Recusar a operação perto da meia-noite UTC e retirar o invoker antigo após
   conferir o proxy novo. Não reiniciar o limite diário silenciosamente.
5. Replicar WIF GitHub com repository_id 1457842425, repository_owner_id
   356640671, `main`, workflow exato e eventos push/workflow_dispatch.
   Deployer acessa apenas este serviço, repositório e SA runtime.
6. Replicar WIF Vercel com issuer `https://oidc.vercel.com/lucas-projects-62e8b289`,
   audience `https://vercel.com/lucas-projects-62e8b289` e subject
   `owner:lucas-projects-62e8b289:project:kipp-earth-trends-lab:environment:production`.
   Invoker recebe somente `run.invoker` neste serviço.
7. Publicar e testar o novo backend com IAM obrigatório, sem allUsers ou
   allAuthenticatedUsers. A primeira publicação usa a conta proprietária;
   publicações seguintes usam o CI com permissões reduzidas.
8. Atualizar constantes do backend, proxy, defaults dos scripts e CI/CD; manter
   caminhos de override explícitos para operação/reversão. Atualizar documentação
   atual sem reescrever evidências históricas de implantações anteriores.
9. Trocar a Vercel pela integração Git existente depois das verificações locais
   e do backend novo; aguardar a publicação Vercel antes de executar o smoke
   que exige a revisão do backend novo e confirmar um CI posterior. A primeira
   atualização do CI poderá ser separada da troca do proxy para evitar corrida.

## Validação e critérios de aceite

- Node.js 24; testes preexistentes do backend/frontend e ambos os builds.
- Runtime novo autentica no Databricks com Google ID da SA nova, sem segredo.
- Startup/readiness bem-sucedidos e catálogo real com as 72 variáveis.
- Frame, série, tendência armazenada e comparação com proveniência preservada.
- Chat faz chamada real ao Vertex e reserva quota persistente no Firestore novo.
- Endpoint direto anônimo responde 401/403; Vercel responde 200 com revisão nova.
- WIF restrita e ausência de credenciais no bundle público.
- Publicação posterior pelo GitHub Actions usa o projeto novo e passa o smoke.
- Documentar URLs, revisões, commit/CI e pendências observadas, sem declarar
  investigação científica ou submissão Space Apps concluídas.

## Reversão e limites

Manter o serviço, imagens e identidades antigos. Se o teste pelo site falhar,
restaurar o deployment anterior da Vercel ou reverter o commit de roteamento;
não remover recursos antigos nesta tarefa. Não migrar os dados Databricks,
não encerrar o projeto antigo nem modificar recursos corporativos.

Toda alteração vinculada à entrega precisa terminar antes de seu prazo efetivo;
o evento/fuso ainda deve ser confirmado pela equipe. A referência provisória é
15/11/2026 às 23h59 America/Sao_Paulo, conforme os documentos do projeto.

## Acessos e decisões pendentes

- O usuário determinou explicitamente nesta conversa que seja usado somente
  seu GitHub pessoal, substituindo a orientação corporativa anterior para esta
  tarefa. Conta `Luckstai`; identidade Git local Lucas Henrique /
  `lucas.henrique.tai@gmail.com`. Conferir a conta e a permissão antes de push/PR.
- A integração MCP Vercel não acessou o time, e sua tentativa de autorização
  respondeu Team not found. A integração Git existente poderá publicar a troca;
  operações manuais na Vercel exigirão acesso disponível e verificado.
- Desenho e worktree isolado aprovados explicitamente pelo usuário em chat.
- Se Vertex bloquear o projeto em avaliação, não realizar upgrade pago nem
  cortar o tráfego com funcionalidade quebrada; registrar a restrição e pedir
  a decisão específica necessária.
