# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Opposing regional trends in temperature indicators
# MAGIC
# MAGIC Which of the 14 MERRA-2 temperature indicators show robust increasing trends in some regions and robust decreasing trends in others? Uses `earth-trend-data.data_grid.tb_trend_grid_cell_id_merra2_temperatura` (deseasonalized trends, 2024-01..2026-09). "Robust" means `is_significant_fdr` (q < 0.05 across all cells); nominal p < 0.05 is shown for context only. The window is short, so these are interannual patterns, not climate trends.

# COMMAND ----------

# DBTITLE 1,Area with robust increase vs decrease per indicator
# MAGIC %sql
# MAGIC -- Share of Earth's area (ok cells) with robust (FDR) and nominal increasing/decreasing trends
# MAGIC SELECT t.indicator,
# MAGIC   round(100 * sum(CASE WHEN is_significant_fdr AND slope_per_year > 0 THEN g.area_weight END) / sum(g.area_weight), 2) AS pct_area_increase_fdr,
# MAGIC   round(100 * sum(CASE WHEN is_significant_fdr AND slope_per_year < 0 THEN g.area_weight END) / sum(g.area_weight), 2) AS pct_area_decrease_fdr,
# MAGIC   round(100 * sum(CASE WHEN is_significant AND slope_per_year > 0 THEN g.area_weight END) / sum(g.area_weight), 2) AS pct_area_increase_p05,
# MAGIC   round(100 * sum(CASE WHEN is_significant AND slope_per_year < 0 THEN g.area_weight END) / sum(g.area_weight), 2) AS pct_area_decrease_p05,
# MAGIC   round(max(CASE WHEN is_significant_fdr THEN slope_per_year END), 3) AS max_robust_slope_per_year,
# MAGIC   round(min(CASE WHEN is_significant_fdr THEN slope_per_year END), 3) AS min_robust_slope_per_year,
# MAGIC   CASE WHEN coalesce(sum(CASE WHEN is_significant_fdr AND slope_per_year > 0 THEN g.area_weight END), 0) / sum(g.area_weight) >= 0.005
# MAGIC         AND coalesce(sum(CASE WHEN is_significant_fdr AND slope_per_year < 0 THEN g.area_weight END), 0) / sum(g.area_weight) >= 0.005
# MAGIC        THEN 'mixed (both >= 0.5% of area)' ELSE 'one-sided or none' END AS pattern
# MAGIC FROM `earth-trend-data`.data_grid.tb_trend_grid_cell_id_merra2_temperatura t
# MAGIC JOIN `earth-trend-data`.refined.tb_dim_grid_0p5x0p625 g USING (grid_cell_id)
# MAGIC WHERE t.status = 'ok'
# MAGIC GROUP BY t.indicator
# MAGIC ORDER BY pattern, least(pct_area_increase_fdr, pct_area_decrease_fdr) DESC NULLS LAST

# COMMAND ----------

# DBTITLE 1,Maps of robust increase vs decrease
from pyspark.sql import functions as F
import numpy as np, matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

TREND = "`earth-trend-data`.data_grid.tb_trend_grid_cell_id_merra2_temperatura"
GRID  = "`earth-trend-data`.refined.tb_dim_grid_0p5x0p625"
SHOW = [("TS_C", "Surface skin temperature"), ("T2M", "Air temperature 2 m"), ("T2MDEW", "Dew point 2 m"),
        ("T850", "850 hPa"), ("T500", "500 hPa"), ("TSTAR", "Surface temperature scale (TSTAR)")]

pdf = (spark.table(TREND).where(F.col("indicator").isin([s for s, _ in SHOW]))
       .join(spark.table(GRID).select("grid_cell_id", "lat_idx", "lon_idx"), "grid_cell_id")
       .select("indicator", "lat_idx", "lon_idx", "status", "slope_per_year", "is_significant_fdr")
       .toPandas())

# -1 robust decrease, 0 no robust trend, +1 robust increase, NaN insufficient data
pdf["cls"] = np.where(pdf["status"] != "ok", np.nan,
              np.where(pdf["is_significant_fdr"] == True, np.sign(pdf["slope_per_year"]), 0.0))
cmap = ListedColormap(["#2166ac", "#eeeeee", "#b2182b"])

fig, axes = plt.subplots(3, 2, figsize=(18, 13))
for ax, (ind, label) in zip(axes.ravel(), SHOW):
    d = pdf[pdf["indicator"] == ind]
    a = np.full((361, 576), np.nan)
    a[d["lat_idx"], d["lon_idx"]] = d["cls"]
    im = ax.imshow(a, origin="lower", extent=[-180.3125, 179.6875, -90.25, 90.25], cmap=cmap, vmin=-1.5, vmax=1.5)
    ax.set_title(f"{ind} - {label}: robust trends (FDR q<0.05)", fontsize=10)
    ax.set_xlabel("Longitude"); ax.set_ylabel("Latitude"); ax.grid(alpha=0.2)
cb = fig.colorbar(im, ax=axes, ticks=[-1, 0, 1], fraction=0.02)
cb.ax.set_yticklabels(["decrease", "no robust trend", "increase"])
plt.show()

# COMMAND ----------

# DBTITLE 1,Hotspot boxes: where the opposing trends are
# MAGIC %sql
# MAGIC -- 10 x 20 degree boxes where >= 20% of the box area has a robust trend, for indicators with mixed patterns
# MAGIC WITH c AS (
# MAGIC   SELECT t.indicator, g.area_weight, t.slope_per_year, t.is_significant_fdr,
# MAGIC     floor(g.latitude / 10) * 10 AS lat0, floor(g.longitude / 20) * 20 AS lon0
# MAGIC   FROM `earth-trend-data`.data_grid.tb_trend_grid_cell_id_merra2_temperatura t
# MAGIC   JOIN `earth-trend-data`.refined.tb_dim_grid_0p5x0p625 g USING (grid_cell_id)
# MAGIC   WHERE t.status = 'ok' AND t.indicator IN ('TS_C', 'T2M', 'T2MDEW', 'T850', 'TSTAR')
# MAGIC ), b AS (
# MAGIC   SELECT indicator, lat0, lon0,
# MAGIC     100 * sum(CASE WHEN is_significant_fdr AND slope_per_year > 0 THEN area_weight ELSE 0 END) / sum(area_weight) AS pct_increase,
# MAGIC     100 * sum(CASE WHEN is_significant_fdr AND slope_per_year < 0 THEN area_weight ELSE 0 END) / sum(area_weight) AS pct_decrease,
# MAGIC     avg(CASE WHEN is_significant_fdr THEN slope_per_year END) AS mean_robust_slope
# MAGIC   FROM c GROUP BY indicator, lat0, lon0
# MAGIC )
# MAGIC SELECT indicator,
# MAGIC   CASE WHEN pct_increase > pct_decrease THEN 'increase' ELSE 'decrease' END AS direction,
# MAGIC   concat(cast(lat0 AS INT), '..', cast(lat0 + 10 AS INT), ' lat / ', cast(lon0 AS INT), '..', cast(lon0 + 20 AS INT), ' lon') AS box,
# MAGIC   round(greatest(pct_increase, pct_decrease), 1) AS pct_box_area_robust,
# MAGIC   round(mean_robust_slope, 3) AS mean_robust_slope_per_year
# MAGIC FROM b
# MAGIC WHERE greatest(pct_increase, pct_decrease) >= 20
# MAGIC ORDER BY indicator, direction, pct_box_area_robust DESC

# COMMAND ----------

# DBTITLE 1,Findings
# MAGIC %md
# MAGIC ## Findings
# MAGIC
# MAGIC **Mixed patterns (robust increase and robust decrease both present):** surface and near-surface indicators.
# MAGIC
# MAGIC | Indicator | Area robust increase | Area robust decrease | Strongest robust (K/yr) |
# MAGIC | --- | --- | --- | --- |
# MAGIC | TS (surface skin) | 0.49% | 0.81% | +1.81 / −2.25 |
# MAGIC | T2M (air 2 m) | 0.84% | 1.81% | +1.52 / −1.85 |
# MAGIC | T2MDEW (dew point 2 m) | 0.91% | 1.69% | +3.22 / −1.82 |
# MAGIC
# MAGIC T10M, TLML and TSH (and T2MWET for dew point) behave like these since they are near-duplicates.
# MAGIC
# MAGIC **Mostly one-sided:** T850 (0.14% up vs 1.68% down), T500 (0.02% vs 6.14%) and T250 (0% vs 3.58%) are almost entirely robust cooling. TROPT and TSTAR have no meaningful robust area.
# MAGIC
# MAGIC **Where (10° × 20° boxes with ≥ 15% of area robust):**
# MAGIC * Increase: Central Asia / Kazakhstan (40–50°N, 60–80°E) in TS, T2M and T850 (+1.2 to +1.4 K/yr); southeast Pacific off Chile/Peru (20–40°S, 80–100°W) in T2M and dew point; South Atlantic (30–50°S); southern Africa in dew point (+1.5 to +2.0 K/yr, i.e. more humid).
# MAGIC * Decrease: Southern Ocean south of New Zealand/Pacific sector (50–70°S, 140–160°W); Caribbean and tropical Atlantic (10–20°N); Gulf of Guinea/Angola coast; western Indian Ocean (80% of the 0–10°S, 60–80°E box at 850 hPa); North Atlantic off North America (40–50°N).
# MAGIC
# MAGIC **Interpretation and caveats.** Robust areas are small (≤ 2% per direction at the surface) because the window is only 33 months. The tropical-ocean cooling fits the post-2023/24 El Niño relaxation; the Central Asia warming is a regional anomaly in this window. MERRA-2 is a reanalysis, and none of this is a long-term climate trend or a causal attribution.

# COMMAND ----------

# DBTITLE 1,Trend direction and significance map
from pyspark.sql import functions as F
import numpy as np, matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from matplotlib.patches import Patch

INDICATOR = "TS_C"                  # any short code in the trend table
SIG_COL   = "is_significant_fdr"    # robust (FDR q<0.05); use "is_significant" for nominal p<0.05

TREND = "`earth-trend-data`.data_grid.tb_trend_grid_cell_id_merra2_temperatura"
GRID  = "`earth-trend-data`.refined.tb_dim_grid_0p5x0p625"

m = (spark.table(TREND).where(F.col("indicator") == INDICATOR)
     .join(spark.table(GRID).select("grid_cell_id", "lat_idx", "lon_idx", "area_weight"), "grid_cell_id")
     .select("lat_idx", "lon_idx", "area_weight", "status", "slope_per_year", F.col(SIG_COL).alias("sig"))
     .toPandas())

# 0 = decrease significant, 1 = decrease n.s., 2 = increase n.s., 3 = increase significant, NaN = insufficient data
up  = m["slope_per_year"] > 0
sig = m["sig"] == True
m["cls"] = np.select([~up & sig, ~up & ~sig, up & ~sig, up & sig], [0, 1, 2, 3]).astype(float)
m.loc[m["status"] != "ok", "cls"] = np.nan

grid_arr = np.full((361, 576), np.nan)
grid_arr[m["lat_idx"], m["lon_idx"]] = m["cls"]

colors = ["#08306b", "#9ecae1", "#fcae91", "#99000d"]   # strong blue, light blue, light red, dark red
labels = ["Decrease, significant", "Decrease, not significant", "Increase, not significant", "Increase, significant"]
ok = m["status"] == "ok"
shares = [100 * m.loc[ok & (m["cls"] == k), "area_weight"].sum() / m.loc[ok, "area_weight"].sum() for k in range(4)]

cmap = ListedColormap(colors); cmap.set_bad("#bdbdbd")
fig, ax = plt.subplots(figsize=(16, 8))
ax.imshow(np.ma.masked_invalid(grid_arr), origin="lower", extent=[-180.3125, 179.6875, -90.25, 90.25],
          cmap=cmap, vmin=-0.5, vmax=3.5, interpolation="nearest")
handles = [Patch(color=c, label=f"{l} ({s:.1f}% of area)") for c, l, s in zip(colors, labels, shares)]
if m["cls"].isna().any():
    handles.append(Patch(color="#bdbdbd", label="Insufficient data"))
ax.legend(handles=handles, loc="lower left", fontsize=9, framealpha=0.9)
sig_txt = "FDR q<0.05" if SIG_COL == "is_significant_fdr" else "p<0.05 (AR(1)-adjusted)"
ax.set_title(f"{INDICATOR}: deseasonalized trend direction, 2024-01..2026-09 (MERRA-2 reanalysis), significance = {sig_txt}")
ax.set_xlabel("Longitude"); ax.set_ylabel("Latitude")
ax.set_xticks(range(-180, 181, 30)); ax.set_yticks(range(-90, 91, 30)); ax.grid(alpha=0.25)
plt.tight_layout(); plt.show()