# Inventário de fontes no GCP

Este documento preserva o inventário inicial e as 62 referências do catálogo. Consulte o [acompanhamento das fontes](acompanhamento-fontes.md) para o inventário atualizado dos arquivos, jobs, tabelas e pendências do projeto.

Consulta realizada em 14/11/2026 no bucket `gs://nasa-earth-trends-lab-raw/`, por listagem recursiva dos objetos e leitura do catálogo JSON. Comparação com os notebooks e o mapeamento de `databricks/data-extraction/CONTEXT.md`.

## Resultado da comparação

- O catálogo contém 62 entradas, todas com status `catalogued`. Inclui produtos, portais, serviços e referências metodológicas. A presença de arquivos foi verificada separadamente pela listagem do bucket.
- Foi encontrado um único snapshot, `kipp/catalog/snapshots/20261114T142814Z/sources.json`, com `version: 1` e `as_of: 2026-11-14`. O repositório não tinha uma cópia anterior das 62 entradas para comparação. A data de inclusão individual das fontes permanece sem confirmação.
- `MOD13C2` consta do catálogo e possui três arquivos HDF4, de janeiro a março de 2024, em `kipp/raw/nasa/MOD13C2/version=061/`. O bundle atual ainda não possui notebook ou job para esse produto. Sua disponibilidade anterior já era indicada pelos derivados de vegetação descritos no contexto.
- `GPM_3IMERGDL` passou de um para seis CSVs em relação ao inventário anterior. Foram acrescentados os meses 2025-11, 2025-12, 2026-01, 2026-02 e 2026-03. O filtro do job existente cobre esses nomes. A disponibilidade da carga nas tabelas Databricks exige uma verificação própria.
- Os demais quatro conjuntos CSV mantêm as contagens do mapeamento anterior. A consulta foi limitada ao inventário de fontes e objetos, sem leitura integral dos datasets.

## Conjuntos CSV e cobertura dos jobs

Os caminhos são relativos a `gs://nasa-earth-trends-lab-raw/`. A cobertura dos jobs foi conferida no YAML local do bundle.

| Conjunto | Pasta | CSVs | Período observado | Chave do job | Diferença frente ao contexto anterior |
| --- | --- | --- | --- | --- | --- |
| MERRA-2 TS | `transient/M2TMNXSLV/` | 33 | 2024-01 a 2026-09 | `merra2_surface_temperature` | Mesma contagem |
| MERRA-2 T10M | `transient/M2TMNXSLV_T10M/` | 33 | 2024-01 a 2026-09 | `merra2_temperature_t10m` | Mesma contagem |
| MERRA-2 SPEED | `transient/M2TMNXFLX_SPEED/` | 33 | 2024-01 a 2026-09 | `merra2_wind_speed` | Mesma contagem |
| IMERG Final | `transient/GPM_3IMERGM/` | 21 | 2024-01 a 2025-09 | `gpm_imerg_precipitation` | Mesma contagem |
| IMERG Late | `transient/GPM_3IMERGDL/` | 6 | 2025-10 a 2026-03 | `gpm_imerg_late_precipitation` | Cinco novos meses |

## Produtos com arquivos originais em kipp/raw

| Produto | Pasta relativa | Arquivos | Período | Formato | Situação no bundle |
| --- | --- | --- | --- | --- | --- |
| MERRA-2 M2TMNXSLV | `kipp/raw/nasa/M2TMNXSLV/version=5.12.4/` | 3 | 2024-01 a 2024-03 | NetCDF-4 `.nc4` | Os jobs existentes leem os CSVs TS e T10M de `transient/` |
| IMERG Final GPM_3IMERGM | `kipp/raw/nasa/GPM_3IMERGM/version=07/` | 3 | 2024-01 a 2024-03 | HDF5 `.HDF5` | O job existente lê CSVs de `transient/` |
| MODIS MOD13C2 | `kipp/raw/nasa/MOD13C2/version=061/` | 3 | 2024-01 a 2024-03 | HDF-EOS2/HDF4 `.hdf`, conforme catálogo | Fonte pendente de notebook e job |

O catálogo descreve MOD13C2 como vegetação NDVI mensal. A implementação deve inspecionar SDS, escala, valores ausentes e qualidade e usar um leitor com suporte HDF4. Os derivados `kipp/processed/vegetation/` contêm GeoTIFFs, que também precisam de contrato de leitura próprio.

## Artefatos derivados observados

`kipp/processed/` contém rasters de temperatura, precipitação e vegetação e três versões de resumos Parquet. `kipp/serving/` contém manifests e frames binários com cobertura. `kipp/manifests/` e `kipp/reports/` registram processamento. Esses artefatos complementam os produtos inventariados.

## Entradas do catálogo

A lista abaixo foi transcrita de `gs://nasa-earth-trends-lab-raw/kipp/catalog/snapshots/20261114T142814Z/sources.json`. Os formatos e status refletem as declarações desse catálogo. A verificação externa de cada provedor e a inspeção completa dos arquivos permanecem fora desta consulta. Os links são referências fornecidas pelo catálogo.

| ID | Fonte | Categoria | Formatos declarados | Status | Referencia |
| --- | --- | --- | --- | --- | --- |
| official_resources_01 | Giovanni | official_resources | Portal de exploração; séries exportáveis e produtos científicos cujo formato depende da operação, frequentemente CSV/NetCDF | catalogued | [Fonte](https://giovanni.gsfc.nasa.gov/) |
| official_resources_02 | Hydrology Time Series | official_resources | Ferramenta GES DISC para séries hidrológicas | catalogued | [Fonte](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series) |
| official_resources_03 | AppEEARS | official_resources | API de tarefas; respostas JSON; extrações pontuais CSV e área GeoTIFF/NetCDF, com informações de qualidade e arquivos auxiliares | catalogued | [Fonte](https://appeears.earthdatacloud.nasa.gov/api/) |
| official_resources_04 | NOAA Climate Data Online | official_resources | API JSON; ferramentas de exportação também oferecem tabelas | catalogued | [Fonte](https://www.ncei.noaa.gov/cdo-web/webservices/v2) |
| official_resources_05 | Artigo SeaWiFS | official_resources | **PDF científico** | catalogued | [Fonte](https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf) |
| official_resources_06 | KNMI Climate Explorer | official_resources | Portal com séries e campos; arquivos texto/NetCDF dependem do produto e análise | catalogued | [Fonte](https://climexp.knmi.nl/help.cgi) |
| official_resources_07 | Statistical test methods | official_resources | Artigo HTML | catalogued | [Fonte](https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b) |
| official_resources_08 | Guide to Statistical Significance | official_resources | Artigo HTML | catalogued | [Fonte](https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance) |
| official_resources_09 | RCM — Data | official_resources | Catálogo RADARSAT; cenas SAR e metadados, formatos variam pelo nível/pacote | catalogued | [Fonte](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm) |
| official_resources_10 | GEO.ca | official_resources | Catálogo geoespacial canadense; pode apontar GeoTIFF, vetores e serviços OGC | catalogued | [Fonte](https://geo.ca/) |
| official_resources_11 | SWOT — informação CSA | official_resources | Página HTML sobre a missão | catalogued | [Fonte](https://www.asc-csa.gc.ca/eng/satellites/swot/) |
| official_resources_12 | Ecosystems from space | official_resources | Página HTML de divulgação | catalogued | [Fonte](https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp) |
| official_resources_13 | SAR Python Tutorial | official_resources | Código Python, notebooks e instruções de dados SAR | catalogued | [Fonte](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial) |
| core_products_01 | MERRA-2 `M2TMNXSLV` 5.12.4, C1276812859-GES_DISC | core_products | `.nc4`, NetCDF-4; exemplo `MERRA2_400.tavgM_2d_slv_Nx.202401.nc4` | catalogued | [Fonte](https://cmr.earthdata.nasa.gov/search/concepts/C1276812859-GES_DISC) |
| core_products_02 | IMERG Final `GPM_3IMERGM` 07, C2723754851-GES_DISC | core_products | **`.HDF5`**, não presumir NetCDF; exemplo `3B-MO.MS.MRG.3IMERG.20240101-S000000-E235959.01.V07B.HDF5` | catalogued | [Fonte](https://cmr.earthdata.nasa.gov/search/concepts/C2723754851-GES_DISC) |
| core_products_03 | MODIS `MOD13C2` 061, C2565788914-LPCLOUD | core_products | **HDF-EOS2/HDF4 `.hdf`**, global mensal 0,05° | catalogued | [Fonte](https://cmr.earthdata.nasa.gov/search/concepts/C2565788914-LPCLOUD) |
| core_products_04 | MERRA-2 `M2IMNXASM` 5.12.4, C1276812823-GES_DISC | core_products | NetCDF-4 `.nc4` | catalogued | [Fonte](https://cmr.earthdata.nasa.gov/search/concepts/C1276812823-GES_DISC) |
| core_products_05 | MODIS `MOD13A3` 061, C2327962326-LPCLOUD | core_products | HDF-EOS2/HDF4 em tiles sinusoidais de 1 km; AppEEARS pode entregar subconjuntos GeoTIFF/NetCDF | catalogued | [Fonte](https://cmr.earthdata.nasa.gov/search/concepts/C2327962326-LPCLOUD) |
| nasa_families_01 | NASA POWER | nasa_families | JSON, CSV, ASCII, NetCDF conforme endpoint | catalogued | [Fonte](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/) |
| nasa_families_02 | GISTEMP v4 | nasa_families | Tabelas CSV/texto, NetCDF comprimido, Zarr e outros formatos científicos | catalogued | [Fonte](https://data.giss.nasa.gov/gistemp/) |
| nasa_families_03 | GLDAS `GLDAS_NOAH025_M` 2.1 | nasa_families | NetCDF-4 mensal `.nc4` | catalogued | [Fonte](https://ldas.gsfc.nasa.gov/gldas) |
| nasa_families_04 | GRACE/GRACE-FO JPL Mascons | nasa_families | NetCDF, arquivos auxiliares/mascaras conforme release | catalogued | [Fonte](https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/) |
| nasa_families_05 | SMAP umidade do solo `SPL3SMP_E` 006 | nasa_families | HDF5, grade EASE-Grid | catalogued | [Fonte](https://nsidc.org/data/spl3smp_e/versions/6) |
| nasa_families_06 | MODIS MOD11C3 e MOD11A2 | nasa_families | HDF-EOS2/HDF4; mensal global CMG ou tiles de 8 dias, respectivamente | catalogued | [Fonte](https://doi.org/10.5067/MODIS/MOD11C3.061) |
| nasa_families_07 | MODIS MOD13Q1/MOD13A2 | nasa_families | HDF-EOS2/HDF4, tiles, compósitos de 16 dias | catalogued | [Fonte](https://doi.org/10.5067/MODIS/MOD13Q1.061) |
| nasa_families_08 | MOD16A2GF / MOD17A2HGF | nasa_families | HDF-EOS2/HDF4, tiles | catalogued | [Fonte](https://doi.org/10.5067/MODIS/MOD16A2GF.061) |
| nasa_families_09 | MODIS AOD MOD08_M3/MYD08_M3 | nasa_families | HDF4/HDF-EOS, campos mensais globais | catalogued | [Fonte](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/MYD08_M3/) |
| nasa_families_10 | MAIAC MCD19A2 | nasa_families | HDF-EOS2/HDF4, tiles e múltiplos tempos/camadas conforme produto | catalogued | [Fonte](https://doi.org/10.5067/MODIS/MCD19A2.061) |
| nasa_families_11 | FIRMS MODIS/VIIRS | nasa_families | CSV da API; exports vetoriais conforme ferramenta | catalogued | [Fonte](https://firms.modaps.eosdis.nasa.gov/api/) |
| nasa_families_12 | AIRS | nasa_families | HDF-EOS/HDF ou NetCDF conforme produto e versão | catalogued | [Fonte](https://airs.jpl.nasa.gov/) |
| nasa_families_13 | OMI | nasa_families | HDF-EOS5/HDF5 ou NetCDF, conforme coleção/nível | catalogued | [Fonte](https://disc.gsfc.nasa.gov/) |
| nasa_families_14 | CERES EBAF | nasa_families | NetCDF em grades mensais | catalogued | [Fonte](https://ceres.larc.nasa.gov/Data/) |
| nasa_families_15 | MUR SST v4.1 | nasa_families | NetCDF-4, grade diária 0,01° | catalogued | [Fonte](https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1) |
| nasa_families_16 | MODIS Aqua cor do oceano CHL/Rrs | nasa_families | NetCDF em produtos L3 mapeados atuais; produtos legados podem usar HDF | catalogued | [Fonte](https://oceancolor.gsfc.nasa.gov/) |
| nasa_families_17 | SeaWiFS cor do oceano | nasa_families | NetCDF em produtos L3 atuais; arquivos legados dependem do processamento | catalogued | [Fonte](https://oceancolor.gsfc.nasa.gov/) |
| nasa_families_18 | NASA-SSH Simple Gridded | nasa_families | NetCDF, produto gridded | catalogued | [Fonte](https://doi.org/10.5067/NSREF-SG0V11) |
| nasa_families_19 | OSCAR v2 | nasa_families | NetCDF, componentes de corrente | catalogued | [Fonte](https://podaac.jpl.nasa.gov/dataset/OSCAR_L4_OC_FINAL_V2.0) |
| nasa_families_20 | SMAP salinidade | nasa_families | NetCDF, conforme produto L3 selecionado | catalogued | [Fonte](https://podaac.jpl.nasa.gov/dataset/SMAP_JPL_L3_SSS_CAP_MONTHLY_V5) |
| nasa_families_21 | Landsat Collection 2 | nasa_families | Bandas GeoTIFF/COG e metadados XML/JSON, por produto | catalogued | [Fonte](https://www.usgs.gov/landsat-missions/landsat-collection-2) |
| nasa_families_22 | HLS | nasa_families | GeoTIFF/COG por banda + qualidade/metadados | catalogued | [Fonte](https://hls.gsfc.nasa.gov/about-hls/) |
| nasa_families_23 | PACE | nasa_families | NetCDF-4 em produtos oceânicos, grupos e bandas conforme nível | catalogued | [Fonte](https://pace.oceansciences.org/access_pace_data.htm) |
| nasa_families_24 | SWOT | nasa_families | NetCDF em produtos raster/swath; produtos vetoriais de rios/lagos podem incluir Shapefile e auxiliares | catalogued | [Fonte](https://podaac.jpl.nasa.gov/SWOT) |
| nasa_families_25 | Hydrocron | nasa_families | API de séries SWOT com respostas CSV/GeoJSON conforme consulta | catalogued | [Fonte](https://podaac.github.io/hydrocron/) |
| nasa_families_26 | NISAR | nasa_families | HDF5 em produtos científicos; organização depende do nível | catalogued | [Fonte](https://science.nasa.gov/mission/nisar/data/) |
| nasa_families_27 | OCO-2 | nasa_families | NetCDF-4/HDF5 por produto, observações em trajetórias | catalogued | [Fonte](https://ocov2.jpl.nasa.gov/science/measurement-approach/) |
| nasa_families_28 | GIBS/Worldview | nasa_families | WMTS/WMS; tiles PNG/JPEG e metadados de camadas | catalogued | [Fonte](https://nasa-gibs.github.io/gibs-api-docs/) |
| nasa_families_29 | Earth Observatory | nasa_families | HTML, imagens e referências | catalogued | [Fonte](https://earthobservatory.nasa.gov/) |
| nasa_families_30 | CMR/Earthdata Search | nasa_families | Metadados JSON/UMM-JSON, XML e outros formatos de catálogo | catalogued | [Fonte](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html) |
| nasa_families_31 | Harmony / OPeNDAP | nasa_families | Serviços de transformação/subsetting; formatos dependem da coleção e operação | catalogued | [Fonte](https://harmony.earthdata.nasa.gov/docs) |
| nasa_families_32 | NASA NEO | nasa_families | Serviço legado desativado, conforme estudo inicial | catalogued | [Fonte](https://science.nasa.gov/earth/nasa-earth-observations-neo/) |
| external_sources_01 | INMET | external_sources | Arquivos históricos ZIP com CSV de estações; APIs/formatos variam | catalogued | [Fonte](https://portal.inmet.gov.br/dadoshistoricos/) |
| external_sources_02 | CHIRPS | external_sources | GeoTIFF e NetCDF conforme versão, domínio e distribuição | catalogued | [Fonte](https://www.chc.ucsb.edu/data/chirps3) |
| external_sources_03 | MapBiomas | external_sources | Mapas raster, tabelas e assets no Earth Engine conforme coleção | catalogued | [Fonte](https://brasil.mapbiomas.org/) |
| external_sources_04 | ANA/HidroWeb | external_sources | Séries de estação; retornos CSV/XML/JSON variam pelo serviço e versão | catalogued | [Fonte](https://www.snirh.gov.br/hidroweb/) |
| external_sources_05 | ERA5/ERA5-Land | external_sources | GRIB/NetCDF conforme pedido CDS; tarefas assíncronas e termos | catalogued | [Fonte](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means?tab=overview) |
| external_sources_06 | IBGE | external_sources | Malhas vetoriais, frequentemente ZIP/Shapefile; APIs JSON para outros produtos | catalogued | [Fonte](https://www.ibge.gov.br/geociencias/todos-os-produtos-geociencias/15774-malhas.html) |
| external_sources_07 | INPE/TerraBrasilis | external_sources | Raster/vetor, downloads e geosserviços conforme produto | catalogued | [Fonte](https://terrabrasilis.dpi.inpe.br/downloads/) |
| external_sources_08 | NOAA OISST | external_sources | NetCDF diário em grade | catalogued | [Fonte](https://www.ncei.noaa.gov/products/optimum-interpolation-sst) |
| external_sources_09 | NOAA Coral Reef Watch | external_sources | NetCDF e produtos/imagens de indicadores conforme serviço | catalogued | [Fonte](https://coralreefwatch.noaa.gov/satellite/) |
| external_sources_10 | Copernicus Marine | external_sources | NetCDF e acesso por subset/serviços; formatos variam por produto | catalogued | [Fonte](https://data.marine.copernicus.eu/products) |
| external_sources_11 | OBIS | external_sources | API JSON/GeoJSON; downloads tabulares/Darwin Core conforme ferramenta | catalogued | [Fonte](https://manual.obis.org/access) |
| external_sources_12 | GBIF | external_sources | API JSON; downloads Darwin Core Archive/CSV e formatos suportados no pedido | catalogued | [Fonte](https://techdocs.gbif.org/en/data-use/api-downloads) |
