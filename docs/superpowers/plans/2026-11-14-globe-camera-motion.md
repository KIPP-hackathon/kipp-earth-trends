# Globe camera motion implementation plan

**Goal:** Move the displayed globe continuously from its actual current camera to the agent's requested destination.

**Design:** Share one 900 ms eased camera transition in App for both panels. Interpolate the shortest longitude arc, latitude and zoom; the WebGL field, land paths and study outline receive the same current camera. Direct pointer interaction cancels a flight immediately. A replacement flight starts from the current intermediate position. Honor reduced motion, including changes during a flight. Data observations are never interpolated or refetched because of camera movement. A range/playback-only command does not restart a flight. Event navigation uses the same motion; direct drag/key/zoom controls remain immediate.

**Approaches:** CSS transform alone cannot synchronize the orthographic projection and field; separate per-globe animations can diverge when B mounts. One shared frontend camera animator fits the existing controlled view. No backend/model/API change is required.

**Scope:** `frontend/src/lib/useGlobeCamera.ts` owns frame scheduling; `App.tsx` sends programmatic destinations; `RealGlobe.tsx` cancels on pointer-down; `GlobeSurface.tsx` draws camera updates in a layout effect so texture and SVG align before paint. User already prioritizes hackathon speed; no new automated suites.

- [x] Add shared cancellable camera hook with shortest-arc interpolation, exact destination, reduced motion and unmount cleanup.
- [x] Animate agent camera/area commands and event navigation; manual camera edits cancel; unrelated assistant actions preserve any flight.
- [x] Node24 build, focused interpolation/scheduler smoke and browser verification with a real agent request, interruption and synchronized A/B.
- [ ] Review change, update AI/evidence register, publish frontend and verify production.

## Additional user request: compact header

Move the existing accessible tabs directly next to the logo in the site header. Remove the visible hero title/subtitle and duplicate global introduction so the selected tab's content starts below the header. Preserve an invisible semantic heading; retain sources, guide and catalog refresh in the footer and scientific distinctions next to the footer/per-variable provenance. Horizontal tab scrolling on narrow screens must avoid whole-page overflow. No API changes.

- [x] Refactor App header/main and responsive CSS; verify all five tabs and mobile width.
