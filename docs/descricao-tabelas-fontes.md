# Descrições das tabelas e colunas

Cada tabela tem uma pasta em `databricks/data-extraction/`, com seu notebook e `description_schema.yaml`. O YAML reúne a descrição da tabela, as descrições das colunas, unidades, referências e pendências de validação. Todos os conjuntos integrados ao bundle têm esses arquivos. O [acompanhamento das fontes](acompanhamento-fontes.md) registra os jobs e as cargas pendentes.

```text
data-extraction/
  table_metadata.py
  tb_merra2_t10m/
    description_schema.yaml
    raw2refined-tb-merra2-temperature-t10m.py
```

## Como os comentários são aplicados

O notebook instala PyYAML, carrega o YAML da própria pasta e valida que todas as colunas do DataFrame têm descrição e que o YAML corresponde à tabela de destino. Na etapa final, cria a tabela Delta e aplica `COMMENT ON TABLE` e `ALTER TABLE ... ALTER COLUMN ... COMMENT`. Os comentários ficam disponíveis no catálogo do Databricks. A identidade de execução precisa de permissões para criar a tabela e modificar seus comentários. [Documentação Databricks](https://docs.databricks.com/gcp/en/sql/language-manual/sql-ref-syntax-ddl-comment)

Cada execução lê os arquivos de origem, valida as descrições, grava a tabela e publica os comentários definidos no YAML. Cada alteração de comentário é uma operação própria.

Os arquivos YAML são publicados junto dos notebooks pelo bundle. O notebook usa o diretório atual para localizar seu YAML e o módulo compartilhado. Essa resolução depende do comportamento padrão dos notebooks em runtimes modernos, nos quais o diretório atual corresponde à pasta do notebook. [Diretório de trabalho no Databricks](https://docs.databricks.com/gcp/en/files/cwd-dbr-14)

A gravação usa `mode("overwrite")` por padrão para substituir os dados da tabela em cada reprocessamento. As descrições do YAML são reaplicadas após a gravação. Os jobs continuam com uma única tarefa `extract`, com criação de schemas feita na preparação do ambiente.

## De onde obter as descrições

1. Inspecionar os atributos do arquivo original da versão utilizada. Em NetCDF, consultar `long_name`, `standard_name`, `units`, `calendar`, `_FillValue`, `scale_factor`, `add_offset` e flags de qualidade. Xarray e netCDF4 expõem esses atributos. Em HDF5, consultar atributos dos grupos e datasets com h5py. Para HDF4, usar GDAL com suporte HDF4 ou pyhdf.
2. Ler a especificação e o guia do produto exato, incluindo coleção, versão, variável, nível de processamento, grade e frequência. O catálogo CMR/Earthdata ajuda a identificar o produto e seus documentos.
3. Ler o código produtor e os arquivos `.metadata.json` do bucket para campos derivados, como acumulado mensal, fração de cobertura e médias dos erros. A documentação do satélite descreve a variável original. O código do pipeline estabelece a transformação aplicada ao campo exportado.
4. Registrar a descrição em português, a unidade, a referência e a revisão em `description_schema.yaml`. Campos cuja definição exata ainda depende do produtor recebem status de pendência e essa limitação no comentário.

CSV contém nomes e valores. Para os CSVs existentes, os guias MERRA-2 e IMERG e os metadados de processamento foram usados para complementar os cabeçalhos. As regras exatas de `valid_day_count` e `mean_halfhourly_sample_fraction` permanecem pendentes de inspeção do código produtor. As unidades das colunas de vento exportadas também exigem revisão.

Exemplo reduzido do contrato de documentação usado pelos notebooks.

```yaml
table:
  name: "`earth-trend-data`.refined.tb_merra2_t10m"
  description: Temperatura mensal do ar a 10 m da reanálise MERRA-2.
  product: M2TMNXSLV
  theme: calor
provenance:
  reviewed_on: '2026-11-14'
  references:
    - https://gmao.gsfc.nasa.gov/pubs/docs/Bosilovich785.pdf
columns:
  T10M_K:
    description: Temperatura do ar a 10 m, em kelvin.
    unit: K
    source: Especificação MERRA-2 e atributos da variável T10M.
```

O exemplo mostra um campo. O YAML executado deve conter todas as colunas reais. `unit`, `source` e `status` documentam proveniência no arquivo. O texto de `description` é o conteúdo publicado como comentário e deve incluir as unidades e limitações necessárias à interpretação.

## Temas do projeto e definição dos produtos

Os temas abaixo orientam a seleção das próximas fontes. Os contrastes regionais e tendências citados no planejamento são perguntas de análise. As descrições das tabelas documentam as variáveis e o processamento, com resultados científicos associados a análises e períodos definidos.

| Tema | Produto ou variável a documentar | Situação da integração atual |
| --- | --- | --- |
| Calor | MERRA-2 para temperatura do ar, identificando altura. MODIS LST para temperatura da superfície, identificando dia/noite e QA | Há tabelas MERRA-2 TS e T10M e job de T2M. A temperatura da superfície MODIS exige um produto LST, como MOD11, e sua ingestão própria |
| Ciclo da água | GPM IMERG, diferenciando execução Final/Late, taxa e acumulado | Há tabelas Final e Late com descrições e campos de cobertura |
| Água subterrânea | GRACE/GRACE-FO e produto de armazenamento ou assimilação escolhido | Job GRACE de anomalia de massa total publicado. A estimativa isolada de água subterrânea exige explicitar componentes e método |
| Gelo e nível do mar | Extensão/concentração de gelo marinho, massa das calotas e altimetria | Jobs de máscaras de gelo marinho publicados. Séries de extensão regional, massa de calotas e altimetria exigem tratamento próprio |
| Poluição do ar | NO₂ OMI, identificando coluna total/troposférica e flags | Integração pendente. Escolher coleção, versão, variável e unidade antes de definir o schema |
| Fogo | Detecções FIRMS e produto MODIS de área queimada | Integração pendente. As medidas de detecção e área queimada têm contratos próprios |
| Vegetação | MODIS NDVI/EVI e produto LAI | Job MOD13C2 com NDVI, EVI e QA publicado, com execução de carga pendente. LAI exige um produto próprio, como a família MOD15 |
| CO₂ atmosférico | OCO-2, XCO₂ e qualidade da recuperação | Integração pendente. Selecionar versão, flags e forma de agregação |

MERRA-2 distingue T2M, T10M e TS em sua especificação. A descrição deve manter essa identificação da variável. [Especificação MERRA-2](https://gmao.gsfc.nasa.gov/pubs/docs/Bosilovich785.pdf)

MODIS LST possui produtos específicos de temperatura da superfície e emissividade. MOD13 e MOD15 pertencem, respectivamente, às famílias de índices de vegetação e LAI/FPAR. [MODIS LST](https://modis.gsfc.nasa.gov/data/dataprod/mod11.php), [produtos terrestres MODIS](https://modis.gsfc.nasa.gov/data/dataprod/pdf/MODISdataflowdiag.pdf)

Os produtos de água subterrânea por assimilação combinam observações GRACE com modelagem dos componentes hídricos. A referência e o método precisam constar do produto selecionado. [NASA GRACE Data Assimilation](https://earth.gsfc.nasa.gov/hydro/data/groundwater-and-soil-moisture-conditions-grace-data-assimilation)

Para os demais temas, usar os documentos do produto escolhido como origem das definições. [IMERG](https://gpm.nasa.gov/data/imerg), [Sea Ice Index](https://nsidc.org/sites/default/files/g02135-v003-userguide_1_0.pdf), [OMI NO₂](https://airquality.gsfc.nasa.gov/no2), [FIRMS](https://firms.modaps.eosdis.nasa.gov/map/index.html), [guia OCO-2/OCO-3](https://docserver.gesdisc.eosdis.nasa.gov/public/project/OCO/OCO2_v11.2_OCO3_v10_L2_Data_Users_Guide_V3_RevB.pdf)
