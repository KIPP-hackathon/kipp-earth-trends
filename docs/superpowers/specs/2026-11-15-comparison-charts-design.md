# Two multivariable comparison charts

The user chose historical standardized deviation and0–100 scaling with a toggle.
Keep exactly two time-series charts per globe: Global and Selected area. Both
contain all applied variables, independent of map-layer visibility/opacity.
Preserve the team's translucent design and current exclusive Warehouse reads;
Lakebase stays inactive. Map controls remain available in a separate disclosure.

The API aggregates both spatial scopes in one reviewed trusted scan per variable,
then computes both representations at runtime. Historical reference is fixed at
2001-01–2020-12, selected to fit the long observed source records, not claimed as
a30-year WMO climate normal. Compare like calendar months within each scope;
require at least10valid reference years per calendar month and nonzero sample
standard deviation. Missing/short/constant reference produces explicit gaps.
No silent fallback to another normalization or reference period.

0–100 uses each variable/scope's finite minimum/maximum over the displayed study
period; a constant series is50 with an explicit no-variation label. It compares
curve shapes, not physical magnitudes. Regional and global reference statistics
are independent and disclosed. Missing observations remain gaps. Categorical
ice classes become a clearly identified valid-area ice fraction (%) before
normalization, never arithmetic on class codes. No trend/significance/causality
feature is added in this change.

Return original values, normalized values, per-month reference counts/mean/std,
coverage, method, bounds, source and limits. Tooltips, data tables and exports
retain actual units and provenance. The toggle is instant and performs no
additional query. Keep bounded two-request concurrency/cache/abort and avoid a
separate historical chart per variable. Save/share the toggle additively in v1;
old investigations remain compatible. Assistant context is capability gated;
normalized colors/curves are never numerical or causal evidence by themselves.

Alternatives considered: percent change rejected for zeros/negative/Celsius
values; separate raw-unit charts superseded by the user's explicit request.
Selected approaches are standardized monthly anomalies and min–max curves.

Execution follows the already approved hackathon workflow: in-place feature
branch, preserve other chats' edits, no new persistent test suites or approval
loop. Existing checks/builds and temporary focused math/API/browser checks,
then publish and verify Vercel/private Cloud Run before reporting completion.
