# Backend com leitura Lakebase

O deploy usa por padrão `DATA_PROVIDER=lakebase-postgres`. As quatro tabelas
usadas pela API já estavam sincronizadas no Lakebase; nenhuma cópia adicional
ou rotina de sync foi criada para esta alteração.

Destino: projeto `rt-demo`, branch `production`, endpoint `primary`, banco
`databricks_postgres`, schema `default`. Host:
`ep-gentle-glade-g3123wa8.database.us-east4.gcp.databricks.com`.
Workspace de autenticação: `https://8259552519150212.2.gcp.databricks.com`.

| Variável | Tabela | Registros | Meses | Cobertura |
| --- | --- | ---: | ---: | --- |
| temperature | tb_merra2_t10m | 6.861.888 | 33 | 2024-01 a 2026-09 |
| surface_temperature | tb_merra2_ts | 6.861.888 | 33 | 2024-01 a 2026-09 |
| rainfall | tb_gpm_imerg_precipitation | 4.366.656 | 21 | 2024-01 a 2025-09 |
| rainfall_late | tb_gpm_imerg_late_precipitation | 2.703.168 | 13 | 2025-10 a 2026-10 |

Total: 20.793.600 registros. A tabela antiga `merra2_ts` não é usada: ela
possui somente 21 meses. A tabela correta `tb_merra2_ts` mantém os 33 meses
expostos anteriormente pela API.

## Identidade

A SA `kipp-earth-api@nasa-earth-trends-lab.iam.gserviceaccount.com` foi adicionada
ao workspace Lakebase com workspace-access, CAN USE no projeto e papel OAuth
USER `projects/rt-demo/branches/production/roles/kipp-cloud-run-api`. No banco,
recebeu CONNECT, USAGE em `default` e SELECT somente nas quatro tabelas acima.
Não recebeu administração do banco ou escrita nas tabelas.

O token Google da SA, com audience do workspace Lakebase, chama
`POST /api/2.0/postgres/credentials` para obter a senha PostgreSQL temporária.
O pool abre até quatro conexões, renova antes da expiração e verifica TLS.
A API preserva parâmetros vinculados, allowlist de tabelas e contrato HTTP.

## Validação e operação

Em 14/11/2026, as quatro tabelas estavam com estado
`SYNCED_TABLE_ONLINE_NO_PENDING_UPDATE`. No PostgreSQL foram conferidos nomes
e tipos de colunas, COUNT, meses distintos e datas mínima/máxima. O adaptador
real DataService retornou os meses esperados, frames com células válidas e
séries não nulas para cada variável, sem alterar as tabelas.

O CI preserva Cloud Run privado e o proxy Vercel. Startup probe verifica
conexão real; o smoke pelo proxy exige `provider=lakebase-postgres`, dados
não simulados e quatro variáveis com meses disponíveis. Falha no smoke
restaura a revisão anterior. O tamanho e o estado de suspensão do endpoint
Lakebase não são modificados pelo deploy.

O modo SQL permanece disponível explicitamente com `DATA_PROVIDER=databricks-sql`
no script manual. Não há fallback silencioso entre fontes.

## Produção confirmada

O [PR #5](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/5) foi integrado
e a [execução 43632060854](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43632060854)
concluiu com sucesso. Revisão `kipp-earth-api-00013-zoh`, com 100% do tráfego.
O [catálogo via aplicação](https://kipp-earth-trends-lab.vercel.app/api/earth/v1/catalog)
retornou `provider=lakebase-postgres` e as coberturas 33/33/21/13. Frames com
células válidas e séries não nulas foram conferidos pela mesma rota Vercel para
as quatro variáveis; `X-Data-Provider` também confirmou Lakebase nas respostas.
O acesso anônimo direto ao Cloud Run retornou 403, preservando a política privada.
