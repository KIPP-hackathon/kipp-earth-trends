# Multivariable investigation layers

The team's translucent theme from main `cd8611e` is retained. The variable control
now drafts multiple selections until Apply; Cancel/Escape/outside leaves the
investigation unchanged. Every selected variable has regional/global charts in
a bounded scrollable column, with its own units and coverage. New secondary
variables start as charts-only; eyes, Show all, Hide all and Show only this layer
control the map. Each layer has opacity and its own continuous range or discrete
legend. Scale/opacity never alter measurements, series or exports.

The calendar spans the union of selected source months. The selected date stays
when adding variables. A source without that exact month is explicitly absent;
another year/month is never substituted. Map loading commits complete batches
with a common displayed month, retaining the previous batch while buffering.
Layer errors remain explicit; removing/changing sources aborts obsolete work.
The global field stays visible when a regional rectangle changes.

One WebGL context caches an ordered equirectangular composite (at most2048×1024).
Later visible layers are blended above earlier ones using source-over alpha.
Camera movement needs one orthographic pass, independent of layer count; source
textures/palettes are not reuploaded on rotation or opacity edits. Source grids
and missing values retain their meaning; zoom/composition add no resolution and
are not a scientific combination of physical quantities.

Charts load with at most two simultaneous series requests shared across panels;
frame downloads have their existing independent two-request queue/32MiBcache.
API requests are chunked into at most120months, preserving longer histories and
full-period export provenance. Catalog-empty chunks and explicit NO_DATA gaps
remain null; permission/network failures are errors. Matching regional/global
charts share a vertical domain within one variable. Different quantities retain
separate scales. Charts are memoized so camera/opacity changes do not rebuild them. Their pairs
load/render only near the scroll viewport; offscreen placeholders preserve
measured heights and cancel obsolete requests. Selecting all72variables keeps
all controls available without mounting every historical SVG at once.

Saved investigations, JSON exports/imports and share fragments retain ordered
layers, visibility, opacity, all selected color ranges, cameras and areas. Legacy
single-variable v1 records remain valid. Validation rejects duplicate IDs,
nonfinite/out-of-bounds opacity, missing primary variable and unexpected fields.
Configuration-only share fragments are bounded at32768characters; names/notes
are not in the URL. JSON/storage limits remain bounded. The agent receives optional selected-layer visibility/opacity and actual rendered
months when the backend advertises support; older deployments keep the legacy
wire contract. These are advisory screen state, not numerical facts. Existing
validated actions remain unchanged; manual opacity/multiselect controls do not
silently become unvalidated model actions. Manual camera navigation marks the view changed before
animation so pending model/geolocation results cannot override it.

Country pickers contain local flags/countries only. The redundant local globe
backdrop is removed while the team's fullscreen space background and theme stay.
The requested browser-save caption and Use country button were removed.

## Verification

Node24 builds and existing checks, plus focused ephemeral GL/state/series/save
smokes. Synthetic verification fixtures are software checks, not observations.
Live local UI review uses the actual72-variable Warehouse trusted catalog and
read-only real frames/series; temperature covers321months.

Production release `2dd5bee` was verified at
https://kipp-earth-trends-lab.vercel.app/ with bundle `index-CXRSmVb2.js`.
Browser review restored three visible layers with100/55/65percent opacity,
loaded regional/global charts, and applied0–50°C to air temperature without
changing the other layers' default scales. Local browser review also covered
Apply/Cancel, saving/reopening, and selecting all72variables with lazy charts.
The production catalog reports all72variables available from trusted through
`databricks-sql`, with321temperature months. Backend CI run43668280708 succeeded;
Cloud Run revision `kipp-earth-api-00037-rul` received100percent of traffic.
Anonymous access to Cloud Run returned403. Lakebase configuration remains
preserved and inactive; there is no active hybrid read path.

This work does not establish causal attribution,
new scientific findings, significance tests or challenge submission completion.
