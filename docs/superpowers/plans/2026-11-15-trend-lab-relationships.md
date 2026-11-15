# Trend Lab — relationships, anomalies, and forecasting implementation plan

Date: 2026-11-15. Status: milestones 1–3 implemented and validated locally.
See [implementation evidence](../../trend-lab-relationships.md). Deployment is
not performed; milestones 4–6 remain future work. The historical and projected change controls use the seasonal slope and its
robust parameter interval. The legacy OLS helper remains only for its isolated
historical tests/chart module; the active Trend Lab uses the backend method.
Evidence: [warehouse exploration](../../trend-lab-exploration.md),
[current Trend Lab](../../trend-lab.md), [runtime statistics](../../runtime-trends.md).
Apply [challenge requirements](../../space-apps-2026-requisitos.md) and
[delivery checklist](../../space-apps-2026-entrega.md) throughout.

## Product objective and first release

Help someone investigate: **What is changing in this region, how unusual is it,
and which variables move together or follow one another?**

Keep one Trend Lab workspace, with three result views: **Trend**, **Anomalies**,
and **Relationships**. Region, dates, and submitted investigation remain shared
inside this workspace and independent of Explore/Compare. Forecast is a later
research release, conditional on demonstrated skill.

The first release supports temperature at 10 m, IMERG Final rainfall, and GRACE
water-equivalent mass anomaly. Use existing catalog IDs, units, QA, and trusted
aggregation contracts. Start with one region and at most two variables per run.
Other continuous variables can become eligible through the same coverage checks;
do not promise that all catalog variables are statistically usable. MODIS currently
has three months and remains unavailable for seasonal analysis until backfilled.

Example journey:

1. Choose the Pantanal box, temperature and rainfall, Jan 2000–Sep 2025.
2. Generate once; inspect seasonal trend rates and uncertainty for each variable.
3. Switch from raw values to anomalies, with the reference period visible.
4. Open Relationships to compare raw and adjusted correlation and scatterplots.
5. Try rainfall and water storage; inspect lags 0–6 months and missing-data notes.
6. Export the exact observations, transformations, methods, and result family.

The first preset illustrates the exploratory correlation sign reversal; it is
not a guaranteed production result independent of input revision and settings.
Globe interaction selects the study rectangle. Any later anomaly map must use
cell-specific baselines; never paint a regional scalar as a measured global field.

## Architecture decisions

- Databricks performs spatial aggregation of trusted source rows. Compute
  statistics over the resulting monthly series in the existing TypeScript API.
  Do not send cell grids to the browser for statistical calculations.
- Keep one authoritative implementation of seasonal trend inference in
  `backend/src/runtime-trend.ts`. Trend Lab consumes its results instead of
  maintaining a separate browser Student-t method with different assumptions.
- Add a bounded `GET /v1/investigation` endpoint in `backend/src/server.ts`, with
  the aggregation/service adapter in `backend/src/data.ts` and a new
  `backend/src/investigation.ts`. New numerical helpers may live in
  `backend/src/anomalies.ts` and `backend/src/relationships.ts`.
- Proposed parameters: `x`, optional `y`, `bbox`, `start`, `end`, `baselineStart`,
  `baselineEnd`, and `method=relationships-v1`. The server computes fixed lags
  0–6 together; selecting a plotted lag does not run a new query or shrink tests.
  Limit to two allowlisted continuous variables and 600 requested months;
  apply existing spatial limits, cancellation, and provider concurrency controls.
- Fetch each variable once over the union of display/reference periods, then
  reuse that series for all views and lags. Preserve the existing QA and
  cos(latitude)/valid-area weighting; never duplicate raw SQL in UI code.
- Extend the exact route/parameter allowlist in `frontend/api/earth.ts`; its
  current proxy only permits GET/HEAD and named routes. Keep server credentials
  and upstream identity handling unchanged.
- Add typed requests/results in `frontend/src/lib/earthApi.ts`. Cache by all
  numerical settings, exact bbox, source revision and method version. Deduplicate
  in-flight reads; stale responses must not replace a newer submitted result.
- Response includes request snapshot, source metadata, raw monthly rows,
  reference counts, transformed rows, individual trends, lag results, inference
  status/reasons, full test family, and method/version identifiers. Errors and
  unavailable inference are explicit, never numerical zeros.
- Avoid a new job service in the first release. Any subsequent bootstrap that
  exceeds the synchronous API budget belongs in a bounded offline experiment or
  separately designed asynchronous job; never silently increase public timeouts.

## Milestone 1 — seasonal trend foundation and contracts

Dependencies: none. Deliver as the first implementation PR.

- Wire Trend Lab to the backend seasonal OLS + Newey–West HAC12 method.
- Preserve source-unit slope/year, slope/decade, interval, observed span and
  coverage. Distinguish the season-adjusted straight component from monthly
  fitted values. Retire the old inference copy and update its UI descriptions.
- Preserve the existing guards: descriptive fit requires 24 values and at least
  two of every calendar month; inference requires 60 consecutive valid months
  and nondegenerate variation. These are project rules, not universal guarantees.
- Keep any extrapolation explicitly labeled linear projection; a slope interval
  or confidence interval for the mean must not become a forecast interval.
- Publish the investigation contract and a backend capability flag. Old deployed
  APIs leave the new feature unavailable with a clear message.

Acceptance: match the existing real-data temperature trend reference and an
independent statsmodels calculation; constant, duplicate, short and gapped
fixtures produce appropriate unavailable states. Compare continues to behave as
before. Units and interval labels agree in UI and export.

## Milestone 2 — anomalies and reference coverage

Depends on milestone 1.

- Default reference: 2003–2020 for the new investigation workflow. Label it an
  18-year study reference. Preserve Compare's existing 2001–2020 convention;
  always show which reference a view uses.
- For each calendar month, calculate the reference mean and sample standard
  deviation. Display raw values, departures in physical units, and optional
  standardized departures. Standardization requires nonzero reference variance.
- Require at least ten valid reference years per calendar month, matching the
  existing normalization policy. Show actual counts and unavailable months;
  never fill missing values or silently shorten/change the reference.
- Retrieve baseline dates even when outside the selected display interval.
- Preserve GRACE's native anomaly definition separately from additional seasonal
  departures. Source uncertainty and estimated-baseline uncertainty are not
  automatically included in a displayed trend CI.

Acceptance: independently match calendar-month means/SDs and anomalies; changing
display dates alone does not alter the fixed reference. A three-month MODIS
series cannot produce valid seasonal anomalies. CSV retains physical units.

## Milestone 3 — relationships, lag exploration, and evidence

Depends on milestones 1–2. Completes the first release.

### Descriptive analysis

- Show Pearson r for raw values and for values adjusted for calendar-month
  effects plus linear time. Use this adjustment by default for relationship
  analysis; explain that these residuals differ from baseline anomalies.
- For lag L, align X(t) with Y(t+L); never use array offsets across missing months.
  Label positive lag as “X precedes Y by L months.” Both source and outcome
  dates must remain within the requested analysis period; trim endpoints explicitly.
- Lag curve uses a common complete-case set of predictor months across all
  requested lags, so changes are not caused simply by changing samples. Expose
  those dates and the months excluded. If insufficient, show unavailable lag
  comparison; do not quietly revert to different samples.
- Require at least 24 pairs and two observations of each calendar month for the
  adjusted descriptive fit; reject constant/collinear cases. This policy is
  separate from the larger inference requirement below.
- Scatterplot selection identifies the matching months on both charts. Retain
  sample size, dates and coverage beside every coefficient. No automatic
  “best predictor” or causal label based on the largest r.

### Statistical inference

- Fit Y(t+L) = intercept + beta·X(t) + linear time + 11 month indicators.
  Use the full model's residuals and design matrix for the HAC covariance, with
  Bartlett weights, 12 lags and n/(n−14) correction when full rank. Do not reuse
  the trend model's n/(n−13) correction for this larger model.
- Report beta in Y-units per X-unit, its approximate 95% CI and normal Wald
  p for H0: beta=0. This interval belongs to beta, not Pearson r.
- Require at least 60 consecutive paired calendar months, full rank, nonconstant
  predictors and nondegenerate residual variance. If common lag support has
  internal gaps, inference is unavailable for that run; descriptive r survives.
- Adjust eligible p-values using Holm over all seven applied lags, plus any
  individual trend tests displayed with the same investigation evidence badge.
  Keep unavailable tests in the declared family as p=1 for adjustment only;
  their displayed p remains unavailable. Hiding a chart or selecting a lag
  never changes the family. Exports include all family entries.
- State that this correction does not protect repeated exploratory choices of
  regions, variables or periods. Interpret evidence conditionally, without
  claiming causality or prediction.
- GRACE's historical gaps mean many rainfall/storage runs will be descriptive
  in this release. The earlier exploratory bootstrap intervals are not a
  validated substitute for these inference rules.

Acceptance: compare full-model beta, HAC SE, p and Holm outputs against
statsmodels on complete real and synthetic data. Test independent seasonal
series, autocorrelated null series, known lag, near-collinearity, missing months,
different units and changed visible curves. Show weak/null examples alongside
strong examples. Archive the full study configuration used in validation.

### UI and reproducibility

- Refactor `frontend/src/components/TrendLab.tsx` into setup and focused result
  components, retaining the existing submitted-query/stale-filter behavior.
- Add a second variable selector, view tabs, synchronized charts, scatterplot,
  lag curve, coverage summary, interpretation and method details. English first.
- Keep the custom bbox, mobile layout, keyboard controls, cancellation, retry,
  tab persistence and independent Explore/Compare workspaces working.
- Add two reviewed presets: Pantanal temperature/rainfall and regional
  rainfall/storage. Include the rectangle in labels and exports.
- Version saved investigations. Store the selected variables, bbox, dates,
  reference and method; export CSV/JSON with actual analyzed rows, source revision,
  transformations, all statistics and unavailable reasons. A shared filter link
  is a live query, not a frozen scientific artifact.

## Milestone 4 — compound anomalies and uncertainty with gaps

Follow-up release; does not block milestones 1–3.

- Add a month-by-year anomaly calendar and explicit month-specific percentile
  thresholds. Example descriptive rule: temperature above reference P90 and
  rainfall below P10. Show counts and baseline sample limitations; 10–18 annual
  observations per calendar month provide only coarse tail estimates.
- Label these as retrospective hot/dry flags, never confirmed drought/disaster
  events. Choose thresholds before evaluating historical examples.
- Extend `ml_experiments/trend_lab_exploration.py` to study paired calendar-block
  bootstrap uncertainty with gaps, refitting adjustments each replicate.
  Compare 6/12/24-month blocks, missing-data patterns and structural changes.
- Independently assess interval coverage on synthetic known-effect processes;
  predeclare acceptable calibration and runtime before promoting a method.
  Do not derive null p-values from an ordinary uncentered bootstrap interval.
- If validated, introduce a separately versioned method and explicit pointwise
  versus simultaneous uncertainty. Otherwise retain descriptive GRACE results.

## Milestone 5 — ENSO context and additional variables

Depends on stable relationships and source review.

- Ingest a versioned NOAA RONI monthly/seasonal index with source URL, retrieval
  date, units, definition, missing flags, revision and license/terms. Preserve
  the distinction from ONI and account for overlapping three-month windows.
- Expose it as an external climate index: it has no gridded globe layer. Never
  turn MERRA-2 skin temperature into an SST/ENSO index through relabeling.
- Add exploratory regional teleconnection comparisons and declared lag families;
  separate historical ENSO context from model forecasts or official event claims.
- Backfill MODIS and audit QA/seasonal coverage before adding vegetation studies.
  Treat soil moisture as a new source project, not already available data.
- Wind can enter as u/v components; do not apply ordinary linear correlations
  directly to circular direction angles. Add circular methods only as a separate
  reviewed statistical feature.

Acceptance: source index values match the producer, time labels and revisions
are explicit, no map layer is fabricated, and historical overlap is verified.

## Milestone 6 — forecasting research gate

Depends on stable versioned data and analysis. No forecast UI promised until
the experiment passes. Begin with regional anomalies, not a new El Niño model.

- Targets: monthly temperature or water-storage anomalies at 1 and 3 months.
  Candidates: seasonal climatology, persistence, autoregression, and regularized
  regression with lagged rainfall/temperature/index predictors.
- Use expanding-window chronological validation. Keep at least the last three
  complete eligible years as a final test, defined before model selection.
  Fit climatology, transformations, imputation if justified, features and tuning
  on training data only. Never randomly split adjacent climate months.
- Simulate issue dates with actual publication delays. Final rainfall and revised
  GRACE values cannot be assumed available immediately. Without historical
  vintages, label results a retrospective hindcast with revision limitations.
- Track datasets, features, splits, model versions and metrics in Databricks
  experiment tooling; verify workspace facilities before adding dependencies.
- Evaluate MAE/RMSE, skill against both baselines, interval coverage/width, and
  performance by season, region and horizon. Assess paired error uncertainty
  with temporal blocks. Any event probability model also needs Brier score and
  calibration evaluation.
- Promote only region/target/horizon combinations that beat both baselines on
  the untouched test with credible uncertainty and acceptable calibration.
  Otherwise publish the negative research result and keep forecasting disabled.

## Delivery, verification, and scope control

Implementation order: **1 → 2 → 3 → first release → 4 → 5 → 6**.
Use separate reviewable PRs for the milestones; split API and UI work within
milestone 3 if needed. No sub-agent/delegation workflow is required by this plan.

For functional changes, use Node.js 24 and run:

```sh
rtk npm --prefix frontend test
rtk npm --prefix frontend run build
rtk npm --prefix backend run build
```

Also run focused statistical/backend checks, independent numerical comparisons,
API/proxy contract checks and browser smoke tests at desktop/390/360 px. Verify
source failure, empty overlap, missing reference, constant series, antimeridian
bbox, filter changes during loading, export completeness and workspace isolation.
Measure real request latency and memory; the investigation must fit existing
proxy deadlines and bounded provider concurrency. Ship no expensive resampling
on the synchronous path without measured headroom.

Do not make a data source call per slider movement. Do not merge IMERG Final/Late,
interpolate GRACE gaps, claim independent grid cells, infer causality from r, or
declare forecast skill from an in-sample fit.

Before publishing, verify the submission freeze status and effective event
deadline. The project's provisional reference is Nov 15, 2026, 23:59
America/Sao_Paulo; event/fuso confirmation remains outstanding. After the actual
deadline, development belongs on a separate branch/version without changing
evaluated links or triggering their automatic deploy. A new feature must not
displace finishing the reviewed investigation and official Project submission.

Use personal GitHub identity Luckstai and repository-local author settings for
future commits/pushes. Preserve unrelated in-progress edits, including the
existing `MultiVariablePicker.tsx` modification observed during planning.

## Sources and AI disclosure

- [statsmodels HAC covariance](https://www.statsmodels.org/stable/generated/statsmodels.stats.sandwich_covariance.cov_hac.html):
  equally spaced consecutive observations are assumed by the reference routine.
- [statsmodels multiple testing](https://www.statsmodels.org/stable/generated/statsmodels.stats.multitest.multipletests.html):
  independent reference for Holm adjustment during implementation validation.
- NOAA and ECMWF references and warehouse evidence are linked in the exploration
  document. All new data integrations require their own provenance review.

OpenAI Codex assisted this plan and the local implementation of milestones 1–3.
No model training, warehouse mutation, deployment, or submission was performed.
Scientific review remains future work; technical evidence is linked above.


Release integration: rebased onto main `cefe451`; preserves horizontal setup,
collapsible area globe, methodology/Guide navigation and the newer chart controls.
The historical/projected change controls now use the seasonal time slope and
its robust parameter interval; they are not forecasts. The old OLS mean band
is not carried into this model. Publication remains pending authentication as
Luckstai, required by AGENTS.md.
