# Trend Lab: seasonal trends, anomalies and relationships

Implemented locally on 2026-11-15. This completes milestones 1–3 of the
[plan](superpowers/plans/2026-11-15-trend-lab-relationships.md). It is not a
deployment or a forecast product. Compound anomaly classification, ENSO ingestion,
MODIS backfill and forecasting remain future work.

## User workflow

Choose a region, one or two continuous indicators, study dates and a reference
period, then **Generate investigation**. Three views share that submitted result:

- **Trend:** seasonal linear time components, rates/year and decade, approximate
  robust slope intervals, valid month counts and adjusted evidence.
- **Anomalies:** raw values, calendar-month departures in physical units, or
  standardized departures; reference counts and statistics are inspectable.
- **Relationships:** raw and season/time-adjusted Pearson correlations, a lag
  curve for 0–6 months, scatterplot, and synchronized month selection on both
  series. Positive lag means X precedes Y.

Presets cover Pantanal temperature/rainfall and rainfall/storage. These labels
refer to the rectangle −60,−22,−54,−16, not a biome polygon. Selecting a preset
does not automatically run it. Changing setup leaves previous results identified
until the next generation. View/lag/representation changes do not fetch new data.

Settings can be saved and restored on the current device. They are versioned
configuration, not an offline data snapshot. JSON and long-form CSV export the
submitted request, raw and baseline observations, transformations, source
metadata, reference statistics, lag pairs, and every member of the test family.
CSV uses record type, variable/test, month and a JSON payload to preserve all
heterogeneous evidence fields. Exported JSON also includes the region label.

## Data and API

`GET /v1/investigation` accepts `x`, optional `y`, `bbox`, `start`, `end`,
`baselineStart`, `baselineEnd`, and `method=relationships-v1`. The catalog
advertises `capabilities.investigations`; older APIs leave generation disabled.
The Vercel proxy permits the exact new route and parameter set, using its
existing fixed private upstream and server-side identity.

The service accepts at most two distinct allowlisted continuous indicators and
600 calendar months across the union of study/reference periods. It performs
one regional aggregation query per variable, sequentially, using the existing
trusted product mappings, source QA, conversions, latitude and valid-area
weighting. No new dataset is synthesized, written, or interpolated. Missing,
invalid or uncovered months remain unavailable; duplicate dates fail explicitly.

Results use the existing bounded response cache and request budget. Browser
cache keys include every request setting, variable metadata and source revision.
Both API and client preserve the submitted request identity. Results include
generation time and backend source revision; these do not freeze upstream data
or replace native product version/provenance.

## Statistical contract

Trend Lab now uses `backend/src/runtime-trend.ts`, the same authoritative seasonal
OLS/HAC12 method used by Compare. Its 13 parameters are intercept, time and 11
calendar-month indicators. Descriptive fits require 24 values with at least two
of each calendar month. Inference requires at least 60 consecutive valid months
and nondegenerate residual variance. The old browser OLS is no longer active. Historical/projected change controls
use the seasonal time component and slope uncertainty; Compare's reference is unchanged.

The default anomaly reference is 2003–2020, an 18-year study reference, not a
30-year climate normal. Each month requires ten valid reference years. Departures
subtract that calendar month's mean; standardized departures additionally divide
by its sample SD and require nonzero SD. Baseline dates are fetched independently
of the displayed period. GRACE's native mass-anomaly reference remains distinct
from this extra seasonal transformation; GRACE does not isolate groundwater.

All seven lags use the same complete-case predictor months, with both X(t) and
Y(t+L) inside the selected period. This can reduce usable GRACE pairs substantially.
No missing dates are compressed into adjacent months. Adjusted Pearson r is
computed after removing calendar-month effects and linear time from both
variables on that common support. These residuals are not baseline anomalies.

The relationship model is `Y(t+L) ~ X(t) + time + 11 month indicators + intercept`.
Beta and its uncertainty use the full model residuals, HAC12 Bartlett covariance,
`n/(n−14)` correction, and a two-sided approximate normal Wald test of beta=0.
The CI is for beta in Y-units/X-unit, not Pearson r or a future observation.
Sixty consecutive common pairs, full rank and nondegenerate variation are
required. Gapped studies retain descriptive correlations but no p/CI.

Holm adjustment covers all seven lag tests and the selected individual trend
tests (nine entries with two indicators). Unavailable tests count as p=1 for
adjustment but display as unavailable. Selecting a lag, hiding details or
changing views never shrinks the family. This does not correct repeated
exploratory region/period/variable choices. Seasonal stationarity, linearity and
short-memory dependence remain assumptions; native product and estimated
baseline uncertainty are not propagated. Associations do not establish causal
effects, event occurrence or predictive skill.

Reference validation uses [statsmodels HAC covariance](https://www.statsmodels.org/stable/generated/statsmodels.stats.sandwich_covariance.cov_hac.html)
and [Holm multiple testing](https://www.statsmodels.org/stable/generated/statsmodels.stats.multitest.multipletests.html).
The consecutive-month guard respects the reference HAC routine's equal-spacing
assumption; the exploratory gap bootstrap has not been promoted to production.

## Verification

- Node.js 24: 85 frontend tests, 14 backend tests and both builds passed.
  The frontend build retains the existing bundle-size warning.
- Four read-only Databricks statements through the new `DataService.investigation`
  implementation produced two real Pantanal studies. Combined CLI/query/service
  wall time was about 15 seconds; this is a spot measurement, not a latency SLA.
- Independent statsmodels checks matched 14 adjusted lag correlations and beta
  coefficients, all available HAC SEs/CIs/p-values, four trend slopes and their
  eligible inference, four reference sets, and both Holm families. A deterministic
  full-design statsmodels beta/SE/CI reference is retained in the backend tests.
- Real temperature/rainfall, 2000-01–2025-09: 303 common predictor months for
  lags 0–6; lag-zero raw r=0.41318436 and adjusted r=−0.42065381.
- Real rainfall/storage, 2002-04–2025-09: 166 common predictor months; lag-one
  adjusted r=0.31369904, with inference unavailable because support has gaps.
  These differ from the preliminary exploration's pairwise-lag sample sizes;
  the new method deliberately uses common support and trims outcome dates.
- Chromium at 1440, 390 and 360 px: no page overflow or JavaScript errors;
  presets, three views, lag selection, data export, saved configuration,
  workspace persistence, stale filters, failure/retry and no additional view
  queries verified. Browser testing replayed the measured Databricks series
  through the new analysis helper and advertised the new capability locally;
  it is not evidence of an end-to-end production deployment.
- Proxy tests verify the fixed investigation route, supported method and
  rejection of duplicate parameters, arbitrary SQL and unreviewed routes.
  Service tests verify query count, source QA, antimeridian selection, period
  bounds, gaps, constant/collinear data and unit conversion invariance.

Ignored evidence: `artifacts/trend-lab-release/{live.json,independent-check.json,
browser-check.json,browser-export.json,desktop.png,mobile-390.png,mobile-360.png}`.
These are local validation artifacts, not public submission attachments.
The independent checker is
[`verify_trend_lab_investigation.py`](../ml_experiments/verify_trend_lab_investigation.py);
run it with input/output JSON paths using an environment containing numpy and
statsmodels. Python packages are verification-only, not production dependencies.

OpenAI Codex assisted implementation, tests, queries and documentation. Human
scientific review is pending. The local validation above did not write to the
warehouse, train models or submit the official project. Production evidence follows.


Release integration: rebased onto main `cefe451`; preserves horizontal setup,
collapsible area globe, methodology/Guide navigation and the newer chart controls.
The historical/projected change controls now use the seasonal time slope and
its robust parameter interval; they are not forecasts. The old OLS mean band
is not carried into this model.

## Production verification — 2026-11-15

The user explicitly authorized the available GitHub account `c0ffex` for this
release after the initial account-policy block. Personal project Git authorship
was retained. The release was rebased onto main `1e054ac`, including the unchanged
wind-arrow fix, and merged in [PR #23](https://github.com/KIPP-hackathon/kipp-earth-trends/pull/23)
as `beadd712`. The release touched no WindArrows or MultiVariablePicker code;
unrelated local edits were left in the original checkout. All 85 frontend tests,
14 backend tests and both Node.js 24 builds passed after integration.

[Vercel deployment](https://vercel.com/lucas-projects-62e8b289/kipp-earth-trends-lab/C8jeJc93iD96LTANDeLFc9sbgfRc)
completed with bundle `index-BJVw9LPx.js`.
[Backend CI/CD](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43690141300)
passed and promoted `kipp-earth-api-00014-wos`. Two public investigation requests
returned HTTP 200 and matched the independent real-data reference across all
seven lags, including sample counts, correlations, coefficients, eligible
uncertainty and gap-related inference status. The catalog advertises
`investigations=true`, 72 variables and real trusted data.

At 13:23 UTC (10:23 America/Sao_Paulo), Chromium verified the public site with
no request interception or fixtures: both Pantanal presets, historical change
controls, relationship lag selection, adjusted scatterplot, standardized
departures, JSON export, GRACE gap warning and Guide navigation. Desktop 1440 px
and mobile 390/360 px had no horizontal overflow or JavaScript exceptions.
This check also includes subsequent main UI changes through `5655e01`.
The initial browser attempt encountered the old five-minute catalog cache;
the final ordinary public request and browser session use the new capability.

Ignored local evidence: `artifacts/trend-lab-release/production-api.json`,
`production-check.json`, `production-export.json`, `production-desktop.png`,
`production-390.png`, `production-360.png`. Deployment verifies the technical
release; scientific review, ENSO forecasting and official submission remain separate.

## Combined series chart — 15/11/2026 (local, not deployed)

Anomalies and Relationships now draw both indicators on one time axis
(`CombinedSeriesChart`). Different units get independent left/right value axes;
identical units (standardized departures) share one axis. Departure views are
symmetric around zero so both indicators share a single zero line. A trailing
12-month mean (only where all 12 months are valid; gaps are not bridged) is
drawn over the thin monthly line and is labeled as smoothing, not a fitted trend.
Year ticks replace start/end-only labels; hover reads both values, click selects
the month. With a lag, each series keeps its own highlighted month.

Motivation from a read-only Databricks check (trusted MERRA-2, Brazil bounding
box, cos-latitude weighting, 2000-01–2026-09, 321 months): T10M seasonal cycle
amplitude ≈3.3 °C vs. deseasonalized anomaly SD ≈0.53 °C and a fitted
≈+0.40 °C/decade; raw T10M vs. surface pressure r≈−0.84 drops to ≈−0.16 on
anomalies. Raw monthly plots therefore mostly show the seasonal cycle and a
spurious shared-season correlation. These are exploratory numbers from a
simple OLS on departures, not the app's HAC inference or a scientific finding.
Results now open on **Anomalies** (seasonal departures), listed first; Trend
and Relationships remain one click away.
Claude Code (Anthropic) assisted this change.
