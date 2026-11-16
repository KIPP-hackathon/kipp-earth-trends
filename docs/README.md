# KIPP documentation

KIPP combines spatial exploration and statistical investigation of Earth-system change. Start with the [project overview](../README.md), [architecture and stack](architecture.md), [data scale and NASA sources](data-inventory.md), and [repository audit](repository-audit-2026-11-15.md).

Documents include dated implementation/deployment history. Historical test counts, source mappings and release notes describe their named version. Use current code, the public catalog and dated audit to establish present availability; a plan is not proof of implementation or publication.

## Product and methods

| Reference | Purpose |
| --- | --- |
| [Frontend guide](../frontend/README.md) | Execution, workspaces and hosting modes. |
| [Architecture](architecture.md) | Runtime, data flow, trust boundaries and operations. |
| [Runtime trends](runtime-trends.md) | Seasonal model, HAC12, significance and recorded numerical check. |
| [Trend Lab relationships](trend-lab-relationships.md) | Anomalies, lagged associations, test families and limitations. |
| [Variable catalog](variable-catalog.md) | Educational variable and ecosystem entry points. |
| [Assistant](assistant-v1.md) / [prompt audit](assistant-prompt-audit.md) | Context, tools, limitations and prior validation. |

## Data and pipelines

| Reference | Purpose |
| --- | --- |
| [Data scale and counting method](data-inventory.md) | 734,637,888 serving records, 224 registered variables, 106 available and source-family accounting. |
| [Source inventory CSV](fontes-transient-dados.csv) | Definitions and provenance; not a live availability guarantee. |
| [Pipeline contract](contrato-pipelines-api.md) / [API/frontend contract](contrato-dados-api-frontend.md) | Processing and consumer interfaces. |
| [Databricks bundle](databricks-bundle.md) | Extract/standardize jobs and prerequisites. |
| [Consolidated indicators](consolidated-indicators.md) / [coverage catalog](indicadores-cobertura-catalogo.md) | Physical mappings and visibility, including migration history. |
| [IMERG extraction](imerg-extraction.md) / [Late processing](imerg-late.md) | Acquisition, monthly aggregation and processing distinctions. |
| [Water and ice](water-ice-extraction.md) / [phase and concentration](phase-concentration-extraction.md) | Product-specific acquisition and scientific limits. |

## Operations

[Backend/API](../backend/README.md) · [backend CI/CD](backend-cicd.md) · [Cloudflare/Vercel](cloudflare-deploy.md) · [Vercel-to-Cloud Run access](acesso-vercel-cloud-run.md).

Lakebase documents and earlier HTML architecture drafts are historical/future integration records. The [current architecture](architecture.md) uses SQL Warehouse only. Plans/specs in `superpowers/` preserve intended or earlier work.

## Submission and attribution

- [Submission text and source/tool inventory](submission.md).
- [English submission checklist](submission_checklist.md).
- [Challenge requirements](space-apps-2026-requisitos.md) and [detailed delivery evidence](space-apps-2026-entrega.md), in Portuguese.
- [Mascot artwork and AI credits](kipp-mascot.md).

The public application is available at [kipp-nasa.space](https://kipp-nasa.space), and the project demo is available on [YouTube](https://www.youtube.com/watch?v=hFzB7sUlQuY). The official Project URL, team/event details and submission receipt remain pending. The website and repository do not replace the official submission.
