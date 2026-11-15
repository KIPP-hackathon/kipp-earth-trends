# Compare joint playback — local implementation

Goal: one visible Play both / Pause both bar above Compare, shared speed and optional Same month.

Architecture: a Compare-only provider registers each selected panel's available months, prepare/commit functions and local pause/speed controls. A cancellable shared clock prepares both targets before committing either. RealPanel's individual controls stop the joint run before acting. No Explore state, datasets, units or statistical calculations change.

Constraints: Node.js 24, existing requestFrame cache and abort handling, no dependencies, no deployment. Same month uses sorted exact intersection, requires at least two common months, aligns to A's current month when possible, otherwise the first common month. Independent mode cycles each own available calendar. Pause, manual changes, hidden page, leaving Compare and failures cancel the shared run; no late commit. Existing individual playback remains available.

- [x] Write scheduler tests: nonconsecutive overlap, distinct periods/wrap, empty overlap, both-ready barrier, failure and cancellation.
- [x] Implement scheduler/provider/bar and integrate panel registration, shared speed and individual controls.
- [x] Verify with real API in local browser: disabled empty state, joint play/pause, different dates, same dates, cancellation, individual controls, responsive layout. Run frontend tests and both builds; update delivery evidence.

Evidence:143/143 frontend tests (7 new scheduler tests), frontend/API builds on Node v24.18.0. Independent review found two cancellation gaps (local speed and new presets), both corrected. Browser real API verified independent offset dates, same dates, shared speed, no-overlap block, local/global pause, individual play, tab exit and390/360px layouts. No commit/push/deploy.
