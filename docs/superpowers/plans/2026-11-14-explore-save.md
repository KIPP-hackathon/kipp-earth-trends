# Explore and Save Implementation Plan

> **For agentic workers:** Use focused parallel implementations with root integration and final review. User approved direct execution and hackathon speed; no further design gate or new test suite.

**Goal:** Let people explore, use coherent event presets and save/reopen/share their view without login, in a compact globe-first UI.

**Architecture:** Bounded versioned configuration persistence separate from React controls; root validates against real catalog before restoring a workspace atomically. Backend owns event relevance/availability and bounded exact-match stored trend access. Existing private Cloud Run + Vercel BFF, caches and independent workspaces remain.

**Tech Stack:** Node24, React19/TypeScript, Fastify, localStorage, existing browser APIs.

**Spec:** docs/superpowers/specs/2026-11-14-explore-save-design.md

## Global Constraints
- No login, new dependencies, credentials or GPS coordinates in saved/exported/shared state.
- Never silently substitute source dates/variables or apply stored significance to a different region/period.
- Preserve unrelated edits; use personal KIPP authorized Git identity and existing deployment.
- Existing checks plus focused real/browser validation; no new test suites per user.

## Review Focus
- Corrupt/oversized/untrusted import or hash must not partially restore or inject UI.
- Storage denied/quota exceeded must report failure without losing existing records.
- Restore country/custom rectangles and both comparison panels independently, with valid available months.
- Clear area must select Global and remove conflicting event context; camera alone must not change study area.
- Event relevance is not causality, catalog overlap not guaranteed local coverage, stored trend only exact match.

### Task 1: Persistence and save UI
Files: new frontend/src/lib/investigations.ts; components/InvestigationControls.tsx and CSS.
Interface: InvestigationView {tab:explore|compare|analysis; panels:[{side,variable,month,start,end,region}]; camera:GlobeView; colorRanges; eventId?}. InvestigationControls {getView:()=>InvestigationView|null;onRestore:(view)=>Promise<void>;ready:boolean}. Root restores after catalog validation.
- [x] Implement bounded versioned storage, view/file/hash validation, share configuration only, import/export; modal save/list/update/copy/open/delete with clear local-only wording.
- [x] Verify malformed/oversized input, blocked storage, roundtrip both panels and no raw data/secrets saved using ephemeral smoke.

### Task 2: Compact exploration UI
Files: RealDataView.tsx, RealGlobe.tsx, new focused controls and CSS; root owns App.tsx.
Interface: add onAreaChange?:()=>void to RealPanel for explicit draw/clear/country/region changes; preserve existing onCustomRegion and presets.
- [x] Compact period control, move month to player area, searchable variable chooser, country selector with geographic outline, clear-to-global, collapse advanced color controls, remove enclosing border and reduce blank grid spacing.
- [x] Build and browser-check global map/paired graphs, draw and country change, independent comparison state and mobile/accessibility.

### Task 3: Event guidance and exact stored trends
Files: backend event mapping/server; frontend earthApi types/loaders; new TrendEvidence component. Root owns App.tsx and new EventExplorer component.
- [x] Backend returns bounded related-variable relevance and month overlap; GET stored trends through existing BFF fixed route, exact variable/bounds/dates filtering.
- [x] New analysis evidence component retains method units p/CI/coverage/caveats and explicit unsupported-selection state.
- [x] Build, real limited smoke; no dynamic model SQL or access-policy changes.

### Task 4: Integrate and publish
Files: App.tsx, EventExplorer.tsx, LabTabs.tsx, docs.
- [x] Wire save/share/bootstrap restore, real catalog validation, custom-region registration, optional event context, playback paused and camera restored.
- [x] Events show related candidates with coverage and apply exact available event window/context; manual area changes clear context. Analysis uses exact stored trends.
- [x] Existing frontend/backend checks, secret scan, focused review, browser save/reload/share/import/clear/event/compare paths.
- [ ] Update source/AI evidence, publish main to Vercel/Cloud Run, verify private API and public complete flow.

Independent review found optional-name action gates, incompatible event context after explicit location use and conflicting custom region IDs during A/B restore. All were fixed before publication. Browser checks and an ephemeral conflict/quota/roundtrip smoke passed. Existing 46 frontend and six backend auth checks plus Node24 builds passed.
