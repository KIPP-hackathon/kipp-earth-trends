# Dados reais, reprodução e Lakebase

A API usa roteamento explícito por variável: temperatura do ar a 10 m,
superfície e chuva mensal Final/Late vêm do Lakebase; as demais variáveis
revisadas vêm do Databricks SQL. Não há fallback silencioso entre as origens. Não lê volumes `kipp/serving` ou GCS.

## Catálogo

O registro revisado expõe 72 variáveis de 68 tabelas NASA em
`earth-trend-data.refined`. Duas tabelas são excluídas explicitamente: `merra2_ts`
legada e SPEED com conversão de unidade inválida. Campos de erro, codificação
raw e QA são auxiliares, não camadas científicas independentes.

Temperaturas usam °C, pressões hPa e umidade específica g/kg. Conversões de
variância usam o quadrado do fator, sem deslocamento. MODIS NDVI/EVI aplica
faixa [-0,2;1], pixel_reliability=0 e vi_quality diferente de 65535; esse filtro
conservador não substitui a interpretação completa dos bits QA. GRACE em Gt
soma massa por célula válida; anomalias têm referência 2004–2009 e não isolam
água subterrânea. Classes de gelo usam moda ponderada, não uma média das classes.

`GET /v1/catalog` publica unidade, conversão, regra QA, agregação, produto,
meses disponíveis e política de renderização. Consultas de disponibilidade
agrupam colunas da mesma tabela e usam nove lotes, com até dois em paralelo e
orçamento total de 45 s. Saturação/timeout não é cacheado como fonte ausente.
`GET /v1/config` fornece regiões e políticas de reprodução/comparação.
`GET /v1/events` fornece fichas históricas, fontes, bbox de contexto e a
sobreposição com meses reais. As fichas são curadas, não detecções automáticas.

A escala de cores é fixa por variável, para comparar os globos. Seus extremos
são parâmetros de visualização; não são limites físicos ou mínimos/máximos
científicos globais. A grade é renderizada como textura na GPU, sem milhões de
elementos DOM. O backend entrega bins, não cada registro nativo.

## Reprodução

HTTP binário, cache compartilhado de frames de até 32 MiB no navegador,
deduplicação e até dois downloads simultâneos. Os próximos meses são preparados
em segundo plano. O quadro anterior compatível permanece até o próximo estar
pronto; o mês exibido sempre pertence ao quadro visível. Câmera e interação
não reiniciam por causa do play. Consultas mensais estáticas não precisam de
WebSocket para esse comportamento.

## RT inspecionado em 14/11/2026

Workspace `8259552519150212.2.gcp.databricks.com`, projeto `rt-demo`, branch
`production`, database `databricks_postgres`, schema `default`, us-east4.
Endpoint de 0,5 CU e PostgreSQL 17. Foram encontradas 32 tabelas, contra 70 na
origem SQL. Na primeira inspeção, T2M e T10M retornaram COUNT=0 e uma consulta de cobertura
de chuva excedeu 8 s. Depois, o time concluiu a sincronização das quatro fontes
já publicadas, conforme [validação Lakebase](backend-lakebase.md), com 20.793.600
registros e cobertura conferida. Essas quatro variáveis passam a usar RT; as
demais continuam no Warehouse. Tempo baixo em uma tabela vazia não demonstra performance
sobre observações reais. Não migrar as outras fontes para esse endpoint antes da carga e validação.

A identidade dedicada OAuth M2M foi habilitada no workspace e recebeu somente
CONNECT/USAGE/SELECT nas 32 tabelas explicitadas em
`backend/scripts/lakebase-read-access.sql`, por autorização do usuário.
Uma conexão TLS real confirmou SELECT permitido e INSERT/UPDATE negados.
A conta admin foi usada para inspeção e concessão, não como usuário de runtime.

Os índices visíveis na inspeção tinham chave (lat,lon,time), sem índice temporal
inicial. Antes de rotear fontes prontas para RT, medir consultas reais por mês e
bbox; validar cobertura/QA e equivalência com SQL; avaliar índice por time e
pré-agregações adequadas ao endpoint pequeno. Nenhum índice, tabela, dado ou
capacidade do Lakebase foi alterado nesta tarefa.

## Evidências

Builds Node.js 24 e consultas reais, sem novas suítes conforme a prioridade do
hackathon. Catálogo M2M frio: 72 variáveis disponíveis em cerca de 17 s.
Frames regionais de T2M, variância de pressão, GRACE, gelo categórico e NDVI,
e série de concentração de gelo, responderam em aproximadamente 1 s cada.
Esses tempos são amostras funcionais, não um ensaio de carga ou SLA.

O acesso Cloud Run exige IAM com a identidade de produção do projeto Vercel;
veja [acesso Vercel/Cloud Run](acesso-vercel-cloud-run.md).
