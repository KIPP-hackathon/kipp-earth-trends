# Repository review — 15 November 2026

The reviewed application has a working scientific-data path and reproducible trend results. Its documentation needed a current project narrative, architecture, stack and verified data-scale inventory. **Formal submission readiness is still incomplete.**

Scope: checkout `c49cf35`, existing local documentation/materials, code inspection, automated checks and anonymous public data requests. Other work was editing frontend components during this review; those changes are not authored by this documentation task. No commit, push, deployment, portal submission, IAM change or data ingestion was performed here.

## Project scale and public evidence

Both `https://kipp-nasa.space/` and the Vercel mirror returned HTTP 200, as did their `/api/earth/v1/catalog` endpoints. The catalogs reported `databricks-sql`, `trusted`, `simulated=false` and revision `kipp-earth-api-00043-mev`.

| Metric | Verified result |
| --- | --- |
| Registered variables | 224 |
| Available / unavailable | 106 / 118 |
| Curated observation tables | 11 |
| Grid records represented in those tables | 734,637,888 |
| Active NASA families | 2: MERRA-2 and GPM IMERG |
| NASA collection/processing streams | 8: six MERRA-2 collections, IMERG Final and IMERG Late |
| Additional source family | NOAA/NSIDC Sea Ice Index |
| Temperature record | 321 months, January 2000–September 2026 |

Counts and qualifications are published in the [data inventory](data-inventory.md) and [CSV snapshot](data-inventory-2026-11-15.csv). Records are summed once per source table/month, not once per variable. They are not independent measurements, valid-value counts or a raw-storage size estimate. No GB/TB figure was measured.

## Documentation corrections

- Replaced the stale simulated-prototype overview with a project presentation in English: problem, investigation workflow, stack, data scale, architecture, interpretation and attribution.
- Added the [current architecture](architecture.md) and [documentation index](README.md). SQL Warehouse/trusted is active; Lakebase/hybrid is inactive. The two existing HTML diagrams now carry visible historical notices.
- Corrected the backend's old 72-variable/68-table inventory, the frontend's obsolete browser-only OLS description, and submission text that implied all acquisition families were available in the application.
- Updated demo status: a local 30-second video exists in the evidence log; public hosting, final approval and official submission are not established.
- Preserved historical evidence and existing user materials. The initial Git index showed conflicts in two documentation files; they ceased to appear during concurrent work before this task edited them. This review did not stage or resolve the index.

## Verification

Node.js **24.18.0** was used. The final frontend checks ran at 21:30 America/Sao_Paulo; the recorded frontend source hashes were unchanged across those checks. They include concurrent frontend additions, which were not implemented or fully reviewed by this documentation task.

| Check | Result |
| --- | --- |
| Frontend tests | Baseline: 178 passed; final check after concurrent additions: **202 passed across 31 files** |
| Backend tests | 49 passed, zero failures |
| Frontend production build | Baseline and final checks passed; existing chunk-size warning remains |
| Backend TypeScript build | Passed |
| Cloudflare Worker dry run | Passed; no deployment |
| Python indicator-catalog tests | 4 passed |
| Python extraction tests | **60 passed** in the isolated environment with repository requirements |
| Main site and Vercel site/catalog | HTTP 200, same provider/revision/counts |
| Real temperature comparison | HTTP 200; 321 observations in each scope |
| Independent statistical reproduction | Global and Brazil-bbox slope, HAC12 SE and approximate p matched statsmodels |

The real-data request was:

```text
https://kipp-nasa.space/api/earth/v1/comparison/temperature?start=2000-01&end=2026-09&bbox=-73.98614,-33.76766,-34.73135,5.24412&analysis=trend-v1
```

| Scope | Rate (°C/year) | 95% slope interval (°C/year) | Unadjusted approximate p |
| --- | ---: | --- | ---: |
| Global | 0.0198242406 | 0.0124829288 to 0.0271655524 | 1.20574156e-7 |
| Brazil bounding rectangle | 0.0402471847 | 0.0234883180 to 0.0570060515 | 2.51459023e-6 |

The independent fit used statsmodels OLS with calendar time and 12 month indicators, HAC covariance with 12 lags, finite-sample correction and normal-Wald inference. The comparison used `rtol=1e-8`, `atol=1e-12` for slope, SE and p. This rectangle is not Brazil's exact territory; the estimates are conditional, not causal findings or forecasts. UI-adjusted p depends on the selected family. The check does not scientifically certify all variables.

Local logs/catalog responses and statistical evidence are in ignored `artifacts/repository-audit-2026-11-15/`. They are not public submission attachments. The system Python initially lacked scientific dependencies; an isolated Python 3.12 environment was created under that ignored directory using the repository requirements. No source-code fix was needed for those missing-module failures.

An independent reviewer searched 1,475 tracked working-tree files for recognized private-key/token patterns and found no matches. This limited check does not cover Git history, entropy-based detection or every secret format. The official submission-guide recheck failed through the web tool; this review does not claim renewed rule verification. No new browser-based visual certification or complete cloud-security audit was performed.

## Open findings and delivery decisions

| Priority | Finding | Evidence and required closure |
| --- | --- | --- |
| High | Automatic freeze does not cover every evaluated dependency | `.github/workflows/backend.yml` and `backend/scripts/deploy-image.sh` permit main/manual deployments without a date gate. Vercel's build-ignore script only checks changed paths. Confirm cutoff and protect both hosts, shared backend and mutable data before submission. External dashboard protections were not audited. |
| Medium | Cloudflare's cutoff is checked too early | `.github/workflows/frontend-cloudflare.yml` checks before install/tests/build; a run can cross the cutoff before deployment. A final gate or explicit release freeze remains needed. |
| Medium | Submission facts remain undefined | The team confirmed the Project URL, public final demo and event/timezone are not yet available. Complete official fields, approval, attribution and submit/record the receipt. |
| Medium | Repository license is unspecified | The frontend manifest says ISC but no root license file is present. The team must choose/confirm its code license; third-party assets and data retain separate terms. No license was invented by this review. |
| Low | Frontend initial bundle warning remains | Build succeeds but reports a chunk over 500 kB. Treat size optimization separately from submission-critical corrections. |

These findings do not justify adding unrelated functionality before delivery. The README and project documentation now emphasize what KIPP does and what its evidence supports; operational instructions remain in component guides.

OpenAI Codex assisted the review, documentation and metadata calculations. Human review of the project narrative and scientific interpretation remains pending.
