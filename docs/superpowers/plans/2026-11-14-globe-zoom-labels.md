# Globe zoom and country labels implementation

User requests a more useful zoom and country names appearing as the globe approaches. Continue the approved hackathon execution workflow with no new test suites, no approval loop and no new dependencies.

Design: raise the supported camera range from 0.8–1.8 to 0.8–8 across UI, saved/shared configuration and the agent contract. Keep orthographic geometry and pointer inversion synchronized. Drag sensitivity decreases with zoom. Buttons and +/- remain accessible; Ctrl/Meta+wheel and touch pinch add zoom without consuming ordinary page scroll; double-click recenters and approaches smoothly. Drawing cannot commit an area after a pinch/cancel.

Render the WebGL surface directly for the current viewport at zoom rather than enlarging a pre-rendered globe image. Retain the legacy prototype renderer's default behavior. Bound canvas/GPU dimensions. Zoom never implies finer NASA source resolution or changes the scientific study area.

Country labels use bundled Natural Earth geometry, not a network geocoder. Place names on the visible hemisphere, prioritize larger on-screen countries, use a fixed readable text size, avoid collisions and clip at viewport/horizon. Show thin country boundaries when zoomed; labels are decorative cartographic context, not observations or selectable study polygons. Save/restore and independent workspaces retain the camera zoom.

- [x] Implement bounded zoom, input handling and compatible contracts.
- [x] Add country labeling geometry/placement and viewport WebGL rendering.
- [x] Existing checks/builds, focused math/input/save smoke and independent review.
- [ ] Browser-check zoom, labels, drawing and saved comparison; publish and verify public flow/private API.

Sources: existing Natural Earth 4.1.0 via world-atlas2.0.2 (docs/country-location.md), D3 projection and spherical-math API documentation. OpenAI Codex assists implementation; no new source data or scientific resolution claims.
