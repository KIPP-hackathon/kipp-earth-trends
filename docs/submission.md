# NASA Space Apps 2026 — Project submission

> **Rascunho de trabalho; não é uma confirmação de envio.** Atualizado em
> 15/11/2026. A página Project no Space Apps é a entrega avaliada; este arquivo,
> o GitHub e os sites publicados não substituem o preenchimento e o envio no
> portal.

Use este documento para preparar o conteúdo da página Project e os créditos.
Antes de copiar os textos em inglês, a equipe deve revisar a interpretação
científica, confirmar cadastro/equipe/prazo e completar os itens marcados como
pendentes no [checklist de submissão](submission_checklist.md).

## Identidade do projeto

| Campo para preparar | Conteúdo atual | Estado |
| --- | --- | --- |
| Título do projeto | **KIPP - Earth Trend** | Nome definido pela equipe para a candidatura. |
| Desafio | **Be An Earth System Trend Detective!** — NASA Space Apps Challenge 2026 | Desafio escolhido pelo projeto; confirmar seleção na página Project. |
| Tagline | **Explore a changing Earth through evidence, not just maps.** | Rascunho em inglês. |
| Equipe e evento | Não registrados neste documento | Preencher com o nome da equipe, integrantes, evento Local/Universal e funções. Não inferir integrantes a partir de autores do Git. |
| Página Project | URL ainda não registrada | Colar URL e confirmar que o rascunho foi efetivamente salvo e submetido. |
| Repositório | [KIPP-hackathon/kipp-earth-trends](https://github.com/KIPP-hackathon/kipp-earth-trends) | Público segundo o estado do projeto; testar sem login antes de enviar. |
| Aplicação publicada | [KIPP - Earth Trend](https://kipp-nasa.space) | Endereço definido pela equipe para a candidatura. Conferir acesso público antes do envio. |
| Demo ou slides | Ainda não produzidos | Preparar vídeo de até 30 segundos ou apresentação de até 7 slides e fornecer link público. |
| Imagem de projeto | Ainda não produzida | Preparar a imagem e conferir formato, tamanho e identificação de conteúdo gerado por IA. |

Usar **KIPP - Earth Trend** como nome do projeto na candidatura.

## Texto-base em inglês para a candidatura

Os textos abaixo são propostas editoriais, não campos confirmados do formulário
nem declarações já aprovadas pela equipe. Ajuste extensão e formato ao editor
real da página Project. Não afirme resultados ou funcionalidades que não possam
ser reproduzidos pelo link público.

### Short description

> KIPP - Earth Trend helps people investigate changes in Earth-system
> variables using NASA Earth-data products. Choose a variable, region, and time
> range, inspect a monthly time series, and examine its rate of change with
> uncertainty and significance context. The project identifies data provenance,
> units, coverage, and limitations so that reanalysis and other derived
> products are not mistaken for direct observations.

### Project story / full description

> KIPP - Earth Trend helps students, educators, and curious explorers investigate how Earth is changing. Users select a variable, region, and period, explore its monthly history, and examine rates of change, uncertainty, and statistical significance.
>
> Explore combines an interactive globe, monthly playback, and global/regional time series. Compare provides synchronized views for studying differences between regions and periods. Trend Lab examines trends, anomalies, and relationships between indicators, including time lags. Events offers historical starting points, while Guide and an AI assistant help users navigate the investigation. CSV and JSON exports preserve data and provenance for further analysis.
>
> The application brings together MERRA-2, GPM IMERG, MODIS, GRACE/GRACE-FO, NSIDC sea-ice data, and NASA COOLR records. These cover atmospheric conditions, vegetation, water storage, polar ice, and landslide reports worldwide. Historical extraction starts in 2000 where available and extends to each product's latest available month.
>
> Its creative approach connects spatial exploration, regional comparison, statistical analysis, and contextual guidance in one workspace. The intended impact is to support classroom and independent learning, helping users formulate questions and build explanations grounded in Earth data.
>
> React and TypeScript power the interface, with Node.js and Fastify serving the API. Python, PySpark, and SQL process data in Databricks. Google Cloud provides storage, API hosting, and Gemini through Vertex AI; Cloudflare Workers delivers the application, and GitHub Actions automates validation and deployment. Codex assisted development and documentation, and ImageGen generated mascot artwork.
>
> The design prioritizes source traceability, clear comparisons, and responsible interpretation. Coverage, missing data, quality flags, units, bounding-box regions, seasonality, and statistical assumptions are considered when processing and presenting results. Each investigation includes the context needed to understand its findings and limitations.

A equipe deve revisar o texto e reproduzir o percurso na aplicação pública
antes de copiá-lo para a página Project. A implementação atual do Trend Lab
inclui tendências sazonais, anomalias e relações com defasagem, descritas em
[trend-lab-relationships.md](trend-lab-relationships.md). Confirmar esses recursos
no endereço final, pois os registros incluem versões anteriores do módulo.
Explore e Compare usam o [método de tendências em runtime](runtime-trends.md).
Explicitar o método usado no resultado apresentado.

### NASA data, resources, and methods

#### Form entries - ready to copy

Criar uma entrada para cada recurso abaixo. Copiar apenas o conteudo do bloco
para o respectivo campo Link text ou Link URL. As entradas agrupam familias
de dados; o inventario seguinte preserva os produtos e suas referencias.

##### NASA Data

**MERRA-2**

Link text

```text
NASA MERRA-2 v5.12.4 - Atmospheric reanalysis for temperature, humidity, winds, pressure, fluxes, clouds, aerosols and chemistry
```

Link URL

```text
https://gmao.gsfc.nasa.gov/gmao-products/reanalysis-products/
```

**GPM IMERG**

Link text

```text
NASA GPM IMERG V07 - Precipitation estimates and liquid-phase probability, retaining Final and Late provenance
```

Link URL

```text
https://gpm.nasa.gov/data/imerg
```

**MODIS**

Link text

```text
NASA MODIS Terra MOD13C2.061 - Monthly NDVI and EVI vegetation indices with quality information
```

Link URL

```text
https://doi.org/10.5067/MODIS/MOD13C2.061
```

**GRACE / GRACE-FO**

Link text

```text
NASA/JPL GRACE and GRACE-FO RL06.3Mv04 - Mass anomalies for water-storage and ice-mass investigations
```

Link URL

```text
https://doi.org/10.5067/TEMSC-3JC634
```

**COOLR**

Link text

```text
NASA COOLR - Landslide Events and Reports processed as separate monthly catalog record counts
```

Link URL

```text
https://gpm.nasa.gov/applications/landslides/coolr
```

##### Space Agency Partner & Other Data

**Sea Ice Index**

Link text

```text
NOAA/NSIDC Sea Ice Index G02135 v4 - Arctic and Antarctic monthly sea-ice concentration and derived extent masks
```

Link URL

```text
https://nsidc.org/data/g02135/versions/4
```

**Natural Earth**

Link text

```text
Natural Earth - Geographic boundaries used as map context through world-atlas and TopoJSON
```

Link URL

```text
https://www.naturalearthdata.com/
```

##### Other references - platforms and tools

Se o campo incluir ferramentas e outras referencias, usar tambem as entradas
abaixo. O guia publico inclui esses materiais em Space Agency Partner Data
and Other References.

**Databricks**

Link text

```text
Databricks on Google Cloud - Data processing notebooks, ingestion jobs and SQL Warehouse analytics
```

Link URL

```text
https://www.databricks.com/
```

**Google Cloud**

Link text

```text
Google Cloud - Cloud Storage, Cloud Run, Artifact Registry, Vertex AI and Firestore
```

Link URL

```text
https://cloud.google.com/
```

**Cloudflare**

Link text

```text
Cloudflare Workers - Application hosting and server-side API proxy
```

Link URL

```text
https://workers.cloudflare.com/
```

**GitHub**

Link text

```text
GitHub - KIPP - Earth Trend source code, technical references and CI/CD workflows
```

Link URL

```text
https://github.com/KIPP-hackathon/kipp-earth-trends
```

**OpenAI**

Link text

```text
OpenAI Codex and ImageGen - AI-assisted implementation, documentation and mascot artwork
```

Link URL

```text
https://openai.com/
```

O detalhamento de IA permanece na resposta Use of Super Intelligence.
Bibliotecas e pacotes estao reunidos no apendice tecnico.

NASA Blue Marble deve constar nos créditos de imagens com o link do asset
efetivamente utilizado, a confirmar. Earthdata/CMR e a biblioteca earthaccess
aparecem no fluxo de busca e download em [data/](../data/).

A [aba Resources do desafio](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources)
indica Giovanni, Hydrology Time Series e AppEEARS, entre outros recursos.
O texto de Details cita MERRA-2, GPM e MODIS. Os pipelines consultados comprovam
uso desses produtos; uso das ferramentas Giovanni ou AppEEARS ainda não foi
identificado. A relação com o desafio deve ser descrita pelos produtos usados.

Consulta ao conteúdo oficial em 15/11/2026 por HTML público, com verificação
de certificado desativada após falha local de confiança. Esta organização em
famílias é uma proposta de preenchimento, sujeita aos limites do editor.

#### Product inventory and provenance

The source inventory below was reviewed against all extraction contracts in
`databricks/data-extraction/`, the standardization mappings, and the backend
catalog. Product families group their variable-specific tables. The extraction
configuration starts in January 2000 where available and requests updates to
the latest available month. Effective coverage and publication lag vary by
product and variable. The live catalog determines which indicators can be used
for a particular investigation.

| Source / product | Variables and use | Producer reference |
| --- | --- | --- |
| NASA/GMAO MERRA-2 M2TMNXSLV 5.12.4 | Monthly temperature at surface and atmospheric levels, humidity, wind components, pressure, geopotential height, tropopause fields, ozone and cloud-related fields; includes native variance diagnostics. Atmospheric reanalysis with global coverage. | [M2TMNXSLV](https://disc.gsfc.nasa.gov/datasets/M2TMNXSLV_5.12.4/summary) |
| MERRA-2 M2TMNXFLX 5.12.4 | Surface fluxes, evaporation, precipitation components, boundary-layer and surface-exchange fields, with native variances where extracted. | [M2TMNXFLX](https://disc.gsfc.nasa.gov/datasets/M2TMNXFLX_5.12.4/summary) |
| MERRA-2 M2TMNXCSP 5.12.4 | COSP cloud fractions, optical thickness, water/ice paths, particle sizes and satellite-simulator diagnostics, including variance fields. Model-simulated satellite diagnostics. | [M2TMNXCSP](https://disc.gsfc.nasa.gov/datasets/M2TMNXCSP_5.12.4/summary) |
| MERRA-2 M2TMNXAER 5.12.4 | Total and component aerosol optical thickness, scattering, and surface mass concentrations for dust, sea salt, sulfate, black carbon and organic carbon. | [M2TMNXAER](https://disc.gsfc.nasa.gov/datasets/M2TMNXAER_5.12.4/summary) |
| MERRA-2 M2TMNXADG 5.12.4 | Black-carbon deposition diagnostic BCDP001. | [M2TMNXADG](https://disc.gsfc.nasa.gov/datasets/M2TMNXADG_5.12.4/summary) |
| MERRA-2 M2TMNXCHM 5.12.4 | Atmospheric chemistry fields including CO emissions and total-column ozone. | [M2TMNXCHM](https://disc.gsfc.nasa.gov/datasets/M2TMNXCHM_5.12.4/summary) |
| NASA GPM IMERG V07 Final, GPM_3IMERGM | Monthly satellite-derived precipitation estimates and associated quality fields. | [Product DOI](https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07) |
| NASA GPM IMERG V07 Late, GPM_3IMERGDL | Late-run precipitation aggregated to monthly fields. Processing identity is preserved when Final and Late are exposed together. | [IMERG documentation](https://gpm.nasa.gov/data/imerg) |
| NASA GPM IMERG liquid-phase probability V07 | Monthly probability of liquid precipitation phase, derived from IMERG. | [V07 technical documentation](https://gpm.nasa.gov/resources/documents/imerg-v07-technical-documentation) |
| NASA/JPL GRACE and GRACE-FO mascons RL06.3Mv04 | Mass anomalies in equivalent water thickness and derived cell mass. Supports investigation of total water-storage and large-scale ice-mass variability. | [Product DOI](https://doi.org/10.5067/TEMSC-3JC634), [JPL mascons](https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/) |
| NASA MODIS Terra MOD13C2 collection 061 | Monthly global NDVI and EVI vegetation indices, calibrated values and quality/reliability fields. | [Product DOI](https://doi.org/10.5067/MODIS/MOD13C2.061) |
| NSIDC Sea Ice Index G02135 v4, Arctic and Antarctic concentration | Monthly sea-ice concentration fields for both hemispheres, regridded with coverage information. | [G02135 v4](https://nsidc.org/data/g02135/versions/4), [DOI](https://doi.org/10.7265/a98x-0f50) |
| NSIDC Sea Ice Index G02135 v4, Arctic and Antarctic extent masks | Categorical fields derived using the 15% concentration threshold. Regional extent totals require an appropriate area calculation. | [G02135 v4 user guide](https://nsidc.org/sites/default/files/documents/user-guide/g02135-v004-userguide.pdf) |
| NASA COOLR Events Points | Monthly counts of catalog event records assigned to grid cells, with reporting/coverage limitations. | [Events source service](https://gis.earthdata.nasa.gov/portal/rest/services/Landslides/COOLR_Events_Points/FeatureServer/0) |
| NASA COOLR Reports Points | Monthly counts of report records, retained separately from Events to preserve provenance and avoid double counting. | [Reports source service](https://gis.earthdata.nasa.gov/portal/rest/services/Landslides/COOLR_Reports_Points/FeatureServer/0) |
| NASA Blue Marble, January 2004 | Static globe background imagery, credited separately from the monthly scientific layers. | [Frontend asset credits](../frontend/README.md#créditos) |

Exact variable definitions, units, quality policies, transformations, and
references are recorded in each [extraction contract](../databricks/data-extraction/).
The [indicator catalog](../databricks/indicator_catalog.py) and
[backend source mappings](../backend/src/consolidated-sources.ts) connect those
products to application indicators. Confirm the final investigation's actual
coverage in the public catalog. GRACE begins after 2000, polar ice covers its
respective hemispheres, and catalog record counts depend on reporting coverage.

### Platforms and infrastructure

> KIPP - Earth Trend uses Databricks on Google Cloud to process and organize Earth-system
> datasets and serve analytical queries through Databricks SQL Warehouse.
> Google Cloud Storage holds source files and extraction outputs. A containerized
> API on Google Cloud Run connects the application to the analytical data,
> while Vertex AI provides the Gemini assistant and Firestore maintains its
> usage quotas. Cloudflare Workers delivers the public application at
> https://kipp-nasa.space. GitHub hosts the source code, and GitHub Actions
> automates validation and deployment.

| Platform / service | Use in KIPP - Earth Trend | Repository evidence |
| --- | --- | --- |
| Databricks on Google Cloud | Data engineering and analysis through notebooks, Apache Spark/PySpark, Spark SQL, and extraction/standardization jobs. Bundles and the Databricks CLI manage job configuration. | [Bundle configuration](../databricks/databricks.yml), [job resources](../databricks/resources/) |
| Databricks SQL Warehouse | Active analytical query service for catalog metadata, monthly fields, regional/global series, and investigation inputs from the project's reviewed tables. | [Active data architecture](backend-warehouse.md), [data service](../backend/src/data.ts) |
| Google Cloud Platform (GCP) — Cloud Storage | Storage for downloaded Earth-data files, monthly extraction outputs, and provenance metadata used by ingestion jobs. | [Extraction contracts](../databricks/data-extraction/), [extraction configuration](../data/config.py) |
| GCP — Cloud Run | Runs the Node.js/Fastify API in a container with authenticated service access. | [Deployment script](../backend/scripts/deploy.sh), [GCP migration record](gcp-migration.md) |
| GCP — Artifact Registry and Docker | Container image build, storage, and deployment to Cloud Run. | [Backend workflow](../.github/workflows/backend.yml), [deployment script](../backend/scripts/deploy.sh) |
| GCP — Vertex AI / Gemini | Model service for the application's interactive assistant and its bounded application tools. | [Assistant implementation](../backend/src/assistant.ts) |
| GCP — Firestore | Persistent usage quotas for the assistant. An additional response-cache implementation can be enabled through deployment configuration. | [Quota implementation](../backend/src/assistant-quota.ts), [optional cache](../backend/src/persistent-cache.ts) |
| Google Cloud IAM, service accounts, and Workload Identity Federation | Service authorization and deployment identity. GitHub Actions authenticates to GCP through federation. | [Backend workflow](../.github/workflows/backend.yml), [GCP migration record](gcp-migration.md) |
| Cloudflare Workers and Wrangler | Serves the frontend and server-side API proxy, with public-read caching policies. Publishes the application at https://kipp-nasa.space. | [Hosting record](cloudflare-deploy.md), [frontend workflow](../.github/workflows/frontend-cloudflare.yml) |
| GitHub and GitHub Actions | Source control, collaboration, automated tests/builds, and frontend/backend deployment workflows. | [Repository](https://github.com/KIPP-hackathon/kipp-earth-trends), [workflows](../.github/workflows/) |

The repository also retains an earlier Lakebase/PostgreSQL integration and
adapter, documented in [the integration history](backend-lakebase.md). Current
deployment configuration selects Databricks SQL Warehouse. The platform list
above follows that configuration. Platform usage was checked against repository
code, workflows, and deployment records on 15/11/2026.

### AI tools and visual credits

The platforms table above describes the services used to build and operate
KIPP. The following credits identify AI assistance and visual materials used
in the application.

| Item | Use in the project | Attribution / action |
| --- | --- | --- |
| NASA Blue Marble image | Static decorative basemap | Credit NASA; verify the exact asset, usage terms, and link before submission. |
| KIPP mascot artwork | AI-generated interpretive artwork inspired by modular robots in *Interstellar*; no film frame or extracted film asset is recorded as input. | Identify as AI-generated and not official film/NASA artwork; review copyright/attribution and ensure required visible AI watermark on each submitted image/video where it appears. See [mascot asset record](kipp-mascot.md). |
| OpenAI ImageGen | Generated mascot artwork | Name the tool and describe its use in the SI disclosure and project credits. |
| OpenAI Codex | Assisted implementation and documentation | Disclose assistance; team must review and own the final scientific interpretation and project concept. |
| Gemini 3.8 Flash via Vertex AI | AI assistant feature documented in the app | Backend configuration names `gemini-3.8-flash` through Vertex AI. Confirm the deployed configuration before submission; trend statistics are computed by application code. |

**AI/Super Intelligence disclosure — draft for team review**

> Yes. We used AI tools in the project. OpenAI ImageGen generated the KIPP
> mascot artwork; OpenAI Codex assisted with software implementation and
> documentation; and the application includes a Gemini-based assistant for
> user questions. The mascot is identified as AI-generated interpretive
> artwork, not scientific data or official NASA/film artwork. Team members
> selected and reviewed the project direction and must review all generated
> material and scientific claims. AI-generated images/video in the submitted
> materials will be visibly marked as AI-generated, and code/audio/data
> assistance will be identified in descriptive text or metadata as applicable.

This is not ready to submit until the team confirms that the tools/models,
actual uses, and review statement are accurate. The official guide says SI
should support innovation, not come up with the solution idea; generated
content must not use, contain, or modify NASA branding/design elements. It
requires visible AI-generation watermarking on images and videos and
acknowledgment in descriptive text/metadata for audio, code, and data. A
generic credit in this document does not replace those indicators in the
submitted material.

### Links and visuals to prepare

| Candidate link or item | URL / status |
| --- | --- |
| Public source repository | https://github.com/KIPP-hackathon/kipp-earth-trends |
| Public application | https://kipp-nasa.space |
| Demo video or slide deck | **Not yet created.** Public external URL required; no login, permission request, or registration. |
| Screenshot/project image | **Not yet created.** Prepare a representative current project image; review AI watermark, NASA imagery credit, and English labels. |
| Space Apps Project page | **Pending.** Add the final URL after accessing the team's registered event and project editor. |

## Sources used to prepare this draft

- [Project Submission Guide — official](https://www.spaceappschallenge.org/resources/project-submission-guide/)
- [Participant FAQs — official](https://www.spaceappschallenge.org/resources/participant-faqs/)
- [2026 challenge details — official](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=details)
- [2026 challenge resources — official](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources)
- [KIPP requirements/context](space-apps-2026-requisitos.md) and [KIPP delivery checklist/evidence](space-apps-2026-entrega.md)
- [Frontend documentation and credits](../frontend/README.md)
- [Real-data trend method and verification](runtime-trends.md)
- [Data-source inventory](fontes-transient-dados.csv)
- [Mascot assets, AI use, and tool credits](kipp-mascot.md)

The official guide and FAQ URLs were retrieved on 15/11/2026. The local
certificate validation failed; the page HTML was fetched with certificate
verification disabled. Reconfirm current wording in the official pages and
the logged-in submission editor before declaring compliance. No portal login,
Project-page editing, or submission was performed while preparing this draft.

## Technical appendix - libraries and packages

Supporting dependency details are collected here for technical reference and
license review. The main submission text presents the platforms, data sources,
AI tools, and visual credits. Package manifests and lockfiles retain the
complete frontend/backend dependency versions. No requirement to enumerate
every transitive package in the Project description has been verified.

| Technology / package group | Use in the project | Reference / action |
| --- | --- | --- |
| React 19, TypeScript 7, Vite 8, Node.js 24 | Web application and build/runtime tooling | List the project and versions in the repository; confirm dependency licenses from the lockfile/package metadata. |
| Fastify 5, @fastify/cors and @fastify/compress | API framework, cross-origin policy, and response compression | Backend dependency manifest in `backend/package.json`. Infrastructure roles are recorded above. |
| WebGL/Canvas, d3-geo, topojson-client, Natural Earth / `world-atlas`, Lucide React | Map projections and geographic outlines | Cite the relevant package/data licenses and identify Natural Earth as geographic context, not observations. |
| Manrope and Instrument Serif | Locally bundled interface fonts | Confirm and cite each font license from the package metadata. |
| Local flag-icons assets | Optional country identifiers | The frontend documentation records MIT licensing; link the bundled license if used in screenshots/demo. |
| Three.js 0.187.0, Playwright 1.65.1, Chromium, FFmpeg | Used to create/render the animated assistant mascot assets; not all are runtime dependencies | Three.js MIT and Playwright Apache-2.0 are recorded in [mascot credits](kipp-mascot.md); verify the media/codec and other applicable notices. |
| Python, PySpark, Spark SQL, Databricks notebooks/jobs and Google Cloud Storage | Extraction, standardization, metadata and analytical data pipeline | Source and job configuration in `databricks/`; storage and extraction configuration in `data/`. |
| earthaccess, xarray, netCDF4, Dask, NumPy, pandas, SciPy, Rasterio and pyhdf | NASA data access, array processing, scientific formats, regridding and MODIS HDF4 reading | See `requirements.txt`, `requirements-water-ice.txt` and notebook imports for applicable dependencies. |
| Matplotlib and statsmodels | Exploratory plots and independent statistical verification | The verification procedure is documented in `docs/runtime-trends.md`. |
| Vitest, Playwright, Chromium, TypeScript and Prettier | Tests, browser checks, type checking and formatting | Development and validation tools are recorded in manifests and supporting scripts. |

Dependency records are available in [frontend/package.json](../frontend/package.json),
[backend/package.json](../backend/package.json), their adjacent lockfiles,
[requirements.txt](../requirements.txt), and
[requirements-water-ice.txt](../requirements-water-ice.txt).
Preserve applicable third-party license notices with distributed code and assets.
The final portal form and official guide determine the requested credit fields.
