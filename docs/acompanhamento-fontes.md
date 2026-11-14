# Acompanhamento das fontes de dados

Este arquivo acompanha as fontes discutidas pelo time, os arquivos efetivamente encontrados no GCS, os jobs publicados e as tabelas observadas no Unity Catalog. As entradas repetidas da discussão foram consolidadas por variável e produto.

Consulta dos objetos em 14/11/2026 às 14:32 (America/Sao_Paulo). As fontes estavam sendo enviadas durante o trabalho. Este documento registra o recorte desse horário. O deploy publicou 61 novos jobs, totalizando 66 jobs, cujos notebooks e YAMLs foram conferidos no workspace.

- [x] Comparar as fontes discutidas com os arquivos do GCS e as tabelas do catálogo.
- [x] Criar os notebooks e descrições das fontes disponíveis neste recorte.
- [x] Publicar e conferir os 66 jobs no workspace.

## Como acompanhar

`✓` registra uma etapa confirmada. `⬜` registra uma pendência. Uma fonte pode ter arquivos no GCS e job publicado enquanto sua carga no Databricks ainda está pendente. Os períodos das tabelas existentes abaixo vêm das estatísticas do catálogo, que podem estar defasadas em relação aos dados. A consulta não executou as cargas nem uma contagem integral das tabelas.

As tendências regionais e respostas ao El Niño citadas no planejamento são objetivos analíticos. Para marcá-las como concluídas, registrar período, climatologia, método, qualidade e resultado em uma análise própria. O protótipo continua com seus dados simulados identificados.

## Fontes discutidas pelo time

| Tema ou uso | Fonte e variável | GCS | Job publicado | Situação e próxima ação |
| --- | --- | --- | --- | --- |
| Calor, temperatura do ar | MERRA-2 T2M e T10M | ✓ CSVs de 2024-01 a 2026-09 | [T2M][merra2_t2m], [T10M][merra2_temperature_t10m] | T10M tem tabela existente. Executar a carga de T2M e revisar a altura usada na comparação |
| Calor, superfície terrestre | MODIS LST, coleção a selecionar, como MOD11 | ⬜ Produto LST ausente no inventário | ⬜ | Selecionar produto, dia/noite, QA e período, obter arquivos e criar ingestão |
| Superfície, fonte adicional já obtida | MERRA-2 TS | ✓ CSVs de 2024-01 a 2026-09 | [TS][merra2_surface_temperature] | Há tabela existente. Documentar o uso da temperatura da pele da superfície na análise |
| Ciclo da água e ENSO | GPM IMERG Final | ✓ 2024-01 a 2025-09 | [IMERG Final][gpm_imerg_precipitation] | Há tabela existente. Preparar análise regional de precipitação |
| Continuidade da chuva | GPM IMERG Late | ✓ 2025-10 a 2026-10 | [IMERG Late][gpm_imerg_late_precipitation] | Estatísticas da tabela vão até 2026-01. Planejar recarga e avaliar diferenças Final/Late |
| Água e gelo, base gravimétrica | GRACE/GRACE-FO JPL CRI RL06.3Mv04 | ✓ 2024-01 a 2026-09 | [GRACE][grace_jpl_mass_anomaly] | Executar carga da anomalia de massa total e revisar os componentes por região |
| Água subterrânea | Estimativa derivada de GRACE/GRACE-FO e componentes hidrológicos | Parcial, anomalia de massa disponível | Base no job GRACE | ⬜ Selecionar método/modelo e separar água superficial, solo, neve e demais componentes para estimar água subterrânea |
| Gelo marinho, Ártico | NSIDC G02135 v4, máscara de extensão | ✓ 2024-01 a 2026-10 | [Ártico][sea_ice_arctic] | Executar carga. Para série regional em km², obter ou calcular a medida com tratamento espacial apropriado |
| Gelo marinho, Antártida | NSIDC G02135 v4, máscara de extensão | ✓ 2024-01 a 2026-10 | [Antártida][sea_ice_antarctic] | Executar carga e avaliar os hemisférios em análises próprias |
| Massa das calotas | GRACE/GRACE-FO com agregação regional | Parcial, anomalia de massa disponível | Base no job GRACE | ⬜ Definir máscaras das calotas, área, correções e incerteza para a série regional |
| Nível do mar e ENSO | NASA-SSH / altimetria, produto a selecionar | ⬜ | ⬜ | Selecionar coleção e variável de nível/anomalia do mar, obter os arquivos e criar ingestão |
| Poluição do ar | OMI NO₂, coluna e coleção a selecionar | ⬜ | ⬜ | Definir coluna total ou troposférica, unidade, QA e versão e obter os dados |
| Fogo, detecções | FIRMS MODIS/VIIRS | ⬜ | ⬜ | Selecionar sensor, produto e período e obter as detecções com qualidade e horário |
| Fogo, área queimada | MODIS, produto de área queimada a selecionar | ⬜ | ⬜ | Obter produto com unidade de área e QA. A análise conjunta exige associar detecções e área queimada |
| Vegetação e resposta à seca | MODIS Terra MOD13C2 061, NDVI e EVI | ✓ HDF4 de 2024-01 a 2024-03 | [NDVI/EVI][modis_mod13c2_vegetation] | O leitor foi verificado em arquivo real. Executar carga, filtrar QA e ampliar o período |
| Vegetação, estrutura do dossel | MODIS LAI, produto a selecionar, como MOD15 | ⬜ | ⬜ | Selecionar coleção LAI e QA, obter arquivos e criar ingestão |
| CO₂ atmosférico | OCO-2, XCO₂ e qualidade | ⬜ | ⬜ | Selecionar nível/versão e obter as recuperações com flags e incerteza |
| ENSO, SST e Niño 3.4 | MUR SST ou produto MERRA-2 com variável/origem de SST confirmadas | ⬜ SST específica ausente | ⬜ | Obter SST com histórico de referência para 5°N–5°S e 170°O–120°O |
| ENSO, alísios | MERRA-2 U10M e V10M | ✓ 2024-01 a 2026-09 | [U10M][merra2_u10m], [V10M][merra2_v10m] | Executar cargas e calcular diagnóstico regional dos ventos |
| Vento, intensidade adicional | MERRA-2 SPEED | ✓ 2024-01 a 2026-09 | [SPEED][merra2_wind_speed] | Há tabela existente. ⬜ Corrigir a exportação SPEED_K/SPEED_C e confirmar as unidades na origem |
| ENSO, pressão e Tahiti–Darwin | MERRA-2 SLP | ✓ 2024-01 a 2026-09 | [SLP][merra2_slp] | Executar carga. ⬜ Definir amostragem das localidades e normalização para o índice de oscilação |
| Pressão, fonte adicional | MERRA-2 PS | ✓ 2024-01 a 2026-09 | [PS][merra2_ps] | Pressão de superfície disponível para carga. A análise Tahiti–Darwin deve usar a variável escolhida e documentada |
| Opcional, salinidade | SMAP salinidade oceânica, produto a selecionar | ⬜ | ⬜ | Selecionar produto de salinidade, período e flags e obter arquivos |
| Opcional, produtividade oceânica | MODIS Aqua clorofila | ⬜ | ⬜ | Selecionar produto ocean color, variável CHL e QA e obter arquivos |

O Sea Ice Index encontrado no bucket é um produto NSIDC/NOAA. A preferência por calcular Niño 3.4 a partir de SST será registrada na escolha desse produto e na definição de sua climatologia. [Sea Ice Index v4](https://nsidc.org/data/g02135/versions/4)

## Dados obtidos além da lista inicial

O bucket contém diagnósticos atmosféricos MERRA-2 adicionais, incluindo pressão e temperatura de nuvens, altura de deslocamento, alturas geopotenciais, movimento vertical, umidade, ozônio, água e gelo de nuvens e parâmetros da tropopausa. Cada conjunto com contrato próprio recebeu notebook, YAML de descrições e job, listados no inventário abaixo.

Os HDF4 MOD13C2 já continham NDVI e EVI, além dos GeoTIFFs NDVI e frames de visualização existentes. A ingestão criada usa os HDF4 originais, mantém QA e confiabilidade e lê os dados por blocos. Assim, a tabela preserva os dois índices e a grade de 0,05 grau.

## Checklist das próximas etapas

Os notebooks usam `mode("overwrite")` por padrão. Cada reprocessamento substitui o conteúdo da tabela pelos arquivos de origem selecionados e reaplica os comentários do YAML.

- [ ] Executar os novos jobs e confirmar contagens, período, nulos e comentários nas tabelas criadas.
- [ ] Recarregar IMERG Late conforme a estratégia do time para incluir os meses posteriores a 2026-01 indicados no GCS.
- [ ] Aplicar as descrições YAML às tabelas existentes durante o reprocessamento. Os comentários estavam ausentes na consulta do catálogo.
- [ ] Corrigir e validar a exportação de SPEED na origem.
- [ ] Ampliar o histórico MOD13C2 além dos três meses do piloto.
- [ ] Obter os produtos ainda pendentes da tabela de fontes discutidas.
- [ ] Definir climatologia e histórico de SST, média espacial ponderada por área e média móvel de três meses para o índice Niño 3.4.
- [ ] Calcular os diagnósticos de chuva, vegetação, vento, pressão e nível do mar associados a ENSO.
- [ ] Definir o método para água subterrânea e massa regional das calotas.
- [ ] Validar as tendências regionais discutidas com séries e métodos documentados.

## Convenções de atualização

Na próxima inclusão de fontes, atualizar a data e o horário da consulta, os arquivos/períodos observados, o link do job e a situação da tabela. Novos meses entram na mesma fonte. Mudanças de coleção, versão, granularidade ou schema devem ser avaliadas antes de ampliar um filtro.

O inventário completo de referências e portais está em [catálogo de fontes GCP](catalogo-fontes-gcp.md). Os critérios de descrição ficam em [descrições de tabelas e fontes](descricao-tabelas-fontes.md). Este acompanhamento registra a implementação observada do projeto.

## Inventário dos jobs e arquivos cobertos

Os caminhos abaixo são relativos a `gs://nasa-earth-trends-lab-raw/`. Cada link de tabela abre seu YAML de descrição. A coluna de carga registra a existência da tabela observada no catálogo. Todos os jobs mantêm uma única tarefa `extract`, com publicação automática dos comentários do YAML durante a carga.

| Origem GCS | Formato | Arquivos cobertos | Período observado | Job | Tabela e descrições | Carga |
| --- | --- | --- | --- | --- | --- | --- |
| `transient/GPM_3IMERGDL/` | CSV | 13 | 2025-10 a 2026-10 | [gpm_imerg_late_precipitation][gpm_imerg_late_precipitation] | [tb_gpm_imerg_late_precipitation](../databricks/data-extraction/tb_gpm_imerg_late_precipitation/description_schema.yaml) | ✓ Existente |
| `transient/GPM_3IMERGM/` | CSV | 21 | 2024-01 a 2025-09 | [gpm_imerg_precipitation][gpm_imerg_precipitation] | [tb_gpm_imerg_precipitation](../databricks/data-extraction/tb_gpm_imerg_precipitation/description_schema.yaml) | ✓ Existente |
| `transient/GRACE_JPL_CRI_RL06.3Mv04/` | CSV | 33 | 2024-01 a 2026-09 | [grace_jpl_mass_anomaly][grace_jpl_mass_anomaly] | [tb_grace_jpl_mass_anomaly](../databricks/data-extraction/tb_grace_jpl_mass_anomaly/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_CLDPRS/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_cldprs][merra2_cldprs] | [tb_merra2_cldprs](../databricks/data-extraction/tb_merra2_cldprs/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_CLDTMP/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_cldtmp][merra2_cldtmp] | [tb_merra2_cldtmp](../databricks/data-extraction/tb_merra2_cldtmp/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_DISPH/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_disph][merra2_disph] | [tb_merra2_disph](../databricks/data-extraction/tb_merra2_disph/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_H1000/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_h1000][merra2_h1000] | [tb_merra2_h1000](../databricks/data-extraction/tb_merra2_h1000/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_H250/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_h250][merra2_h250] | [tb_merra2_h250](../databricks/data-extraction/tb_merra2_h250/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_H500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_h500][merra2_h500] | [tb_merra2_h500](../databricks/data-extraction/tb_merra2_h500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_H850/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_h850][merra2_h850] | [tb_merra2_h850](../databricks/data-extraction/tb_merra2_h850/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_OMEGA500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_omega500][merra2_omega500] | [tb_merra2_omega500](../databricks/data-extraction/tb_merra2_omega500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_PBLTOP/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_pbltop][merra2_pbltop] | [tb_merra2_pbltop](../databricks/data-extraction/tb_merra2_pbltop/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_PS/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_ps][merra2_ps] | [tb_merra2_ps](../databricks/data-extraction/tb_merra2_ps/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Q250/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_q250][merra2_q250] | [tb_merra2_q250](../databricks/data-extraction/tb_merra2_q250/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Q500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_q500][merra2_q500] | [tb_merra2_q500](../databricks/data-extraction/tb_merra2_q500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Q850/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_q850][merra2_q850] | [tb_merra2_q850](../databricks/data-extraction/tb_merra2_q850/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_QV10M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_qv10m][merra2_qv10m] | [tb_merra2_qv10m](../databricks/data-extraction/tb_merra2_qv10m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_QV2M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_qv2m][merra2_qv2m] | [tb_merra2_qv2m](../databricks/data-extraction/tb_merra2_qv2m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_SLP/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_slp][merra2_slp] | [tb_merra2_slp](../databricks/data-extraction/tb_merra2_slp/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_surface_temperature][merra2_surface_temperature] | [tb_merra2_ts](../databricks/data-extraction/tb_merra2_ts/description_schema.yaml) | ✓ Existente |
| `transient/M2TMNXSLV_T250/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_t250][merra2_t250] | [tb_merra2_t250](../databricks/data-extraction/tb_merra2_t250/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_T2M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_t2m][merra2_t2m] | [tb_merra2_t2m](../databricks/data-extraction/tb_merra2_t2m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_T2MDEW/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_t2mdew][merra2_t2mdew] | [tb_merra2_t2mdew](../databricks/data-extraction/tb_merra2_t2mdew/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_T2MWET/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_t2mwet][merra2_t2mwet] | [tb_merra2_t2mwet](../databricks/data-extraction/tb_merra2_t2mwet/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_T500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_t500][merra2_t500] | [tb_merra2_t500](../databricks/data-extraction/tb_merra2_t500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_T850/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_t850][merra2_t850] | [tb_merra2_t850](../databricks/data-extraction/tb_merra2_t850/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_T10M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_temperature_t10m][merra2_temperature_t10m] | [tb_merra2_t10m](../databricks/data-extraction/tb_merra2_t10m/description_schema.yaml) | ✓ Existente |
| `transient/M2TMNXSLV_TO3/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_to3][merra2_to3] | [tb_merra2_to3](../databricks/data-extraction/tb_merra2_to3/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TOX/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_tox][merra2_tox] | [tb_merra2_tox](../databricks/data-extraction/tb_merra2_tox/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TQI/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_tqi][merra2_tqi] | [tb_merra2_tqi](../databricks/data-extraction/tb_merra2_tqi/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TQL/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_tql][merra2_tql] | [tb_merra2_tql](../databricks/data-extraction/tb_merra2_tql/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TQV/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_tqv][merra2_tqv] | [tb_merra2_tqv](../databricks/data-extraction/tb_merra2_tqv/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TROPPB/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_troppb][merra2_troppb] | [tb_merra2_troppb](../databricks/data-extraction/tb_merra2_troppb/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TROPPT/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_troppt][merra2_troppt] | [tb_merra2_troppt](../databricks/data-extraction/tb_merra2_troppt/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TROPPV/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_troppv][merra2_troppv] | [tb_merra2_troppv](../databricks/data-extraction/tb_merra2_troppv/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TROPQ/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_tropq][merra2_tropq] | [tb_merra2_tropq](../databricks/data-extraction/tb_merra2_tropq/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_TROPT/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_tropt][merra2_tropt] | [tb_merra2_tropt](../databricks/data-extraction/tb_merra2_tropt/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_U10M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_u10m][merra2_u10m] | [tb_merra2_u10m](../databricks/data-extraction/tb_merra2_u10m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_U250/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_u250][merra2_u250] | [tb_merra2_u250](../databricks/data-extraction/tb_merra2_u250/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_U2M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_u2m][merra2_u2m] | [tb_merra2_u2m](../databricks/data-extraction/tb_merra2_u2m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_U500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_u500][merra2_u500] | [tb_merra2_u500](../databricks/data-extraction/tb_merra2_u500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_U50M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_u50m][merra2_u50m] | [tb_merra2_u50m](../databricks/data-extraction/tb_merra2_u50m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_U850/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_u850][merra2_u850] | [tb_merra2_u850](../databricks/data-extraction/tb_merra2_u850/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_V10M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_v10m][merra2_v10m] | [tb_merra2_v10m](../databricks/data-extraction/tb_merra2_v10m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_V250/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_v250][merra2_v250] | [tb_merra2_v250](../databricks/data-extraction/tb_merra2_v250/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_V2M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_v2m][merra2_v2m] | [tb_merra2_v2m](../databricks/data-extraction/tb_merra2_v2m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_V500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_v500][merra2_v500] | [tb_merra2_v500](../databricks/data-extraction/tb_merra2_v500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_V50M/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_v50m][merra2_v50m] | [tb_merra2_v50m](../databricks/data-extraction/tb_merra2_v50m/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_V850/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_v850][merra2_v850] | [tb_merra2_v850](../databricks/data-extraction/tb_merra2_v850/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_CLDPRS/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_cldprs][merra2_var_cldprs] | [tb_merra2_var_cldprs](../databricks/data-extraction/tb_merra2_var_cldprs/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_CLDTMP/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_cldtmp][merra2_var_cldtmp] | [tb_merra2_var_cldtmp](../databricks/data-extraction/tb_merra2_var_cldtmp/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_DISPH/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_disph][merra2_var_disph] | [tb_merra2_var_disph](../databricks/data-extraction/tb_merra2_var_disph/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_H1000/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_h1000][merra2_var_h1000] | [tb_merra2_var_h1000](../databricks/data-extraction/tb_merra2_var_h1000/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_H250/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_h250][merra2_var_h250] | [tb_merra2_var_h250](../databricks/data-extraction/tb_merra2_var_h250/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_H500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_h500][merra2_var_h500] | [tb_merra2_var_h500](../databricks/data-extraction/tb_merra2_var_h500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_H850/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_h850][merra2_var_h850] | [tb_merra2_var_h850](../databricks/data-extraction/tb_merra2_var_h850/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_OMEGA500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_omega500][merra2_var_omega500] | [tb_merra2_var_omega500](../databricks/data-extraction/tb_merra2_var_omega500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_PBLTOP/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_pbltop][merra2_var_pbltop] | [tb_merra2_var_pbltop](../databricks/data-extraction/tb_merra2_var_pbltop/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_PS/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_ps][merra2_var_ps] | [tb_merra2_var_ps](../databricks/data-extraction/tb_merra2_var_ps/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_Q250/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_q250][merra2_var_q250] | [tb_merra2_var_q250](../databricks/data-extraction/tb_merra2_var_q250/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_Q500/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_q500][merra2_var_q500] | [tb_merra2_var_q500](../databricks/data-extraction/tb_merra2_var_q500/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXSLV_Var_Q850/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_var_q850][merra2_var_q850] | [tb_merra2_var_q850](../databricks/data-extraction/tb_merra2_var_q850/description_schema.yaml) | ⬜ Carga pendente |
| `transient/M2TMNXFLX_SPEED/` | CSV | 33 | 2024-01 a 2026-09 | [merra2_wind_speed][merra2_wind_speed] | [tb_merra2_speed](../databricks/data-extraction/tb_merra2_speed/description_schema.yaml) | ✓ Existente |
| `kipp/raw/nasa/MOD13C2/version=061/` | HDF4 | 3 | 2024-01 a 2024-03 | [modis_mod13c2_vegetation][modis_mod13c2_vegetation] | [tb_modis_mod13c2_vegetation](../databricks/data-extraction/tb_modis_mod13c2_vegetation/description_schema.yaml) | ⬜ Carga pendente |
| `transient/SEA_ICE_G02135_V4_S/` | CSV | 34 | 2024-01 a 2026-10 | [sea_ice_antarctic][sea_ice_antarctic] | [tb_sea_ice_antarctic](../databricks/data-extraction/tb_sea_ice_antarctic/description_schema.yaml) | ⬜ Carga pendente |
| `transient/SEA_ICE_G02135_V4_N/` | CSV | 34 | 2024-01 a 2026-10 | [sea_ice_arctic][sea_ice_arctic] | [tb_sea_ice_arctic](../databricks/data-extraction/tb_sea_ice_arctic/description_schema.yaml) | ⬜ Carga pendente |

### Exportações alternativas e artefatos já obtidos

- `transient/M2TMNXSLV_TS/` contém 33 CSVs com a coluna `TS`. A tabela existente usa `transient/M2TMNXSLV/`, com `TS_K` e `TS_C`, para os mesmos meses. A nova exportação foi catalogada como variante do contrato de TS.
- `transient/M2TMNXSLV_T10M/` contém 33 CSVs diretamente na pasta e outros 33 em subpastas anuais. O job existente lê os 33 arquivos da raiz, com `T10M_K` e `T10M_C`. A exportação anual é uma variante a avaliar antes de unificar os schemas.
- Há três arquivos NetCDF MERRA-2 e três HDF5 IMERG Final do piloto em `kipp/raw/nasa/`, de 2024-01 a 2024-03. Os CSVs já integrados cobrem esses produtos e períodos. O HDF4 MOD13C2 possui job de leitura próprio.
- `kipp/processed/` contém GeoTIFFs de temperatura, precipitação e vegetação e resumos Parquet versionados. `kipp/serving/` contém frames binários e cobertura para visualização. Manifests identificam os produtos e o processamento.
- O GeoTIFF de temperatura do piloto deriva de T2M. O GeoTIFF de vegetação deriva de NDVI com QA. Esses detalhes constam dos manifests e já permitem identificar as variáveis obtidas.
- O arquivo `g4.timeAvgMap.M2TMNXSLV_5_12_4_TS.20260101-20260131.180W_90S_180E_90N.nc` na raiz é um artefato de mapa de TS de janeiro de 2026, com agregação própria.

## Tabelas observadas no Unity Catalog

Consulta de metadados em `earth-trend-data.refined`. Linhas e período abaixo são estatísticas registradas no catálogo e devem ser conferidos durante a validação de cada carga. Os jobs novos foram publicados sem execução de suas cargas nesta etapa.

| Tabela | Linhas nas estatísticas | Primeiro mês nas estatísticas | Último mês nas estatísticas | Comentário de tabela observado |
| --- | --- | --- | --- | --- |
| `merra2_ts` | 4366656 | 2025-01 | 2026-09 | ⬜ Ausente |
| `tb_gpm_imerg_late_precipitation` | 831744 | 2025-10 | 2026-01 | ⬜ Ausente |
| `tb_gpm_imerg_precipitation` | 4366656 | 2024-01 | 2025-09 | ⬜ Ausente |
| `tb_merra2_speed` | 6861888 | 2024-01 | 2026-09 | ⬜ Ausente |
| `tb_merra2_t10m` | 6861888 | 2024-01 | 2026-09 | ⬜ Ausente |
| `tb_merra2_ts` | 6861888 | 2024-01 | 2026-09 | ⬜ Ausente |

A tabela `merra2_ts` também existe, além de `tb_merra2_ts`, com período diferente nas estatísticas. O bundle usa `tb_merra2_ts`. Confirmar o uso da tabela antiga antes de decidir sua manutenção.

## Evidências e validação

Foram usados a listagem recursiva do bucket, os cabeçalhos CSV, os metadados GRACE e Sea Ice, os atributos de um NetCDF MERRA-2 e de um HDF4 MOD13C2 reais, o resumo do bundle e a API do Unity Catalog. Para os novos CSVs, os schemas explícitos preservam a ordem dos cabeçalhos e tipos numéricos, inclusive quando a amostra tem campos vazios.

O leitor MOD13C2 foi executado localmente sobre o arquivo real de janeiro de 2024 e produziu 25.920.000 posições da grade. Foram conferidos centros dos pixels, calibração de EVI e preservação de QA e fill. A execução distribuída e a escrita Delta ainda dependem da primeira carga do job no workspace.

A configuração do bundle foi validada pela CLI. Os notebooks, schemas YAML e caminhos dos jobs foram verificados localmente e os recursos foram conferidos por leitura no workspace após o deploy.

[gpm_imerg_late_precipitation]: https://8259554586019913.3.gcp.databricks.com/jobs/657258759173558
[gpm_imerg_precipitation]: https://8259554586019913.3.gcp.databricks.com/jobs/997684687416233
[grace_jpl_mass_anomaly]: https://8259554586019913.3.gcp.databricks.com/jobs/96348117194134
[merra2_cldprs]: https://8259554586019913.3.gcp.databricks.com/jobs/160855981836578
[merra2_cldtmp]: https://8259554586019913.3.gcp.databricks.com/jobs/324326543154063
[merra2_disph]: https://8259554586019913.3.gcp.databricks.com/jobs/60571411829999
[merra2_h1000]: https://8259554586019913.3.gcp.databricks.com/jobs/417255851641289
[merra2_h250]: https://8259554586019913.3.gcp.databricks.com/jobs/679198450384589
[merra2_h500]: https://8259554586019913.3.gcp.databricks.com/jobs/231517166823380
[merra2_h850]: https://8259554586019913.3.gcp.databricks.com/jobs/535822553195629
[merra2_omega500]: https://8259554586019913.3.gcp.databricks.com/jobs/88275177960742
[merra2_pbltop]: https://8259554586019913.3.gcp.databricks.com/jobs/34993670813098
[merra2_ps]: https://8259554586019913.3.gcp.databricks.com/jobs/597307816291464
[merra2_q250]: https://8259554586019913.3.gcp.databricks.com/jobs/912865739616534
[merra2_q500]: https://8259554586019913.3.gcp.databricks.com/jobs/451381170534051
[merra2_q850]: https://8259554586019913.3.gcp.databricks.com/jobs/143002236511210
[merra2_qv10m]: https://8259554586019913.3.gcp.databricks.com/jobs/219606295939382
[merra2_qv2m]: https://8259554586019913.3.gcp.databricks.com/jobs/711894966217025
[merra2_slp]: https://8259554586019913.3.gcp.databricks.com/jobs/1079621942006983
[merra2_surface_temperature]: https://8259554586019913.3.gcp.databricks.com/jobs/41910520338213
[merra2_t250]: https://8259554586019913.3.gcp.databricks.com/jobs/829050065655492
[merra2_t2m]: https://8259554586019913.3.gcp.databricks.com/jobs/625975179109696
[merra2_t2mdew]: https://8259554586019913.3.gcp.databricks.com/jobs/949256357644883
[merra2_t2mwet]: https://8259554586019913.3.gcp.databricks.com/jobs/1029323730170311
[merra2_t500]: https://8259554586019913.3.gcp.databricks.com/jobs/1072260701114707
[merra2_t850]: https://8259554586019913.3.gcp.databricks.com/jobs/532880624166576
[merra2_temperature_t10m]: https://8259554586019913.3.gcp.databricks.com/jobs/573059230903303
[merra2_to3]: https://8259554586019913.3.gcp.databricks.com/jobs/992764637036777
[merra2_tox]: https://8259554586019913.3.gcp.databricks.com/jobs/488632502733356
[merra2_tqi]: https://8259554586019913.3.gcp.databricks.com/jobs/783415949583358
[merra2_tql]: https://8259554586019913.3.gcp.databricks.com/jobs/288063437954037
[merra2_tqv]: https://8259554586019913.3.gcp.databricks.com/jobs/724925872495154
[merra2_troppb]: https://8259554586019913.3.gcp.databricks.com/jobs/206102534469907
[merra2_troppt]: https://8259554586019913.3.gcp.databricks.com/jobs/707069396002950
[merra2_troppv]: https://8259554586019913.3.gcp.databricks.com/jobs/16322093025160
[merra2_tropq]: https://8259554586019913.3.gcp.databricks.com/jobs/945398458908328
[merra2_tropt]: https://8259554586019913.3.gcp.databricks.com/jobs/1059580462285306
[merra2_u10m]: https://8259554586019913.3.gcp.databricks.com/jobs/102097354271277
[merra2_u250]: https://8259554586019913.3.gcp.databricks.com/jobs/622254288183492
[merra2_u2m]: https://8259554586019913.3.gcp.databricks.com/jobs/991330322308352
[merra2_u500]: https://8259554586019913.3.gcp.databricks.com/jobs/496683082369654
[merra2_u50m]: https://8259554586019913.3.gcp.databricks.com/jobs/259617143452173
[merra2_u850]: https://8259554586019913.3.gcp.databricks.com/jobs/3527057414233
[merra2_v10m]: https://8259554586019913.3.gcp.databricks.com/jobs/357593224844636
[merra2_v250]: https://8259554586019913.3.gcp.databricks.com/jobs/852422196849094
[merra2_v2m]: https://8259554586019913.3.gcp.databricks.com/jobs/101963076746075
[merra2_v500]: https://8259554586019913.3.gcp.databricks.com/jobs/298165097126787
[merra2_v50m]: https://8259554586019913.3.gcp.databricks.com/jobs/583799598207455
[merra2_v850]: https://8259554586019913.3.gcp.databricks.com/jobs/927253088822113
[merra2_var_cldprs]: https://8259554586019913.3.gcp.databricks.com/jobs/1123135024842106
[merra2_var_cldtmp]: https://8259554586019913.3.gcp.databricks.com/jobs/139265683190440
[merra2_var_disph]: https://8259554586019913.3.gcp.databricks.com/jobs/284648457637508
[merra2_var_h1000]: https://8259554586019913.3.gcp.databricks.com/jobs/742375727308408
[merra2_var_h250]: https://8259554586019913.3.gcp.databricks.com/jobs/898898319707967
[merra2_var_h500]: https://8259554586019913.3.gcp.databricks.com/jobs/911368993089147
[merra2_var_h850]: https://8259554586019913.3.gcp.databricks.com/jobs/206093571282103
[merra2_var_omega500]: https://8259554586019913.3.gcp.databricks.com/jobs/401173258157246
[merra2_var_pbltop]: https://8259554586019913.3.gcp.databricks.com/jobs/561827591357345
[merra2_var_ps]: https://8259554586019913.3.gcp.databricks.com/jobs/484975967110094
[merra2_var_q250]: https://8259554586019913.3.gcp.databricks.com/jobs/16832121180544
[merra2_var_q500]: https://8259554586019913.3.gcp.databricks.com/jobs/111098010480762
[merra2_var_q850]: https://8259554586019913.3.gcp.databricks.com/jobs/781006260142821
[merra2_wind_speed]: https://8259554586019913.3.gcp.databricks.com/jobs/190774641401357
[modis_mod13c2_vegetation]: https://8259554586019913.3.gcp.databricks.com/jobs/487211899876573
[sea_ice_antarctic]: https://8259554586019913.3.gcp.databricks.com/jobs/813718655325289
[sea_ice_arctic]: https://8259554586019913.3.gcp.databricks.com/jobs/862022792263838
