# Active backend: SQL Warehouse and trusted data

Updated November 14, 2026. The user selected **SQL Warehouse only** for current
operation while preserving Lakebase configuration for a future migration.
There is no hybrid routing or automatic fallback.

The active workspace is `https://8259554586019913.3.gcp.databricks.com`, Warehouse
`74a8d94611137690`. Observations use the fixed reviewed
`earth-trend-data.trusted.<table>` contract. `DATA_SCHEMA`, `DATA_CATALOG` and
`TABLE_*` do not redirect the runtime to another observation source.

Metadata inventory through the isolated `kipp_sql_admin` profile found 228
trusted tables and 73 refined tables. All 72 reviewed variable IDs (68 distinct
observation tables) exist in trusted with every required physical measurement,
coordinate, coverage and QA column, and `time` DATE. This establishes schema
compatibility, not successful runtime reads or scientific conclusions.

`src/data.ts` is the active Warehouse adapter. `src/trusted-map.ts` preserves
reviewed standardization mappings without changing units or quality rules.
Catalog, frame and series metadata identify `source=databricks-sql`,
`sourceLayer=trusted`, and the full trusted relation in `sourceTable`/`sourceUC`.
Exact monthly `samples`/`validSamples` are queried from data; table statistics
are not substituted. Timeouts and denied sources remain explicit failures.

Two separately reviewed reference tables are explicitly read from the same
Warehouse: `earth-trend-data.refined.tb_dim_indicators` and
`earth-trend-data.refined.tb_trend_merra2_ts`. Their existence and required fields
were checked through metadata. This is a fixed reference source choice, not
observation fallback or cross-provider routing. Stored trend results keep their
original January 2024–September 2026 period, methods and limitations. They do
not establish trends for the 321-month trusted temperature history. Exact
selection continues to require the stored variable, bbox and period to match.

The server and deployment default to `DATA_PROVIDER=databricks-sql` and reject
other modes. Deploy configuration removes active PostgreSQL connection variables
while retaining the prepared Lakebase adapter, provider, mappings, commented
future environment and discovery helper in the repository. Future activation
requires a separate source decision and validation; it cannot happen per request.

## Verification

Node.js 24 build, the six existing backend authentication tests and deployment
shell syntax checks passed. An ephemeral startup check verified that `hybrid`
and `lakebase-postgres` are rejected before authentication or network access.

An M2M `LIMIT 0` query verified access to all 68 trusted observation tables in
8.7 seconds. The exact live catalog returned 72/72 available variables in
42.236 seconds, close to the 45-second request budget. Its per-process memo is
five minutes; cold latency remains a material operational limit. Samples and
valid samples were counted from actual data, not planner estimates.

| Variable | Observed catalog coverage | Frame valid cells / bins | Frame / series time |
| --- | --- | --- | --- |
| Temperature at 10 m | Jan 2000–Sep 2026, 321 months | 30 / 30 | 1.676 / 1.189 s |
| Surface pressure | Jan 2000–Sep 2026, 321 months | 30 / 30 | 1.517 / 1.191 s |
| NDVI | Jan–Mar 2024, 3 months | 3599 / 3600 | 1.939 / 1.220 s |
| GRACE water equivalent | Jan 2024–Sep 2026, 33 months | 30 / 30 | 1.214 / 1.089 s |

Frames and one-month series used the real bbox `-60,-22,-54,-16`, factor 2, and
the latest valid month for each variable. Each series contained a non-null
observation. These are technical integration checks, not trend significance or
causal findings. Google service-account access in the deployed revision and
publication remain separate checks; local M2M success does not prove them.
No database writes, grants, deployments or Git changes were performed by this
implementation task.

OpenAI Codex assisted source adaptation and documentation. Team review and the
challenge's reproducible scientific investigation/submission remain pending.
