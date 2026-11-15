# Runtime trends on the two comparison charts

The user requests a dashed straight trend and trend p-value for every selected
variable on both Global and Selected-area charts. Preserve the new team layout,
exclusive Warehouse reads, dormant Lakebase and private API. This builds on the
approved rapid hackathon workflow without additional approval loops or new
persistent test suites.

Fit each displayed representation separately (raw, standardized, minmax):
OLS with a linear calendar-time term and12calendar-month fixed effects.
Compute the slope via within-month demeaning (Frisch–Waugh–Lovell), retaining
actual dates across gaps. Center the displayed straight trend component at the
mean observed value/time; it excludes the recurring monthly offsets and spans
only the first/last usable observation, never a forecast. Raw units/year and
normalized units/year are explicit; standardized monthly scaling may change
the estimate/test, while affine minmax preserves raw inference.

At least24valid months, two observations for each calendar month and nonzero
within-month time variation are required for a descriptive fit. Inferential
statistics require at least60consecutive valid months (five complete years),
nonconstant data and nondegenerate residual variance. These are conservative
KIPP v1 guardrails, not universal scientific thresholds. Internal missing months
disable p/CI rather than compressing time or imputing observations.

Use Newey–West HAC slope variance with12monthly lags, Bartlett weights and
n/(n−13) finite-sample correction. Two-sided asymptotic normal Wald p-value,
normal95% slope CI, H0 slope=0. Approximate inference assumes an adequate linear
model with fixed seasonality and short-memory residual dependence; it does not
guarantee treatment of long-memory, changing seasonality or missing-data bias.
Zero variance, singular/short data and nonfinite statistics produce explicit
unavailable statuses. No fake p=0 for perfect or constant series.

Return all modes in the existing comparison response and bump processing cache
version. No new Warehouse query or endpoint. Frontend uses original p and a
Holm-adjusted p over2×selected-variable count (both scopes, current mode,
including unavailable tests conservatively as1). Declare evidence at adjusted
p<0.05; show nominal p too. Until loading finishes, avoid a final significance
label. No claim that nonsignificance proves no change, no causal attribution,
and a short period's rate/year is not a long-term climate finding.

Keep curve colors and toggle; add dashed matching lines, compact trend table,
counts/dates/method/reasons, original-unit results in details and reproducible
CSV/JSON metadata. Existing precomputed TrendEvidence remains separate and
unchanged. The agent must not invent these runtime results from screen state.
Numerical reference checks use temporary Python statsmodels/SciPy, not a new
production dependency.
