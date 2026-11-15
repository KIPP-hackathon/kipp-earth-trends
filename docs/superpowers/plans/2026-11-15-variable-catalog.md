# Variable Catalog Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this local review inline. Steps use checkbox syntax for tracking.

**Goal:** Deliver a polished local Catalog workspace that explains available variables and opens selected variables in Explore.
**Architecture:** Lazy React workspace; pure catalog helpers and curated educational metadata; existing catalog resource and multilayer presets.
**Tech Stack:** React 19, TypeScript, CSS, Lucide, Vite, Vitest, Node.js 24.
**Spec:** docs/superpowers/specs/2026-11-15-variable-catalog-design.md

## Global Constraints
Local only; no dependency additions; English; preserve unrelated local edits; runtime availability authoritative; explicit reanalysis/satellite estimate/simulator distinctions; no invented results.

## Review Focus
- Missing/invalid months or unavailable profiles must not launch an investigation.
- Non-overlapping records need an explicit selection error.
- Product diagnostics and variance entries must not masquerade as direct observations.
- Mobile controls/dialogs/tray must stay readable and operable by keyboard.
- Catalog browsing must not initiate scientific data reads.

### Task 1: Catalog model and evidence
Files: frontend/src/lib/variableCatalog.ts, frontend/src/lib/variableCatalog.test.ts.
- [x] Add meaningful tests for unavailable entries, month intersection, ecosystem membership and product-kind distinctions; verify red.
- [x] Implement curated definitions, ecosystem presets, filter index and safe investigation handoff; verify green.

### Task 2: Workspace and integration
Files: frontend/src/components/VariableCatalog.tsx, variable-catalog.css, App.tsx, LabTabs.tsx.
- [x] Build responsive ecosystem cards, search/topic/full-inventory filters, profile dialog, related navigation and investigation tray.
- [x] Add lazy tab retaining state; hand selections to Explore with layers, common period and explicit region; preserve existing edits.

### Task 3: Verification and review handoff
Files: docs/variable-catalog.md, docs/space-apps-2026-entrega.md.
- [x] Run frontend tests/build and API build using Node 24.
- [x] Check real API interactions, desktop/mobile, empty state, unavailable variables, dialog keyboard and Explore handoff.
- [x] Record evidence/AI sources and open the local preview for user review. Keep preview running; no publication.

## Rulings and execution ledger
- Work in the existing checkout: user requests a local integrated preview; its unrelated uncommitted work is preserved and no branch/worktree is created.
- Existing dependency installation was incomplete (@rolldown/pluginutils empty). Repair using cached lockfile packages with offline npm install; no manifest changes intended.

- Verification: 77 frontend tests passed; frontend/backend builds passed on Node24.18.0. Catalog async chunk13.29KiB gzip plus CSS5.10KiB gzip; existing main-chunk size advisory remains.
- Browser: real data, search/empty states, unavailable entries, simulator distinction, selection persistence, Amazon two-layer handoff, native-dialog Escape/related navigation, mobile360/390 and desktop1440 without horizontal overflow; no console warnings/errors in exercised paths.
- Scoped independent review found no critical/important findings. Stale-ID removal issue fixed; human scientific/editorial review remains pending.
- Local preview retained on port5191 for user analysis; no commit/push/publication.

## Requested area expansion
- [x] Add six source-backed ecosystem entries and explicit rectangle/interpretation limits.
- [x] Link existing context variables using explicit reviewed membership; preserve runtime availability.
- [x] Add conceptual forest/wetland/coral art and five-column desktop/two-column mobile grid for ten entries.
- [x] Test each new area, polar exclusion of IMERG, and absence of invented measurements.
- [x] Verify real browser filtering, Congo handoff, mobile/desktop overflow and fresh builds.

## Region tags and direct navigation implementation
- [x] Extract ecosystem metadata into lightweight shared module; test unified-area options and label resolution before implementing helper.
- [x] Add shared StudyAreaPicker using existing search popover. Integrate empty/selected panels and one-shot area commands, preserving user-selected data/period.
- [x] Add process tags, reviewed variable chips and explicitly unlinked signals to ecosystem details; add direct View area in Explore action and return-to-gallery navigation.
- [x] Verify existing tests/builds and browser: direct empty navigation, current-label persistence, countries/ecosystems/drawn selection, command consumption, availability tags, responsive dialog/layout.

## Global selector categories and latest main
- [x] Sync main safely and preserve local work; incorporate tour/playback changes.
- [x] Test event typing/coverage/geometry and implement classified country/place/event options.
- [x] Add three internal expandable groups and shared search to the shared picker; use live events with lazy fetch and explicit unavailable state.
- [x] Wire Explore, both Compare panels and Trend Lab to the same control; expose event context and apply existing reviewed presets.
- [x] Verify Node24 tests/builds, actual El Niño selection, countries/places categorization, Trend Lab and new Compare controls; refresh local preview/docs.

- Latest user clarification implemented: no category tabs or All. Countries, Places and Events reuse the Variables group layout, counts and expansion behavior; a search expands matching groups. Single selection applies immediately.
- Main synchronized to23bc440 with local work backed up and preserved. Node24:178tests and frontend/API builds passed. Browser exercised El Niño in Explore, before/during in both Compare panels, editable Trend Lab draft, country reset, search grouping and390/1440px layouts. Mobile group clipping corrected by preventing flex shrink; no console warnings/errors in exercised paths. Local only.
