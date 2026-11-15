# Guided user journey implementation plan

**Goal:** Publish the requested journey on `feat/guided-user-journey` as a Vercel preview, preserving production and unrelated local edits.
**Architecture:** Reuse React/Vite, real catalog and existing Trend Lab. Add an immediately available Start workspace. Restore both scopes from each existing comparison response; share chart controls and domain. Default Explore to an available temperature variable. Do not change scientific estimators or production infrastructure.
**Constraints:** Node.js 24; English main journey; preserve source provenance, QA, missing values and distinctions between observations, reanalysis and projections. The X axis remains calendar time; the requested modes control the value axis. No causal or reliable forecast claims. Read challenge requirements and delivery checklist. No merge or production deployment.

- [x] Add initial-investigation selection with valid-month fallback; test unavailable preferred variable and empty catalog.
- [x] Add Start with event → Trend Lab → Explore journey and clear scientific caveats. Preserve shared/saved investigation restoration and keyboard navigation.
- [x] Restore Global alongside Selected area; allow Global with no area, synchronize modes, trend-only, visibility and cursor. Use a domain covering both scopes and adjust Holm family for both displayed scopes. Verify domain with global extrema, missing values and constant values.
- [x] Replace blocking notice with accessible staged loading and elapsed time; lazy-load Trend Lab and avoid mounting unopened workspaces. Compare network timings and bundle size.
- [x] Run full frontend tests/build and API build; verify real API and desktop/mobile, controls, no-area, multi-variable and shared-view flows in browser. Inspect diff and record evidence/AI use.
- [x] Commit/push only the isolated branch under personal identity and publish/verify Preview in the intended Vercel project. Production remains unchanged. Report actual link or precise access blocker.

Initial evidence: 85 frontend tests and both builds pass on base `19dc594`; entry bundle 693.45 kB (234.81 kB gzip). Warm public catalog 216 ms / 866,518 bytes; config 42 ms. Backend cold catalog fans out grouped Warehouse queries, with two workers and a five-minute memo. Prior documented cold query: 42.236 s. Authenticated personal GitHub access is currently unavailable; Vercel connection lacks target-team access. No inference of a permanently slow API from a warm timing.
