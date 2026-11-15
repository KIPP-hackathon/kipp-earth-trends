# Global and selected-area comparison charts

The two charts overlay all applied variables independently of their map-layer
visibility, opacity or physical color range. A shared toggle switches between:

- **Historical deviation:** `(value − calendar-month mean) / sample std`, using
  the fixed2001-01–2020-12 project reference separately for each variable and
  spatial scope. At least10valid reference years are required for that calendar
  month. Missing observations, short reference and zero variance remain gaps.
  This20-year reference fits the long source records; it is not a30-year WMO
  climate normal. A value in standard deviations is not a probability or test.
- **Scale0–100:** each variable/scope's finite minimum and maximum within the
  displayed period. Constant series are50 and explicitly labeled no variation.
  Changing the displayed period changes this scale. It compares curve shapes,
  not physical magnitudes or global-versus-regional absolute levels.

The calendar-month method follows the standardized-anomaly approach described
by [NOAA PSL](https://psl.noaa.gov/data/atmoswrit/timeseries/) and its
[anomaly definition](https://psl.noaa.gov/data/usstation/help/timeseries/).
The reference dates, minimum sample count, constant-series midpoint and UI
are KIPP implementation choices, not NOAA-defined climate thresholds.

`GET /v1/comparison/:variable?start=YYYY-MM&end=YYYY-MM&bbox=w,s,e,n` is a
whitelisted read through the existing Vercel BFF/private Cloud Run. It supports
at most2400display months and uses one reviewed trusted Warehouse scan per
variable for both spatial scopes plus reference history. QA, conversions and
spatial aggregation retain the source contract. Ice class layers specifically
return the percentage of valid weighted area with class1 before transformation;
they do not average category codes or claim extent in km². Their physical map
still shows native classes. Country statistics still use rectangular extents.

The response contains original units/values, provenance/method, coverage,
reference mean/sample std/count per calendar month, min/max, both normalized
values and explicit standardized statuses. Cached responses retain both modes,
so the toggle makes no network request. The client queues at most two comparison
requests across panels, aborts obsolete readers, and renders one path per source
per chart plus markers for isolated observations. It never joins gaps.

Hover and keyboard inspection show original units and comparison values; an
expandable table includes coverage and all selected variables. CSV/JSON exports
include originals, transformations and their reference metadata. Saved/shared
v1 panels optionally retain `comparisonMode`; older records default to historical
deviation. Agent screen context uses the new capability to preserve compatibility
with earlier backends. Its numerical tools still return original-unit series,
so it must not invent normalized observations or unsupported toggle actions.

## Verification

Node24 existing frontend/auth checks and builds; temporary math checks covered
seasonality, sample std, affine unit conversion, short/constant reference,
constant/negative minmax, invalid coverage and null gaps. Compatible share
validation checked legacy records, both modes and rejected invalid modes.
Read-only Warehouse checks confirmed temperature has20reference years/month
and33valid display months for2024-01–2026-09 in both scopes. Arctic ice returns
valid-area percent, and explicitly lacks the historical reference in the current
short source. Local browser checks cover three curves, toggle, share restoration
and a single-month period with isolated markers. Production evidence follows
deployment. These checks do not constitute a scientific trend/significance study
or complete the challenge submission. OpenAI Codex assisted implementation,
documentation and verification; the team's scientific review remains separate.
