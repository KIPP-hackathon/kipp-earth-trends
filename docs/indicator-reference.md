# Curated indicator reference for the assistant

The assistant retains the `search_indicators` tool. Runtime access is limited to
Lakebase/PostgreSQL; it never falls back to Databricks SQL Warehouse. The current
Lakebase inventory does not contain `tb_dim_indicators`. A reference must have
verified **trusted** source lineage before it can be enabled. The historical
467-row reference is therefore unavailable to the current API.
The service defaults to disabled reads (`trustedSourceVerified: false`); mere
table existence cannot enable a future refined-source synchronization. Its fixed
Lakebase target is `default.tb_dim_indicators`, which is currently absent. Enable
only after verifying that exact target's trusted source lineage.

Reference metadata is separate from observations and the application's reviewed
variable catalog. It does not expand available layers. The assistant can still
explain variables from the actual catalog and must disclose unavailable reference
searches rather than invent matches.

The tool accepts a required `query` (1–200 characters), optional `role`, `source`,
`domain` and `accessibility` filters (1–40 characters, validated against cached
reference values), and `limit` (1–12, default 6). English/Portuguese vocabulary,
accent normalization, exact tokens and prefixes support bounded lexical ranking.
Measurement/core/combined entries receive a default preference; explicit variance,
quality and raw queries retain the requested roles. No vector index is used.

The backend issues one fixed SELECT of 18 reviewed metadata columns with
`ORDER BY indicator_id LIMIT 501`. A shared, coalesced five-minute cache retains
at most 500 records. `referenceTruncated` explicitly reports a larger reference;
`matchedCount` then describes the cached subset only. Results contain at most 12
records. Text is bounded to 250 characters per field and 1,200 for descriptions.
Source metadata is treated as untrusted text, never as executable SQL or agent
instructions. Unknown filters are rejected and upstream errors are redacted.
An unavailable reference returns `status: "unavailable"`, empty `results`, code
`REFERENCE_NOT_AVAILABLE_IN_LAKEBASE` and the explicit reason that the reference
is not yet synchronized or available in Lakebase. Failed reads are not cached as
successful reference snapshots. Explicit non-Postgres providers are rejected
before a query. Public unavailable responses must use `Cache-Control: no-store`.

`source_table` and `indicator_name` describe **trusted** data and can differ from
refined application columns. Reviewed registry mappings use exact source table,
code/column or explicitly reviewed aliases. Unmapped records have
`metadataOnly: true`; mapped records still report runtime availability as
`not_checked`. The assistant must use the actual catalog before configuring or
analyzing a variable. Raw reference units are preserved; runtime units,
conversions and quality filters remain authoritative. Some reference units and
vertical levels are incomplete.

## Current verification — November 14, 2026

Node.js 24 backend build passed. Ephemeral checks exercised fixed PostgreSQL SQL,
coalesced successful reads, reviewed mapping and source units, ISO timestamps,
redacted unavailable results, retries after failure, and rejection of a Warehouse
provider without querying it. No new test suite or database writes were added.
The physical Lakebase inventory found no `tb_dim_indicators`; this is a missing
reference, not evidence that indicators or Earth observations do not exist.

## Historical evidence before Lakebase-only access

Node.js 24 backend build passed. Read-only M2M queries returned 467 unique
reference indicators with a common source creation timestamp of
`2026-11-14T22:40:27.751Z`. Two concurrent metadata searches coalesced into one
SQL query and did not request the application catalog. Real searches checked
Portuguese temperature/rainfall, English temperature variance and NDVI mapping;
raw NDVI remained metadata-only. Invalid arguments/filters, a 501-record reference
and provider failures were checked for rejection, explicit truncation and error
redaction. These checks did not modify Databricks permissions or data.

Production Google service-account access was verified after deployment at source
`dcfe85a1b847c4d2300bd3fe1f679b94f6000f0f`: a real same-origin Vercel assistant
request returned indicator matches from this table, together with stored trends.
No additional grants or credentials were needed. Earlier local impersonation
was denied; M2M success alone was not used as production evidence. That historical
Warehouse-backed behavior is not used by the current API. The table is not
synced into Lakebase. Lakebase extension
inspection found no PostGIS or ST_Contains/ST_Covers functions; this reference
does not establish exact country-polygon statistics.

OpenAI Codex assisted this implementation and documentation. Exact model identifier
was not verified; team review remains pending. Metadata access does not complete
the reproducible scientific investigation or Space Apps submission checklist.
