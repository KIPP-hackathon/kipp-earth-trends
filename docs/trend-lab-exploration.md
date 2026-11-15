# Trend Lab: relationships, anomalies, and prediction

Exploration performed 2026-11-15 with the Databricks CLI, profile `nasa-gcp`,
warehouse `74a8d94611137690`, catalog `earth-trend-data`, schema `trusted`.
All warehouse operations were read-only. This is an exploratory research note,
not an implemented feature, a validated forecast, or a final scientific finding.

## Recommendation

Build **Relationships & anomalies** next: choose a regional question, compare
two variables, remove seasonal effects, inspect lags, and show uncertainty.
The strongest initial story is **rainfall → water storage**, with temperature
providing a second view of hot/dry conditions. Preserve the challenge's trend,
rate, uncertainty, and interpretation workflow alongside these additions.

First upgrade Trend Lab's own regression. Its current implementation in
`frontend/src/lib/trendLab.ts` uses a raw monthly straight line and Student-t
intervals with no seasonal/autocorrelation adjustment. The separate runtime
trend implementation documented in `runtime-trends.md` already provides monthly
effects and HAC uncertainty; investigate reusing that method and its validation.
The two existing methods should not be described as equivalent.

## Actual warehouse coverage

Counts are distinct stored monthly dates, not independent samples or proof that
every source file passed scientific review. Coverage statement:
`01f1e0be-0e5e-1c19-99da-0dbc2e61fa9c`.

| Variable | Trusted table | Coverage | Months |
| --- | --- | --- | ---: |
| Air temperature at 10 m | tb_merra2_t10m | Jan 2000–Sep 2026 | 321 |
| Eastward / northward wind at 10 m | tb_merra2_u10m / tb_merra2_v10m | Jan 2000–Sep 2026 | 321 each |
| IMERG Final precipitation | tb_gpm_imerg_precipitation | Jan 2000–Sep 2025 | 309 |
| GRACE water-equivalent mass anomaly | tb_grace_jpl_mass_anomaly | Apr 2002–Sep 2026, gaps | 259 |
| MODIS vegetation indices | tb_modis_mod13c2_vegetation | Jan–Mar 2024 | 3 |
| Surface skin temperature | tb_merra2_ts | Jan 2024–Sep 2026 | 33 |

Temperature and wind are MERRA-2 reanalysis, rainfall is a satellite-based
estimate, and GRACE is a gravity-derived mass-anomaly estimate. GRACE does not
measure groundwater alone. Its gridded cells are not independent observations.
MODIS requires substantial historical backfill before seasonal analysis.
Final and Late rainfall must remain distinct products.

A catalog table-name search for `nino|enso|sst|soil|root|ocean` returned no
matches in `trusted` (statement `01f1e0be-2bea-1324-acb4-3f441b7b13a8`).
This is not an exhaustive semantic inventory of every column or other schema.

## Experiment and results

Three deliberately illustrative rectangular regions, coordinates in degrees:

| Label | Latitude | Longitude |
| --- | --- | --- |
| Pantanal box | −22 to −16 | −60 to −54 |
| Amazon box | −10 to 0 | −70 to −55 |
| Southern Brazil box | −33 to −25 | −58 to −48 |

These are not biome, watershed, or national polygon masks. Monthly means use
cos(latitude) weights, additionally multiplied by valid area fraction for
rainfall and GRACE. Only finite values, positive coverage fractions ≤1, and
nonnegative rainfall are retained. Source cells are selected by their centers.
Units: °C, mm/month, and mm water equivalent respectively.

The query returned 2,667 regional monthly values, without response truncation
(statement `01f1e0be-1b2e-1629-926f-8ab6c5746580`).
Pairs are aligned by calendar month; missing GRACE months are not interpolated.
For each pair/lag, OLS removes calendar-month fixed effects and a linear time
term on the matched sample. Pearson correlation is then computed on residuals.
Positive lag means the first variable precedes the second. Lag samples differ,
so their coefficients are not a controlled comparison of predictive performance.

| Pair / region | Lag | Paired months | Raw r | Adjusted r |
| --- | ---: | ---: | ---: | ---: |
| Temperature / rainfall, Pantanal | 0 | 309 | +0.415 | −0.419 |
| Rainfall / water storage, Pantanal | 1 | 248 | +0.526 | +0.398 |
| Rainfall / water storage, Amazon | 1 | 248 | +0.686 | +0.580 |
| Rainfall / water storage, southern Brazil | 1 | 248 | +0.581 | +0.633 |
| Rainfall / water storage, Amazon | 3 | 250 | +0.877 | +0.529 |

The sign reversal in the Pantanal is a useful demonstration of seasonal
confounding. It does not establish a causal effect. The Amazon three-month
coefficient also illustrates how raw seasonality can inflate a relationship.
All 36 combinations (three regions, three pairs, lags 0/1/3/6) are retained in
the local result, including weak relationships; highlighted rows are exploratory.

The analysis script also estimates pointwise percentile intervals with 1,000
paired moving-calendar-block bootstrap replicates, 12-month blocks, seed
20261115. Missing months remain missing, and seasonal/trend terms are refitted
within each replicate. These intervals have no multiple-comparison correction;
block length and nonstationarity sensitivity remain unassessed. They must not
be used to declare a selected relationship confirmed. No causal or predictive
test was performed. Native product uncertainty is not propagated.

Illustrative adjusted-correlation intervals: Pantanal temperature/rainfall
−0.491 to −0.330; rainfall leading storage by one month: Pantanal 0.300–0.512,
Amazon 0.451–0.677, southern Brazil 0.550–0.703. A useful counterexample is
southern Brazil temperature/rainfall: r=0.061, interval −0.031 to 0.182.
These are the exploratory, unadjusted pointwise intervals described above.

## Suggested product sequence

1. **Seasonal anomalies:** raw/anomaly toggle, explicit baseline and units,
   month-specific percentiles, missing-data and baseline-count indicators.
   A 2003–2020 reference is possible for these three products; label it as an
   18-year study reference, not a standard 30-year climate normal. GRACE's native
   mass-anomaly reference differs from this additional seasonal adjustment.
2. **Relationships:** aligned anomaly charts, scatterplot, Pearson/Spearman,
   lag curve, sample counts, effect size, and uncertainty. Define the family of
   all tested regions/pairs/lags and apply an appropriate multiplicity procedure
   before highlighting significance. Use calendar blocks or autocorrelation-aware
   regression. Different units require separate axes or explicit standardization.
3. **Compound anomalies:** highlight unusually hot months coinciding with low
   rainfall or storage, using declared month-specific percentile thresholds.
   These are retrospective anomaly flags, not disaster declarations or forecasts.
4. **ENSO connections:** ingest a versioned NOAA index and compare its historical
   relationship with regional anomalies. NOAA CPC adopted **RONI** in February
   2026; preserve the index/product version and distinguish it from ONI.
   See [CPC announcement](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/announcement.php)
   and [RONI definition/data](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/).
   This index has not been ingested or joined in this experiment. MERRA-2 skin
   temperature is not a substitute for a validated Niño sea-surface-temperature index.
5. **Prediction experiment:** initially forecast regional monthly anomalies at
   1–3 months, rather than claim a new El Niño forecasting system. Compare simple
   autoregression and lagged-predictor regression against persistence and
   seasonal climatology in rolling-origin tests. Fit baselines, scaling, feature
   selection, and hyperparameters using training data only. Respect publication
   delays and revision vintages: a retrospective Final-rainfall join is not an
   operationally available predictor. Use MAE/RMSE for continuous targets,
   Brier scores/calibration for event probabilities, and prediction-interval
   coverage. Keep an untouched final test period. Explain whether performance
   exceeds the baselines before presenting a forecast feature.

[ECMWF verification concepts](https://confluence.ecmwf.int/spaces/FUG/pages/673551834/Section%2B12.A%2BStatistical%2BConcepts%2B-%2BDeterministic%2BData)
distinguish accuracy from skill relative to persistence/climatology.

## Reproduction and evidence

- Query: [SQL](../ml_experiments/trend_lab_exploration.sql).
- Analysis: [Python, standard library only](../ml_experiments/trend_lab_exploration.py).
- Local ignored artifacts: `artifacts/trend-lab-exploration/series-response.json`
  and `analysis.json`. These are not public submission attachments.
- Submit the SQL through `databricks api post /api/2.0/sql/statements` using
  profile `nasa-gcp`, warehouse above, JSON fields `statement`, `wait_timeout:
  "10s"`, `row_limit: 10000`. If pending, retrieve the statement by ID until
  complete; preserve all chunks and verify no truncation before analysis.
- Run `rtk proxy python ml_experiments/trend_lab_exploration.py
  artifacts/trend-lab-exploration/series-response.json
  artifacts/trend-lab-exploration/analysis.json` on one shell line.
- OLS residual orthogonality checked against intercept, calendar-month groups,
  and time on a constructed numerical fixture. Real-data analysis executed.
  No application code changed; frontend/API builds were not rerun.

OpenAI Codex assisted SQL, analysis, interpretation, and this document. Human
scientific review remains pending. No deployment, submission, warehouse writes,
new external data ingestion, or model training was performed.
