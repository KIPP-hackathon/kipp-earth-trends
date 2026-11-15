# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Temperature climatology, anomalies and correlations
# MAGIC
# MAGIC Exploratory analysis of `earth-trend-data.data_grid.tb_agg_grid_cell_id_merra2_temperatura` (207,936 cells × 33 months). Computes per-cell calendar-month climatology, derives anomalies, and examines how the 14 temperature indicators relate to each other — both in raw values and after removing the seasonal cycle.

# COMMAND ----------

# DBTITLE 1,Load data and compute climatology + anomalies
from pyspark.sql import functions as F, Window as W
import pandas as pd, numpy as np, matplotlib.pyplot as plt

CATALOG = "earth-trend-data"
TABLE  = f"`{CATALOG}`.data_grid.tb_agg_grid_cell_id_merra2_temperatura"
GRID   = f"`{CATALOG}`.refined.tb_dim_grid_0p5x0p625"

src = spark.table(TABLE)
grid = spark.table(GRID).select("grid_cell_id", "latitude", "longitude", "area_weight")

# 14 measurement columns (everything except grid_cell_id and period_start)
MEAS = [c for c in src.columns if c not in ("grid_cell_id", "period_start")]

# --- Climatology: mean of each calendar month per cell (2-3 values per month) ---
clim_w = W.partitionBy("grid_cell_id", F.month("period_start"))

anom = src.select(
    "grid_cell_id", "period_start",
    F.month("period_start").alias("cal_month"),
    *[F.col(c) for c in MEAS],
    *[F.avg(c).over(clim_w).alias(f"{c}__clim") for c in MEAS],
).select(
    "grid_cell_id", "period_start", "cal_month",
    *[F.col(c) for c in MEAS],
    *[F.col(f"{c}__clim").alias(f"{c}__clim") for c in MEAS],
    *[(F.col(c) - F.col(f"{c}__clim")).alias(f"{c}__anom") for c in MEAS],
)

print(f"Rows: {src.count():,}  |  Indicators: {len(MEAS)}  |  Months: {src.select(F.countDistinct('period_start')).collect()[0][0]}")
print("Columns per indicator: raw, __clim (climatology), __anom (anomaly)")
print("Indicators:", MEAS)

# COMMAND ----------

# DBTITLE 1,Section: climatology quality
# MAGIC %md
# MAGIC ## 1. Climatology quality
# MAGIC
# MAGIC With only 33 months (Jan 2024 – Sep 2026), most calendar months have 2–3 values. Jan–Sep have 3 years; Oct–Dec only 2. The climatology is noisy, especially for Oct–Dec. Below: how many values feed each calendar month, and how much variance the climatology explains (area-weighted R² of raw vs climatology for `surface_skin_temperature_celsius`).

# COMMAND ----------

# DBTITLE 1,Calendar-month sample sizes and climatology R2
# Samples per calendar month
samples = (src.groupBy(F.month("period_start").alias("cal_month"))
           .agg(F.countDistinct("period_start").alias("n_years"))
           .orderBy("cal_month").toPandas())
print("Years per calendar month:")
print(samples.to_string(index=False))

# Area-weighted R2 of climatology for TS_C (how much of the variance is seasonal)
TS_C = "surface_skin_temperature_celsius"
r2_df = (anom.join(grid, "grid_cell_id")
         .groupBy("grid_cell_id", "area_weight")
         .agg(F.var_pop(TS_C).alias("var_total"),
              F.var_pop(f"{TS_C}__anom").alias("var_residual"))
         .withColumn("r2", 1 - F.col("var_residual") / F.col("var_total")))

r2_stats = r2_df.agg(
    (F.sum(F.col("r2") * F.col("area_weight")) / F.sum("area_weight")).alias("global_mean_r2"),
    F.percentile_approx("r2", 0.05).alias("r2_p05"),
    F.percentile_approx("r2", 0.50).alias("r2_p50"),
    F.percentile_approx("r2", 0.95).alias("r2_p95"),
).collect()[0]
print(f"\nClimatology R² for {TS_C} (fraction of variance explained by seasonal cycle):")
print(f"  Global area-weighted mean: {r2_stats.global_mean_r2:.3f}")
print(f"  Percentiles (p5/p50/p95): {r2_stats.r2_p05:.3f} / {r2_stats.r2_p50:.3f} / {r2_stats.r2_p95:.3f}")

# COMMAND ----------

# DBTITLE 1,Global area-weighted anomaly series
# Global area-weighted mean anomaly per month for the 5 core indicators
CORE = ["air_temperature_at_2_meters_kelvin", "air_temperature_at_10_meters_kelvin",
        "surface_skin_temperature_kelvin", "surface_skin_temperature_celsius",
        "air_temperature_at_10_meters_celsius"]
CORE_LABELS = ["T2M (K)", "T10M (K)", "TS (K)", "TS (°C)", "T10M (°C)"]

anom_g = anom.join(grid, "grid_cell_id")
parts = []
for c, lab in zip(CORE, CORE_LABELS):
    parts.append(
        anom_g.groupBy("period_start")
        .agg((F.sum(F.col(f"{c}__anom") * F.col("area_weight")) / F.sum("area_weight")).alias("anomaly"))
        .select("period_start", "anomaly", F.lit(lab).alias("indicator"))
    )
global_anom = parts[0]
for p in parts[1:]:
    global_anom = global_anom.unionByName(p)
global_pdf = global_anom.orderBy("indicator", "period_start").toPandas()

fig, ax = plt.subplots(figsize=(12, 4))
for lab in CORE_LABELS:
    s = global_pdf[global_pdf["indicator"] == lab]
    ax.plot(s["period_start"], s["anomaly"], marker="o", ms=3, label=lab)
ax.axhline(0, color="grey", lw=0.5)
ax.set_ylabel("Anomaly (unit of indicator)")
ax.set_title("Global area-weighted monthly anomaly (value − cell climatology)")
ax.legend(fontsize=8, ncol=3)
ax.grid(alpha=0.3)
plt.tight_layout()
plt.show()

# COMMAND ----------

# DBTITLE 1,Spatial map of TS anomaly for a recent month
# Map: TS_C anomaly for the most recent month
LAST_MONTH = src.select(F.max("period_start")).collect()[0][0]
map_df = (anom.where(F.col("period_start") == LAST_MONTH)
          .join(grid, "grid_cell_id")
          .select("latitude", "longitude", F.col(f"{TS_C}__anom").alias("anom"))
          .toPandas())

fig, ax = plt.subplots(figsize=(14, 5), subplot_kw={"projection": None})
sc = ax.scatter(map_df["longitude"], map_df["latitude"], c=map_df["anom"],
                s=0.3, cmap="RdBu_r", vmin=-5, vmax=5, rasterized=True)
ax.set_xlim(-180, 180); ax.set_ylim(-90, 90)
ax.set_xlabel("Longitude"); ax.set_ylabel("Latitude")
ax.set_title(f"Surface skin temperature anomaly (°C), {LAST_MONTH}")
fig.colorbar(sc, ax=ax, label="Anomaly (°C)", fraction=0.025)
plt.tight_layout()
plt.show()

# COMMAND ----------

# DBTITLE 1,Section: correlations between temperature indicators
# MAGIC %md
# MAGIC ## 2. Correlations between temperature indicators
# MAGIC
# MAGIC Two views:
# MAGIC * **Raw pooled** (area-weighted): dominated by geography and seasons — shows which pairs carry essentially the same spatial/seasonal information.
# MAGIC * **Anomaly pooled** (area-weighted): after removing the seasonal cycle per cell — shows which pairs still move together on interannual/sub-seasonal timescales.
# MAGIC
# MAGIC Then per-cell temporal correlation of selected pairs to see where they agree or diverge spatially.

# COMMAND ----------

# DBTITLE 1,Weighted correlation matrices: raw vs anomaly
SHORT = {
    "air_temperature_at_2_meters_kelvin": "T2M",
    "air_temperature_at_10_meters_kelvin": "T10M",
    "air_temperature_at_10_meters_celsius": "T10M_C",
    "surface_skin_temperature_kelvin": "TS",
    "surface_skin_temperature_celsius": "TS_C",
    "air_temperature_at_250_hpa_kelvin": "T250",
    "air_temperature_at_500_hpa_kelvin": "T500",
    "air_temperature_at_850_hpa_kelvin": "T850",
    "dew_point_temperature_at_2_meters_kelvin": "T2MDEW",
    "wet_bulb_temperature_at_2_meters_kelvin": "T2MWET",
    "tropopause_temperature_kelvin": "TROPT",
    "surface_air_temperature": "TLML",
    "effective_surface_skin_temperature": "TSH",
    "surface_temperature_scale": "TSTAR",
}
SHORT_NAMES = list(SHORT.values())

def weighted_corr(df, cols, weight_col="area_weight"):
    """Area-weighted Pearson r for all pairs, pairwise-complete, single agg pass."""
    aggs, pairs = [], []
    for i, a in enumerate(cols):
        for b in cols[i+1:]:
            m = F.col(a).isNotNull() & F.col(b).isNotNull()
            w = F.when(m, F.col(weight_col))
            x, y = F.when(m, F.col(a)), F.when(m, F.col(b))
            k = f"{a}__{b}"
            aggs += [F.sum(w).alias(f"{k}__sw"), F.sum(w*x).alias(f"{k}__sx"), F.sum(w*y).alias(f"{k}__sy"),
                     F.sum(w*x*x).alias(f"{k}__sxx"), F.sum(w*y*y).alias(f"{k}__syy"), F.sum(w*x*y).alias(f"{k}__sxy")]
            pairs.append((a, b))
    s = df.agg(*aggs).collect()[0].asDict()
    mat = pd.DataFrame(np.eye(len(cols)), index=cols, columns=cols)
    for a, b in pairs:
        k = f"{a}__{b}"; sw = s[f"{k}__sw"]
        if not sw: r = np.nan
        else:
            mx, my = s[f"{k}__sx"]/sw, s[f"{k}__sy"]/sw
            cov = s[f"{k}__sxy"]/sw - mx*my
            vx, vy = s[f"{k}__sxx"]/sw - mx**2, s[f"{k}__syy"]/sw - my**2
            r = cov / np.sqrt(vx*vy) if vx>0 and vy>0 else np.nan
        mat.loc[a,b] = mat.loc[b,a] = r
    return mat

joined = anom.join(grid, "grid_cell_id")

# Raw correlation
raw_corr = weighted_corr(joined, MEAS).rename(index=SHORT, columns=SHORT)

# Anomaly correlation
anom_cols = [f"{c}__anom" for c in MEAS]
anom_corr = weighted_corr(
    joined.select("area_weight", *[F.col(f"{c}__anom").alias(c) for c in MEAS]),
    MEAS
).rename(index=SHORT, columns=SHORT)

fig, axes = plt.subplots(1, 2, figsize=(18, 7))
for ax, (title, m) in zip(axes, [("Raw (geography + season)", raw_corr), ("Anomaly (seasonal cycle removed)", anom_corr)]):
    im = ax.imshow(m.values.astype(float), cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(m)), m.columns, rotation=45, ha="right", fontsize=8)
    ax.set_yticks(range(len(m)), m.index, fontsize=8)
    for i in range(len(m)):
        for j in range(len(m)):
            v = m.values[i,j]
            if not np.isnan(v):
                ax.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=6,
                        color="white" if abs(v)>0.6 else "black")
    ax.set_title(title, fontsize=10)
fig.colorbar(im, ax=axes, fraction=0.015)
fig.suptitle("Area-weighted Pearson correlation among 14 MERRA-2 temperature indicators", fontsize=11)
plt.tight_layout()
plt.show()

# COMMAND ----------

# DBTITLE 1,Sorted pair table: which are redundant, which diverge
# Pairs sorted by anomaly correlation (most to least redundant)
pairs = []
for i, a in enumerate(SHORT_NAMES):
    for b in SHORT_NAMES[i+1:]:
        pairs.append({"A": a, "B": b, "raw_r": raw_corr.loc[a,b], "anomaly_r": anom_corr.loc[a,b]})
pairs_pdf = (pd.DataFrame(pairs)
             .assign(abs_anom_r=lambda d: d["anomaly_r"].abs())
             .sort_values("abs_anom_r", ascending=False))

print("=== Most correlated (anomaly r > 0.8): nearly redundant ===")
display(pairs_pdf[pairs_pdf["abs_anom_r"] > 0.8].round(3))

print("\n=== Least correlated (anomaly |r| < 0.3): potentially complementary ===")
display(pairs_pdf[pairs_pdf["abs_anom_r"] < 0.3].round(3))

# COMMAND ----------

# DBTITLE 1,Per-cell temporal correlation of key pairs
# Per-cell temporal correlation (on anomalies) for selected pairs
KEY_PAIRS = [
    ("surface_skin_temperature_celsius", "air_temperature_at_2_meters_kelvin", "TS vs T2M"),
    ("surface_skin_temperature_celsius", "air_temperature_at_850_hpa_kelvin", "TS vs T850"),
    ("surface_skin_temperature_celsius", "tropopause_temperature_kelvin", "TS vs TROPT"),
    ("air_temperature_at_2_meters_kelvin", "dew_point_temperature_at_2_meters_kelvin", "T2M vs T2MDEW"),
    ("air_temperature_at_2_meters_kelvin", "surface_temperature_scale", "T2M vs TSTAR"),
]

corr_parts = []
for a, b, lab in KEY_PAIRS:
    corr_parts.append(
        anom.groupBy("grid_cell_id")
        .agg(F.corr(f"{a}__anom", f"{b}__anom").alias("r"),
             F.count(F.when(F.col(f"{a}__anom").isNotNull() & F.col(f"{b}__anom").isNotNull(), 1)).alias("n"))
        .where(F.col("n") >= 20)
        .select("grid_cell_id", "r", F.lit(lab).alias("pair"))
    )
cell_corr = corr_parts[0]
for p in corr_parts[1:]:
    cell_corr = cell_corr.unionByName(p)
cell_corr_pdf = cell_corr.join(grid, "grid_cell_id").toPandas()

fig, axes = plt.subplots(len(KEY_PAIRS), 1, figsize=(14, 3.2 * len(KEY_PAIRS)))
for ax, (_, _, lab) in zip(axes, KEY_PAIRS):
    sub = cell_corr_pdf[cell_corr_pdf["pair"] == lab]
    sc = ax.scatter(sub["longitude"], sub["latitude"], c=sub["r"],
                    s=0.2, cmap="RdBu_r", vmin=-1, vmax=1, rasterized=True)
    ax.set_xlim(-180, 180); ax.set_ylim(-90, 90)
    ax.set_title(f"{lab}  (per-cell anomaly r, n≥20)", fontsize=9)
    fig.colorbar(sc, ax=ax, fraction=0.02)
fig.suptitle("Per-cell temporal correlation of anomalies (33 months)", fontsize=11, y=1.01)
plt.tight_layout()
plt.show()

# COMMAND ----------

# DBTITLE 1,Histogram of per-cell r for TS vs T2M and TS vs TROPT
fig, axes = plt.subplots(1, 2, figsize=(12, 3.5))
for ax, lab in zip(axes, ["TS vs T2M", "TS vs TROPT"]):
    sub = cell_corr_pdf[cell_corr_pdf["pair"] == lab]
    ax.hist(sub["r"].dropna(), bins=80, edgecolor="none", alpha=0.8)
    ax.axvline(sub["r"].median(), color="red", ls="--", label=f"median={sub['r'].median():.2f}")
    ax.set_title(lab); ax.set_xlabel("Per-cell anomaly r"); ax.legend()
plt.tight_layout()
plt.show()

# COMMAND ----------

# DBTITLE 1,Findings
# MAGIC %md
# MAGIC ## Findings
# MAGIC
# MAGIC ### Climatology
# MAGIC * Jan–Sep have 3 values per calendar month; Oct–Dec only 2. The climatology is therefore noisier in Q4.
# MAGIC * Even so, the seasonal cycle explains **88.2%** of the variance of TS (°C) globally (area-weighted R²). At the median cell R² = 0.95; the 5th percentile is 0.64 (tropical ocean and desert cells with small annual range).
# MAGIC * The global anomaly series for the 5 core indicators (T2M, T10M, TS in K and °C) move almost identically month to month, confirming they are redundant at the global scale.
# MAGIC
# MAGIC ### Correlation between the 14 indicators
# MAGIC
# MAGIC **Nearly redundant (anomaly r > 0.8, 22 pairs):**
# MAGIC * T2M ≈ T10M ≈ T10M_C ≈ TLML (r 0.99–1.00): air temperature at different near-surface heights is the same signal.
# MAGIC * TS ≈ TS_C ≈ TSH (r 0.96–1.00): skin temperature and effective skin temperature are interchangeable.
# MAGIC * T2M ↔ TS (r 0.96): surface and 2 m air temperature track each other closely.
# MAGIC * T2MDEW ≈ T2MWET (r 1.00): dew point and wet bulb are nearly the same variable.
# MAGIC * **For the app:** one surface temperature (TS_C), one near-surface air temperature (T2M converted to °C), and one moisture proxy (T2MDEW) are enough. The others add no information.
# MAGIC
# MAGIC **Potentially complementary (anomaly |r| < 0.3, 33 pairs):**
# MAGIC * **TSTAR** (surface temperature scale) is nearly uncorrelated with everything in anomalies (|r| < 0.3 with T2M, T10M, T250, T500, T850, TLML, TROPT). It measures turbulent flux intensity, not absolute temperature.
# MAGIC * **TROPT** (tropopause temperature) is weakly anti-correlated with surface indicators (r ≈ −0.17 to −0.21) and weakly positive with T250 (r 0.17). It captures stratospheric dynamics, not the same signal as the troposphere.
# MAGIC * **T250** is uncorrelated with T500 and T850 in anomalies (r ≈ 0.00 to 0.13), even though raw values are correlated (r 0.88–0.92). The seasonal cycle creates the illusion of agreement; after removing it, upper and lower troposphere are independent at monthly scale.
# MAGIC
# MAGIC ### Spatial patterns (per-cell anomaly r)
# MAGIC * **TS vs T2M:** r > 0.9 almost everywhere; drops to 0.6–0.8 in polar sea-ice zones and some deserts where the skin–air decoupling is larger.
# MAGIC * **TS vs T850:** r 0.4–0.8 globally, lower in the tropics (convective decoupling) and higher in mid-latitudes.
# MAGIC * **TS vs TROPT:** weakly negative everywhere (r ≈ −0.1 to −0.4), with the strongest anti-correlation in mid-latitudes. The spatial map shows this is not noise — it is a coherent pattern.
# MAGIC * **T2M vs T2MDEW:** r 0.6–0.9 in most land areas, lower over the Sahara and Arabian Peninsula (dry air) where temperature can rise without the dew point following.
# MAGIC * **T2M vs TSTAR:** near zero almost everywhere, confirming TSTAR is a fundamentally different quantity.
# MAGIC
# MAGIC ### Recommendations for the app
# MAGIC 1. **Core indicators to expose:** TS_C (surface), T2M→°C (near-surface air), T2MDEW→°C (moisture proxy), T850→°C or T500→°C (mid-troposphere), TROPT→°C (stratosphere). These 4–5 cover independent dimensions.
# MAGIC 2. **Derived quantities worth pre-computing:** TS − T2M (skin–air gap), T850 − T250 (lapse rate / stability), T2M − T2MDEW (dew point depression ≈ dryness).
# MAGIC 3. **Climatology and anomalies** are ready to materialize per cell, but document that Oct–Dec use only 2 years.
# MAGIC 4. **TSTAR** is not useful as a user-facing temperature; keep it only if the app explains turbulent fluxes.