# Event context and exact stored trend evidence

Implemented locally on November 14, 2026. Deployment and integrated browser
verification must be recorded separately; this document does not establish a
finished scientific investigation or Space Apps submission.

## Curated event guidance

`GET /v1/events` retains the existing event, primary variable, availability and
months fields. It adds `suggestedVariables` with reviewed runtime `id`, English
`reason`, valid overlapping `months` and `available`, plus a `coverageNote`.
Primary selection stays unchanged when available; otherwise it uses the first
available relevant candidate. The top-level months belong to that primary
variable. The assistant's existing `list_events` contract is unchanged.

Candidates are deliberately limited to the reviewed registry: fire context uses
rainfall, air temperature at 10 m, specific humidity at 2 m, NDVI and EVI;
hurricane context uses rainfall, signed eastward/northward wind components at
10 m and surface pressure; ENSO context uses air temperature and rainfall.
Tsunamis have no suitable candidate. Excluded wind speed is never suggested.
NDVI and EVI retain their distinct meanings. Air temperature is not SST or ONI;
specific humidity is not relative humidity; wind components are not peak speeds.

Availability requires actual catalog months inside the historical event window
with `validSamples > 0`. It is **global catalog overlap**, not proof of regional
coverage. The regional series request checks the selected rectangle separately.
Rectangles are study areas, not exact affected footprints. Monthly fields cannot
resolve daily extremes, cyclone tracks, tsunami waves or establish causality.
Historical events outside the loaded record stay unavailable rather than being
silently shifted to newer dates.

## Bounded stored evidence contract

`GET /v1/trends?variable=surface_temperature&bbox=-80,-20,-45,5&start=2024-01&end=2026-09`
checks the selected runtime variable, numeric bounds and complete monthly
period against the actual stored rows. The fixed authenticated Vercel BFF route
accepts only `variable`, `bbox`, `start` and `end`, without extra or duplicate
parameters. The backend validates registered variables, geographic bounds,
1900–2100 calendar months, ordered periods and a maximum of 120 calendar months.

Only reviewed runtime `surface_temperature` maps to stored
`surface_skin_temperature`. Air temperature and other variables cannot borrow
its results. Bounds compare numerically, so equivalent decimal strings match;
nearby, overlapping or contained rectangles do not. Dates must match both stored
period endpoints at monthly resolution, not merely overlap the record. No
nearest region, polygon substitution or newly calculated significance is used.

The endpoint shares the assistant's `TrendReferenceService` instance, fixed
30-column SQL query, coalesced five-minute cache and 500-row snapshot cap.
It reads the SQL provider only; a Lakebase-only deployment returns unavailability.
The new method generates no SQL from filters or source identifiers. Results
retain stored methods, units, dates, observations, slopes, nullable confidence
bounds, p-values, alpha, significance, product, aggregation and notes. At most
12 exact method records and 100 actual context combinations are returned.
`referenceTruncated`, `resultsTruncated` and `contextsTruncated` make caps explicit;
an incomplete snapshot cannot establish absence of a matching result.

A successful response has status `exact` or `unsupported` and echoes the
selection. Provider unavailability returns a generic HTTP 503 with no-store
caching; transient failures never enter the success caches. Unsupported selections contain empty `results`, a reason and safe
`supportedContexts` assembled from actual row combinations rather than a
cross-product of unrelated metadata. Provider errors are generic and contain
no credentials or upstream error bodies. The frontend validates selection and
exactness again and uses the existing bounded memory-only read cache.

`TrendEvidence` shows the exact methods in Analysis, including disagreement and
source notes about autocorrelation/effective sample size. Separate supported
contexts are informational and never mutate filters. Stored area weighting and
cell-center bounds may differ from the descriptive chart's aggregation; the
component explicitly identifies this as stored analysis rather than a fresh
calculation of that chart. A short 33-month record does not establish a
long-term climate trend; per-decade slopes are rescaled rates, not a ten-year
observed change or forecast. Non-significance or missing evidence does not
establish no change, and significance does not establish causality or importance.

## Local verification evidence

With Node.js 24.18.0, backend and frontend builds passed and all 46 existing
frontend checks passed. No new committed test suite or dependency was added.

An ephemeral read-only smoke queried the actual reference table: 35 stored
rows, seven supported contexts and five methods for the exact Amazon rectangle
`-80,-20,-45,5`, January 2024–September 2026. Search and exact-selection requests
shared one SQL read. It preserved null confidence bounds and the stored method
disagreement documented in [trend-reference.md](trend-reference.md). Equivalent
numeric bbox strings matched; different variables, nearby rectangles and shorter
periods returned no borrowed result. Six invalid selections were rejected.
Synthetic oversized-reference and provider-failure checks confirmed caps and
error redaction. Event checks covered valid-month filtering, primary fallback,
unavailable historical windows, unavailable catalog entries and zero tsunami
candidates. Credentials were loaded only into process memory and not printed.

A local real-provider HTTP smoke returned HTTP 200 with five global methods,
35 reference rows, ETag and a subsequent response-cache hit. Invalid month,
degenerate bounds, extra source parameter and unknown variable were rejected.
This checks the backend route; it does not establish production BFF access.

OpenAI Codex assisted the implementation, English contextual rationale and this
documentation. Exact model identifier was not verified. Human scientific review and production verification remain pending. No new
source data, scientific statistics, cloud permissions or provider grants were
created by this work.


Integrated local browser verification: Pantanal 2024 opened rainfall with a
May–October 2024 context around the June–September event window, offered actual
rainfall/temperature/humidity overlap and disabled uncovered vegetation choices.
Switching a suggested variable retained area/context dates. Clear area selected
Global and removed the event context. Evidence exposed no matching trend for an
unsupported selection; explicitly opening the stored Amazon study selected
surface temperature, bbox -80,-20,-45,5 and January 2024–September 2026, then
rendered all five method rows and their significance disagreement. Opening a
supported context is an explicit user action, never an automatic substitution.
