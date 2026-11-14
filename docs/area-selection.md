# Area selection, monthly calendar and independent globes

Implemented with AI assistance on 14 November 2026; team review pending.

Choose **Draw area**, drag between two points on the visible globe and release. A geographic rectangle is previewed while dragging. Only a valid release commits its west/south/east/north bbox. Escape, pointer cancellation and invalid/outside-disk endpoints preserve the previous selection. Rotation remains the normal drag behavior outside drawing mode. **Clear area** restores that panel's default.

The same bbox is sent to the existing frame and series API endpoints. Frames are aggregated from actual source points inside the rectangle, not merely masked global display values. Their bounded texture coordinates, tooltip indices, cache keys and playback prefetch preserve the selected bounds, including date-line wrapping. A changed area clears the incompatible old field while loading; monthly playback within the same area retains the previous compatible displayed month. Geographic rectangles are not exact basin boundaries or disaster footprints.

Explore opens globally without a region dropdown. It does not make an automatic global regional-series query: draw an area or choose one through the assistant to start regional analysis. Explore/Analysis owns one persistent panel, camera, dates, range, area, playback and region registry. Comparison owns two different persistent panels and an independent registry/camera/range; A/B intentionally share their comparison camera and same-variable display scale. Hidden panels pause and skip network requests. Immutable frame caching is shared; selections and canvas instances are not. Every completed draw creates an immutable area ID, so reusing an area in another panel does not make later redraws change it.

The assistant reads the visible workspace and applies validated commands to the requested destination workspace. Reusing an area across workspaces explicitly copies its geometry. Existing version guards prevent stale manual-state changes from being overwritten.

Date controls open a month/year calendar and disable months absent from the actual catalog. The data are monthly; the UI does not imply daily observations. Existing period ordering, missing-data handling, coverage and descriptive-analysis limitations remain.

The decorative deterministic starfield and atmospheric lighting add depth around the Earth. They are not a stellar catalog, ephemeris, Solar System simulation or scientific data layer. NASA Blue Marble remains the static Earth background; the colored field represents its identified observation month. No new image assets, dependencies, model credentials or provider permissions were introduced.

Verification: Node.js 24 builds, 29 existing frontend checks, independent source review, eleven focused geometry/date-line sampling checks, real API bounded-frame decoding for Brazil and a wrapped Pacific rectangle. Browser checks confirmed exact month-calendar availability; drawing yielded bbox `-70.88455,-28.9019,-45.70488,-5.4275`, a real 21×24 field and a 33-month regional series; no region dropdown in Explore; three distinct canvases; independent Explore/Comparison variables, dates, areas and zoom. No scientific significance or causal finding is claimed.
