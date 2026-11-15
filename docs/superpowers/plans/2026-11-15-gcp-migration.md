# GCP Migration Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the authorized inline execution. Track the operations and their verified outcomes below.

**Goal:** Move the production KIPP API and its direct Google dependencies to `kipp-space-apps-2026`, with private invocation and working data/chat/CI.
**Architecture:** Prepare the new project and identities in parallel with production. Validate the new backend, then change the Vercel proxy and CI, keeping the old service for rollback.
**Tech Stack:** Node.js 24, Cloud Run, Artifact Registry, Google WIF, Vertex AI, Firestore, Databricks SQL, GitHub Actions, Vercel Git integration.
**Spec:** ../specs/2026-11-15-gcp-migration-design.md (approved in chat).

## Global Constraints

- Target `kipp-space-apps-2026` / 696766216489; GCP owner `kipp.nasa@gmail.com`; region `us-east4`.
- Personal GitHub `Luckstai`, Git Lucas Henrique / lucas.henrique.tai@gmail.com, as explicitly instructed in chat.
- Branch `fix/gcp-hackathon-migration`, isolated from existing frontend edits.
- Keep existing resource limits, API contracts, IAM checks, data provenance, model and Warehouse.
- No credential keys or secrets in Git/output; no paid-account upgrade; preserve old service.
- Required existing tests/builds; no new implementation-mirroring tests for identifier changes.

## Review Focus

- New runtime identity must have the required Databricks entitlements, Warehouse and table grants: verify a real `/ready` and 72-variable catalog.
- New project may have Vertex trial/model restrictions: make a minimal real model call before cutover.
- Firestore cutover must preserve counters, including reservations in flight: block old reservations transactionally, drain, copy and verify before new chat starts.
- WIF issuer/audience/subject must match actual Vercel/GitHub tokens: test through the production app and a subsequent CI run.
- CI smoke must not race the Vercel rebuild: stage the proxy switch before migrating the automatic deployment workflow.

## Task 1: Prepared target backend

**Files:** backend/src/assistant.ts, backend/src/assistant-quota.ts, backend/scripts/deploy.sh, backend/scripts/deploy-image.sh; temporary operational scripts outside Git.
**Interfaces:** Existing HTTP contracts and Databricks Google ID auth; produces a private Cloud Run URL and healthy revision.

- [x] Install locked dependencies in the worktree and run frontend/backend baseline tests/builds with Node 24.
- [x] Enable APIs; create repository, three SAs, restricted WIF providers, runtime roles and Firestore database.
- [x] Register new Google SA in Databricks with explicit existing read grants and CAN USE. Record inherited workspace policy without modifying shared groups.
- [x] Change backend Google project constants and script defaults/allowed account; keep explicit overrides for operations.
- [x] Test Vertex and Firestore with new runtime identity; build/push image and perform initial private deployment as owner.
- [x] Verify readiness, catalog, frame, regional series, comparison and stored trend; confirm anonymous 401/403 and runtime IAM.

## Task 2: Production route and quota cutover

**Files:** frontend/server/cloudRunAuth.ts, docs/gcp-migration.md, docs/space-apps-2026-entrega.md.
**Interfaces:** Task 1 URL/provider/invoker; produces Vercel production traffic on the new backend.

- [x] Preserve old quota counters with a bounded reservation block/drain/copy procedure and rollback state outside Git. Never silently reset limits.
- [x] Change the three public identifiers in cloudRunAuth.ts to the new URL/provider/invoker.
- [x] Run required tests/builds and review diff; commit/push with verified personal identity; open and merge PR after checks.
- [x] Wait for Vercel publication, then verify revision, 72 variables, real frame/series/comparison/trends and an assistant request with persistent quota.
- [x] Inspect public bundle for accidental credentials; confirm direct backend remains private.

## Task 3: Ongoing deployment and evidence

**Files:** .github/workflows/backend.yml, backend/README.md, docs/backend-cicd.md, docs/acesso-vercel-cloud-run.md, docs/gcp-migration.md, delivery checklist.
**Interfaces:** Healthy production route; produces CI deploying to the new GCP and reproducible operation/rollback instructions.

- [x] Update workflow project ID, project number, provider and deployer; update current operational documentation, retaining historical evidence.
- [x] Review/commit/push/merge under personal identity; await CI on main and verify exact revision through Vercel smoke.
- [x] Verify final IAM, GCP config, old service preservation, frontend edits preserved and no temporary excessive permissions left behind.
- [x] Record verified URLs, revision/image/commit/CI and AI assistance; report any remaining dependency or explicit blocker.
