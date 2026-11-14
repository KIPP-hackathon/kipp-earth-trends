# Concentração de gelo e probabilidade de fase líquida — tabelas mensais

`data/phase_concentration.py` exporta duas variáveis em tabelas próprias. Não
adiciona colunas aos CSVs anteriores de precipitação, massa GRACE ou extensão de
gelo. Os originais anteriores são preservados.

Grade de saída: **0,5° de latitude × 0,625° de longitude**, igual à referência
MERRA-2 do projeto. São 361 latitudes (−90 a 90), 576 longitudes (−180 a 179,375)
e **207.936 linhas por mês**, ordenadas por latitude e longitude. A coluna `time`
usa o início do mês UTC; a periodicidade científica é **mensal**.

## Comandos

Na raiz do projeto, o `uv` usa as dependências de `requirements-water-ice.txt`:

```sh
# Probabilidade: reutilizar os originais Final mensais já baixados, sem rede.
uv run --with-requirements requirements-water-ice.txt python data/phase_concentration.py \
  liquid-probability --offline --start 2024-01-01

# Concentração: baixar os GeoTIFFs oficiais e exportar ambos os polos, sem login.
uv run --with-requirements requirements-water-ice.txt python data/phase_concentration.py \
  sea-ice-concentration --start 2024-01-01
```

O padrão de fim é o último mês UTC completo. Use `--end YYYY-MM-DD`, com o último
dia do mês, para limitar o período. Não exporta meses incompletos. Meses sem
original são informados; não há interpolação temporal nem substituição de fonte.

Para procurar e baixar originais IMERG Final que ainda não estão em cache, omita
`--offline`. Esse modo usa CMR/Earthdata e o mecanismo existente do IMERG, com login
interativo sem persistência, ou `--auth-strategy environment` para credenciais
Earthdata específicas do projeto. `--plan` faz somente a consulta pública, sem
login, download de observações ou exportação.

Opções compartilhadas: `--reference-csv` confere a referência MERRA-2;
`--raw-dir` e `--output-dir` alteram diretórios; `--overwrite` permite substituir
saídas desta extração. Sem essa opção, CSV ou metadados existentes são protegidos.
`--offline` também permite reprocessar GeoTIFFs de concentração locais.

Após interrupção, acrescente **`--resume`** ao mesmo comando. CSVs completos são
mantidos somente após conferir produto, mês, grade, parâmetros e hashes SHA-256
do original e CSV. Arquivos incompletos ou divergentes não são ignorados.
`--resume` e `--overwrite` são mutuamente exclusivos. Downloads de concentração
têm até quatro tentativas em falhas transitórias; um timeout não promove o arquivo
parcial ao cache. HTTP 404 informa ausência sem produzir uma observação.

## Tabelas e originais

Sob `data/data/processed/csv/`, cada tabela possui subpastas por ano:

| Tabela | Variável principal | Unidade |
| --- | --- | --- |
| `GPM_3IMERGM_LIQUID_PROBABILITY_V07` | `liquid_precipitation_probability_pct` | % |
| `SEA_ICE_CONCENTRATION_G02135_V4_N` | `sea_ice_concentration_pct` no Ártico | % |
| `SEA_ICE_CONCENTRATION_G02135_V4_S` | `sea_ice_concentration_pct` na Antártida | % |

Cada CSV inclui somente `lat`, `lon`, `time`, a variável científica e
`valid_area_fraction`, um diagnóstico de cobertura espacial (0 a 1).
Metadados adjacentes `.metadata.json` registram origem, produto, versão, unidades,
hash SHA-256 do original e CSV, mês, método e limitações.

O IMERG reutiliza `data/data/raw/GPM_3IMERGM/`. Os novos GeoTIFFs ficam em
`data/data/raw/G02135_V4_CONCENTRATION/`, mantendo os nomes oficiais. Downloads
passam por staging e validação de formato antes de entrar no cache. Não há envio
automático ao bucket.

## IMERG: o que significa a probabilidade

Fonte: **GPM_3IMERGM, Final Run V07**, variável
`Grid/probabilityLiquidPrecipitation`. Lê diretamente o produto mensal de 0,1°.
O campo indica **probabilidade da fase líquida**, não a probabilidade de chover.
Zero e 100 são valores válidos no produto mensal; fills e valores fora de 0–100
ficam ausentes.

A NASA calcula a probabilidade mensal nativa ponderando as probabilidades de
meia hora pelas taxas de precipitação. Em células nativas sem precipitação no
mês, usa a média simples das probabilidades disponíveis. Preservamos essas
estimativas diagnósticas em regiões secas: probabilidade preenchida não significa
que houve precipitação.

O remapeamento espacial calcula a **média por área esférica do campo mensal
nativo**, tratando polos e mudança de data. Portanto, a saída é uma média
espacial de probabilidades nativas; não é uma nova estimativa da fração de volume
líquido da célula grosseira, que exigiria outra ponderação espacial pela
precipitação. Não converte probabilidade em quantidade de chuva, neve ou SWE.

Esta tabela usa exclusivamente **Final mensal**. Não agrega o campo diário Late
nem mistura os dois produtos. Para estender o período, é necessário haver novos
originais mensais Final disponíveis; ausências são preservadas.

Referências: [documentação técnica IMERG V07, seção de probabilidade de fase](https://gpm.nasa.gov/sites/default/files/2023-07/IMERG_TechnicalDocumentation_final_230713.pdf),
[DOI do produto mensal](https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07).

## NSIDC: concentração e remapeamento polar

Fonte: **Sea Ice Index G02135 v4**, GeoTIFFs mensais
`N_YYYYMM_concentration_v4.0.tif` e `S_YYYYMM_concentration_v4.0.tif`, obtidos no
arquivo oficial NOAA/NSIDC. Os campos são uint16 na projeção polar nativa de
25 km, EPSG:3411 (Norte) e EPSG:3412 (Sul).

Os valores científicos 0–1000 são divididos por 10 para obter porcentagem. Zero
é oceano aberto; 2510 (pole hole), 2530 (costa), 2540 (terra) e 2550 (ausência)
são excluídos. Eventuais valores nativos maiores que zero e menores que 15% são
excluídos conforme a limitação descrita pelo NSIDC, não convertidos em oceano.
O produto já aplica um limiar nativo de 15%; essa limitação permanece na saída.

O remapeamento usa **quadratura de área esférica aproximada**: cada célula de
destino recebe por padrão 16 × 16 amostras de área igual, uniformes em longitude
e seno da latitude. Cada amostra localiza seu pixel na projeção polar; as
contribuições compõem uma matriz esparsa reutilizada em todos os meses da mesma
geometria. O método inclui as meias células polares e o cruzamento de −180°.
Não é amostragem única no centro, interseção exata de polígonos ou conservação
exata da área do gelo. `--quadrature-samples 32` permite avaliar convergência.

`valid_area_fraction` é a fração das amostras que atingiu pixels científicos
válidos. Terra, costa, ausência, regiões externas ao mapa e o outro hemisfério
ficam sem concentração. O padrão `--minimum-coverage 1` exige todas as amostras
válidas; uma opção como `--minimum-coverage 0.9` permite calcular a média sobre a
parte válida, sem extrapolar para toda a célula e mantendo a fração de cobertura.
A política também vale para os pesos esféricos exatos usados no IMERG.

A concentração grosseira pode ficar abaixo de 15% ao combinar pixels nativos de
oceano aberto e gelo. Não reaplicamos o limiar após a agregação. Não é o flag de
extensão, massa de gelo ou área regional em km². O G02135 v4 muda de sensores de
entrada a partir de janeiro de 2025; essa transição deve acompanhar a interpretação
de séries temporais.

Referências: [guia oficial G02135 v4, seção 3.6.1](https://nsidc.org/sites/default/files/documents/user-guide/g02135-v004-userguide.pdf),
[produto](https://nsidc.org/data/g02135/versions/4),
[arquivo oficial](https://noaadata.apps.nsidc.org/NOAA/G02135/).

## Verificação

```sh
uv run --with-requirements requirements-water-ice.txt python -m unittest discover \
  -s data -p 'test_phase_concentration.py' -v
```

Os testes são sintéticos, não observações ou descobertas científicas. Verificam
escala percentual, zeros reais, flags, cobertura parcial, hemisférios e polos,
valores abaixo do limiar após agregação, formato dos CSVs, proveniência e
proteção das saídas. Código, documentação e fixtures foram preparados com Codex.

## Extração real concluída em 2026-11-14

| Tabela | Período extraído | CSVs |
| --- | --- | ---: |
| `GPM_3IMERGM_LIQUID_PROBABILITY_V07` | Janeiro de 2024 a setembro de 2025 | 21 |
| `SEA_ICE_CONCENTRATION_G02135_V4_N` | Janeiro de 2024 a outubro de 2026 | 34 |
| `SEA_ICE_CONCENTRATION_G02135_V4_S` | Janeiro de 2024 a outubro de 2026 | 34 |

Os **89 CSVs e 89 metadados** foram produzidos localmente e validados contra os
originais: 18.506.304 linhas, grade, ordem das coordenadas, datas, porcentagens,
cobertura e hashes SHA-256. A consulta pública atual ao CMR confirmou 21
originais mensais Final V07 no intervalo solicitado, terminando em setembro de
2025. A probabilidade reutilizou esses originais; a concentração baixou 68
GeoTIFFs oficiais adicionais. Timeouts do NSIDC foram recuperados por novas
tentativas e retomada, sem promover arquivos parciais ao cache.

O relatório local está em
`artifacts/phase-concentration-extraction-validation.json`. Uma comparação em
547 células válidas de janeiro de 2024 usando quadraturas 16×16 e 32×32 encontrou
diferença máxima inferior a 0,3 ponto percentual; houve uma diferença de máscara
de validade na amostra sul. Esse teste amostral está em
`artifacts/phase-concentration-quadrature-check.json` e não é uma garantia global
de erro nem uma descoberta científica. O método permanece aproximado.

Passaram 10 testes Python da nova extração e os 16 testes e build do frontend
com Node.js 24. Esta execução não enviou os novos arquivos ao bucket.
