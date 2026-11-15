# Configurações das três fontes da ingestão reduzida

Preparadas em 15/11/2026 a partir de `data/config.py` e do
[inventário reduzido](inventario-fontes-ingestao-reduzida.md).

| Tabela lógica | Arquivo de configuração | Extrator reutilizado |
| --- | --- | --- |
| `tb_sea_ice_concentration_global` | [config_sea_ice_concentration_global.py](../data/config_sea_ice_concentration_global.py) | `phase_concentration.py sea-ice-concentration`, ambos os polos |
| `tb_gpm_imerg_precipitation_final_late` | [config_gpm_imerg_precipitation_final_late.py](../data/config_gpm_imerg_precipitation_final_late.py) | `imerg.py` e `imerg_late.py`, com recortes separados |
| `tb_grace_jpl_mass_anomaly` | [config_grace_jpl_mass_anomaly.py](../data/config_grace_jpl_mass_anomaly.py) | `water_ice.py grace` |

Os arquivos mantêm o padrão de constantes `SHORT_NAME`, `VERSION`, `VARIABLE`,
`VARIABLES`, `START_DATE`, `END_DATE`, diretórios e `OUTPUT_UNIT`. Acrescentam
`TABLE_NAME`, contrato de saída e parâmetros específicos. Como no exemplo,
criam os diretórios locais ao serem importados. Não contêm credenciais.

O período padrão é **2000-01-01 a 2026-10-31**, com saída **mensal** em
**0,5° × 0,625°**. É um pedido de extração, não uma afirmação de cobertura:
o início efetivo das fontes e as lacunas continuam sendo tratados pelos leitores.

Cada configuração também pode ser executada. Ela encaminha período, diretórios
e parâmetros de qualidade ao extrator específico; não substitui o `config.py`
usado pelo `main.py` de MERRA-2. Os produtos, versões e variáveis científicas
são contratos fixados nos leitores existentes: mudar essas constantes descritivas
exige conferir o leitor correspondente. `OUTPUT_UNIT` não aplica conversões
genéricas de temperatura a precipitação, concentração ou massa.

## Conferir antes de baixar

Na raiz do projeto:

```bash
uv run --with-requirements requirements-water-ice.txt python data/config_sea_ice_concentration_global.py --show-missing
uv run --with-requirements requirements-water-ice.txt python data/config_gpm_imerg_precipitation_final_late.py --show-missing
uv run --with-requirements requirements-water-ice.txt python data/config_grace_jpl_mass_anomaly.py --show-missing
```

As três configurações agora consultam os objetos de `transient/` no bucket
`nasa-earth-trends-lab-raw` **antes** de chamar os leitores e pulam meses com
CSV não vazio. `--show-missing` mostra somente o que falta no bucket, sem
consultar ou baixar observações NASA/NSIDC. Falha de autenticação, permissão
ou rede interrompe a configuração; não é interpretada como bucket vazio.

É usado o login Google Cloud ativo (`gcloud`); `--gcp-account` permite indicar
a conta explicitamente. Esse acesso ao bucket é diferente do login Earthdata
usado para baixar originais NASA. A listagem completa, incluindo paginação,
é salva em `artifacts/bucket-months-<horário-UTC>.json`.

Para também consultar os originais disponíveis apenas para os meses faltantes:

```bash
uv run --with-requirements requirements-water-ice.txt python data/config_sea_ice_concentration_global.py --plan
uv run --with-requirements requirements-water-ice.txt python data/config_gpm_imerg_precipitation_final_late.py --plan
uv run --with-requirements requirements-water-ice.txt python data/config_grace_jpl_mass_anomaly.py --plan
```

`--plan` consulta primeiro o bucket com o login Google Cloud e depois usa a
consulta pública do extrator, sem login NASA, download ou exportação de
observações. A conferência histórica de gelo pode ser demorada.
Use `--start`/`--end` para conferir um recorte.

Para executar, remova `--plan`. IMERG e GRACE usam o login Earthdata interativo
dos extratores, sem persistir credenciais; concentração NSIDC usa arquivos
públicos. `--offline` exige também `--bucket-inventory <arquivo.json>` e usa
somente o snapshot explícito e o cache local, sem rede. As proteções contra sobrescrita dos
extratores continuam valendo: os arquivos existentes não são substituídos
automaticamente. `--resume` existe para concentração; IMERG e GRACE não possuem
essa opção. `--overwrite` local não desativa o filtro de meses do bucket.
Ainda é possível limitar o pedido ao histórico anterior, por exemplo:

```bash
uv run --with-requirements requirements-water-ice.txt python data/config_grace_jpl_mass_anomaly.py \
  --start 2000-01-01 --end 2023-12-31
```

## Procedência e consolidação

Consulta efetiva ao bucket em 15/11/2026, sem lacunas internas nos intervalos:

| Prefixo de origem | CSVs / metadados | Meses já presentes e pulados |
| --- | ---: | --- |
| `SEA_ICE_CONCENTRATION_G02135_V4_N/` | 34 / 34 | 2024-01 a 2026-10 |
| `SEA_ICE_CONCENTRATION_G02135_V4_S/` | 34 / 34 | 2024-01 a 2026-10 |
| `GPM_3IMERGM/` | 21 / 21 | 2024-01 a 2025-09 |
| `GPM_3IMERGDL/` | 13 / 13 | 2025-10 a 2026-10 |
| `GRACE_JPL_CRI_RL06.3Mv04/` | 33 / 33 | 2024-01 a 2026-09 |

O snapshot dessa consulta está em `artifacts/inventario-bucket-fontes-reduzidas.json`.
A ausência de CSV indica somente ausência no bucket, não disponibilidade na
fonte científica. No período padrão, o histórico 2000–2023 está ausente nesses
prefixos; GRACE 2026-10 também está ausente e depende da disponibilidade real
do provedor. Meses anteriores à missão e lacunas não serão preenchidos.
A checagem usa nomes e tamanho dos objetos, sem validar o conteúdo científico
de cada CSV. Um CSV sem metadado também é preservado; metadado sem CSV e CSV
de tamanho zero não marcam o mês como concluído.

- **Concentração:** mantém os CSVs e metadados em
  `SEA_ICE_CONCENTRATION_G02135_V4_N/` e `SEA_ICE_CONCENTRATION_G02135_V4_S/`.
  Não usa `sea_ice_extent_flag`. Percentual e cobertura permanecem distintos.
  Cada polo é consultado e executado separadamente: se só um estiver presente,
  o outro continua elegível para extração, sem repetir o polo concluído.
- **IMERG:** por padrão, Final recebe o início solicitado até **2025-09-30**;
  Late recebe **2025-10-01** até o fim solicitado. Os dois limites, contíguos,
  reproduzem a política do inventário local e são editáveis juntos no arquivo.
  Não se presume disponibilidade nova do Final nem se busca Late como fallback
  silencioso para lacunas históricas. `--start`/`--end` são recortados para os
  dois produtos antes da execução, evitando sobreposição. `--run final` ou
  `--run late` permite executar só uma parte. Os diretórios continuam
  `GPM_3IMERGM/` e `GPM_3IMERGDL/`; erros e diagnósticos não são equiparados.
- **GRACE:** reutiliza o NetCDF cumulativo da versão `RL06.3Mv04` e exporta
  somente meses presentes. Mantém anomalia de massa em equivalente de água,
  massa por célula e a incerteza descritiva quando disponível. Não representa
  armazenamento absoluto ou água subterrânea isolada.
  O período completo continua sendo usado para localizar o arquivo cumulativo;
  `--skip-months` impede a agregação e escrita dos meses já existentes. Isso
  evita procurar um NetCDF separado para um mês final ainda indisponível.

Os nomes `TABLE_NAME` documentam os destinos lógicos propostos. Estes arquivos
**não criam nem consolidam tabelas Databricks** e não mudam os prefixos do bucket.
A união dos polos e a harmonização Final/Late continuam como etapas próprias
da proposta de ingestão reduzida. Nenhum download ou upload foi iniciado pela
criação das configurações.

Implementação e documentação assistidas por OpenAI Codex. Foram conferidos os
argumentos encaminhados aos leitores, os recortes de período, diretórios e a
sintaxe Python, sem consultar observações ou usar credenciais. Isso não comprova
ampliação de cobertura no bucket nem encerra uma investigação científica.

## Execução paralela de 15/11/2026

As três configurações foram abertas em janelas separadas do terminal. Logs e
estados ficam em `artifacts/extracoes-paralelas-<horário-UTC>/`.
Na leitura histórica GRACE, o NetCDF local apresentou duas soluções com
timestamp no mesmo mês em **2012-01** e **2015-04**, com intervalos nativos
diferentes. O modo padrão interrompe nessa condição.

A execução GRACE foi retomada explicitamente com `--ambiguous-months skip`:
todos os registros dos meses ambíguos ficam fora dos CSVs mensais, preservados
no original. Não são promediados, descartados silenciosamente nem deslocados
para outro mês. Os metadados registram a política e `excluded_ambiguous_months`;
os logs e o relatório de meses ausentes registraram essas lacunas na primeira
execução. A seleção explícita posterior do usuário, abaixo, resolve esses dois
casos sem combinar soluções. A documentação
[JPL](https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/) alerta que
os dias efetivos das soluções mensais variam.

```bash
uv run --with-requirements requirements-water-ice.txt python data/config_grace_jpl_mass_anomaly.py \
  --ambiguous-months skip
```

### Seleção explícita posterior do usuário

O usuário escolheu **2012-01-01 a 2012-01-31** e **2015-04-01 a 2015-04-30**.
Essas escolhas estão em `MONTH_SELECTIONS` no arquivo de configuração GRACE.
O leitor exige uma única solução com limites nativos de datas correspondentes,
usando `time_bounds`; se não houver correspondência única, interrompe o mês.
O limite final original, incluindo a precisão subsegundo, é preservado nos
metadados. Não há média de soluções nem mudança de mês de referência.

Os dois CSVs faltantes foram gerados localmente, usando os índices nativos
112 e 143 do original atual, com `selected_native_interval`, `source_time_index`
e `source_time_bounds` nos metadados. A campanha histórica passou de 224 para
**226 meses disponíveis exportados**, de 2002-04 a 2023-12, preservando as
demais lacunas nativas. Os 33 meses já presentes no bucket continuaram pulados.
Em 15/11/2026, os 226 CSVs históricos e seus 226 metadados foram enviados para
`gs://nasa-earth-trends-lab-raw/transient/GRACE_JPL_CRI_RL06.3Mv04/`, em subpastas
anuais. Foram conferidos tamanho e CRC32C dos 452 objetos; os hashes SHA-256
locais dos CSVs coincidiram com os metadados. Os 66 objetos anteriores mantiveram
suas gerações. O prefixo passou a conter **259 CSVs e 259 metadados**, com as
lacunas nativas preservadas. Evidência local:
`artifacts/grace-historico-upload-validation.json`.

### Concentração de gelo: extração e upload históricos concluídos

A extração dos dois polos terminou com código 0. Foram produzidos e enviados
288 CSVs de 2000-01 a 2023-12 por polo, com 288 metadados por polo:
**576 CSVs e 576 metadados novos**. Destinos no bucket `nasa-earth-trends-lab-raw`:
`transient/SEA_ICE_CONCENTRATION_G02135_V4_N/` e
`transient/SEA_ICE_CONCENTRATION_G02135_V4_S/`, organizados por ano.

Os 1.152 objetos novos tiveram tamanho e CRC32C conferidos contra os arquivos
locais; os SHA-256 locais dos CSVs coincidiram com seus metadados. Os 136
objetos anteriores mantiveram suas gerações. Cada polo agora possui 322 CSVs e
322 metadados, cobrindo 2000-01 a 2026-10 sem lacunas mensais. Evidência:
`artifacts/sea-ice-historico-upload-validation.json`. Essa publicação não comprova
ingestão no Unity Catalog nem atualização da aplicação.

### IMERG Final: extração e upload históricos concluídos

A execução IMERG terminou com código 0 e produziu 288 CSVs mensais e seus
metadados de 2000-01 a 2023-12. Late foi pulado porque os 13 meses configurados
já estavam no bucket. Os 288 CSVs e 288 metadados Final foram enviados para
`gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGM/`, em subpastas anuais.

Os 576 objetos novos tiveram tamanho e CRC32C conferidos contra os arquivos
locais; os SHA-256 dos CSVs coincidiram com os sidecars. Os 42 objetos anteriores
mantiveram suas gerações. O prefixo Final passou a conter 309 CSVs e 309
metadados, de 2000-01 a 2025-09. Late permanece em seu prefixo próprio,
com processamento e indicadores de qualidade distintos. Evidência:
`artifacts/imerg-final-historico-upload-validation.json`. Não houve execução
de ingestão no UC ou publicação dessa ampliação na aplicação nesta etapa.
