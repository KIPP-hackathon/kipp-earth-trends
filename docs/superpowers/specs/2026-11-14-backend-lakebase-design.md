# Ativar leitura Lakebase no backend existente

O usuário autorizou verificar as quatro tabelas da API e ler do Lakebase as
disponíveis. As quatro estão online e sem atualização pendente no projeto
`rt-demo`, branch `production`, schema PostgreSQL `default`.

| Tabela | Registros | Meses |
| --- | ---: | ---: |
| tb_merra2_t10m | 6.861.888 | 33 |
| tb_merra2_ts | 6.861.888 | 33 |
| tb_gpm_imerg_precipitation | 4.366.656 | 21 |
| tb_gpm_imerg_late_precipitation | 2.703.168 | 13 |

As colunas necessárias preservam nomes, tipos e caixa. Não usar `merra2_ts`,
uma cópia anterior de cobertura menor. Reutilizar o adaptador Postgres já
implementado e configurar `DATA_PROVIDER=lakebase-postgres` no CI/CD.
Não é necessário roteamento híbrido: todas as tabelas estão disponíveis.
Manter modo SQL explícito para rollback, sem fallback silencioso em erros.

Runtime continua a SA Google existente, registrada no workspace Lakebase e
como papel OAuth USER no PostgreSQL, com CONNECT, USAGE e SELECT apenas nas
quatro tabelas. Google ID token com audience do workspace Lakebase solicita
credencial PostgreSQL temporária. TLS exige certificado válido.

Preservar a publicação privada e o proxy Vercel introduzidos na main. A revisão
candidata passa pelo startup probe; smoke checks pelo proxy devem confirmar
provider Lakebase e as quatro coberturas. Conferir também frame e série reais.
Falha antes da promoção preserva revisão anterior; falha no proxy aciona rollback.
Não alterar syncs, tamanho do endpoint, outras tabelas ou contrato frontend.
