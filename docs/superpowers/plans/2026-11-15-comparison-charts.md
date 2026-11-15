# Two multivariable charts Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Track completed tasks here.

**Goal:** Two charts per globe with a historical-deviation/0–100 toggle.
**Architecture:** One cached API request per variable returns both scopes and both
representations; two SVG charts share dates/colors and preserve raw tooltips.
**Tech Stack:** Existing Node24/Fastify/Databricks SQL and React/TypeScript/Vite.
**Spec:** docs/superpowers/specs/2026-11-15-comparison-charts-design.md

## Global Constraints

Warehouse only; inactive Lakebase preserved. No credentials in frontend. Primary
UX English. Existing hackathon authorization covers implementation/publication;
no new persistent tests. Preserve unrelated uncommitted work and fetch team main.

## Review Focus

- Short/constant calendar-month references must not invent standardized values.
- Missing dates and failed sources must remain explicit, not fake zero curves.
- Categorical codes need physical area fractions before numeric transformation.
- Toggle/date/area/save changes must not leak stale areas or alter the globe.
-72selected variables must keep bounded network and SVG work.

### Task1: Runtime API normalization

- [x] Add pure backend comparison transformation with fixed reference, gaps,
      original units, coverage and export metadata; temporary math checks.
- [x] Add DataService comparison aggregate (one scan, both scopes), validated
      cached GET /v1/comparison/:variable and fixed BFF whitelist/capability.
- [x] Build backend; verify representative real continuous and ice responses.

### Task2: Two-chart UX and persistence

- [x] Add cached/queued comparison client and progressive per-variable loading.
- [x] Render exactly Global and Selected-area charts with stable variable colors,
      accessible keyboard/crosshair tooltips, raw values/coverage, exports,
      event shading and truthful per-variable loading/insufficiency status.
- [x] Put map cards in separate disclosure; toggle uses already returned data.
- [x] Preserve mode in compatible saved/shared panels and capability-gated agent
      context; existing checks/builds and focused normalization/share checks.

### Task3: Review, publish, evidence

- [x] Review changed interfaces/math/queries/security, fix important findings.
- [x] Browser verify real multivariable toggle, missing reference, raw tooltip,
      map independence, regional selection, saves and responsive layout.
- [x] Publish; verify production artifacts, endpoint and private Cloud Run;
      update evidence and AI record without staging other chats' changes.

Execution notes: existing feature branch reused to preserve active chats; team main7e4abc5 fast-forwarded. No new test suites, per hackathon instruction. Reviewer found a dropped assistant preset mode and invisible singleton runs; both fixed, with runtime browser confirmation of single-month markers. Hover cursor also clears after interaction/month changes. Existing46frontend and6auth checks and Node24 builds passed; local live Warehouse temperature/ice and two-chart/share/mobile checks passed. Other chats’ mascot/architecture work remains outside this change.
