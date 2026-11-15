# Future trusted Lakebase API contract

> **Inactive future configuration.** The user selected SQL Warehouse only for the
> current runtime and deployment. Lakebase provider, trusted mappings, sync
> discovery helper and this design are preserved for a later migration. There
> is no hybrid mode or automatic fallback. See [the active Warehouse contract](backend-warehouse.md).

Updated November 14, 2026. The API reads only PostgreSQL/Lakebase sources whose
trusted lineage has been reviewed explicitly. SQL Warehouse and legacy
unsuffixed tables are not fallback sources.

The public catalog retains the 72 reviewed variable IDs, units, conversions,
quality rules and scientific limitations. Their presence is a semantic catalog,
not proof that 72 datasets are available in Lakebase.

## Verified physical manifest

`backend/src/trusted-map.ts` separates reviewed column mappings from verified
physical sources. The column mappings come from
`databricks/data-standardization/*/column_mapping.yaml`. Availability requires
an explicit source entry in the manifest as well as runtime PostgreSQL checks.

| API variable | PostgreSQL table | Verified upstream source |
| --- | --- | --- |
| `temperature` | `default.tb_merra2_t10m_trusted` | `merra2_shared.trusted.tb_merra2_t10m` |

The upstream sync metadata confirms this lineage. Initial synchronization was
still running when this contract was implemented; a row-level benchmark and
production availability must be recorded only after synchronization is online.
Existing `default.tb_merra2_t10m`, `default.tb_merra2_ts`, and other unsuffixed
tables do not establish trusted lineage and are never selected by this manifest.

The confirmed trusted temperature schema uses `latitude`, `longitude`, `time`
(DATE), and `air_temperature_at_10_meters_celsius`. Temperature is already in
Celsius, so the existing scale 1 / offset 0 remains appropriate. All other
reviewed mappings are prepared but do not authorize reads or establish sync
completion. In particular, do not automatically truncate long column names:
`merra2_var_omega500` has a mapped name longer than PostgreSQL's ordinary
63-byte identifier limit and requires actual-schema verification before activation.

## Runtime behavior

Before a data query, the service checks only the manifested relation in
`pg_catalog`: physical presence, schema USAGE, table SELECT, and exact required
column names. A successful metadata snapshot is reused for 30 seconds. Timeouts
and metadata query failures are not recorded as successful availability evidence.

A variable with no verified manifest entry returns
`TRUSTED_SOURCE_NOT_SYNCED` before any metadata or data query for that request.
A missing manifested relation uses the same code. Insufficient privileges use
`TRUSTED_SOURCE_ACCESS_DENIED`; an incompatible column contract uses
`TRUSTED_SCHEMA_MISMATCH`. The catalog returns explicit unavailable entries with
empty months and null coverage bounds. It does not silently drop variables or
read an older/refined source. Frames, series and availability requests fail
explicitly for those sources.

Catalog month counts are actual `COUNT`/quality-filter counts. PostgreSQL
planner estimates and partial-sync row counts are not substituted for observed
samples or valid samples. The current implementation scans only manifested,
readable, schema-compatible sources; adding many large tables may require a
separately reviewed monthly coverage relation to meet the request budget.

Catalog entries, frames and series identify `source=lakebase-postgres` and
`sourceLayer=trusted`. `sourceTable` is the qualified physical PostgreSQL table
and `sourceUC` is its verified upstream relation; both are null for variables
without a manifest entry. Public IDs and scientific transformations remain
independent from physical column names. Raw, QA and uncertainty fields do not
become map layers automatically.

## Activation and evidence

Run the read-only discovery helper from the repository root with Node.js 24:

```sh
node backend/scripts/discover-trusted.mjs
```

It uses the explicit `kipp_lakebase_admin` profile and the isolated configuration
`~/.config/databricks-kipp-nasa/config` (or `DATABRICKS_CONFIG_FILE` when supplied).
Other `DATABRICKS_*` environment variables are removed from the CLI subprocess
environment so inherited host/token settings cannot silently replace that profile.
The helper lists `merra2_shared.trusted` and `nasa_hacka_lakebase.default`, then
checks only reviewed `<registryTable>_trusted` candidates through table metadata
and `postgres get-synced-table`. It performs no Warehouse query, credential
creation, grant, data read, manifest write or publication.

JSON output contains `readySources` and `blocked`. A candidate is ready only when
its destination `properties.source_table` exactly matches the expected trusted
upstream, both schemas contain every reviewed coordinate/value/coverage/QA
column, both `time` fields are DATE, and sync state is
`SYNCED_TABLE_ONLINE_NO_PENDING_UPDATE` with a completed `last_sync` and no
ongoing progress. Each ready candidate includes variable IDs, physical table,
upstream lineage and the last sync timestamps. Blocked candidates have explicit
codes; CLI failures are sanitized without printing response bodies or logs.
A successful discovery can exit zero with all candidates blocked; exit zero is
not a publication or activation signal.

The helper prepares a candidate manifest for review; it does not expand the
runtime allowlist. For each ready source, inspect its actual PostgreSQL columns
and effective API read access, then add only its `schema`, `table` and `upstream`
under its `registryTable` key in `trustedSources`. Validate real
catalog/frame/series results before publication. The runtime PostgreSQL preflight
still checks the exact physical identifiers and privileges; Unity Catalog
metadata alone does not replace that check.
Do not infer trusted status from matching table names, registry presence or a
successful legacy-source query. No additional grant is performed by the API.

Local ephemeral checks covered all 72 required column mappings, an exact-count
catalog with one permitted source, rejection of unmanifested variables without
queries, denied access and schema mismatch. They used clearly synthetic provider
responses and are software checks, not scientific evidence. No new test suite
was added. The discovery helper also passed ephemeral cases for ready sources,
shared MODIS QA mappings, wrong lineage, missing completed-sync evidence,
schema mismatch, isolated CLI authentication and sanitized CLI failures. Its live
metadata-only run found the temperature sync still provisioning, with no ready
sources at that instant. Live row-level evidence remains pending until the sync
is online.

OpenAI Codex assisted this implementation and documentation. Team review remains
pending. This is technical integration work and does not complete the challenge's
reproducible scientific investigation, significance analysis or submission.
