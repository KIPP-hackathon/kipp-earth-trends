# Backend de dados KIPP no Cloud Run

Objetivo autorizado: criar e publicar uma API performática no projeto GCP
`nasa-earth-trends-lab`, região `us-east4`, usando somente a identidade pessoal
do hackathon. Fonte atual: tabelas Delta do Databricks SQL no workspace GCP
8259554586019913. Fonte futura: Lakebase/PostgreSQL em us-east4. A instrução
posterior do usuário exclui leitura direta de `kipp/serving` e do Cloud Storage.

## Abordagem

Node.js 24, TypeScript, Fastify, cache LRU limitado por bytes e agrupamento de
requisições idênticas. Dois adaptadores de consulta: Databricks Statement API
agora; PostgreSQL (`pg`, pool e SSL) na migração. O frontend permanece publicado
sem alterações nesta entrega. Consultas parametrizadas e tabelas em allowlist;
nenhuma rota aceita SQL arbitrário. Identidade de aplicação dedicada e segredo
OAuth em Secret Manager. Dados públicos NASA podem ser lidos pela API, sem
acesso público às tabelas ou às credenciais.

Os 18.922.176 registros atuais incluem 207.936 posições por variável/mês. Usar
grades binárias Float32 com máscara de cobertura para o mapa, JSON limitado
para inspeção, recortes e agregação por resolução; séries temporais separadas.
Não processar ou transferir todo o histórico a cada interação. Manter unidades,
produto, execução Final/Late e valores ausentes. Não oferecer anomalias ou
inferência climática sem referência histórica adequada. Vento com unidade
inconsistente e vegetação sem tabela consultável não são expostos como prontos.

## Operação

Cloud Run com 1 CPU, 512 MiB, mínimo zero, máximo três instâncias e concorrência
32; consultas simultâneas ao Databricks limitadas por instância. Deploy por
Dockerfile/Cloud Build e script reproduzível. Endpoints de saúde, catálogo,
disponibilidade, grade e série regional. Host, warehouse e tabelas configuráveis
para migração sem alteração do contrato HTTP.

O usuário pediu velocidade e dispensou testes automatizados nesta etapa.
Validar compilação e chamadas reais do backend publicado, sem repetir a suíte
do frontend. Documentar resultados e limitações; não prometer desempenho não medido.
