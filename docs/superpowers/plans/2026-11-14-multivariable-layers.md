# Multivariable investigation layers implementation

Goal: select multiple variables with an explicit Apply, inspect every selected
variable's regional/global charts in a scrollable column, and independently
show/hide map layers, set opacity and color scale, following the user's reference.

Continue the explicitly approved fast hackathon workflow, no new test suites.
Integrate the team's main `cd8611e` translucent theme first; preserve its styles.
Latest steering: publish exclusive SQL Warehouse reads now, preserving dormant
Lakebase configuration for future migration. Observations use trusted; the two
reviewed metadata/trend references stay explicitly in Warehouse refined.

- [x] Fetch/fast-forward team design changes without losing local work.
- [x] Shared typed layer settings and transactional multiselect; preserve primary
      variable for evidence/agent operations; timeline spans selected month union.
- [x] One WebGL context with ordered alpha-composited field passes; reuse textures
      while moving/adjusting opacity, independent ranges; missing month never
      silently uses another date. No source resolution/science changes.
- [x] Scrollable per-variable regional/global charts; shared unit/domain only
      within each matching variable. Bound concurrent source requests, cache,
      abort removed/inactive requests and keep previously displayed frame sets
      until the next visible-layer batch is ready during playback.
- [x] Persist layer selection/visibility/opacity and scales in local save/share;
      old single-variable records remain valid. Strict bounds and catalog checks.
- [x] Existing frontend checks/build, focused synthetic/captured-data UI review,
      independent review, then publish integration and verify Vercel/private Cloud Run artifacts.

Visual choices: compact multiselect above the globe, explicit Apply/Cancel;
scrollable layer cards beside it with eye, opacity percent+slider and each layer's
scale controls. New variables begin as chart-only until enabled; Show all/Hide all
controls allow the user to decide overlap. First selected layer is the bottom
layer; later visible entries are drawn above it. Opacity is visual blending,
never a scientific combination of quantities. Charts retain original units and
regional/global context. Display explicit missing-data status per layer.

The later Warehouse-only decision supersedes the earlier migration pause.
Live read-only Warehouse trusted checks are authorized. Local UI review may use
clearly identified captured frames or synthetic fixtures; never claim these are
new trusted observations. Country flags and country-only search remain included.
