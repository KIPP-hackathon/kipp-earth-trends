# Extração mensal de água, gelo e nível do mar

O script `data/water_ice.py` segue o fluxo dos extratores IMERG: descobrir os
originais, baixar para cache, decodificar, selecionar meses e exportar um CSV por
mês com metadados. A grade coincide com o MERRA-2 do projeto: **0,5° de latitude ×
0,625° de longitude**, 361 latitudes de −90° a 90° e 576 longitudes de −180° a
179,375°, totalizando **207.936 linhas por CSV**. O horário exportado é o início
do mês em UTC. Faça joins por latitude, longitude, ano e mês.

O usuário escolheu começar pelo **armazenamento total do GRACE**, sem apresentar
esse campo como uma estimativa isolada de água subterrânea. O pipeline não
calcula tendências nem assume que uma região sempre perde ou ganha água.

## Instalação e execução

Na raiz do repositório, usando `uv`:

```sh
uv run --with-requirements requirements-water-ice.txt python data/water_ice.py --help
```

Alternativa: `pip install -r requirements-water-ice.txt` no ambiente Python do
projeto. Esse arquivo inclui as dependências existentes e acrescenta Rasterio
para o gelo polar e Copernicus Marine Toolbox para altimetria. Nenhuma credencial
de outro projeto deve ser reutilizada automaticamente.

### GRACE/GRACE-FO: água continental e massa de gelo

Primeiro consulte o catálogo público sem autenticação, download ou exportação:

```sh
uv run --with-requirements requirements-water-ice.txt python data/water_ice.py grace \
  --plan --start 2025-01-01 --end 2025-12-31
```

Para baixar e processar:

```sh
uv run --with-requirements requirements-water-ice.txt python data/water_ice.py grace \
  --start 2025-01-01 --end 2025-12-31 \
  --reference-csv transient_M2TMNXSLV_M2TMNXSLV_TS_2025_01.csv
```

Requer NASA Earthdata Login. O padrão é login interativo com `persist=False`.
Também aceita `--auth-strategy environment`, com credenciais Earthdata específicas
do projeto. Não lê `.netrc` global automaticamente.

Produto fixado: **TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4**, versão
**RL06.3Mv04**, DOI [10.5067/TEMSC-3JC634](https://doi.org/10.5067/TEMSC-3JC634).
O CMR fornece **um NetCDF cumulativo com todo o histórico**, não um arquivo por
mês. Apenas os meses selecionados são carregados/exportados. Uma nova revisão
do arquivo cumulativo tem outro nome; o pipeline consulta o catálogo novamente
e usa somente o arquivo retornado. Não mistura revisões locais antigas.

| Coluna | Significado |
| --- | --- |
| `mass_anomaly_mm_we` | Anomalia de massa em mm de água equivalente; valores negativos são válidos |
| `cell_mass_anomaly_gt` | Anomalia de massa integrada na célula de destino, em Gt |
| `valid_area_fraction` | Fração da área da célula com valores válidos, de 0 a 1 |
| `native_uncertainty_mean_mm_we` | Quando disponível, média descritiva da incerteza nativa |

A variável `lwe_thickness` é convertida de cm para mm conforme o atributo de
unidades. A anomalia e sua referência temporal são preservadas, incluindo
`time_mean_removed` quando presente. O produto inclui água continental, gelo e
oceano. Sobre bacias hidrográficas, o campo está associado ao armazenamento
**total**: não fornece sozinho nível de aquífero, volume absoluto disponível ou
extração humana. Isolar água subterrânea exigiria separar os outros componentes
com fontes auxiliares e referências temporais compatíveis.

Sobre Groenlândia e Antártida, o campo permite estudar anomalias de massa em
grandes regiões. O CSV global não identifica automaticamente polígonos de mantos
de gelo. Para um total regional, use uma máscara científica e frações de
interseção com as células; não use uma caixa geográfica como se fosse o contorno
do manto. `cell_mass_anomaly_gt` **não é** o total de uma calota nem uma taxa de
perda: `Gt = mm × área_esférica_m² / 10¹²`, usando raio terrestre de
6.371.008,8 m. Não some essa coluna fora da região de interesse.

A reamostragem usa interseções de área esférica, com tratamento das calotas
polares e da linha de mudança de data. A grade de distribuição nativa é 0,5° ×
0,5°, mas a resolução independente dos mascons é aproximadamente **3°**. A grade
de saída não aumenta essa resolução. Não serve para desprendimentos de pequenas
geleiras. Os fatores de ganho hidrológico **não são aplicados**, pois não são
adequados aos mantos de gelo. A incerteza média exportada não é incerteza
propagada da nova célula; os pixels de um mascon são correlacionados.

Referência: [guia JPL dos mascons](https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/).

### Gelo marinho: Ártico e Antártida separados

```sh
uv run --with-requirements requirements-water-ice.txt python data/water_ice.py sea-ice \
  --plan --start 2025-01-01 --end 2025-01-31

uv run --with-requirements requirements-water-ice.txt python data/water_ice.py sea-ice \
  --start 2025-01-01 --end 2025-12-31
```

Fonte: **NSIDC Sea Ice Index G02135 v4**, GeoTIFFs mensais `extent_v4.0` de ambos
os hemisférios, acessados pelo arquivo HTTPS oficial, sem login. O modo `--plan`
verifica a existência dos arquivos; HTTP 404 é informado como indisponibilidade.
Outros erros de rede não são tratados como ausência de observações.

Cada hemisfério gera seu próprio CSV na mesma grade global. A coluna
`sea_ice_extent_flag` amostra a célula nativa mais próxima de cada coordenada:
**1 = extensão de gelo; 0 = oceano aberto**. `valid_sample` é 1 quando essa amostra
é válida e 0 quando não é. Terra, costa, dados ausentes, área externa ao mapa e o
outro hemisfério ficam em branco na variável científica. A projeção polar e os
códigos de classificação são validados antes da exportação.

Este é um campo categórico mensal derivado da concentração mensal com limiar de
15%; **não é** concentração, fração de gelo na célula, massa ou km². Também não é
a média das extensões diárias. A reamostragem de categorias não conserva área:
não some os flags na grade de saída para calcular extensão regional. Para esse
indicador, use a série oficial agregada do NSIDC. Os CSVs aqui atendem ao uso
espacial e à combinação com a grade do projeto.

Referências: [produto v4](https://nsidc.org/data/g02135/versions/4),
[guia de arquivos e códigos](https://nsidc.org/sites/default/files/documents/user-guide/g02135-v004-userguide.pdf),
DOI [10.7265/a98x-0f50](https://doi.org/10.7265/a98x-0f50).

### Altimetria: anomalia mensal do nível do mar

```sh
uv run --with-requirements requirements-water-ice.txt python data/water_ice.py altimetry \
  --plan --start 2025-01-01 --end 2025-12-31

uv run --with-requirements requirements-water-ice.txt python data/water_ice.py altimetry \
  --start 2025-01-01 --end 2025-12-31
```

O download requer as variáveis de ambiente `COPERNICUSMARINE_SERVICE_USERNAME` e
`COPERNICUSMARINE_SERVICE_PASSWORD`, específicas do projeto, de uma conta
Copernicus Marine. Os valores são passados diretamente ao Toolbox; o script não
faz login persistente nem busca arquivos globais de credenciais.

Produto: **SEALEVEL_GLO_PHY_CLIMATE_L4_MY_008_057**, dataset mensal
**c3s_obs-sl_glo_phy-ssh_my_twosat-l4-duacs-0.25deg_P1M-m**, variável `sla`,
grade nativa 0,25°. O pipeline requisita um mês por vez e converte metros para
**`sea_level_anomaly_mm`**. Preserva a referência do produto e usa o mesmo
remapeamento por área do GRACE. Terra e regiões sem observação continuam sem
valores; não extrapola para as regiões polares.

A versão atual e os meses exatos são consultados no catálogo antes do download.
A requisição fixa essa versão e usa seleção temporal estrita, sem substituir um
mês indisponível pela observação mais próxima. A versão também entra no nome do
original em cache. Meses fora do catálogo são informados e não são requisitados.

É um produto L4 de altimetria mapeada de satélites, apropriado para mudanças do
nível do mar, diferente da massa oceânica inferida por GRACE. Não representa
nível absoluto, um marégrafo ou monitoramento de tsunamis. `--plan` consulta o
catálogo público e a disponibilidade, sem login e sem download de observações.
Requisições e atributos de origem são registrados nos metadados.

Referências: [produto e DOI 10.48670/moi-00145](https://data.marine.copernicus.eu/product/SEALEVEL_GLO_PHY_CLIMATE_L4_MY_008_057/description),
[dataset mensal](https://data.marine.copernicus.eu/product/SEALEVEL_GLO_PHY_CLIMATE_L4_MY_008_057/services),
[API Python do Toolbox](https://toolbox-docs.marine.copernicus.eu/en/stable/python-interface.html).

## Arquivos e controles

- Originais: `data/data/raw/<coleção>/`.
- Saídas: `data/data/processed/csv/<produto>/YYYY/<produto>_YYYY_MM.csv`.
- Cada CSV tem um `.metadata.json` com origem, versão, hash SHA-256 do original
  e do CSV, unidades, método, cobertura e limitações. Downloads DUACS também têm
  um `.source.json` com a requisição, sem credenciais.
- `--raw-dir` e `--output-dir` substituem os diretórios padrão.
- `--offline` processa somente originais locais, sem acessar serviços. Para
  GRACE, o diretório deve conter exatamente um NetCDF cumulativo da versão
  escolhida. Para gelo marinho, os nomes oficiais precisam ser preservados.
- `--overwrite` autoriza substituir CSVs existentes. Sem a opção, o script recusa
  substituir um CSV ou seus metadados. Downloads e exportações usam staging.
- Em GRACE/DUACS, o padrão `--minimum-coverage 1` exige cobertura espacial
  completa; bordas costeiras podem ficar em branco. É possível aceitar cobertura
  parcial, por exemplo `--minimum-coverage 0.9`, preservando a fração no CSV.
  Nesse caso, a média representa somente a parte observada. A massa por célula
  continua em branco quando a cobertura é incompleta, para não extrapolar a massa
  para a área sem observação. Essa opção não altera a amostragem categórica do gelo.
- Meses ausentes não são interpolados nem substituídos por outra coleção.
  O script informa ausências; falhas de autenticação/rede interrompem o processo.
- Datas devem começar no primeiro dia e terminar no último dia de um mês. Os
  padrões são janeiro de 2025 e o último mês UTC completo; a disponibilidade
  científica pode terminar antes disso. Um único ano não sustenta uma tendência
  climática de longo prazo.

Não há upload para bucket, alteração do frontend, commit ou publicação. Tsunamis
não fazem parte deste extrator mensal.

## Validação

```sh
uv run --with-requirements requirements-water-ice.txt python -m unittest discover \
  -s data -p 'test_water_ice.py' -v
```

Os testes usam dados **sintéticos**, incluindo anomalias negativas, conservação
global de massa, polos sem observação, conversão de unidades, ordem das dimensões,
lacunas, códigos de gelo, metadados e proteção contra sobrescrita. Esses fixtures
não são observações NASA/NSIDC nem descobertas científicas.
