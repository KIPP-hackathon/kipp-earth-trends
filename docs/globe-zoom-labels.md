# Globe zoom and cartographic names

The live-data globe supports camera zoom 0.8–8. Buttons, +/- keys and reset remain
available. Ctrl/Command with the wheel zooms without consuming ordinary page
scroll; touch pointer pairs implement a pinch gesture. Double-click recenters
and approaches using the existing reduced-motion-aware camera flight. At higher
zoom, drag sensitivity decreases in proportion to zoom. Pinch/cancel paths clear
pending rectangle state before any area can be committed.

The WebGL surface renders the visible orthographic viewport directly in a bounded
1024×1024 drawing buffer; it no longer enlarges a pre-rendered whole-globe bitmap.
The legacy prototype surface retains its old default contract. Camera changes
update uniforms without uploading source grids again. SVG borders and pointer
inversion use the same 320-center/270-radius geometry. Zoom does not request finer
NASA data or alter the scientific study area; visible source cells retain their
original resolution and missing-data rules.

Country names appear progressively above zoom1.45 with a fixed apparent11.5px
font, contrast halo, viewport/horizon clipping, area prioritization and collision
avoidance. Up to20 names are displayed. Thin country boundaries appear above
zoom1.4. Cached representative landmass anchors avoid remote-island placement;
when a large country fills the viewport, an in-country camera point can label it.
Names/borders use the existing bundled Natural Earth1:110m dataset, with its
simplification and missing-small-island limitations; see [source/licence](country-location.md).
They are cartographic context, not a precise scientific polygon mask.

Projection conventions follow [D3 projections](https://d3js.org/d3-geo/projection)
and [spherical math](https://d3js.org/d3-geo/math). No new provider, dependency,
credential or external geocoder was introduced. Saved/shared investigations and
both frontend/backend agent contracts accept the same zoom range, retaining old
configurations. Explore and Comparison keep independent cameras; comparison A/B
share their camera as before.

## Verification — November14,2026

Node24 frontend/backend builds and46 existing frontend/six backend checks passed.
Independent source review found no blocking or important issue. Temporary math
checks covered projection roundtrips at0.8/1/2/8, fixed label size, backside and
collision rejection, and representative France/Japan/Brazil/Canada/Russia labels.
Browser checks exercised +/- including the8× bound, country names, drawing bbox
`-59.60277,-12.29194,-55.28077,-7.66634` at8×, keeping the global288×180 field,
sharing/reopening8×, reset to1× (labels hidden), comparison A/B camera sync and a
390px viewport without horizontal overflow. Physical multi-touch hardware was
not exercised in this browser run; pinch lifecycle received source review.

OpenAI Codex assisted code and documentation. Team scientific review remains
pending; no new scientific observations, resolution or findings are claimed.
