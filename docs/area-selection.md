# Area selection, monthly calendar and independent globes

Implemented with AI assistance on 14 November 2026; team review pending.

Choose **Draw area**, drag between two points on the visible globe and release. A geographic rectangle is previewed while dragging. Only a valid release commits its west/south/east/north bbox. Escape, pointer cancellation and invalid/outside-disk endpoints preserve the previous selection. Rotation remains the normal drag behavior outside drawing mode. **Clear area** restores that panel's default.

The map keeps its complete global field when a study area changes. The rectangle is sent to the regional series endpoint only; a separate global series uses the same variable and period. Continuous charts share their vertical domain. Global frame/cache/playback keys are independent of the study area, and the existing bounded-frame API remains available for other consumers, including date-line wrapping. Geographic rectangles are not exact basin boundaries or disaster footprints.

Explore opens with Brazil as its immediate default study extent and requests browser location to identify the starting country locally. If location is allowed and resolves before manual changes, it uses that country; denial/unavailability preserves the Brazil fallback. Country outlines are visual references, and regional statistics are explicitly labeled as rectangle aggregates rather than exact polygon masks. Both regional and global charts populate without a manual draw. Explore/Analysis owns one persistent panel, camera, dates, range, area, playback and region registry. Comparison owns two different persistent panels and an independent registry/camera/range; A/B intentionally share their comparison camera and same-variable display scale. Hidden panels pause and skip network requests. Immutable frame caching is shared; selections and canvas instances are not. Every completed draw creates an immutable area ID, so reusing an area in another panel does not make later redraws change it.

The assistant reads the visible workspace and applies validated commands to the requested destination workspace. Reusing an area across workspaces explicitly copies its geometry. Existing version guards prevent stale manual-state changes from being overwritten.

Date controls open a month/year calendar and disable months absent from the actual catalog. The data are monthly; the UI does not imply daily observations. Existing period ordering, missing-data handling, coverage and descriptive-analysis limitations remain.

The decorative deterministic starfield fills the viewport, while atmospheric lighting adds depth around the Earth. They are not a stellar catalog, ephemeris, Solar System simulation or scientific data layer. NASA Blue Marble remains the static Earth background; the colored field represents its identified observation month. No new image assets, dependencies, model credentials or provider permissions were introduced.

Verification: Node.js 24 builds, 29 existing frontend checks, independent source review, eleven focused geometry/date-line sampling checks, real API bounded-frame decoding for Brazil and a wrapped Pacific rectangle. Browser checks confirmed exact month-calendar availability; drawing yielded bbox `-70.88455,-28.9019,-45.70488,-5.4275`, a real 21×24 field and a 33-month regional series; no region dropdown in Explore; three distinct canvases; independent Explore/Comparison variables, dates, areas and zoom. No scientific significance or causal finding is claimed.

Production verified at source `1305047e9081d085391c9d800f179110ee828ff4`, Vercel deployment successful and Cloud Run `kipp-earth-api-00029-tut` serving 100%. [Backend CI/CD](https://github.com/KIPP-hackathon/kipp-earth-trends/actions/runs/43644701944) passed. The production browser drew bbox `-68.8423,-25.36291,-45.81798,-2.31315`, rendered its real 19×24 field and monthly series, then asked the agent to compare January/February 2024. Both comparison panels received exactly that bbox while Explore retained its selection. Direct anonymous Cloud Run POST returned 403; the live public bundle contained no token/private-key patterns or server authentication implementation.


## Update — country and global context (November 14, 2026)

The earlier bounded-frame screenshots above record the previous behavior. Explore
now requests browser location, resolves a bundled country boundary locally and
starts with Brazil if location is denied or unavailable. Device coordinates are
not sent to the API or agent. A late location result cannot overwrite a manually
selected area. Country outlines are generalized Natural Earth geometry; regional
statistics still use the explicitly labeled bounding rectangle, including cells
outside national borders.

Frames and playback now remain global after any selection. Country and drawn-area
series appear beside the globe together with the global series for the same
variable and period, sharing a continuous vertical scale. Changing the rectangle
retains the global field and global observations; its vertical scale remains
stable while the regional query reloads. A single decorative starfield covers the
viewport, rather than a separate panel behind each globe.

Local browser verification selected bbox `-68.57168,-24.37751,-48.133,3.89416`:
the map retained its 288×180 global field and 100% valid display cells, the new
regional series loaded, and global September 2026 stayed at 16.3 °C. Both charts
had matching vertical ticks. Brazil fallback, country outline and the viewport
backdrop were observed without accepting real device-location permission.
