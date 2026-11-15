# Temperatura MERRA-2 da camada trusted

Migração iniciada em 14/11/2026, a pedido da equipe.

- Origem: `earth-trend-data.trusted.tb_merra2_t10m` (Delta).
- Compartilhamento: `merra2_rt_share`, exposto como
  `merra2_shared.trusted.tb_merra2_t10m` no workspace Lakebase.
- Destino: `nasa_hacka_lakebase.default.tb_merra2_t10m_trusted`, projeto
  `rt-demo`, branch `production`, banco `databricks_postgres`.
- Política: `SNAPSHOT`; atualizações posteriores da origem exigem novo sync.
- Chave: `latitude`, `longitude`, `time`; `time` é DATE em UTC.
- Valor da API: `air_temperature_at_10_meters_celsius`, já em °C;
  nenhuma segunda conversão de Kelvin é aplicada.
- Proveniência preservada: `source_file` e `source_file_modified_at`.

A origem retornou **66.747.456 registros**, **321 meses**, de 2000-01-01
a 2026-09-01, todos com temperatura Celsius preenchida; mínimo -73,36806 °C
e máximo 41,92935 °C. Statement: `01f1e092-510b-1a92-bdf4-510fe12b10fe`.
Pipeline: `3f10b1b6-a5ad-45a4-b966-a1cc52e02d83`, update
`61ecae82-c4e1-425f-9c38-c9d2330c1de5`.

A tabela antiga no Lakebase, `default.tb_merra2_t10m`, vinha de
`earth-trend-data.refined.tb_merra2_t10m` e tinha 33 meses. Sua remoção está
condicionada à conclusão da carga, validação PostgreSQL e troca da API
publicada. As tabelas Delta na origem não fazem parte da exclusão no Lakebase.

O registro `temperature` da API usa os nomes nativos da trusted, incluindo
coordenadas; as demais variáveis mantêm seu mapeamento. O modo SQL explícito
também aponta para a trusted. Séries e períodos do assistente passam de 120
para 360 meses; o frontend preserva o calendário completo, incluindo lacunas.

Validação local na versão atual de `origin/main`, com Node.js 24: 47 testes
do frontend, 9 testes do backend e ambos os builds passaram. Os testes novos
cobrem os nomes de colunas, destino por provedor, antimeridiano e os 321 meses.
Conclusão da carga, conferência PostgreSQL, publicação e exclusão: pendentes.

OpenAI Codex assistiu a migração, os mapeamentos, testes e documentação.
Revisão humana da equipe pendente. São dados de reanálise MERRA-2, não
simulações nem observações diretas; esta integração não encerra os itens de
investigação reproduzível, significância ou submissão do desafio.
