# Runtime trend lines and significance

Both comparison charts now fit each source independently in its displayed mode.
Solid lines are monthly data; same-color dashed lines are the season-adjusted
straight time component, not seasonal predictions or forecasts. Original-unit
fits and95% slope intervals remain available in details and exports.

## Method and guardrails

The model is a linear calendar-time term plus12calendar-month fixed effects.
Time is elapsed calendar months/12, never the compressed index of valid rows.
Within-month demeaning computes the OLS slope (Frisch–Waugh–Lovell); the straight
component is centered at mean observed time/value and spans only first/last
valid observation. This keeps recurring seasonal offsets out of the straight
line. Monthly values receive equal temporal weight; source spatial QA and
aggregation remain unchanged.

Approximate inference uses Newey–West HAC slope variance,12monthly lags,
Bartlett weights and n/(n−13) correction. The two-sided normal Wald p tests
H0: time slope=0. The95% slope interval uses the same robust SE and normal
critical value. It is not a prediction interval. See
[statsmodels HAC covariance](https://www.statsmodels.org/stable/generated/statsmodels.stats.sandwich_covariance.cov_hac.html)
and [robust covariance inference](https://www.statsmodels.org/dev/generated/statsmodels.regression.linear_model.RegressionResults.get_robustcov_results.html).

KIPP v1 requires24valid values and two observations of each calendar month for
a descriptive fit. P/CI additionally require60consecutive valid monthly values,
nonconstant data and nondegenerate residual variance. Internal gaps suppress
inference; leading/trailing unobserved dates remain outside the fit. Missing
months are not interpolated. These sample guards are project choices, not
universal statistical thresholds or a guarantee of adequate climate history.

The linear specification, fixed seasonality and short-memory residual dependence
remain assumptions. HAC12 does not guarantee treatment of long-memory, structural
changes or missing-data/coverage bias. Normalized reference parameters are
treated as fixed; their estimation uncertainty is not propagated. Raw,
standardized and minmax fits are separate. Affine minmax preserves raw p-values;
calendar-month standardization can change the slope/test.

## Multiple comparisons and interpretation

The API returns unadjusted p-values. The UI also calculates Holm adjusted p over
all applied variables in both available spatial scopes, in the active mode.
Unavailable tests conservatively remain in the family as p=1. Visually hiding
a source never shrinks that family. Final evidence labels wait for loading and
use adjusted p<0.05; the original p is also visible. This controls that family,
not repeated exploratory choices of periods, places or transformations.

Failure to reject zero slope does not prove no change. A small p does not
establish effect size, importance, causal attribution, event detection or future
behavior. A short record's rate/year is not a long-term climate finding. The
existing precomputed trend studies remain separate, with their own methods.

## Contract and reproducibility

The existing Warehouse-only comparison request returns per-scope
`trends.raw|standardized|minmax`: slope/year and/decade, observation dates/count,
method/lag count, status/reason, SE, approximate p,95% CI and straight endpoints.
An optional validated `analysis=trend-v1` query isolates the new CDN cache variant;
the frontend uses it only when the backend advertises `runtimeTrends`.
No new Warehouse scan, SQL input, identity grant or public Cloud Run access is
introduced. Future Lakebase configuration remains inactive.

JSON includes every selected family test, including hidden variables. Trend CSV
exports all those tests with scopes, exact bbox, requested and observed periods,
source/product, normalization reference/range, original-unit estimates, method,
variance/CI, raw/adjusted p and unavailable reasons. Ordinary chart CSV still
contains the displayed scope/curves, with trend columns; use JSON or Trend CSV
to reproduce the full Holm family.

## Verification and one real-data check

Temporary Python statsmodels/SciPy comparisons independently matched slope,
HAC12SE, normal Wald p and95% interval on five generated seasonal AR series and
all six fits (two scopes ×three representations) of a real321-month trusted
temperature record. Extreme normal tails and affine unit changes were checked.
Synthetic fixtures are software checks, not observations. Temporary guard checks
covered short/gapped/constant/perfect/duplicate/missing data.

Real input: `earth-trend-data.trusted.tb_merra2_t10m`, MERRA-2 M2TMNXSLV5.12.4,
air temperature at10m (°C),2000-01–2026-09; regional bbox
`-73.98614,-33.76766,-34.73135,5.24412` (Brazil's rectangular extent, not a
country polygon mask). Source monthly means are weighted by cos(latitude) and
valid coverage; no causal claim. Independent calculation on the API's real data:

| Scope | Raw slope °C/year | HAC SE °C/year | Approximate unadjusted p |95% slope CI °C/year |
| --- | ---: | ---: | ---: | --- |
| Global |0.0198242406 |0.0037456361 |1.20574156e-7 |0.0124829288–0.0271655524 |
| Brazil bbox |0.0402471847 |0.0085505993 |2.51459023e-6 |0.0234883180–0.0570060515 |

These are reproducible conditional model estimates for that input/period, not
forecasts or causal findings. Final human scientific review remains separate.
Request the comparison endpoint with those dates/bbox and `analysis=trend-v1`
to retrieve observations and the complete inference metadata. The UI's adjusted
p additionally depends on the complete selected variable family.

Existing frontend/auth checks and Node24 builds passed. Local browser checked
both modes/scopes, real dashed paths, SVG clip namespace,33-month surface
temperature as descriptive only, unchanged six-test family after hiding a curve,
and a390px viewport without horizontal overflow. Its data came from actual
public Warehouse API reads with the new local postprocessing helper. Downloaded
Trend CSV retained all six selected tests, exact coordinates/period and matched
statsmodels' Holm correction. Production evidence is recorded after publication.

OpenAI Codex assisted implementation/docs; an independent code review identified
SVG clip placement and missing CSV study coordinates. Both were fixed and
verified. No new production dependency or persistent test suite was added.
