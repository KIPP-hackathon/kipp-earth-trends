# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Per-cell temperature trends: maps, significance and vertical structure
# MAGIC
# MAGIC Explores `earth-trend-data.data_grid.tb_trend_grid_cell_id_merra2_temperatura`: deseasonalized linear trends per grid cell for 14 MERRA-2 reanalysis temperature indicators over 2024-01..2026-09 (33 months). Covers where trends are significant, how much of that can be explained by chance (multiple testing), how trends vary with latitude and altitude, and what the underlying series look like. The window is short, so these trends describe interannual variability in this period, not long-term climate change.

# COMMAND ----------

# DBTITLE 1,Load trends joined to the grid
from pyspark.sql import functions as F
import numpy as np, pandas as pd, matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap, TwoSlopeNorm

CATALOG = "earth-trend-data"
TREND = f"`{CATALOG}`.data_grid.tb_trend_grid_cell_id_merra2_temperatura"
AGG   = f"`{CATALOG}`.data_grid.tb_agg_grid_cell_id_merra2_temperatura"
GRID  = f"`{CATALOG}`.refined.tb_dim_grid_0p5x0p625"
NLAT, NLON = 361, 576
EXTENT = [-180 - 0.3125, 180 - 0.3125, -90.25, 90.25]

# Non-redundant indicators (see the climatology/correlation EDA): surface, near-surface air, moisture, vertical levels
FOCUS = ["TS_C", "T2M", "T2MDEW", "T850", "T500", "T250", "TROPT"]
LABEL = {"TS_C": "Surface skin (TS)", "T2M": "Air 2 m (T2M)", "T2MDEW": "Dew point 2 m",
         "T850": "850 hPa", "T500": "500 hPa", "T250": "250 hPa", "TROPT": "Tropopause"}

grid = spark.table(GRID).select("grid_cell_id", "lat_idx", "lon_idx", "latitude", "longitude", "area_weight")
tr = (spark.table(TREND).where(F.col("indicator").isin(FOCUS)).join(grid, "grid_cell_id")
        .select("grid_cell_id", "indicator", "status", "lat_idx", "lon_idx", "latitude", "area_weight",
                "n_obs", "lag1_autocorr", "slope_per_year", "slope_ci95_low_per_year", "slope_ci95_high_per_year",
                "p_value", "q_value_fdr", "is_significant", "is_significant_fdr", "trend_direction"))
pdf = tr.toPandas()

def to_grid(df, col):
    a = np.full((NLAT, NLON), np.nan)
    a[df["lat_idx"].to_numpy(), df["lon_idx"].to_numpy()] = df[col].astype(float).to_numpy()
    return a

print(f"Rows loaded: {len(pdf):,} ({pdf['indicator'].nunique()} indicators)")
print(pdf.groupby("indicator")["status"].value_counts().unstack(fill_value=0))

# COMMAND ----------

# DBTITLE 1,Section: where are trends significant
# MAGIC %md
# MAGIC ## 1. Where are trends significant?
# MAGIC
# MAGIC Left: slope per year (K/yr; 1 K = 1 °C for differences). Right: classification. Grey = no significant trend; light colours = significant only at p < 0.05 (adjusted for autocorrelation); strong colours = also significant after controlling the false discovery rate across all cells (FDR, q < 0.05). Only the strong colours are robust to the fact that we test ~208k cells at once.

# COMMAND ----------

# DBTITLE 1,Slope and significance maps: TS and T2M
cls_cmap = ListedColormap(["#2166ac", "#92c5de", "#e0e0e0", "#f4a582", "#b2182b"])

def classify(df):
    c = np.zeros(len(df))                                   # 0 = not significant
    s = df["slope_per_year"].to_numpy()
    nom = df["is_significant"].fillna(False).to_numpy(bool)
    fdr = df["is_significant_fdr"].fillna(False).to_numpy(bool)
    c[nom & (s > 0)] = 1; c[nom & (s < 0)] = -1
    c[fdr & (s > 0)] = 2; c[fdr & (s < 0)] = -2
    c[df["status"].to_numpy() != "ok"] = np.nan
    return c

fig, axes = plt.subplots(2, 2, figsize=(18, 9))
for row, ind in zip(axes, ["TS_C", "T2M"]):
    d = pdf[pdf["indicator"] == ind].copy()
    d["cls"] = classify(d)
    im = row[0].imshow(to_grid(d, "slope_per_year"), origin="lower", extent=EXTENT, cmap="RdBu_r", vmin=-1, vmax=1)
    row[0].set_title(f"{LABEL[ind]}: slope (K/yr), 2024-01..2026-09")
    fig.colorbar(im, ax=row[0], fraction=0.025, label="K/yr")
    im2 = row[1].imshow(to_grid(d, "cls"), origin="lower", extent=EXTENT, cmap=cls_cmap, vmin=-2.5, vmax=2.5)
    row[1].set_title(f"{LABEL[ind]}: significance class")
    cb = fig.colorbar(im2, ax=row[1], fraction=0.025, ticks=[-2, -1, 0, 1, 2])
    cb.ax.set_yticklabels(["cooling (FDR)", "cooling (p<.05)", "n.s.", "warming (p<.05)", "warming (FDR)"])
    for ax in row:
        ax.set_xlabel("Longitude"); ax.set_ylabel("Latitude")
plt.tight_layout(); plt.show()

# COMMAND ----------

# DBTITLE 1,Share of significant area by indicator
def area_share(g):
    ok = g[g["status"] == "ok"]; w = ok["area_weight"]; s = ok["slope_per_year"]
    sig = ok["is_significant"].astype(bool); fdr = ok["is_significant_fdr"].astype(bool)
    return pd.Series({
        "cells_ok": len(ok),
        "area_weighted_mean_slope_K_per_yr": (s * w).sum() / w.sum(),
        "area_warming_p05_pct": 100 * w[sig & (s > 0)].sum() / w.sum(),
        "area_cooling_p05_pct": 100 * w[sig & (s < 0)].sum() / w.sum(),
        "area_warming_fdr_pct": 100 * w[fdr & (s > 0)].sum() / w.sum(),
        "area_cooling_fdr_pct": 100 * w[fdr & (s < 0)].sum() / w.sum(),
        "median_lag1_autocorr": ok["lag1_autocorr"].median(),
    })

share = pdf.groupby("indicator").apply(area_share).loc[FOCUS].round(3)
display(share.reset_index())

# COMMAND ----------

# DBTITLE 1,Section: how much is chance
# MAGIC %md
# MAGIC ## 2. How much of this could be chance?
# MAGIC
# MAGIC If there were no trend anywhere, p-values would be uniformly distributed and about 5% of cells would fall below 0.05 by chance. An excess of small p-values indicates real signal; the FDR step keeps only cells where that excess is strong enough. Neighbouring cells are strongly correlated, so significant cells come in coherent regions rather than independent discoveries.

# COMMAND ----------

# DBTITLE 1,P-value histograms vs uniform
fig, axes = plt.subplots(1, len(FOCUS), figsize=(22, 3.2), sharey=True)
bins = np.linspace(0, 1, 21)
for ax, ind in zip(axes, FOCUS):
    p = pdf.loc[(pdf["indicator"] == ind) & (pdf["status"] == "ok"), "p_value"]
    ax.hist(p, bins=bins, density=True, color="#4c72b0", alpha=0.85)
    ax.axhline(1.0, color="red", ls="--", lw=1, label="uniform (no trend)")
    ax.set_title(f"{LABEL[ind]}\n{(p < 0.05).mean()*100:.1f}% with p<0.05", fontsize=9)
    ax.set_xlabel("p-value")
axes[0].set_ylabel("density"); axes[0].legend(fontsize=7)
plt.tight_layout(); plt.show()

# COMMAND ----------

# DBTITLE 1,Section: latitude and altitude
# MAGIC %md
# MAGIC ## 3. How do trends vary with latitude and altitude?
# MAGIC
# MAGIC Zonal (latitude-band) area-weighted mean slope for each level, from the surface up to the tropopause. Shading shows the 25th–75th percentile of cell slopes within each 5° band.

# COMMAND ----------

# DBTITLE 1,Zonal mean slope profiles and latitude-level heatmap
pdf["lat_band"] = (np.floor(pdf["latitude"] / 5) * 5 + 2.5).clip(-87.5, 87.5)
ok = pdf[pdf["status"] == "ok"]

def zonal(g):
    w = g["area_weight"]; s = g["slope_per_year"]
    return pd.Series({"mean": (s * w).sum() / w.sum(), "p25": s.quantile(0.25), "p75": s.quantile(0.75)})
zon = ok.groupby(["indicator", "lat_band"]).apply(zonal).reset_index()

LEVELS = ["T2M", "T850", "T500", "T250", "TROPT"]
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 5), gridspec_kw={"width_ratios": [1.3, 1]})
for ind in LEVELS + ["TS_C"]:
    z = zon[zon["indicator"] == ind]
    ax1.plot(z["lat_band"], z["mean"], label=LABEL[ind], lw=1.8, ls="--" if ind == "TS_C" else "-")
    ax1.fill_between(z["lat_band"], z["p25"], z["p75"], alpha=0.08)
ax1.axhline(0, color="grey", lw=0.6)
ax1.set_xlabel("Latitude band centre"); ax1.set_ylabel("Area-weighted mean slope (K/yr)")
ax1.set_title("Zonal mean trend by level"); ax1.legend(fontsize=8); ax1.grid(alpha=0.3)

heat = zon[zon["indicator"].isin(LEVELS)].pivot(index="indicator", columns="lat_band", values="mean").loc[LEVELS[::-1]]
lim = np.nanmax(np.abs(heat.values))
im = ax2.imshow(heat.values, aspect="auto", cmap="RdBu_r", norm=TwoSlopeNorm(0, -lim, lim),
                extent=[-90, 90, -0.5, len(LEVELS) - 0.5])
ax2.set_yticks(range(len(LEVELS)), [LABEL[i] for i in LEVELS])
ax2.set_xlabel("Latitude"); ax2.set_title("Zonal mean trend: latitude x level (K/yr)")
fig.colorbar(im, ax=ax2, fraction=0.04)
plt.tight_layout(); plt.show()

# COMMAND ----------

# DBTITLE 1,Section: example series
# MAGIC %md
# MAGIC ## 4. What do the underlying series look like?
# MAGIC
# MAGIC For a few cells — the strongest FDR-significant warming and cooling for surface skin temperature, plus São Paulo as a familiar reference — the raw monthly series (with seasonal cycle), the deseasonalized anomaly, and the fitted trend line from the table.

# COMMAND ----------

# DBTITLE 1,Raw series, anomalies and fitted trend for example cells
ts = pdf[(pdf["indicator"] == "TS_C") & (pdf["status"] == "ok")]
fdr_cells = ts[ts["is_significant_fdr"].astype(bool)]
picks = {}
if len(fdr_cells):
    picks["Strongest significant warming"] = int(fdr_cells.loc[fdr_cells["slope_per_year"].idxmax(), "grid_cell_id"])
    picks["Strongest significant cooling"] = int(fdr_cells.loc[fdr_cells["slope_per_year"].idxmin(), "grid_cell_id"])
sp_lat, sp_lon = -23.55, -46.63   # Sao Paulo
picks["Sao Paulo (reference)"] = int(round((sp_lat + 90) / 0.5)) * NLON + int(round((sp_lon + 180) / 0.625)) % NLON

ser = (spark.table(AGG).where(F.col("grid_cell_id").isin(list(picks.values())))
          .select("grid_cell_id", "period_start", F.col("surface_skin_temperature_celsius").alias("y"))
          .join(grid.select("grid_cell_id", "latitude", "longitude"), "grid_cell_id").toPandas())
ser["period_start"] = pd.to_datetime(ser["period_start"])
ser = ser.sort_values("period_start")

fig, axes = plt.subplots(len(picks), 2, figsize=(16, 3.3 * len(picks)), squeeze=False)
for (name, gid), (a1, a2) in zip(picks.items(), axes):
    g = ser[ser["grid_cell_id"] == gid].copy()
    row = ts[ts["grid_cell_id"] == gid].iloc[0]
    m = g["period_start"].dt.month
    g["anom"] = g["y"] - g.groupby(m)["y"].transform("mean")
    t = (g["period_start"].dt.year - 2024) * 12 + g["period_start"].dt.month - 1
    tc = t - t.groupby(m).transform("mean")
    a1.plot(g["period_start"], g["y"], marker="o", ms=3)
    a1.set_title(f"{name}: lat {g['latitude'].iloc[0]:.1f}, lon {g['longitude'].iloc[0]:.2f} - raw TS (degC)", fontsize=9)
    a2.bar(g["period_start"], g["anom"], width=20, color=np.where(g["anom"] > 0, "#d6604d", "#4393c3"))
    a2.plot(g["period_start"], row["slope_per_year"] / 12 * tc, color="k", lw=2, label="fitted trend")
    a2.set_title(f"Deseasonalized anomaly | slope {row['slope_per_year']:+.2f} K/yr "
                 f"[{row['slope_ci95_low_per_year']:+.2f}, {row['slope_ci95_high_per_year']:+.2f}], "
                 f"p={row['p_value']:.3g}, q={row['q_value_fdr']:.3g}", fontsize=9)
    a2.axhline(0, color="grey", lw=0.5); a2.legend(fontsize=8)
plt.tight_layout(); plt.show()

# COMMAND ----------

# DBTITLE 1,Findings
# MAGIC %md
# MAGIC ## Findings
# MAGIC
# MAGIC Source: MERRA-2 reanalysis (a model-data product, not direct observations), 2024-01..2026-09. Slopes are deseasonalized and in K/yr.
# MAGIC
# MAGIC **Overall direction.** Every level shows a small area-weighted cooling over this window: TS −0.036, T2M −0.059, dew point −0.074, 850 hPa −0.132, 500 hPa −0.274, 250 hPa −0.273, tropopause −0.245 K/yr. The signal is concentrated in the tropics (median TS slope −0.134 K/yr vs about ±0.005 in both extratropical bands) and is stronger aloft than at the surface. This matches a post-El Niño (2023–24) relaxation, i.e. interannual variability, and must not be read as a climate trend.
# MAGIC
# MAGIC **Significance and chance.**
# MAGIC * With an autocorrelation-adjusted p < 0.05, 7–24% of the area is "significant" depending on the level (tropopause 6.8%, TS 13.1%, T2M 15.2%, T500 24.0%). Under no trend at all we would expect about 5%, so there is real signal, but most of these cells are not robust.
# MAGIC * After FDR control the robust area shrinks to 1.3% (TS), 2.6% (T2M), 1.8% (T850), 6.2% (T500), 3.6% (T250) and 0% (tropopause). The mid-troposphere (500 hPa) has the most robust, almost entirely cooling, signal.
# MAGIC * For any user-facing map, use `is_significant_fdr` (or show nominal significance with a clear caveat).
# MAGIC
# MAGIC **Example cells (TS).**
# MAGIC * Strongest robust cooling: 37.5°N, 143.1°E (off Japan), −2.25 K/yr [−2.76, −1.74], q = 0.0004.
# MAGIC * Strongest robust warming: 63.5°N, 178.1°W (Bering Sea / Chukotka), +1.81 K/yr [0.90, 2.72], q = 0.048 (just under the threshold).
# MAGIC * São Paulo cell: −0.71 K/yr [−1.17, −0.25], nominal p = 0.004 but q = 0.15, so not robust once all cells are considered.
# MAGIC
# MAGIC **Data notes.** T850 is undefined where the 850 hPa level lies below ground (Antarctica, Tibet, Andes); 19,725 cells are `insufficient_data` and appear blank on maps. Median lag-1 autocorrelation of residuals ranges from 0.11 (500 hPa) to 0.42 (TS), which is why the adjusted tests are stricter than a naive OLS t-test.
# MAGIC
# MAGIC **Limitations.** 33 months gives about 20 residual degrees of freedom before the autocorrelation adjustment; confidence intervals are wide and slopes are sensitive to start and end months. Neighbouring cells are not independent, so significant regions should be read as coherent patterns, not as many separate findings. Per-year slopes should not be extrapolated to decades.