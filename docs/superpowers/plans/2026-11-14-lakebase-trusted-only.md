# Future trusted-only Lakebase migration

Status: preserved but inactive. Later user steering selects SQL Warehouse only
for production now; see `docs/backend-warehouse.md`. The prepared Lakebase
implementation is not wired into the active server and does not receive traffic.

Continue the user's approved hackathon execution: no new test suite or permission
loop. Node24/Fastify remains the backend; HTTP IDs, camera, saved views and
scientific units remain stable.

1. Inspect Databricks metadata APIs and read-only PostgreSQL catalogs only.
   Never use a SQL Warehouse. Confirm actual trusted lineage, sync completion,
   schema, units and effective read access before data queries.
2. Remove runtime Warehouse/hybrid providers and deployment envs. Use only
   reviewed trusted physical sources; unavailable sources stay explicit.
3. Preserve metadata/trend absence without fallback or inferred significance.
4. Existing tests/builds, focused data-contract smoke and independent review.
5. Wait for the initial trusted sync; validate real catalog/frame/series, publish
   through existing private Cloud Run/Vercel flow, and verify provenance/security.

Verified initial source: `merra2_shared.trusted.tb_merra2_t10m` →
`default.tb_merra2_t10m_trusted` in `databricks_postgres`. Team confirmed other
trusted tables are being synced with the same `_trusted` destination convention.
The convention alone does not prove sync completion or data availability.

No ingestion changes, new databases, broad grants, data writes or public Cloud
Run access. SELECT was granted only on the verified trusted pilot to existing
read-only runtime/development roles. Future tables require reviewed activation.
