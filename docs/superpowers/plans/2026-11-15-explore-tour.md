# Explore guided tour

Goal: repeat the existing Trend Lab guided tour pattern in Explore, locally for review.

Use the existing GuidedTour component, theme and navigation. Add an Explore-specific wrapper which survives the initial variable selection. Confirm area, applied variables and period before continuing; keep the page interactive. Explain the globe, playback, map filters, regional chart and saving, with accurate scientific limitations. Closing or changing tabs removes the overlay. Start automatically after catalog/config loading and controls paint, unless this browser has completed or dismissed the tour. Skip allows a later visit; Don’t show again and Finish persist suppression. No data changes, new dependencies or deployment.

- [x] Add Explore steps and wrapper; connect actual area, Apply and period callbacks in empty/selected panels.
- [x] Verify empty-to-selected flow, back/finish/close, reopening, workspace switching, dropdowns and mobile using the real public API.
- [x] Run existing frontend tests and frontend/backend builds with Node.js 24. Record evidence and AI assistance in the delivery checklist.

Implementation: inline in an isolated local clone based on feat/trend-significance (4451712); existing checkout belongs to another chat. This preview does not publish or change submitted materials.

Final verification: 136/136 tests passed; frontend and backend builds passed with Node.js v24.18.0. Browser error log empty; mobile menu overlap corrected and rechecked. No commit or deploy.

Revision: corrected country popover horizontal positioning, explicit catalog-backed temperature shortcut, spotlight following open picker dialogs, and removal of the empty Explore side card. Verified browser paths at 1280, 800, 390 and 360 px; final suite 136/136 and both builds passed.

Automatic-entry revision: removed the Explore launch button; added Skip, Don’t show again, completion persistence and focus after positioning. Browser confirmed all three exit paths, full keyboard traversal, persistence across reload and 360 px layout. Temporary QA preference reset page removed after testing. 136/136 existing tests and frontend/API builds passed.
