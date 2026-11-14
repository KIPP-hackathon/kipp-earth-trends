# Entrega dos pipelines para a API

Proposta para o time de dados, baseada na inspeção SQL das 70 tabelas de
`earth-trend-data.refined` em 14/11/2026. Não é uma migração executada.

Objetivo: a camada de consumo deve entregar medidas interpretáveis e versionadas.
A API escolhe filtros e resolução; o frontend desenha o dado e sua legenda.
Preservar os dados de origem e criar uma camada Gold de consumo, por tabela ou
família. Não é necessário transformar imediatamente as 70 tabelas em uma tabela
única, nem copiar todos os dados para Lakebase nesta etapa.

## Divisão de responsabilidade

| Pipeline / camada Gold | API | Frontend |
|---|---|---|
| Decodificar fill, calibrar e aplicar qualidade | Validar seleção e combinações de filtros | Mostrar filtros publicados no catálogo |
| Definir grandeza, unidade e estatística | Resolver tabelas, níveis, produtos e meses | Renderizar raster, vetores ou classes |
| Padronizar mês, coordenadas e grade | Recortar e escolher nível de detalhe | Exibir legenda, unidade e cobertura |
| Preparar agregados de visualização pesados | Servir buffers/cache e séries pequenas | Interagir com a câmera e ler tooltips |
| Publicar disponibilidade, qualidade e revisão | Invalidar cache quando a revisão mudar | Informar ausência e incompatibilidades |

Conversões temporárias no adaptador da API podem continuar durante a migração.
Cada dataset declara se já está normalizado: nunca aplicar uma conversão duas
vezes. O frontend não deve subtrair Kelvin, decodificar bits MODIS ou interpretar
nomes físicos como `T2M`, `Var_Q850` ou `SPEED_C`.

## Contrato mínimo antes de publicar um dataset

### 1. Identidade e significado da medida

Publicar um catálogo com um registro por variável/combinação de dimensões:

- `dataset_id` e `variable_id` estáveis, independentes do nome da tabela;
- nome, descrição, tema e `quantity` física;
- `kind`: `scalar`, `vector` ou `categorical`;
- `measure_type`: `intensive`, `extensive` ou `category`;
- `temporal_statistic`: média, total, variância nativa, classificação ou outra
  definição documentada; periodicidade mensal não significa sempre média;
- dimensões: altura em metros, nível de pressão em hPa, definição da tropopausa
  ou hemisfério, somente quando aplicáveis;
- produto, run, versão de processamento e referências da fonte;
- `source_unit`, `unit`, transformação aplicada e `normalization_version`;
- referência temporal de anomalias, quando existente;
- operações espaciais/temporais permitidas e operações bloqueadas.

Quando houver múltiplas versões de processamento no mês, registrar a lista e a
política usada para combiná-las. Não ocultar essa mistura em um nome genérico
de produto.

Não juntar grandezas apenas porque compartilham unidade: temperatura da
superfície e do ar, pressão da superfície e do nível do mar e diferentes
definições de tropopausa precisam continuar distinguíveis. A concentração e a
máscara de extensão de gelo também representam variáveis diferentes.

### 2. Tempo

Na camada Gold, adotar `period_start` como DATE do primeiro dia do mês e
`period_end_exclusive` como DATE do primeiro dia do mês seguinte. O catálogo
declara `time_resolution=month`. A API pode expor o ID `YYYY-MM`.

Preservar o timestamp original para rastreabilidade. MERRA-2 usa 00:30 em alguns
arquivos; outros produtos usam 00:00. Esses timestamps não devem impedir o
cruzamento do mesmo mês. Não inferir a data pelo fuso do navegador.

Publicar a lista real de meses disponíveis e a situação de cada partição.
Não assumir que Final e Late têm a mesma disponibilidade ou qualidade.

### 3. Coordenadas e grade

Publicar um registro de grades com:

- `grid_id`, CRS e ordem dos eixos;
- lat/lon em graus, domínio de longitude declarado, passos e dimensões;
- coordenadas de centros ou bordas, origem e orientação;
- footprint/área de célula, ou método explícito quando a área for aproximada;
- resolução da grade armazenada e resolução informativa da fonte;
- método de reprojeção/reamostragem, tratamento dos polos e antimeridiano;
- `cell_id` ou índices inteiros estáveis de linha/coluna.

Na amostra, 69 tabelas têm 361 × 576 posições; MODIS tem 3.600 × 7.200. Não
rotular tudo como a mesma grade. O ruído numérico próximo à longitude zero já
provocou uma coluna vazia no agrupamento da API: índices de célula e snapping
documentado evitam joins frágeis por igualdade de floats.

Definir uma chave única por dataset/variável/dimensões/mês/célula. Na inspeção,
o primeiro mês de cada uma das 70 tabelas teve chaves `(lat,lon,time)` únicas.
O pipeline precisa validar a unicidade de cada nova carga, não apenas essa amostra.

### 4. Valores, unidades e ausência

Usar tipos numéricos na camada Gold e unidade declarada no catálogo. Preservar
a precisão adequada na base; Float32 é uma escolha do formato de visualização.

| Medida | Normalização de consumo recomendada |
|---|---|
| Temperatura absoluta | °C; converter K uma única vez |
| Pressão | hPa; converter Pa uma única vez |
| Vento U/V | m/s, com convenção e referencial dos componentes |
| Umidade específica | g/kg; não é umidade relativa |
| Chuva total mensal | mm no mês, distinta da taxa em mm/h |
| NDVI/EVI | Adimensional, calibrado; campos brutos preservados fora da camada pública |
| Concentração/probabilidade | %, intervalo 0–100; significado físico explícito |
| GRACE | mm de água equivalente para o campo; Gt para massa por célula |
| Variâncias | Unidade ao quadrado e estatística nativa preservada |

Converter fill e ausência para NULL no valor público. Zero não é ausência:
chuva zero, oceano sem gelo e probabilidade zero são exemplos válidos. Não
aplicar um filtro global de valores negativos: temperaturas, anomalias, vento
e algumas alturas podem ser negativas. Faixas válidas pertencem à variável.

Em variâncias, o fator de conversão é elevado ao quadrado e offsets não se
aplicam. A variância K² → °C² não recebe subtração de 273,15.

### 5. Qualidade, domínio e cobertura

Padronizar o significado dos campos públicos, preservando os indicadores
nativos para auditoria:

- `is_valid`: resultado da política aplicada ao valor público;
- `validity_reason`: razão conhecida, como `source_nodata`, `quality_rejected`,
  `outside_domain` ou `invalid_range`; se a origem não distingue a razão, declarar
  `unknown_nodata` em vez de inventar terra, nuvem ou falha de sensor;
- `quality_policy_id` e versão;
- `source_coverage_fraction`, quando disponível, com denominador e método;
- cobertura temporal, quando existir, em campo separado da cobertura espacial;
- máscara/domínio espacial e suas limitações.

Cobertura e qualidade não são uma probabilidade universal de acerto. Ausência
de QA na fonte deve ser declarada; não fabricar confiança 100%. Um agregado
depois de filtrar QA deve informar sua nova cobertura válida, separadamente da
cobertura original.

Invariante de entrega: se `is_valid=true`, o valor público deve ser numérico,
finito e permitido pela política da variável; se for falso, o valor público é
NULL. Valores originais rejeitados continuam rastreáveis fora da camada pública.
Publicar contagens de linhas e contagens de valores válidos separadamente:
207.936 linhas não significam cobertura global válida, especialmente para gelo.

MODIS precisa de política específica: calibração e faixa não bastam. Foram
encontrados 1.555 NDVIs preenchidos com confiabilidade -1 em janeiro/2024.
Os campos QA devem impedir sua publicação como valor recomendado. Aceitar
confiabilidade marginal, neve/gelo ou valor estimado exige uma política distinta.

Os contadores de dias e frações amostrais de IMERG Late têm semânticas que
precisam ser confirmadas no exportador; não convertê-los automaticamente em
uma nota genérica de qualidade. Medidas de erro nativo não equivalem a uma
incerteza propagada da média regional.

### 6. Formatos por tipo de dado e agregação

A estrutura lógica pode ser comum sem forçar todas as medidas a uma única coluna:

| Tipo | Valores públicos | Regra de agregação |
|---|---|---|
| Escalar intensivo | `value` | Média espacial ponderada com área/cobertura definidas |
| Vetorial | `u`, `v` e validade conjunta | Agregar os componentes, depois calcular módulo/direção |
| Categórico | `class_code` e legenda | Operação categórica explícita; sem média numérica automática |
| Extensivo | `value`, área/footprint e unidade | Soma espacial apropriada, com cuidado em recortes de células |

Preparar os pares U/V no mesmo `grid_id`, nível e período, com unicidade validada
para impedir multiplicação de linhas no join. O módulo do vetor médio não deve
ser rotulado como média da velocidade instantânea.

Não converter uma média da máscara 0/1 de gelo em concentração física. Usar as
novas tabelas de concentração para essa variável. Não somar anomalias GRACE em
meses diferentes para criar um total anual.

### 7. Revisão e publicação de cargas

Cada carga pronta precisa publicar um manifest/catalog entry com:

- `data_revision` imutável e `generated_at` em UTC;
- versões Delta ou equivalente e identificador da execução de ingestão;
- meses prontos, contagens, células válidas e estatísticas de qualidade;
- versões de schema, normalização, QA e agregação;
- fontes e transformações aplicadas;
- estado `loading`, `ready`, `failed` ou `blocked` e motivo.

A API só anuncia partições `ready`. Para componentes dependentes, como U/V,
publicar uma revisão coerente do conjunto. Um `overwrite` com novas medições
precisa gerar outra revisão mesmo quando mês e contagem não mudarem. A API usa
essa revisão na chave do cache. Datas de alteração de schema ou contagens iguais
não substituem uma revisão de dados.

### 8. Níveis de detalhe preparados

Pré-agregar ao menos a vegetação para grades de exibição, com QA aplicado antes
da agregação. Um mês nativo MODIS tem 25,92 milhões de posições e cerca de
198 MiB para valores + cobertura Float32. A API não deve reduzir isso do zero
a cada movimento do globo.

Cada nível informa grade, método, qualidade e revisão da origem. Conservar uma
rota de recorte na resolução original quando necessário. Os agregados são
produtos de visualização, não aumento de resolução nem climatologia validada.

## Exemplo lógico de entrega escalar

Metadados do dataset, armazenados uma vez no catálogo:

```json
{
  "dataset_id": "merra2_air_temperature_2m",
  "variable_id": "air_temperature",
  "quantity": "air_temperature",
  "dimensions": { "height_m": 2 },
  "kind": "scalar",
  "measure_type": "intensive",
  "time_resolution": "month",
  "temporal_statistic": "mean",
  "source_unit": "K",
  "unit": "degC",
  "normalization_version": "temperature-1",
  "quality_policy_id": "merra2-recommended-1",
  "grid_id": "merra2-slv-geographic-1",
  "data_revision": "<identificador imutável da carga>",
  "status": "ready"
}
```

Nas linhas de consumo: `period_start`, `period_end_exclusive`, `cell_id`,
`lat`, `lon`, `value`, `is_valid`, `validity_reason`, cobertura se disponível
e identificação da revisão. Campos constantes podem ficar no manifest em vez
de serem repetidos em centenas de milhões de linhas. Os valores e nomes do
exemplo são propostos; nenhum dataset Gold foi criado por esta análise.

## Ordem prática para o hackathon

1. **Obrigatório agora:** catálogo, mês, unidade, chave única, ausência/QA e revisão.
2. **Prioridade de performance:** grade declarada, pares U/V e MODIS agregado.
3. **Depois:** pirâmide completa de tiles, polígonos exatos e agregados analíticos
   com propagação de incerteza.

Bloquear SPEED até corrigir os campos e unidades; escolher `tb_merra2_ts` como
fonte canônica; distinguir Final/Late, NDVI/EVI, classificação/concentração de
gelo e anomalia de massa/água subterrânea. Essas decisões precisam ser acordadas
no catálogo, não inferidas pelo nome da coluna no frontend.

O inventário e a proposta de consumo estão em
[contrato-dados-api-frontend.md](contrato-dados-api-frontend.md) e
[inventario-api-databricks.csv](inventario-api-databricks.csv).
