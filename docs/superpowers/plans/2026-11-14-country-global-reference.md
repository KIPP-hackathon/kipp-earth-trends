# Country bootstrap, global context and indicator reference

**Goal:** Fill Explore on entry with country/global context, keep the map globally colored after selections, extend the space backdrop to the viewport and ground indicator explanations and stored trend estimates in two new Databricks tables.

**Architecture:** Browser permission resolves a country against bundled Natural Earth polygons without transmitting or storing device coordinates. Brazil renders immediately and remains the fallback. Country updates preserve manual selections if permission completes late. The country outline is visual; current regional statistics use its explicitly labeled bounding rectangle because serving PostgreSQL has no PostGIS. Explore and Comparison remain independent.

Global frames and playback are keyed only by variable/month/render policy; region selection drives a separate regional series. Regional/global series share variable, period and continuous y-domain. One fixed decorative starfield fills the viewport, with transparent globe surroundings and readable data cards.

`earth-trend-data.refined.tb_dim_indicators` has 467 rows, 18 metadata fields, and no need for a vector index for v1. A bounded typed search reads a fixed projection into a 5-minute cache, ranks metadata, returns at most 12 entries and distinguishes curated runtime variables from reference-only indicators. Trusted table names/units are not directly executable runtime SQL. Production Google-identity read access must be verified separately from the existing M2M read smoke. No static credentials, arbitrary SQL, provider write access, or geolocation coordinates enter the browser bundle or model context.

- [x] Inspect new SQL metadata, RT capabilities and runtime/reference mismatch.
- [x] Browser country resolution/permission fallback and late-result guard.
- [x] Global map retained, paired country/ROI and global series, full-viewport space.
- [x] Bounded indicator and precomputed-trend tools, safe mapping and graceful unavailable handling.
- [x] Builds and focused real-data/browser/privacy checks; review and secret scan.
- [ ] Publish and verify production, runtime read permission and source/AI register.

The team confirmed both new tables should be available to the agent. `tb_trend_merra2_ts` holds 35 method-specific results (seven fixed regions × five methods) for 33 monthly surface-skin-temperature values, January 2024–September 2026. A separate bounded tool must retain stored method, region, dates, units, uncertainty and notes; estimates are not transferable to a drawn ROI. Seasonal and autocorrelation-aware estimates must be considered together rather than cherry-picking an unadjusted p-value.
