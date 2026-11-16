# KIPP data: sources, scale and coverage

KIPP transforms Earth-science products into monthly fields and time series that can be explored and analyzed together. This inventory describes the **curated serving data**, independently of the larger set of acquisition scripts and experiments in the repository.

Snapshot: **15 November 2026**, public API revision `kipp-earth-api-00043-mev`. Both [the main catalog](https://kipp-nasa.space/api/earth/v1/catalog) and [the Vercel catalog](https://kipp-earth-trends-lab.vercel.app/api/earth/v1/catalog) returned SQL Warehouse / `trusted` data.

## Ingestion represented in the application

**734,637,888 grid records** are represented across **11 curated tables**. The runtime defines **224 variables**, of which **106 were available** and **118 unavailable** under the current coverage configuration.

| Curated table | Registered variables | Available variables | Months | Grid records |
| --- | ---: | ---: | ---: | ---: |
| MERRA-2 clouds (`tb_merra2_nuvens`) | 21 | 21 | 321 | 66,747,456 |
| MERRA-2 pressure and height (`tb_merra2_pressao_altura`) | 14 | 11 | 321 | 66,747,456 |
| MERRA-2 wind (`tb_merra2_vento`) | 21 | 6 | 321 | 66,747,456 |
| MERRA-2 humidity (`tb_merra2_umidade`) | 12 | 9 | 321 | 66,747,456 |
| MERRA-2 temperature (`tb_merra2_temperatura`) | 14 | 8 | 321 | 66,747,456 |
| MERRA-2 variances (`tb_merra2_variancias`) | 93 | 7 | 321 | 66,747,456 |
| MERRA-2 fluxes (`tb_merra2_fluxos`) | 30 | 25 | 321 | 66,747,456 |
| MERRA-2 aerosols (`tb_merra2_aerossois`) | 14 | 14 | 321 | 66,747,456 |
| MERRA-2 chemistry (`tb_merra2_quimica`) | 2 | 2 | 321 | 66,747,456 |
| IMERG Final + Late (`tb_gpm_imerg_precipitation_final_late`) | 2 | 2 | 322 | 66,955,392 |
| Sea ice (`tb_sea_ice_concentration_global`) | 1 | 1 | 322 | 66,955,392 |
| **Total** | **224** | **106** | **Not additive across tables** | **734,637,888** |

MERRA-2 tables span January 2000–September 2026; the IMERG and sea-ice tables span January 2000–October 2026. Each monthly table contains 207,936 grid rows (361 × 576). This is the application's prepared grid, not each product's native resolution. Valid coverage varies by variable and cell.

The [machine-readable snapshot](data-inventory-2026-11-15.csv) preserves full table names, periods, product labels and revision. It contains aggregate metadata, not downloaded Earth-science arrays.

## How many NASA sources?

The active catalog covers **two NASA families: MERRA-2 and GPM IMERG**. For source-stream accounting, there are **eight NASA streams**: six MERRA-2 collections and two IMERG processing runs. This definition avoids calling each variable, table or processing variant a separate NASA mission.

| NASA family / source stream | What KIPP uses it for |
| --- | --- |
| MERRA-2 `M2TMNXSLV` 5.12.4 | Atmospheric single-level fields, including temperature, humidity, wind, pressure and height. |
| MERRA-2 `M2TMNXFLX` 5.12.4 | Surface and atmospheric fluxes and related fields. |
| MERRA-2 `M2TMNXCSP` 5.12.4 | COSP satellite-simulator cloud diagnostics; not direct MODIS/ISCCP observations. |
| MERRA-2 `M2TMNXAER` 5.12.4 | Aerosol diagnostics. |
| MERRA-2 `M2TMNXADG` 5.12.4 | Aerosol diagnostics represented by the reviewed catalog mapping. |
| MERRA-2 `M2TMNXCHM` 5.12.4 | Atmospheric chemistry fields. |
| GPM IMERG Final V07 | Earlier portion of the consolidated satellite precipitation record. |
| GPM IMERG Late V07 | Later portion of the same record, retaining monthly processing provenance. |

**NOAA/NSIDC Sea Ice Index G02135 v4** is an additional family and is credited separately; it is not counted as another NASA family. The API has eight distinct product labels: six MERRA-2 collection labels, one combined IMERG label and one NSIDC label. Product-label count therefore differs from the eight NASA processing streams above.

Source links and product attribution are collected in the [submission source inventory](submission.md#nasa-data-resources-and-methods). MERRA-2 is reanalysis; IMERG and sea-ice fields are derived satellite products. They must not all be described as direct observations.

## Ingestion work beyond active layers

The repository also contains acquisition/processing work for MODIS vegetation indices, GRACE/GRACE-FO mass anomalies and NASA COOLR records, along with other supporting experiments. Together with MERRA-2 and GPM, these represent five NASA-related families in the documented acquisition scope. Their pipeline presence does not establish current app availability, nor does the row total above include every staging file, transient copy or historical table.

The [source-file inventory](fontes-transient-dados.csv) and [Databricks job documentation](databricks-bundle.md) describe broader processing work. Counts from those inventories must retain their date and scope rather than be added to serving-table totals.

## Counting method and interpretation

1. Read the public catalog and group variables by `sourceTable`.
2. For each table, collect each distinct month once. Check that all variables exposing the same table/month report the same `samples` count.
3. Sum those `samples` counts once per table/month. The [data service](../backend/src/data.ts) derives them using `COUNT(*)` grouped by month over non-null source dates.
4. Count registered variable IDs and the `available` flag separately. Do not multiply grid rows by the number of variables sharing a table.

The result is a count of prepared table records, including rows whose individual measurements may be missing. It is **not** a count of unique independent observations, valid measurements, original NASA files or bytes ingested. Tables overlap in time and geography. Raw/Delta storage size was not measured in this audit; no GB/TB figure is claimed.

Coverage flags, new ingestion and mutable upstream tables can change these totals without changing the frontend. Preserve a dated catalog/response with the final submission. OpenAI Codex assisted this inventory and its calculations; it did not generate the scientific source observations.
