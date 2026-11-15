# Consolidated trusted indicators

> Subsequent update (November 15, 2026): the user expanded the intended source
> list to eleven tables (excluding the retired sea-ice extent mask). Warehouse metadata has been updated; candidate API/UI
> changes and current evidence are in [indicator catalog update](indicadores-cobertura-catalogo.md).
> The seven-table production checks below describe the earlier release.

Production verified November 15, 2026, after
[PR #29](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/29), merge
`d81e66890cfbf33ef18921476411bf38a157735a`.
[Backend CI/CD](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43728947821)
and [Vercel production](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/GJm3eNtsvi1KAUpYn4vMHyWMmPA4)
completed successfully. The public catalog serves revision `kipp-earth-api-00024-gav`,
205 explicit physical fields, 87 enabled and 118 hidden. All 87 enabled physical
table/column pairs match the independently read warehouse inventory exactly.

Production Chromium verification at 1440×1000 and 390×844 showed seven available
event cases (eight when unavailable cases are included), three Pantanal variables,
no NDVI/EVI choices and disabled Tōhoku actions. Opening Pantanal loaded the
September 2024 `merra2_flx_prectotcorr` binary globe frame with
`sourceTable=earth-trend-data.trusted.tb_merra2_fluxos` and `unit=kg m-2 s-1`.
No JavaScript exceptions or mobile horizontal overflow. Screenshots and machine
results were retained in temporary local files; no synthetic data were used in
this production check. The pipeline also passed actual temperature frames,
regional series, stored trend reference, comparisons and seasonal/HAC inference.
This verifies deployment and source integration, not formal Space Apps submission.

On November 15, 2026 the user confirmed that the seven consolidated MERRA-2
tables are the intended observation sources. Individual MERRA-2 tables and the
previous GPM/GRACE/MODIS/ice sources are outside this active observation registry.
Their IDs are not silently remapped to different measurements or products.

All 205 physical indicators in these seven tables have explicit reviewed runtime
definitions. Existing MERRA-2 IDs retain their meaning, units and conversions.
The current coverage inventory enables 87 indicators (25 fluxes, 21 cloud fields,
11 pressure/height fields, 8 temperature fields, 9 humidity fields, 7 variances,
6 wind fields) and hides 118. Temperature at 10 m is available in the existing
Celsius representation and a separately labeled Kelvin source representation.
Visibility remains controlled by the exact table/physical-column coverage flag;
the deployment does not edit flags or warehouse data. Catalog scans skip false
flags and query each consolidated table independently, with two concurrent reads.

| Trusted table | Enabled physical indicators |
| --- | ---: |
| `tb_merra2_fluxos` | 25 |
| `tb_merra2_nuvens` | 21 |
| `tb_merra2_pressao_altura` | 11 |
| `tb_merra2_temperatura` | 8 |
| `tb_merra2_umidade` | 9 |
| `tb_merra2_variancias` | 7 |
| `tb_merra2_vento` | 6 |

Schema discovery returned 226 columns: 205 physical indicators plus time and
coordinates across seven tables. Column types/comments were checked against live
`information_schema.columns`; collection names and units were reviewed against
the producer `description_schema.yaml` files. Static manifests prevent source
metadata from becoming executable identifiers at runtime. The live consolidated
SPEED and SPEEDMAX variance columns are distinct even though an older individual
table YAML aliases both to the same target. They retain distinct runtime IDs.

Physical source column and data type are included in provenance. COSP fields
are explicitly named simulated satellite diagnostics, with their collection and
limitations in the product/description; they are not direct MODIS/ISCCP satellite
observations. `simulated=false` continues to mean no fabricated prototype data;
the more specific `dataType` distinguishes these real model-simulator outputs.
Native variance fields retain squared units and are not regional uncertainty
or confidence intervals. No new uncertainty or causal claim is introduced.

Events and Trend Lab presets use explicitly named MERRA-2 bias-corrected
precipitation flux (`merra2_flx_prectotcorr`, kg m-2 s-1), not the old IMERG
rainfall ID or mm/month. The second Trend Lab example compares precipitation
and specific humidity rather than offering the inactive GRACE source. Seven
event cases have environmental context; Tōhoku retains no suitable layer.

Local real-data validation matched all 87 enabled table/column pairs exactly
against the coverage inventory, verified 321 valid months (2000-01–2026-09)
for each, and checked all seven source scans. The Pantanal rectangle
(-59,-22,-54,-15), June–September 2024 returned four finite regional values for
temperature and modeled precipitation flux. This is a source-integration check,
not a new scientific trend investigation or causal analysis.

Discovery statement IDs: columns `01f1e104-938e-1ea8-bad4-f7d4034caa1b`, coverage
`01f1e104-9489-17cc-9f1a-809ba3ee2ae2`. Reproduction uses the API's DataService
SQL and a read-only CLI provider; all queries completed without truncation.
Live verification statement IDs:

- `01f1e106-fd82-118f-a80c-f15aac553ba4`
- `01f1e106-fe3d-1114-a18a-371a30a0723a`
- `01f1e106-fe3d-1aa6-9280-fab0a5e6962b`
- `01f1e106-fef4-139c-9bbc-5cbb7011a491`
- `01f1e106-ff08-1b6b-b677-e52fb3040a26`
- `01f1e106-ff9e-1966-bc84-4390dd7526ab`
- `01f1e106-ffb6-1c2b-9122-061bf3782099`
- `01f1e107-004e-174f-b8d5-5279f2450bb6`
- `01f1e107-0153-1a39-a047-de8355bccb7c`
- `01f1e107-0297-1e2a-ac6f-3446de9385a8`

OpenAI Codex assisted implementation, metadata review, tests and documentation.
No AI-generated scientific observations or images were added. Human scientific
review remains pending. GitHub use of c0ffex was explicitly authorized by the
user for this deployment; the repository personal Git authorship is preserved.
Local tests/builds and production deployment status are recorded in the delivery
checklist. Formal Space Apps submission and deadline confirmation remain separate.
