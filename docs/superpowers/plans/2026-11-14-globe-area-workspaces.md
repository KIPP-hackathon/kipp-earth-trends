# Globe area selection and independent workspaces

**Goal:** Select actual data by drawing a rectangle, simplify monthly dates, immerse the globe in a starfield and keep Explore independent of Comparison.

**Design:** Explicit Draw area mode separates geographic selection from rotation. Preview a geographic rectangle; commit its bbox only on valid pointer release, then request the existing bounded frames and regional series. Invalid/cancelled draws do not change selections. Bounded frame textures use their own geographic bounds while the base Earth texture remains global; cache keys and monthly prefetch include bbox. Cross-date-line coordinates must remain consistent through request, decoding, UV sampling and probing. No data interpolation or simulated replacement.

Three persistent panel instances (Explore A, Compare A/B) retain independent filters, dates, area, playback and GPU canvases. Explore and Compare own separate cameras/scales; Compare A/B keep their intentional shared camera and same-variable scale. Hidden panels pause and do not fetch. The assistant reads the visible workspace and applies commands to the destination workspace with existing validation/version guards. Shared immutable frame caching is allowed; shared selections are not.

Explore starts at global view, without a region dropdown or automatic regional query; drawing/agent selection activates real regional analysis. Comparison keeps region presets and supports drawing. Clear area restores the corresponding panel's default. The month calendar offers exact available months/years, not fabricated daily resolution. A deterministic decorative starfield and atmospheric depth frame the Earth, preserving scientific colors and reduced-motion behavior; credits explain that it is visual scenery.

**Implementation ownership:** Globe/selection/space and bounded-frame pipeline; RealPanel/calendar/resource lifecycle; App workspace/assistant routing. No new dependencies, provider credentials or backend endpoint changes. Node.js 24; user waived new automated suites for hackathon speed.

- [x] Geographic drawing, bounded frame pipeline, texture/probe coordinate mapping and starfield.
- [x] Accessible month calendar, ROI integration, overview without preset region selector, inactive query gating.
- [x] Separate persistent workspaces and correct assistant/event destination routing.
- [x] Node24 builds, focused bbox/cache/geometry smoke, real API and browser checks for drawing, calendar, isolation and agent compatibility.
- [ ] Independent review, source/bundle secret check, publish frontend and verify production; update Space Apps AI/evidence register.
