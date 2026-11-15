# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Date and geographic alignment report
# MAGIC
# MAGIC Checks whether the 21 analysis-ready tables in `earth-trend-data`.trusted (the 7 combined MERRA-2 tables plus the 14 non-MERRA-2 tables: GPM IMERG, GRACE, MODIS, NSIDC sea ice, COOLR) line up in time (months, gaps, timestamp convention, duplicates, overlap) and in space (grid, coordinates, longitude domain, keys against `tb_dim_grid_0p5x0p625`, valid-data footprint). Ends with a written report of the findings.

# COMMAND ----------

# DBTITLE 1,Tables in scope and representative column
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pyspark.sql import functions as F, Window as W

CATALOG = "earth-trend-data"

def tbl(name):
    return spark.table(f"`{CATALOG}`.trusted.{name}")

# One representative measurement column per table (core first, then intermediate, then scientific)
rep_pdf = spark.sql(f"""
    SELECT source_table, source, indicator_name AS rep_column, indicator_label AS rep_label, accessibility
    FROM (
        SELECT *, row_number() OVER (
                   PARTITION BY source_table
                   ORDER BY CASE accessibility WHEN 'core' THEN 0 WHEN 'intermediate' THEN 1 ELSE 2 END, indicator_id) AS rn
        FROM `{CATALOG}`.refined.tb_dim_indicators
        WHERE role = 'measurement'
    )
    WHERE rn = 1
    ORDER BY source, source_table
""").toPandas()

# Trusted tables not catalogued in tb_dim_indicators: tb_merra2_variancias and the split IMERG / polar sea ice tables.
# Representative column = explicit override, else the first numeric non-key column.
EXTRA_OVERRIDES = {"tb_merra2_variancias": "air_temperature_at_2_meters_kelvin_variance"}
cols_pdf = spark.sql(f"""
    SELECT table_name, column_name, data_type, ordinal_position
    FROM `{CATALOG}`.information_schema.columns
    WHERE table_schema = 'trusted'
      AND (table_name NOT LIKE 'tb_merra2%' OR table_name = 'tb_merra2_variancias')
""").toPandas()
extra_rows = []
for t, g in cols_pdf.sort_values("ordinal_position").groupby("table_name"):
    if t in set(rep_pdf["source_table"]):
        continue
    numeric = [c for c, d in zip(g.column_name, g.data_type)
               if c not in ("time", "latitude", "longitude") and d.upper() in ("DOUBLE", "FLOAT", "INT", "LONG", "BIGINT")]
    col = EXTRA_OVERRIDES.get(t, numeric[0])
    source = next(s for p, s in [("tb_merra2", "merra2"), ("tb_gpm_imerg", "gpm_imerg"), ("tb_sea_ice", "nsidc"),
                                 ("tb_grace", "grace"), ("tb_modis", "modis"), ("tb_coolr", "coolr")] if t.startswith(p))
    extra_rows.append({"source_table": t, "source": source, "rep_column": col, "rep_label": col,
                       "accessibility": "not in tb_dim_indicators"})
rep_pdf = (pd.concat([rep_pdf, pd.DataFrame(extra_rows)], ignore_index=True)
           .sort_values(["source", "source_table"]).reset_index(drop=True))
TABLES = rep_pdf["source_table"].tolist()
assert len(TABLES) == 21, TABLES
print(f"{len(TABLES)} tables in scope ({len(extra_rows)} not catalogued in tb_dim_indicators)")
display(rep_pdf)

# COMMAND ----------

# DBTITLE 1,Section: date alignment
# MAGIC %md
# MAGIC ## 1. Date alignment
# MAGIC
# MAGIC Full history of every table: months loaded, gaps between first and last month, timestamps not on day 1, null timestamps, rows and unique (lat, lon) keys per month, and months where the representative column has no valid value.

# COMMAND ----------

# DBTITLE 1,Per-month profile of every table
month_parts = []
for _, r in rep_pdf.iterrows():
    c = r.rep_column
    month_parts.append(
        tbl(r.source_table)
        .groupBy(F.col("time").alias("month"))
        .agg(F.count("*").alias("n_rows"),
             F.countDistinct("latitude", "longitude").alias("n_keys"),
             F.count_if(F.col(c).isNotNull() & ~F.isnan(F.col(c).cast("double"))).alias("n_valid"))
        .select(F.lit(r.source_table).alias("source_table"), "*")
    )
month_sdf = month_parts[0]
for p in month_parts[1:]:
    month_sdf = month_sdf.unionByName(p)
month_pdf = month_sdf.toPandas()
month_pdf["month"] = pd.to_datetime(month_pdf["month"])

date_rows = []
for t, g in month_pdf.groupby("source_table"):
    g2 = g.dropna(subset=["month"])
    first, last = g2["month"].min(), g2["month"].max()
    full = pd.date_range(first.replace(day=1), last, freq="MS")
    missing = sorted(set(full) - set(g2["month"]))
    date_rows.append({
        "source_table": t,
        "first_month": first.date(), "last_month": last.date(),
        "n_months": g2["month"].nunique(), "expected_months": len(full),
        "missing_months": ", ".join(m.strftime("%Y-%m") for m in missing) or "-",
        "null_time_rows": int(g.loc[g["month"].isna(), "n_rows"].sum()),
        "timestamps_not_day_1": int((g2["month"].dt.day != 1).sum()),
        "min_rows_per_month": int(g2["n_rows"].min()), "max_rows_per_month": int(g2["n_rows"].max()),
        "duplicate_keys": int((g2["n_rows"] - g2["n_keys"]).sum()),
        "months_without_valid_values": int((g2["n_valid"] == 0).sum()),
        "min_valid_fraction": round(float((g2["n_valid"] / g2["n_rows"]).min()), 4),
        "max_valid_fraction": round(float((g2["n_valid"] / g2["n_rows"]).max()), 4),
    })
date_pdf = pd.DataFrame(date_rows).merge(rep_pdf[["source_table", "source", "rep_column"]], on="source_table")
date_pdf = date_pdf.sort_values(["source", "source_table"])
display(date_pdf)

# COMMAND ----------

# DBTITLE 1,Availability heatmap and pairwise month overlap
order = date_pdf["source_table"].tolist()
mp = month_pdf.dropna(subset=["month"]).assign(valid_frac=lambda d: d["n_valid"] / d["n_rows"])
avail_mat = mp.pivot(index="source_table", columns="month", values="valid_frac").reindex(order)

fig, ax = plt.subplots(figsize=(15, 7))
im = ax.imshow(np.ma.masked_invalid(avail_mat.values.astype(float)), aspect="auto", cmap="viridis", vmin=0, vmax=1)
ax.set_yticks(range(len(order)), order, fontsize=8)
ax.set_xticks(range(len(avail_mat.columns)), [m.strftime("%Y-%m") for m in avail_mat.columns], rotation=90, fontsize=7)
ax.set_title("Valid fraction of the representative column per month (white = month not loaded)", fontsize=10)
fig.colorbar(im, ax=ax, fraction=0.02)
plt.tight_layout()
plt.show()

# Number of months shared by each pair of tables
months_by_table = {t: set(g["month"]) for t, g in mp.groupby("source_table")}
overlap_pdf = pd.DataFrame([[len(months_by_table[a] & months_by_table[b]) for b in order] for a in order],
                           index=order, columns=order)
display(overlap_pdf.reset_index().rename(columns={"index": "source_table"}))

def common_window(tables):
    sub = date_pdf[date_pdf["source_table"].isin(tables)]
    start, end = sub["first_month"].max(), sub["last_month"].min()
    n_common = len(set.intersection(*[months_by_table[t] for t in tables]))
    return start, end, n_common

windows = {
    f"all {len(TABLES)} tables": TABLES,
    "catalogued in tb_dim_indicators": rep_pdf.loc[rep_pdf["accessibility"] != "not in tb_dim_indicators", "source_table"].tolist(),
    "all except MODIS and tb_gpm_imerg_late_precipitation": [t for t in TABLES if "modis" not in t and t != "tb_gpm_imerg_late_precipitation"],
    "all except MODIS": [t for t in TABLES if "modis" not in t],
    "MERRA-2 only": [t for t in TABLES if t.startswith("tb_merra2")],
    "non-MERRA-2 except MODIS": [t for t in TABLES if not t.startswith("tb_merra2") and "modis" not in t],
}
window_pdf = pd.DataFrame([{"group": k, "start": s, "end": e, "n_common_months": n}
                           for k, (s, e, n) in ((k, common_window(v)) for k, v in windows.items())])
display(window_pdf)

# Tables available per month
per_month = mp.groupby("month")["source_table"].nunique()
print("Tables loaded per month:", ", ".join(f"{m:%Y-%m}={n}" for m, n in per_month.items()))

# COMMAND ----------

# DBTITLE 1,Processing changes and hemisphere labels inside the time series
# MAGIC %sql
# MAGIC -- Product / processing version and hemisphere labels where a table records them
# MAGIC SELECT 'tb_gpm_imerg_precipitation_final_late' AS source_table,
# MAGIC        concat_ws(' | ', imerg_run, source_product, source_processing_versions) AS label,
# MAGIC        min(time) AS first_month, max(time) AS last_month, count(DISTINCT time) AS n_months,
# MAGIC        min(latitude) AS lat_min, max(latitude) AS lat_max
# MAGIC FROM `earth-trend-data`.trusted.tb_gpm_imerg_precipitation_final_late
# MAGIC GROUP BY ALL
# MAGIC UNION ALL
# MAGIC SELECT 'tb_gpm_imerg_late_precipitation', source_product, min(time), max(time), count(DISTINCT time), min(latitude), max(latitude)
# MAGIC FROM `earth-trend-data`.trusted.tb_gpm_imerg_late_precipitation
# MAGIC GROUP BY ALL
# MAGIC UNION ALL
# MAGIC SELECT 'tb_sea_ice_global', concat('hemisphere=', hemisphere), min(time), max(time), count(DISTINCT time), min(latitude), max(latitude)
# MAGIC FROM `earth-trend-data`.trusted.tb_sea_ice_global
# MAGIC GROUP BY ALL
# MAGIC UNION ALL
# MAGIC SELECT 'tb_sea_ice_concentration_global', concat('hemisphere=', hemisphere), min(time), max(time), count(DISTINCT time), min(latitude), max(latitude)
# MAGIC FROM `earth-trend-data`.trusted.tb_sea_ice_concentration_global
# MAGIC GROUP BY ALL
# MAGIC ORDER BY source_table, first_month, label

# COMMAND ----------

# DBTITLE 1,Section: geographic alignment
# MAGIC %md
# MAGIC ## 2. Geographic alignment
# MAGIC
# MAGIC For every table: number of distinct latitudes and longitudes, extent, step sizes, longitude domain, distance of the coordinates to the MERRA-2 0.5 x 0.625 lattice, and whether the set of cells is the same in every month. Then the keys are matched against `earth-trend-data`.refined.tb_dim_grid_0p5x0p625, by integer index and by exact float equality, and the valid-data footprint is compared by latitude band.

# COMMAND ----------

# DBTITLE 1,Grid profile per table
def steps(df, col):
    """Distinct spacings between consecutive distinct coordinate values, as 'step (count)'."""
    vals = df.select(col).distinct()
    d = (vals.select((F.col(col) - F.lag(col).over(W.orderBy(col))).alias("d"))
         .where(F.col("d").isNotNull())
         .groupBy(F.round("d", 6).alias("step")).count().orderBy(F.desc("count")).collect())
    return ", ".join(f"{r.step:g} ({r['count']})" for r in d)

geo_rows = []
for t in TABLES:
    df = tbl(t)
    a = df.agg(
        F.countDistinct("latitude").alias("n_lat"), F.countDistinct("longitude").alias("n_lon"),
        F.min("latitude").alias("lat_min"), F.max("latitude").alias("lat_max"),
        F.min("longitude").alias("lon_min"), F.max("longitude").alias("lon_max"),
        F.max(F.abs(F.col("latitude") - (F.round((F.col("latitude") + 90) / 0.5) * 0.5 - 90))).alias("max_lat_offset_merra2"),
        F.max(F.abs(F.col("longitude") - (F.round((F.col("longitude") + 180) / 0.625) * 0.625 - 180))).alias("max_lon_offset_merra2"),
        F.countDistinct("latitude", "longitude").alias("n_cells_all_months"),
        F.count_if(F.col("latitude").isNull() | F.col("longitude").isNull()).alias("null_coords"),
    ).collect()[0].asDict()
    a["lat_steps"] = steps(df, "latitude")
    a["lon_steps"] = steps(df, "longitude")
    geo_rows.append({"source_table": t, **a})

geo_pdf = pd.DataFrame(geo_rows)
keys_per_month = month_pdf.dropna(subset=["month"]).groupby("source_table")["n_keys"].agg(["min", "max"])
geo_pdf = geo_pdf.join(keys_per_month.rename(columns={"min": "min_cells_per_month", "max": "max_cells_per_month"}), on="source_table")
geo_pdf["same_cells_every_month"] = (geo_pdf["n_cells_all_months"] == geo_pdf["min_cells_per_month"])
geo_pdf["lon_domain"] = np.where(geo_pdf["lon_max"] > 180, "0..360", "-180..180")
geo_pdf["on_merra2_lattice"] = (geo_pdf["max_lat_offset_merra2"] < 1e-9) & (geo_pdf["max_lon_offset_merra2"] < 1e-9)
display(geo_pdf)

# COMMAND ----------

# DBTITLE 1,Key match against the grid dimension (one month per table)
# Check month: 2024-03 when loaded (common to every table except tb_gpm_imerg_late_precipitation), else the table's first month
first_month_by_table = date_pdf.set_index("source_table")["first_month"].to_dict()
def check_month(t):
    return "2024-03-01" if pd.Timestamp("2024-03-01") in months_by_table[t] else str(first_month_by_table[t])
grid = spark.table(f"`{CATALOG}`.refined.tb_dim_grid_0p5x0p625").select("lat_idx", "lon_idx", "latitude", "longitude")
n_grid = grid.count()

def with_idx(df):
    return df.select("latitude", "longitude",
                     F.round((F.col("latitude") + 90) / 0.5).cast("int").alias("lat_idx"),
                     F.pmod(F.round((F.col("longitude") + 180) / 0.625).cast("int"), F.lit(576)).alias("lon_idx"))

key_rows = []
for t in TABLES:
    if "modis" in t:
        continue  # finer grid: many pixels per cell, checked separately below
    src = with_idx(tbl(t).where(F.col("time") == check_month(t)))
    key_rows.append({
        "source_table": t, "check_month": check_month(t),
        "n_source_cells": src.count(),
        "matched_by_index": src.join(grid.select("lat_idx", "lon_idx"), ["lat_idx", "lon_idx"], "inner").count(),
        "source_not_in_grid": src.join(grid.select("lat_idx", "lon_idx"), ["lat_idx", "lon_idx"], "left_anti").count(),
        "grid_not_in_source": grid.select("lat_idx", "lon_idx").join(src, ["lat_idx", "lon_idx"], "left_anti").count(),
        "matched_by_exact_float": src.join(grid.select("latitude", "longitude"), ["latitude", "longitude"], "inner").count(),
    })
key_pdf = pd.DataFrame(key_rows)
key_pdf["exact_float_match_pct"] = (100 * key_pdf["matched_by_exact_float"] / key_pdf["n_source_cells"]).round(2)
print(f"Grid dimension cells: {n_grid}")
display(key_pdf)

# COMMAND ----------

# DBTITLE 1,MODIS nesting into the MERRA-2 grid
# How many 0.05 deg MODIS pixels fall into each MERRA-2 cell (nearest cell centre)
modis_cells = (with_idx(tbl("tb_modis_mod13c2_vegetation").where(F.col("time") == "2024-01-01"))
               .groupBy("lat_idx", "lon_idx").agg(F.count("*").alias("n_pixels")))
nesting_pdf = (modis_cells.groupBy("n_pixels").agg(F.count("*").alias("n_merra2_cells"))
               .orderBy("n_pixels").toPandas())
print("MERRA-2 cells covered by MODIS:", int(nesting_pdf["n_merra2_cells"].sum()), "of", n_grid)
display(nesting_pdf)

# COMMAND ----------

# DBTITLE 1,Valid-data footprint by latitude band
# Area-weighted (cos lat) share of cell-months with a valid representative value, per 10 deg latitude band, all months
band = F.least(F.floor(F.col("latitude") / 10) * 10, F.lit(80)).cast("int")
foot_parts = []
for _, r in rep_pdf.iterrows():
    c = r.rep_column
    valid = (F.col(c).isNotNull() & ~F.isnan(F.col(c).cast("double"))).cast("double")
    w = F.cos(F.radians("latitude"))
    foot_parts.append(tbl(r.source_table)
                      .groupBy(band.alias("lat_band"))
                      .agg((F.sum(w * valid) / F.sum(w)).alias("valid_frac"))
                      .select(F.lit(r.source_table).alias("source_table"), "*"))
foot = foot_parts[0]
for p in foot_parts[1:]:
    foot = foot.unionByName(p)
foot_pdf = foot.toPandas()
foot_mat = foot_pdf.pivot(index="source_table", columns="lat_band", values="valid_frac").reindex(order).sort_index(axis=1)

fig, ax = plt.subplots(figsize=(12, 5))
im = ax.imshow(foot_mat.values.astype(float), aspect="auto", cmap="magma", vmin=0, vmax=1)
ax.set_yticks(range(len(foot_mat.index)), [f"{t} [{rep_pdf.set_index('source_table').loc[t, 'rep_column']}]" for t in foot_mat.index], fontsize=7)
ax.set_xticks(range(len(foot_mat.columns)), [f"{b}..{b + 10}" for b in foot_mat.columns], rotation=45, fontsize=8)
for i in range(foot_mat.shape[0]):
    for j in range(foot_mat.shape[1]):
        v = foot_mat.values[i, j]
        ax.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=6, color="white" if v < 0.5 else "black")
ax.set_title("Valid fraction by latitude band (representative column, all months)", fontsize=10)
fig.colorbar(im, ax=ax, fraction=0.02)
plt.tight_layout()
plt.show()

display(foot_mat.round(3).reset_index())

# COMMAND ----------

# DBTITLE 1,Report: date and geographic alignment findings
# MAGIC %md
# MAGIC ## Report (run of 2026-11-14, 21 trusted tables)
# MAGIC
# MAGIC ### 1. Dates
# MAGIC * **Convention is consistent**: `time` is DATE on day 1 of the month in every table; no null timestamps, no gaps between each table's first and last month, constant rows per month (207,936; MODIS 25,920,000) and no duplicate (lat, lon, month) keys.
# MAGIC * **Coverage differs by family**:
# MAGIC
# MAGIC | Group | Period | Months |
# MAGIC | --- | --- | --- |
# MAGIC | MERRA-2 (7 tables) and GRACE | 2024-01 .. 2026-09 | 33 |
# MAGIC | IMERG final_late, NSIDC sea ice (6), COOLR (2) | 2024-01 .. 2026-10 | 34 |
# MAGIC | IMERG Final (`tb_gpm_imerg_precipitation`) and liquid probability | 2024-01 .. 2025-09 | 21 |
# MAGIC | IMERG Late (`tb_gpm_imerg_late_precipitation`) | 2025-10 .. 2026-10 | 13 |
# MAGIC | MODIS vegetation | 2024-01 .. 2024-03 | 3 |
# MAGIC
# MAGIC * **Common windows**: no month is shared by all 21 tables. The 14 tables in `tb_dim_indicators` share only 2024-01..03 (limited by MODIS). Without MODIS and the Late-only table: 2024-01..2025-09 (21 months). MERRA-2 alone: 33 months. 2026-10 is loaded only in 10 tables.
# MAGIC * **Processing changes inside a series**: `tb_gpm_imerg_precipitation_final_late` is Final until 2025-09, then Late V07B (2025-10..2026-02), mixed V07B;V07C (2026-03) and V07C (2026-04..2026-10). Liquid probability has no Late counterpart after 2025-09.
# MAGIC * **Valid values**: every month has valid values in every table. Partial coverage is structural: MERRA-2 clouds 82–100% valid per month, IMERG 97.6–98.9%, sea ice 10–27% (polar domain), MODIS 21–24% (land, QA).
# MAGIC
# MAGIC ### 2. Geography
# MAGIC * **20 of 21 tables share the MERRA-2 lattice**: 361 x 576 (lat -90..90 step 0.5, lon -180..179.375 step 0.625), longitude domain -180..180, identical cell set in every month, and 100% match by integer index with the 207,936 cells of `tb_dim_grid_0p5x0p625` (no missing or extra cells).
# MAGIC * **Float noise in MERRA-2 tables**: coordinates deviate from the lattice by up to 1.8e-13 (lat) and 6.0e-13 (lon). An exact float join with the grid dimension matches only 99.55% of cells (936 cells lost); the non-MERRA-2 tables match 100%. Join on `lat_idx`/`lon_idx`, never on raw lat/lon.
# MAGIC * **MODIS is a different grid**: 3600 x 7200 at 0.05 deg with pixel centres at ±0.025 offsets (max 0.225 deg / 0.3 deg from MERRA-2 centres). Nearest-centre aggregation covers all 207,936 cells, but 0.625 / 0.05 = 12.5 columns, so cells alternate between 120 and 130 pixels (60 / 65 in the polar rows). Aggregates must be pixel-count or area weighted.
# MAGIC * **Footprint**: MERRA-2, GRACE, COOLR and IMERG liquid probability are complete everywhere; IMERG drops to 96.7–99.5% only in the two outermost polar bands; MERRA-2 clouds drop to 52–79% at high latitudes; sea ice is restricted to the polar bands; MODIS valid EVI (its representative column) is near zero south of 60°S and highest at 50–70°N (58–68%). Footprints are measured on each table's representative column only.
# MAGIC * **Hemisphere label**: in `tb_sea_ice_global` and `tb_sea_ice_concentration_global`, `arctic` covers lat 0.5..90 and `antarctic` -90..-0.5; the equator row (lat 0) has a NULL hemisphere.
# MAGIC
# MAGIC ### Recommendations
# MAGIC 1. Use `lat_idx`/`lon_idx` (or `grid_cell_id`) as the spatial key in every refined table; consider snapping MERRA-2 lat/lon to the lattice in trusted.
# MAGIC 2. Publish a month key (`YYYY-MM`) plus `period_start` and keep IMERG `imerg_run` / processing version in any series or trend output.
# MAGIC 3. Choose the analysis window per question (e.g. 2024-01..2026-09 for MERRA-2 + GRACE + sea ice) instead of a global intersection, which is empty.
# MAGIC 4. Pre-aggregate MODIS to the MERRA-2 grid with pixel-count weights before using it with other sources.