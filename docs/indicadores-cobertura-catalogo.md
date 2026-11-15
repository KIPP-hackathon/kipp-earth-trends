# Indicadores, cobertura e grupos do app — 15/11/2026

As duas tabelas de metadados foram atualizadas no Databricks por solicitação da
equipe. As mudanças correspondentes nos scripts, backend e frontend estão
locais; esta etapa não comprova publicação da nova interface/API.

## Atualização no Unity Catalog

Ajuste posterior solicitado pela equipe: `tb_sea_ice_global` foi retirada da
lista do app. Os dois campos de cobertura dessa tabela estão com
`valid_flag=false`, com exclusão explícita também na política de futuras cargas.
A tabela de observações e sua referência na dimensão foram preservadas;
`tb_sea_ice_concentration_global` continua habilitada.

- `earth-trend-data.refined.tb_dim_indicators`: 253 linhas, 253 valores distintos
  de `indicator_name` e 253 IDs distintos. Antes havia 236 nomes únicos; foram
  acrescentados 16 campos científicos AER/ADG/CHM e um campo de proveniência.
  Os IDs e datas de criação dos registros existentes foram preservados.
- A dimensão prefere as tabelas combinadas selecionadas pela equipe, incluindo
  `tb_merra2_variancias`. `source_table` é a origem canônica e `source_tables`
  conserva as outras tabelas físicas com o mesmo nome de coluna. Para consultar
  uma origem alternativa, juntar por `indicator_name` e pertença a `source_tables`.
  TO3 de CHM tem nome próprio e não substitui TO3 de SLV.
- `earth-trend-data.trusted.tb_indicator_coverage`: 474 registros únicos por
  tabela/campo; 112 com `valid_flag=true` e 362 com `false`. Foram inseridos
  os 16 campos numéricos de aerossóis/química e atualizados os 9 campos de
  IMERG/gelo já presentes. Os 25 campos dessas quatro fontes têm valores finitos
  e estão habilitados. As flags das outras fontes foram preservadas.
- `history_eligible` conserva a triagem anterior (`min_date <= 2001-01-01` e
  `null_ratio <= 0.9`). `valid_flag` é habilitação para uso no app; não comprova
  continuidade mensal, qualidade científica ou adequação a tendências longas.
  Isso permite usar gelo polar e séries recentes sem inventar histórico.
- COSP foi identificado como `model_simulated_diagnostic`, com rótulos
  explicitamente simulados. Campos de proveniência têm papel `metadata` e
  unidade nula; não são observações científicas.

Não foram alteradas observações das tabelas de origem. Estatísticas das quatro
fontes adicionais foram calculadas sobre os dados existentes; snapshots anteriores,
versões Delta e IDs das consultas permanecem em
`artifacts/indicator-catalog-update/` (ignorados, sem credenciais).

## União de IMERG no seletor

Por solicitação posterior da equipe, Precipitation tem duas opções:
**Precipitation total · IMERG** (mm por mês observado) e
**Precipitation rate · IMERG** (mm/h). Ambas usam os registros já consolidados
em `tb_gpm_imerg_precipitation_final_late`, com `run=Final + Late`; não são
mais quatro opções separadas por processamento. Não foi necessário reescrever
observações ou flags no Databricks.

Catálogo, mapas, séries, comparações e exportações mantêm `processingRun`
por mês, lido da coluna física `imerg_run`, sem deduzir o processamento por uma
data fixa. O mapa mostra o processamento do mês exibido, e o gráfico avisa que
a troca de processamento pode afetar comparações/tendências. A referência de
normalização não calibra Final contra Late. CSV/JSON do Trend Lab conservam
essa proveniência. O app lê cada registro consolidado uma vez; não faz UNION
nem média entre dois produtos para produzir um mês.

## Fontes do app

A lista autorizada contém exatamente estas 11 tabelas trusted:

| Tabela | Tema principal |
|---|---|
| `tb_merra2_temperatura` | Temperatura |
| `tb_merra2_vento` | Vento |
| `tb_merra2_umidade` | Umidade |
| `tb_merra2_pressao_altura` | Pressão/altura; ozônio mantém tema químico próprio |
| `tb_merra2_nuvens` | Nuvens; COSP é simulação de diagnóstico de satélite |
| `tb_merra2_fluxos` | Fluxos e parâmetros de superfície |
| `tb_merra2_variancias` | Variâncias nativas, distintas de incerteza regional |
| `tb_merra2_aerossois` | Aerossóis e deposição de carbono negro |
| `tb_merra2_quimica` | Química atmosférica |
| `tb_gpm_imerg_precipitation_final_late` | Precipitação, Final + Late, com procedência por mês |
| `tb_sea_ice_concentration_global` | Concentração de gelo marinho |

A cobertura inclui campos auxiliares de qualidade e incerteza. Esses campos
continuam disponíveis como metadados, sem serem transformados em camadas de
observação no seletor. O registro explícito tem 224 definições de variáveis e
106 habilitadas no teste real; as demais 118 continuam ocultas pelas flags
anteriores. Há 224 pares físicos distintos, com uma definição por par. Taxa e acumulado
IMERG usam Final + Late em uma série cronológica para cada grandeza.

## Domínio e tema são classificações diferentes

Temperatura do ar, vento, nuvens, aerossóis e química atmosférica podem pertencer
corretamente ao domínio `atmosphere`. Alterar esse domínio apenas para diversificar
o menu produziria classificações falsas. A solução adotada agrupa o seletor por
`theme` e preserva `domain` como contexto científico. Precipitação IMERG mantém
`hydrosphere`; gelo marinho mantém `cryosphere`.

A API passa a ler classificação por coluna física/`indicator_name`, em vez de
aplicar o domínio do primeiro registro encontrado a toda uma tabela mista.
O seletor candidato apresenta estes grupos, com contagens verificadas:

| Grupo | Variáveis habilitadas |
|---|---:|
| Temperature | 8 |
| Wind | 6 |
| Humidity | 9 |
| Pressure & height | 9 |
| Clouds | 21 |
| Surface fluxes | 25 |
| Aerosols | 14 |
| Atmospheric chemistry | 4 |
| Precipitation | 2 |
| Sea ice | 1 |
| Variances · advanced | 7 |

## Cobertura e limites preservados

- IMERG Final: 309 meses válidos, 2000-01–2025-09. Late: 13 meses,
  2025-10–2026-10. Por decisão posterior da equipe, o app apresenta esses dois trechos como
  uma série por grandeza: 322 meses, 2000-01–2026-10. Cada mês mantém
  `processingRun` com o processamento original; não há calibração ou
  homogeneização entre os produtos. As escalas de cor podem compartilhar os percentis físicos da
  tabela; isso não estabelece equivalência dos produtos.
- Concentração de gelo: 322 meses, 2000-01–2026-10. A máscara de presença (34 meses,
  2024-01–2026-10) foi retirada do app por decisão posterior da equipe. Vazios fora da cobertura polar continuam ausentes.
- BCDP001: 42 meses com valores, com lacunas internas. O intervalo entre primeiro
  e último mês não é uma série contínua. A ativação não preenche lacunas.
- Mapas da máscara usam classes/modas; gráficos de comparação usam a fração
  ponderada de classe gelo entre amostras válidas. Nenhum deles calcula extensão
  regional em km². A rota de série categórica preserva a moda e sua unidade.

## Validação e estado de publicação

O provider e o serviço de dados do app foram executados localmente contra o
SQL Warehouse real. O catálogo retornou as 11 tabelas, 224 definições e 106
habilitadas em aproximadamente 6,2 segundos na sessão verificada; isso não é
uma garantia de latência de um carregamento frio em produção. Séries
reais (acumulado/taxa IMERG e concentração de gelo) conferiram dados, unidades,
filtros e meses ausentes, inclusive a troca de processamento em set/out de 2025.

A conferência inicial de Chromium validou o seletor em 1440×900 e 390×844 com o catálogo candidato obtido
do Warehouse, sem observações sintéticas. Os 11 grupos foram identificados; após a remoção, somente concentração de gelo
permanece no grupo Sea ice; menu, rolagem interna e controles de confirmação ficaram
acessíveis no celular. Não houve exceções JavaScript ou overflow horizontal.
A interface foi servida localmente; não se declara validação do app publicado.

Validação final: 4 testes Python, 101 testes frontend, 24 testes backend e builds
frontend/backend aprovados com Node.js 24. WebKit com perfil iPhone também
conferiu os grupos e o menu, incluindo altura após alterar a busca. Não houve
teste em aparelho físico. Evidências locais: snapshots
`before-*`/`after-*`, `app-validation.json`, `app-catalog.json`, `app-series.json`,
`browser-validation.json` e imagens em `artifacts/indicator-catalog-update/`.
Os scripts de `data-refined` e `trusted-support` usam o helper compartilhado
`databricks/indicator_catalog.py`, que deve acompanhá-los ao publicar notebooks.

Alteração assistida por OpenAI Codex. A separação entre reanálise, estimativa de
satélite e simulação de diagnóstico foi preservada; revisão científica humana
e submissão Space Apps continuam etapas separadas. A publicação de backend e
frontend ainda é necessária para esses novos grupos/fontes aparecerem no site.
