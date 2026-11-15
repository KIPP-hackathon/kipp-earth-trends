# Agent-guided single-page preview

User requested implementation in existing `feat/guided-user-journey`, preserving production. English primary flow and existing scientific methods/data distinctions remain mandatory. Node24; validate full frontend tests/build and backend build.

Design: header anchors lead through Introduction → Events → Trend Lab → Explore, with optional Compare/Guide. Keep modules and study state in the same document, loading near the viewport and pausing offscreen. A prominent contextual KIPP guide supplies clearly identified interface tips, next-step actions and question shortcuts to real AI chat; no automatic paid/model calls on user edits. Generic questions have an empty study context; Trend Lab must never inherit Explore's study. Existing validated agent commands remain bounded and stale commands rejected.

Map controls: remove per-domain select-all checkboxes; retain individual selection and Apply/Cancel. Configure exactly one selected map variable at a time via dropdown without changing selected curves or map visibility. Solo action next to eye. Continuous legend endpoints become finite validated number inputs, committed on blur/Enter with no Apply button. Invalid/reversed/blank input never changes the map; Escape reverts. Preserve outside-range masking and reset. Categories remain discrete.

Preview AI: retain all same-origin, body-size, JSON and request limits. Only Preview may relay assistant POST to the fixed existing public production endpoint with canonical service origin; never use an arbitrary target or widen IAM. Preview callers share upstream egress quota; no new credentials or provider. Production handler remains private/authenticated. Test origin spoofing, quota propagation and identity separation before enabling chat.

- [x] Implement compact layer selection, inline scale editing and focused validation checks.
- [x] Implement continuous sections/header guidance and contextual agent entry; preserve independent studies, shares and manual edits.
- [x] Enable real AI in Preview through bounded existing service; test both environment paths and reject unauthorized origins.
- [x] Verify full tests/build, browser desktop/mobile, real or explicitly labelled fixture paths and genuine AI response. Review; fix material findings.
- [ ] Update evidence/AI register, commit/push only preview branch, verify shared URL and unchanged production.
