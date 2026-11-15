# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Core indicators EDA
# MAGIC
# MAGIC Exploratory look at the 19 indicators classified as `accessibility = 'core'` in `earth-trend-data`.refined.tb_dim_indicators: coverage, units, nulls, value ranges, data quality flags and global area-weighted monthly series. Results describe only the loaded period (about 2024-01 to 2026-10) and are not long-term climate trends.

# COMMAND ----------

# DBTITLE 1,Core indicator catalog
# MAGIC %sql
# MAGIC SELECT indicator_id, indicator_name, indicator_label, domain, theme, source, data_type, unit, source_table
# MAGIC FROM `earth-trend-data`.refined.tb_dim_indicators
# MAGIC WHERE accessibility = 'core'
# MAGIC ORDER BY domain, theme, indicator_id

# COMMAND ----------

# DBTITLE 1,Coverage and value profile per core indicator
import pandas as pd

CATALOG = "earth-trend-data"
core = spark.sql(f"""
    SELECT indicator_id, indicator_name, source_table, unit
    FROM `{CATALOG}`.refined.tb_dim_indicators
    WHERE accessibility = 'core'
""").collect()

profiles = []
for r in core:
    c = r.indicator_name
    stats = spark.sql(f"""
        SELECT count(*) AS n_rows,
               count(DISTINCT time) AS n_months,
               min(time) AS first_month,
               max(time) AS last_month,
               count(DISTINCT latitude) AS n_lat,
               count(DISTINCT longitude) AS n_lon,
               round(avg(CASE WHEN {c} IS NULL OR isnan({c}) THEN 1 ELSE 0 END), 4) AS null_fraction,
               round(avg(CASE WHEN {c} = 0 THEN 1 ELSE 0 END), 4) AS zero_fraction,
               min({c}) AS v_min,
               percentile_approx({c}, 0.5) AS v_p50,
               max({c}) AS v_max
        FROM `{CATALOG}`.trusted.{r.source_table}
    """).collect()[0].asDict()
    profiles.append({"indicator_id": r.indicator_id, "source_table": r.source_table, "unit": r.unit, **stats})

profile_pdf = pd.DataFrame(profiles).sort_values("indicator_id")
display(profile_pdf)

# COMMAND ----------

# DBTITLE 1,Data quality flags: IMERG runs, COOLR months, GRACE
# MAGIC %sql
# MAGIC -- IMERG Final vs Late periods (must stay distinguishable in trends)
# MAGIC SELECT 'imerg_run' AS check, imerg_run AS detail, min(time) AS first_month, max(time) AS last_month, count(DISTINCT time) AS value
# MAGIC FROM `earth-trend-data`.trusted.tb_gpm_imerg_precipitation_final_late
# MAGIC GROUP BY imerg_run
# MAGIC UNION ALL
# MAGIC -- COOLR: months with at least one landslide record
# MAGIC SELECT 'coolr_events_nonzero_months', CAST(count(DISTINCT time) AS STRING), min(time), max(time), sum(reported_landslide_catalog_record_count)
# MAGIC FROM `earth-trend-data`.trusted.tb_coolr_events_points_monthly_records
# MAGIC WHERE reported_landslide_catalog_record_count > 0
# MAGIC UNION ALL
# MAGIC SELECT 'coolr_reports_nonzero_months', CAST(count(DISTINCT time) AS STRING), min(time), max(time), sum(reported_landslide_catalog_record_count)
# MAGIC FROM `earth-trend-data`.trusted.tb_coolr_reports_points_monthly_records
# MAGIC WHERE reported_landslide_catalog_record_count > 0
# MAGIC UNION ALL
# MAGIC -- GRACE: months loaded (GRACE-FO has known mission gaps; check against source)
# MAGIC SELECT 'grace_months', CAST(count(DISTINCT time) AS STRING), min(time), max(time), round(avg(valid_area_fraction) * 100)
# MAGIC FROM `earth-trend-data`.trusted.tb_grace_jpl_mass_anomaly
# MAGIC UNION ALL
# MAGIC -- MODIS: QA reliability distribution where NDVI is filled
# MAGIC SELECT 'modis_reliability_rank', CAST(pixel_reliability_rank AS STRING), min(time), max(time), count(*)
# MAGIC FROM `earth-trend-data`.trusted.tb_modis_mod13c2_vegetation
# MAGIC WHERE normalized_difference_vegetation_index IS NOT NULL
# MAGIC GROUP BY pixel_reliability_rank
# MAGIC ORDER BY check, detail

# COMMAND ----------

# DBTITLE 1,Global area-weighted monthly series of core indicators
from pyspark.sql import functions as F

# (label, table, value expression, unit, filter); weights = cos(latitude), nulls excluded
series_specs = [
    ("T2M (degC)", "tb_merra2_temperatura", "air_temperature_at_2_meters_kelvin - 273.15", "degC", "true"),
    ("TS (degC)", "tb_merra2_temperatura", "surface_skin_temperature_celsius", "degC", "true"),
    ("TO3 (DU)", "tb_merra2_pressao_altura", "total_column_ozone_dobson_units", "Dobson", "true"),
    ("PRECTOTCORR (mm/day)", "tb_merra2_fluxos", "bias_corrected_total_precipitation * 86400", "mm/day", "true"),
    ("IMERG precip (mm/month)", "tb_gpm_imerg_precipitation_final_late", "monthly_precipitation_millimeters", "mm", "true"),
    ("GRACE mass anomaly (mm w.e.)", "tb_grace_jpl_mass_anomaly", "surface_mass_anomaly_millimeters_water_equivalent", "mm w.e.", "true"),
    ("Sea ice conc. NH (%)", "tb_sea_ice_concentration_global", "sea_ice_concentration_percent", "%", "latitude > 0"),
    ("Sea ice conc. SH (%)", "tb_sea_ice_concentration_global", "sea_ice_concentration_percent", "%", "latitude < 0"),
    ("NDVI (land)", "tb_modis_mod13c2_vegetation", "normalized_difference_vegetation_index", "1", "pixel_reliability_rank = 0"),
]

parts = []
for label, table, expr, unit, flt in series_specs:
    df = (spark.table(f"`{CATALOG}`.trusted.{table}")
          .where(F.expr(flt))
          .withColumn("v", F.expr(expr))
          .where(F.col("v").isNotNull() & ~F.isnan("v"))
          .withColumn("w", F.cos(F.radians("latitude")))
          .groupBy(F.date_trunc("month", "time").cast("date").alias("month"))
          .agg((F.sum(F.col("v") * F.col("w")) / F.sum("w")).alias("value"),
               F.count("*").alias("n_valid_cells"))
          .withColumn("indicator", F.lit(label))
          .withColumn("unit", F.lit(unit)))
    parts.append(df)

global_series = parts[0]
for p in parts[1:]:
    global_series = global_series.unionByName(p)

global_series_pdf = global_series.orderBy("indicator", "month").toPandas()
display(global_series_pdf)

# COMMAND ----------

# DBTITLE 1,Plot global series
import matplotlib.pyplot as plt

labels = global_series_pdf["indicator"].unique()
fig, axes = plt.subplots(len(labels), 1, figsize=(10, 2.2 * len(labels)), sharex=True)
for ax, lab in zip(axes, labels):
    s = global_series_pdf[global_series_pdf["indicator"] == lab]
    ax.plot(s["month"], s["value"], marker="o", ms=3)
    ax.set_title(lab, fontsize=9, loc="left")
    ax.grid(alpha=0.3)
fig.suptitle("Global area-weighted monthly means (cos-lat weights, valid cells only)", fontsize=11)
plt.tight_layout()
plt.show()

# COMMAND ----------

# DBTITLE 1,Section: date and grid alignment
# MAGIC %md
# MAGIC ## Date and grid alignment
# MAGIC
# MAGIC Which months each core indicator covers, the common window where they overlap, and whether the spatial grids line up. Cells are matched on integer grid indices (`lat_idx = round((lat+90)/0.5)`, `lon_idx = pmod(round((lon+180)/0.625), 576)`), never on raw float coordinates, because MERRA-2 coordinates carry ~1e-13 float noise.

# COMMAND ----------

# DBTITLE 1,Month availability matrix per core source
import matplotlib.pyplot as plt
import numpy as np

# One representative column per source table (core indicators); valid = non-null, non-NaN
avail_specs = {
    "MERRA-2 temperature (T2M, TS)": ("tb_merra2_temperatura", "air_temperature_at_2_meters_kelvin"),
    "MERRA-2 ozone (TO3)": ("tb_merra2_pressao_altura", "total_column_ozone_dobson_units"),
    "MERRA-2 precip/snow (PRECTOTCORR)": ("tb_merra2_fluxos", "bias_corrected_total_precipitation"),
    "IMERG precipitation (Final+Late)": ("tb_gpm_imerg_precipitation_final_late", "monthly_precipitation_millimeters"),
    "GRACE mass anomaly": ("tb_grace_jpl_mass_anomaly", "surface_mass_anomaly_millimeters_water_equivalent"),
    "NSIDC sea ice concentration": ("tb_sea_ice_concentration_global", "sea_ice_concentration_percent"),
    "NSIDC sea ice extent flag": ("tb_sea_ice_global", "sea_ice_extent_flag"),
    "MODIS NDVI/EVI (0.05 deg)": ("tb_modis_mod13c2_vegetation", "normalized_difference_vegetation_index"),
    "COOLR landslide events": ("tb_coolr_events_points_monthly_records", "reported_landslide_catalog_record_count"),
}

avail_parts = []
for label, (table, col) in avail_specs.items():
    avail_parts.append(
        spark.table(f"`{CATALOG}`.trusted.{table}")
        .groupBy(F.date_trunc("month", "time").cast("date").alias("month"))
        .agg(F.count("*").alias("n_rows"),
             F.count_if(F.col(col).isNotNull() & ~F.isnan(col)).alias("n_valid"),
             F.count_if(F.dayofmonth("time") != 1).alias("n_not_first_day"))
        .select(F.lit(label).alias("source"), "*")
    )
avail = avail_parts[0]
for p in avail_parts[1:]:
    avail = avail.unionByName(p)
avail_pdf = avail.orderBy("source", "month").toPandas()

# Coverage summary per source
coverage_pdf = (avail_pdf.groupby("source")
                .agg(first_month=("month", "min"), last_month=("month", "max"), n_months=("month", "nunique"),
                     min_valid_cells=("n_valid", "min"), max_valid_cells=("n_valid", "max"),
                     timestamps_not_on_day_1=("n_not_first_day", "sum"))
                .reset_index())
display(coverage_pdf)

# Heatmap: valid-cell fraction per month (relative to the source's own max)
mat = avail_pdf.pivot(index="source", columns="month", values="n_valid")
mat = mat.div(mat.max(axis=1), axis=0)
fig, ax = plt.subplots(figsize=(14, 4))
im = ax.imshow(mat.fillna(0).values, aspect="auto", cmap="viridis", vmin=0, vmax=1)
ax.set_yticks(range(len(mat.index)), mat.index, fontsize=8)
ax.set_xticks(range(len(mat.columns)), [m.strftime("%Y-%m") for m in mat.columns], rotation=90, fontsize=7)
ax.set_title("Monthly availability (valid cells / max valid cells of the source); blank = month not loaded", fontsize=10)
fig.colorbar(im, ax=ax, fraction=0.02)
plt.tight_layout()
plt.show()

# COMMAND ----------

# DBTITLE 1,Common overlap window and grid compatibility
# Common window across sources that have a monthly time series (excludes MODIS and COOLR)
series_sources = [s for s in coverage_pdf["source"] if not s.startswith(("MODIS", "COOLR"))]
sub = coverage_pdf[coverage_pdf["source"].isin(series_sources)]
OVERLAP_START, OVERLAP_END = sub["first_month"].max(), sub["last_month"].min()
print(f"Common window (time-series sources): {OVERLAP_START} .. {OVERLAP_END}")
print("IMERG inside the window: Final 2024-01..2025-09, Late 2025-10..2026-09 (processing change mid-window)")
print("MODIS overlaps only 2024-01..2024-03; COOLR has non-zero events in a single month")

# Grid check on one month: max distance of coordinates to the 0.5 x 0.625 lattice
grid_rows = []
for label, (table, col) in avail_specs.items():
    r = spark.sql(f"""
        SELECT count(DISTINCT latitude) AS n_lat, count(DISTINCT longitude) AS n_lon,
               max(abs(latitude  - (round((latitude + 90) / 0.5) * 0.5 - 90)))      AS max_lat_offset,
               max(abs(longitude - (round((longitude + 180) / 0.625) * 0.625 - 180))) AS max_lon_offset,
               count(*) - count(DISTINCT latitude, longitude) AS duplicate_keys
        FROM `{CATALOG}`.trusted.{table}
        WHERE time = DATE'2024-03-01'
    """).collect()[0].asDict()
    grid_rows.append({"source": label, **r})
grid_pdf = pd.DataFrame(grid_rows)
grid_pdf["on_merra2_grid"] = (grid_pdf["max_lat_offset"] < 1e-9) & (grid_pdf["max_lon_offset"] < 1e-9)
display(grid_pdf)

# COMMAND ----------

# DBTITLE 1,Section: correlation between core indicators
# MAGIC %md
# MAGIC ## Which core indicators move together
# MAGIC
# MAGIC Correlation is not causation. To separate different kinds of association, three views are computed on a cell x month panel (MERRA-2 grid, common window):
# MAGIC
# MAGIC * **Raw pooled correlation**: values across all cells and months. Dominated by geography and the seasonal cycle (e.g. warm places are wet), so it is high for many pairs.
# MAGIC * **Anomaly correlation**: each cell's calendar-month mean is subtracted first, removing the seasonal cycle and the fixed geography. What remains is "when this cell was unusually X, was it also unusually Y?". Climatology uses only 2–3 years per calendar month, so anomalies are noisy.
# MAGIC * **Per-cell lagged correlation**: temporal correlation of anomalies inside each cell, with the driver leading by 0–3 months (e.g. precipitation leading GRACE water storage), summarized by latitude band.
# MAGIC
# MAGIC All pooled statistics are area-weighted by cos(latitude), using only cell-months where both indicators are valid. No p-values are reported for pooled correlations: with millions of spatially autocorrelated samples they would be meaningless. Units: temperatures in °C, MERRA-2 precipitation/snow and IMERG converted to mm/day, GRACE in mm water equivalent, sea ice in %.

# COMMAND ----------

# DBTITLE 1,Build cell x month panel and seasonal anomalies
from pyspark.sql import Window as W

T0, T1 = str(OVERLAP_START), str(OVERLAP_END)
KEYS = ["lat_idx", "lon_idx", "month"]

def load_grid(table, exprs, where="true"):
    """Read a trusted table on the MERRA-2 grid index; NaN -> NULL for every value column."""
    return (spark.table(f"`{CATALOG}`.trusted.{table}")
            .where(F.expr(where) & F.col("time").between(T0, T1))
            .select(F.round((F.col("latitude") + 90) / 0.5).cast("int").alias("lat_idx"),
                    F.pmod(F.round((F.col("longitude") + 180) / 0.625).cast("int"), F.lit(576)).alias("lon_idx"),
                    F.date_trunc("month", "time").cast("date").alias("month"),
                    *[F.when(~F.isnan(F.expr(e)), F.expr(e)).alias(a) for a, e in exprs.items()]))

panel = (
    load_grid("tb_merra2_temperatura", {"t2m": "air_temperature_at_2_meters_kelvin - 273.15",
                                        "ts": "surface_skin_temperature_celsius"})
    .join(load_grid("tb_merra2_pressao_altura", {"to3": "total_column_ozone_dobson_units"}), KEYS, "left")
    .join(load_grid("tb_merra2_fluxos", {"prectotcorr": "bias_corrected_total_precipitation * 86400",
                                         "precsno": "snowfall * 86400"}), KEYS, "left")
    .join(load_grid("tb_gpm_imerg_precipitation_final_late",
                    {"imerg": "monthly_precipitation_millimeters / day(last_day(time))"}), KEYS, "left")
    .join(load_grid("tb_grace_jpl_mass_anomaly", {"grace": "surface_mass_anomaly_millimeters_water_equivalent"}), KEYS, "left")
    .join(load_grid("tb_sea_ice_concentration_global", {"seaice": "sea_ice_concentration_percent"}), KEYS, "left")
)
VARS = ["t2m", "ts", "to3", "prectotcorr", "precsno", "imerg", "grace", "seaice"]
VAR_LABELS = {"t2m": "T2M", "ts": "TS", "to3": "TO3", "prectotcorr": "PRECTOTCORR", "precsno": "PRECSNO",
              "imerg": "IMERG", "grace": "GRACE", "seaice": "Sea ice"}

# Seasonal anomaly: value minus the cell's mean for the same calendar month
clim_w = W.partitionBy("lat_idx", "lon_idx", F.month("month"))
panel_anom = panel.select(
    *KEYS,
    F.cos(F.radians(F.col("lat_idx") * 0.5 - 90)).alias("w"),
    (F.col("lat_idx") * 0.5 - 90).alias("lat"),
    *[F.col(v).alias(v) for v in VARS],
    *[(F.col(v) - F.avg(v).over(clim_w)).alias(f"{v}_a") for v in VARS],
)

# Sanity check: one row per cell-month and expected row count
chk = panel_anom.agg(F.count("*").alias("n_rows"),
                     F.countDistinct(*KEYS).alias("n_keys"),
                     F.countDistinct("month").alias("n_months")).collect()[0]
print(chk.asDict(), "expected rows:", 361 * 576 * chk.n_months)
assert chk.n_rows == chk.n_keys == 361 * 576 * chk.n_months

# COMMAND ----------

# DBTITLE 1,Pooled weighted correlation matrices: raw vs anomaly
def weighted_corr_matrix(df, cols):
    """Area-weighted Pearson correlation for every pair, pairwise-complete, in a single aggregation."""
    aggs, pairs = [], []
    for i, a in enumerate(cols):
        for b in cols[i + 1:]:
            m = F.col(a).isNotNull() & F.col(b).isNotNull()
            w, x, y = F.when(m, F.col("w")), F.when(m, F.col(a)), F.when(m, F.col(b))
            k = f"{a}__{b}"
            aggs += [F.sum(w).alias(f"{k}__sw"), F.sum(w * x).alias(f"{k}__sx"), F.sum(w * y).alias(f"{k}__sy"),
                     F.sum(w * x * x).alias(f"{k}__sxx"), F.sum(w * y * y).alias(f"{k}__syy"),
                     F.sum(w * x * y).alias(f"{k}__sxy"), F.count(x).alias(f"{k}__n")]
            pairs.append((a, b))
    s = df.agg(*aggs).collect()[0].asDict()
    mat = pd.DataFrame(np.eye(len(cols)), index=cols, columns=cols)
    n_mat = pd.DataFrame(np.nan, index=cols, columns=cols)
    for a, b in pairs:
        k = f"{a}__{b}"
        sw = s[f"{k}__sw"]
        if not sw:
            r = np.nan
        else:
            mx, my = s[f"{k}__sx"] / sw, s[f"{k}__sy"] / sw
            cov = s[f"{k}__sxy"] / sw - mx * my
            vx, vy = s[f"{k}__sxx"] / sw - mx ** 2, s[f"{k}__syy"] / sw - my ** 2
            r = cov / np.sqrt(vx * vy) if vx > 0 and vy > 0 else np.nan
        mat.loc[a, b] = mat.loc[b, a] = r
        n_mat.loc[a, b] = n_mat.loc[b, a] = s[f"{k}__n"]
    return mat, n_mat

raw_corr, raw_n = weighted_corr_matrix(panel_anom, VARS)
anom_corr, anom_n = weighted_corr_matrix(panel_anom.select("w", *[F.col(f"{v}_a").alias(v) for v in VARS]), VARS)

raw_corr = raw_corr.rename(index=VAR_LABELS, columns=VAR_LABELS)
anom_corr = anom_corr.rename(index=VAR_LABELS, columns=VAR_LABELS)

# Long table of pairs, sorted by anomaly correlation strength
pairs_pdf = (pd.DataFrame({"raw_r": raw_corr.stack(), "anomaly_r": anom_corr.stack(),
                           "n_cell_months": raw_n.rename(index=VAR_LABELS, columns=VAR_LABELS).stack()})
             .reset_index().rename(columns={"level_0": "indicator_a", "level_1": "indicator_b"}))
pairs_pdf = pairs_pdf[pairs_pdf["indicator_a"] < pairs_pdf["indicator_b"]]
pairs_pdf = pairs_pdf.assign(abs_anomaly_r=pairs_pdf["anomaly_r"].abs()).sort_values("abs_anomaly_r", ascending=False)
display(pairs_pdf.round(3))

fig, axes = plt.subplots(1, 2, figsize=(15, 6))
for ax, (title, m) in zip(axes, [("Raw pooled (geography + season)", raw_corr), ("Seasonal anomalies", anom_corr)]):
    im = ax.imshow(m.values, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(m)), m.columns, rotation=45, ha="right")
    ax.set_yticks(range(len(m)), m.index)
    for i in range(len(m)):
        for j in range(len(m)):
            v = m.values[i, j]
            if not np.isnan(v):
                ax.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=8,
                        color="white" if abs(v) > 0.6 else "black")
    ax.set_title(title)
fig.colorbar(im, ax=axes, fraction=0.02)
fig.suptitle(f"Area-weighted Pearson correlation, {T0[:7]}..{T1[:7]}, pairwise-complete cell-months")
plt.show()

# COMMAND ----------

# DBTITLE 1,Per-cell lagged anomaly correlations by latitude band
# (driver, response, lags in months): driver at t-lag vs response at t
lag_specs = [
    ("prectotcorr", "grace", [0, 1, 2, 3]),
    ("imerg", "grace", [0, 1, 2, 3]),
    ("t2m", "seaice", [0, 1, 2]),
    ("t2m", "precsno", [0]),
    ("t2m", "prectotcorr", [0]),
    ("t2m", "to3", [0]),
    ("t2m", "ts", [0]),
    ("prectotcorr", "imerg", [0]),
]

cell_w = W.partitionBy("lat_idx", "lon_idx").orderBy("month")
lag_cols, corr_aggs, count_aggs = {}, [], []
for x, y, lags in lag_specs:
    for k in lags:
        name = f"{x}->{y}@{k}"
        xl = F.lag(f"{x}_a", k).over(cell_w) if k else F.col(f"{x}_a")
        lag_cols[name] = (xl, F.col(f"{y}_a"))

lagged = panel_anom.select("lat_idx", "lon_idx", "lat", "w",
                           *[c.alias(f"x{i}") for i, (c, _) in enumerate(lag_cols.values())],
                           *[c.alias(f"y{i}") for i, (_, c) in enumerate(lag_cols.values())])
per_cell = lagged.groupBy("lat_idx", "lon_idx", "lat", "w").agg(
    *[F.corr(f"x{i}", f"y{i}").alias(f"r{i}") for i in range(len(lag_cols))],
    *[F.count(F.when(F.col(f"x{i}").isNotNull() & F.col(f"y{i}").isNotNull(), 1)).alias(f"n{i}")
      for i in range(len(lag_cols))],
)
per_cell = per_cell.select("*", F.when(F.abs("lat") < 23.5, "tropics (<23.5)")
                                 .when(F.abs("lat") < 60, "mid-latitudes (23.5-60)")
                                 .otherwise("polar (>=60)").alias("lat_band"))

# Two-sided 5% critical |r| for n samples: t / sqrt(n - 2 + t^2), t ~ 2.04 for n ~ 30 (no autocorrelation correction)
summary_aggs = []
for i, name in enumerate(lag_cols):
    valid = F.col(f"r{i}").isNotNull() & ~F.isnan(f"r{i}") & (F.col(f"n{i}") >= 20)
    rcrit = F.lit(2.04) / F.sqrt(F.col(f"n{i}") - 2 + F.lit(2.04 ** 2))
    summary_aggs += [
        (F.sum(F.when(valid, F.col("w") * F.col(f"r{i}"))) / F.sum(F.when(valid, F.col("w")))).alias(f"{i}__mean_r"),
        (F.sum(F.when(valid & (F.col(f"r{i}") > rcrit), F.col("w"))) / F.sum(F.when(valid, F.col("w")))).alias(f"{i}__frac_pos_sig"),
        (F.sum(F.when(valid & (F.col(f"r{i}") < -rcrit), F.col("w"))) / F.sum(F.when(valid, F.col("w")))).alias(f"{i}__frac_neg_sig"),
        F.count_if(valid).alias(f"{i}__n_cells"),
    ]
band_rows = (per_cell.groupBy("lat_band").agg(*summary_aggs)
             .unionByName(per_cell.agg(*summary_aggs).select(F.lit("global").alias("lat_band"), "*"))
             .toPandas())

records = []
for _, row in band_rows.iterrows():
    for i, name in enumerate(lag_cols):
        drv, rest = name.split("->")
        resp, lag = rest.split("@")
        records.append({"driver": VAR_LABELS[drv], "response": VAR_LABELS[resp], "lag_months": int(lag),
                        "lat_band": row["lat_band"], "area_weighted_mean_r": row[f"{i}__mean_r"],
                        "area_frac_sig_positive": row[f"{i}__frac_pos_sig"],
                        "area_frac_sig_negative": row[f"{i}__frac_neg_sig"], "n_cells": row[f"{i}__n_cells"]})
lag_pdf = pd.DataFrame(records).sort_values(["driver", "response", "lat_band", "lag_months"])
display(lag_pdf.round(3))

# COMMAND ----------

# DBTITLE 1,Spatial correlation of NDVI with climate (Jan-Mar 2024)
# MODIS has only 3 months, so only spatial (across-cell) relationships are possible.
# Aggregate 0.05 deg NDVI/EVI to the MERRA-2 grid (nearest grid centre), best-quality pixels only.
modis_grid = (spark.table(f"`{CATALOG}`.trusted.tb_modis_mod13c2_vegetation")
              .where((F.col("pixel_reliability_rank") == 0) & F.col("normalized_difference_vegetation_index").isNotNull())
              .groupBy(F.round((F.col("latitude") + 90) / 0.5).cast("int").alias("lat_idx"),
                       F.pmod(F.round((F.col("longitude") + 180) / 0.625).cast("int"), F.lit(576)).alias("lon_idx"),
                       F.date_trunc("month", "time").cast("date").alias("month"))
              .agg(F.avg("normalized_difference_vegetation_index").alias("ndvi"),
                   F.avg("enhanced_vegetation_index").alias("evi"),
                   F.count("*").alias("n_pixels"))
              .where(F.col("n_pixels") >= 30))  # >= 30 of ~125 sub-pixels valid

veg_panel = panel_anom.select(*KEYS, "w", *VARS).join(modis_grid, KEYS, "inner")
VEG_VARS = ["ndvi", "evi", "t2m", "ts", "prectotcorr", "imerg", "grace"]
veg_rows = []
for m in [r.month for r in veg_panel.select("month").distinct().orderBy("month").collect()]:
    cm, cn = weighted_corr_matrix(veg_panel.where(F.col("month") == m), VEG_VARS)
    for v in VEG_VARS[2:]:
        veg_rows.append({"month": m, "climate_var": VAR_LABELS[v], "r_with_ndvi": cm.loc["ndvi", v],
                         "r_with_evi": cm.loc["evi", v], "n_cells": cn.loc["ndvi", v]})
veg_pdf = pd.DataFrame(veg_rows)
print("NDVI vs EVI spatial r (last month):", round(cm.loc["ndvi", "evi"], 3))
display(veg_pdf.round(3))

# COMMAND ----------

# DBTITLE 1,Findings: alignment and indicator relationships
# MAGIC %md
# MAGIC ## Findings (run of 2026-11-14)
# MAGIC
# MAGIC **Alignment**
# MAGIC * All time-series sources except MODIS share the MERRA-2 grid (361 x 576, no duplicate keys). MERRA-2 coordinates differ from the lattice only by ~1e-13, so joins must use grid indices. MODIS is 0.05 deg (3600 x 7200) and must be aggregated.
# MAGIC * All timestamps fall on day 1 of the month. Common window of the time-series sources: **2024-01 .. 2026-09 (33 months)**; IMERG, NSIDC and COOLR have one extra month (2026-10).
# MAGIC * Inside the window IMERG switches from Final to Late in 2025-10. MODIS overlaps only 2024-01..03.
# MAGIC
# MAGIC **Pairs that move together after removing the seasonal cycle** (pooled anomaly r, area-weighted)
# MAGIC * T2M vs TS: 0.96 (redundant for the app; per-cell r ≈ 0.89).
# MAGIC * IMERG vs PRECTOTCORR: 0.59 (per-cell r ≈ 0.64; 89% of the area significant). Observation and reanalysis agree, so one can cross-validate the other.
# MAGIC * Sea ice vs TS / T2M: -0.50 / -0.43 at lag 0; per cell r = -0.44 at lag 0, -0.27 at lag 1, -0.10 at lag 2. Warmer-than-usual months coincide with less ice, mostly in the same month.
# MAGIC * T2M vs TO3: -0.20 (per cell -0.18, stronger in mid-latitudes).
# MAGIC * T2M vs PRECSNO: sign depends on latitude (per cell +0.21 polar, -0.26 mid-latitudes): warmer polar air brings more snow; warmer mid-latitude months bring less snow.
# MAGIC
# MAGIC **Weak or no association in this window**
# MAGIC * Precipitation vs GRACE: per cell r ≈ 0.03–0.04 at lag 0 and ≈ 0.08 at lag 1 globally (both PRECTOTCORR and IMERG). The lag-1 peak holds in most bands, but IMERG in polar regions peaks at lag 0 and PRECTOTCORR in the tropics is flat between lags 1 and 2. The sign is consistent with water storage responding to rain about one month later, but the effect is small at monthly 0.5 deg scale (GRACE is natively much coarser).
# MAGIC * Temperature vs precipitation anomalies: near zero globally; positive in polar regions (0.28 per cell).
# MAGIC
# MAGIC **Spatial (across places) for vegetation, 2024-01..03**: NDVI correlates with precipitation (r 0.54–0.66) more than with temperature (0.30–0.37), and barely with GRACE (≤ 0.13). NDVI and EVI are nearly interchangeable spatially (r 0.97).
# MAGIC
# MAGIC **Caveats**: 33 months only; climatology from 2–3 values per calendar month; per-cell significance ignores autocorrelation and multiple testing (the share of significant cells expected by chance alone is ≈ 2.5% per sign). Correlation does not show causation.