# Runtime trend and p-value Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Dashed season-adjusted linear trends and defensible p-values on both charts.
**Architecture:** Pure backend fit/inference runs after monthly normalization;
frontend renders returned endpoints and controls multiple comparisons.
**Tech Stack:** Existing Node24/Fastify/React/TypeScript; no production dependency.
**Spec:** docs/superpowers/specs/2026-11-15-runtime-trends-design.md

## Global Constraints

Warehouse only, private Cloud Run, Node24, English UI, preserve team updates.
Use an isolated managed worktree because the root has unrelated active edits.
No new persistent tests, per hackathon instruction. Existing checks/builds,
temporary numerical comparison and browser checks still run before publishing.

## Review Focus

- Strong seasonality must not become a spurious time slope.
- Gaps, short/constant/perfect data must not yield invented p-values.
- Time units, normalization and straight-line placement must match the shown mode.
- Multiple comparisons and loading failures must not produce misleading labels.
- Existing data access and latest team layout must remain intact.

### Task1: Statistical core and runtime response

- [x] Add backend/src/runtime-trend.ts: within-month OLS, descriptive endpoints,
      HAC12Bartlett variance, corrected approximate Wald p/CI, explicit guards.
- [x] Integrate raw/standardized/minmax results after transformComparison;
      version caches/capability and extend production data smoke.
- [x] Compare numerical results with independent statsmodels/SciPy on synthetic
      seasonal/autocorrelated data and a real temperature series.

### Task2: Overlay, significance UI and exports

- [x] Add typed trend response and a pure Holm-family adjustment helper.
- [x] Render dashed trend components matching source colors, clipped to chart
      bounds and observed dates, plus rates, p, adjusted p, counts/reasons.
- [x] Preserve source units and all inference metadata in exports/method details;
      raw-unit analysis remains explicitly separate from normalized fits.
- [x] Run existing checks/builds and temporary correction/format checks.

### Task3: Review, publish and evidence

- [x] Fresh reviewer checks math, guardrails, exports and chart association;
      fix important issues and verify.
- [x] Browser-check both modes/scopes with real sources, short-source labels,
      map independence and responsive layout.
- [x] Commit/publish latest main, follow CI and verify production/private API;
      update method/evidence/AI record without unrelated root edits.

Execution notes: managed worktree at origin/main f7de47b, branch feat/trend-significance; root active brand/architecture work untouched. User-authorized hackathon workflow continues without new persistent tests. OLS/HAC and p/CI independently matched statsmodels/SciPy for five seasonal AR fixtures and six real-temperature fits. Reviewer found SVG clip outside SVG and missing study coordinates in Trend CSV; fixed, verified real SVG namespace and downloaded CSV with exact bbox/request dates and full six-test family (including hidden sources). Local UI also verified both modes, surface temperature33months as descriptive-only, and390px width. Existing47frontend and6auth checks and both Node24 builds passed.

Production:6c97ac0; CI43680007057 success; Vercel bundle index-B8EFD-eQ.js; Cloud Run kipp-earth-api-00006-hiz100%. API matched independent p/slope references and direct anonymous access403. Final production browser unavailable after initial new UI loaded; recorded verification limitation. Team readability805d694 was merged, preserving both AI entries. Effective Git identity was isolated in worktree config (Luckstai / Lucas Henrique / lucas.henrique.tai@gmail.com), without replacing the root checkout’s concurrent identity.
