# Curated indicator reference for the assistant

The assistant can call `search_indicators` to search
`earth-trend-data.refined.tb_dim_indicators` in the original Databricks SQL
workspace. This is reference metadata, separate from observations and from the
application's reviewed variable catalog. It does not expand the available layers.

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
PostgreSQL-only deployments return explicit reference unavailability.

`source_table` and `indicator_name` describe **trusted** data and can differ from
refined application columns. Reviewed registry mappings use exact source table,
code/column or explicitly reviewed aliases. Unmapped records have
`metadataOnly: true`; mapped records still report runtime availability as
`not_checked`. The assistant must use the actual catalog before configuring or
analyzing a variable. Raw reference units are preserved; runtime units,
conversions and quality filters remain authoritative. Some reference units and
vertical levels are incomplete.

## Verification evidence — November 14, 2026

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
was denied; M2M success alone was not used as production evidence. The table is not synced into Lakebase. Lakebase extension
inspection found no PostGIS or ST_Contains/ST_Covers functions; this reference
does not establish exact country-polygon statistics.

OpenAI Codex assisted this implementation and documentation. Exact model identifier
was not verified; team review remains pending. Metadata access does not complete
the reproducible scientific investigation or Space Apps submission checklist.
