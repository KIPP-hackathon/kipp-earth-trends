# Adjustable map color range implementation plan

**Goal:** Let a person select a continuous map range, such as 0–50 °C, and optionally hide values outside it.

**Architecture:** Keep original frames and API queries intact. Store applied display ranges by variable in App so A/B share the same color meaning. Pass display settings separately to the WebGL texture renderer; numerical series and exports remain unchanged. Categorical layers retain named classes. New controls use English per project guidance.

**Choice:** An editable legend with Apply and Reset, rather than refetching filtered data. It supports both color rescaling and optional inclusive visual filtering. Initial default maps are unchanged; applying a custom range defaults to hiding outside values.

- [x] Add validated display ranges and optional masking to colorFrame, without changing frame/cache keys.
- [x] Add shared App state, accessible minimum/maximum controls, Apply/Reset and clear display-only wording; categorical layers keep class legends.
- [x] Build on Node 24; verify 0/50 endpoints, masking, invalid range, A/B synchronization and playback continuity with real frames. No new test suite per hackathon preference.
- [ ] Update delivery/AI evidence and publish using the existing Git/Vercel integration.
