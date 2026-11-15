# Compare and Catalog usability implementation plan

> Execute inline using the existing checkout; preserve ongoing local work.

Goal: remove the requested Sahara/Amazon footer story, make the joint Compare
player compact and consistent, and provide replayable guided tours on Compare
and Catalog using the existing GuidedTour. Local preview only, English copy,
Node24, no dependency or mathematical/data changes.

Design: use the existing spotlight/navigation component, a shared manual tour
launcher, and workspace-specific steps. No automatic data selection. Tours close
when their workspace becomes inactive, restore focus and can be replayed. Catalog
tour exposes the existing builder on mobile. Compare retains playback logic and
all controls; change layout only to content width with responsive wrapping.

- [x] Remove story markup and its unused CSS; retain unrelated source references.
- [x] Reuse GuidedTour with Compare/Catalog steps and visible launch controls.
- [x] Compact the player, preserving dates, disabled/loading/error feedback,
      synchronization and speed. Verify empty and populated states.
- [x] Run frontend tests, frontend/API builds, browser tours (Next/Back/Finish,
      Escape, workspace switch), responsive sizing and console checks.
- [x] Update delivery evidence, retain preview; no commit, push or publication.

Verification focus: hidden workspaces must not keep an overlay; tours must not
select variables or reset filters; missing charts must not stall; long date/status
text must wrap; controls must remain accessible at390px; source/unit/statistical
limitations must stay explicit.

Verification:178frontend tests passed; frontend/API builds passed on Node24.
Browser at1440px measured player610px within1360px workspace; at390px player
350px within the page, with no horizontal overflow. Played/paused both panels,
observed A/B dates and status. All6steps per tour, Next, Back, keyboard, Finish,
Escape, replay and workspace switching verified; mobile Catalog builder visible.
Removed story absent. No console warnings/errors in exercised paths. Scoped
review found no important risks. Existing main bundle-size advisory remains.
No new dependencies or scientific/data changes; local preview only.
