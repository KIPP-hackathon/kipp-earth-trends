# Stored trend and significance reference

`TrendReferenceService` reads the existing Databricks SQL table
`earth-trend-data.refined.tb_trend_merra2_ts`. It returns precomputed results and
does not calculate a new trend for the current application view.

The service accepts `TrendReferenceArguments`: required `query` (1–200
characters), optional exact `regionId`, `method` and `variable` filters (1–100
characters), and `limit` (1–12, default 6). `query: "all"` lists bounded matches;
short English/Portuguese region, variable or method keywords use accent-normalized
lexical matching. Exact filters are validated against actual cached records.
Unknown regions or variables are not replaced with the nearest stored result.

A fixed SELECT of the table's 30 explicit columns, ordered by region, method and
period, fetches at most 501 records. A shared coalesced five-minute cache retains
at most 500; an oversized reference has `referenceTruncated: true`. No user text
or source-row identifier enters SQL. Errors expose generic unavailability. Text
is bounded to 250 characters, except aggregation (1,200) and notes (2,000).
Numeric precision, nullable statistics, boolean significance, stored dates,
region bounds, product, data type, units, aggregation and method notes are
preserved. Results include actual available regions/methods/variables/periods and
explicit result/reference truncation flags.

## Scope and scientific caveats

Read-only inspection on November 14, 2026 found 35 records: seven regions times
five methods for surface skin temperature, in degrees Celsius, from NASA GMAO
MERRA-2 M2TMNXSLV v5.12.4 (TS), a reanalysis. Each record covers 33 monthly values
from January 2024 through September 2026, computed at
`2026-11-14T20:55:42.212Z`. Regions are `amazon_box`, `global`, `arctic`,
`antarctic`, `tropics`, `nh_extratropics` and `sh_extratropics`.

These are rectangles or latitude bands, not exact country, biome or basin
polygons. Their bounds select source cell centers: south/west inclusive,
north/east exclusive except latitude 90 degrees. Monthly aggregation weights by
exact spherical cell area from `tb_dim_grid_0p5x0p625.area_weight`. It can differ
from the application's descriptive bbox series. The two methods/results must
not be presented as interchangeable calculations.

The short record does not establish long-term climate trends. Slopes per decade
are a rescaled unit from this short record, not ten years of observed change or
a forecast. The producer recommends `seasonal_mann_kendall`,
`mann_kendall_sen_anomaly` or `ols_anomaly_ar1` for interpretation;
`mann_kendall_raw` is reference only. The service orders the three recommended
methods first but retains all five when requested. `ols_anomaly` assumes
independent residuals; anomalies use monthly climatology of the same period.
Seasonal tests have few years per calendar month and low power. Results must
include method disagreement, missing confidence bounds and stored diagnostics.

For example, stored Amazon-box OLS-anomaly p = 0.04617521160722992, while
AR(1)-adjusted OLS p = 0.6116896813955846. The latter notes lag-1 correlation of
0.76 and effective sample size of 4.4. Selecting the smaller p-value alone would
hide a material method limitation. Stored significance uses p < alpha without
multiple-comparison correction. It is not importance, causality or prediction.
No stored result establishes an arbitrary requested region, variable or period.

## Verification and provenance

Node.js 24 backend build passed. An ephemeral read-only M2M smoke checked the
actual 35 rows, seven regions, five methods, coalescing of concurrent queries,
Portuguese region aliases, exact filter validation, numeric/boolean conversion,
null confidence bounds, exact dates and stored Amazon method disagreement.
Synthetic 501-record and failed-provider cases checked explicit truncation and
error redaction. No test suite, DB mutation, grant or cloud configuration was
added by this work. Production service-account access requires deployment
verification; M2M success alone does not establish production access.

OpenAI Codex assisted this service and documentation. Exact model identifier was
not verified; team review remains pending. Access to stored results alone does
not complete a reproducible scientific investigation or the Space Apps submission.
