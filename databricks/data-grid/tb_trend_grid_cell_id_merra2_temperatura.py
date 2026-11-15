# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # tb_trend_grid_cell_id_merra2_temperatura
# MAGIC
# MAGIC Per-cell linear trend for each of the 14 MERRA-2 temperature indicators. Input: `earth-trend-data.data_grid.tb_agg_grid_cell_id_merra2_temperatura` (207,936 cells × 33 months, 2024-01..2026-09). Output: long table keyed by `(grid_cell_id, indicator)`.
# MAGIC
# MAGIC Method:
# MAGIC * Model per cell and indicator: `value = month-of-year mean + slope × t + error`, so the seasonal cycle cannot leak into the slope. The slope is computed exactly via within-month centring of `value` and `t` (Frisch–Waugh).
# MAGIC * Only non-null values are used; cells with fewer than 24 valid months get `status = 'insufficient_data'` and NULL statistics (for example, T850 where the 850 hPa level is below ground).
# MAGIC * Standard error and degrees of freedom are inflated for lag-1 autocorrelation of residuals (AR(1) effective sample size). Base residual dof = n − (months of year) − 1.
# MAGIC * Significance: `is_significant` uses the adjusted p-value < 0.05. `is_significant_fdr` additionally controls the false discovery rate across cells (Benjamini–Hochberg, per indicator).
# MAGIC * Slopes are reported per year in the indicator's native unit. 33 months is short: the slope describes this window only and mostly reflects interannual variability (for example, ENSO), not long-term climate change.

# COMMAND ----------

# DBTITLE 1,Build and write trend table
from pyspark.sql import functions as F, Window as W
import numpy as np
import pandas as pd
from scipy.stats import t as t_dist

CATALOG = "earth-trend-data"
SCHEMA  = "data_grid"
SOURCE  = f"`{CATALOG}`.{SCHEMA}.tb_agg_grid_cell_id_merra2_temperatura"
TARGET  = f"`{CATALOG}`.{SCHEMA}.tb_trend_grid_cell_id_merra2_temperatura"
ALPHA   = 0.05
MIN_OBS = 24      # minimum valid months to fit a trend
R1_MAX  = 0.95    # cap on lag-1 autocorrelation used for the inflation factor
METHOD  = ("OLS slope with month-of-year fixed effects (deseasonalized); "
           "AR(1)-adjusted SE and dof; Benjamini-Hochberg FDR per indicator")

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

src = spark.table(SOURCE)
MEAS = [c for c in src.columns if c not in ("grid_cell_id", "period_start")]
assert set(MEAS) == set(SHORT), "Column mismatch between source and SHORT map"
base_date = src.agg(F.min("period_start")).first()[0]

# --- long format, valid values only ---
long = (src.unpivot(["grid_cell_id", "period_start"], MEAS, "indicator_column", "value")
        .where(F.col("value").isNotNull() & ~F.isnan("value"))
        .withColumn("t", F.months_between("period_start", F.lit(base_date)).cast("int"))
        .withColumn("cal_month", F.month("period_start")))

# --- month-of-year fixed effects: centre value and t within (cell, indicator, month) ---
key = ["grid_cell_id", "indicator_column"]
w_month = W.partitionBy(*key, "cal_month")
dm = (long
      .withColumn("ya", F.col("value") - F.avg("value").over(w_month))
      .withColumn("tc", F.col("t") - F.avg("t").over(w_month)))

fit = (dm.groupBy(*key).agg(
          F.count("*").alias("n_obs"),
          F.countDistinct("cal_month").alias("n_months_of_year"),
          F.min("period_start").alias("first_period"),
          F.max("period_start").alias("last_period"),
          F.sum(F.col("tc") * F.col("ya")).alias("sxy"),
          F.sum(F.col("tc") * F.col("tc")).alias("sxx"),
          F.sum(F.col("ya") * F.col("ya")).alias("syy"))
       .withColumn("slope_per_month", F.when(F.col("sxx") > 0, F.col("sxy") / F.col("sxx"))))

# --- residuals: SSE and lag-1 autocorrelation over consecutive months ---
w_time = W.partitionBy(*key).orderBy("t")
consecutive = (F.col("t") - F.col("t_prev")) == 1
resid = (dm.join(fit.select(*key, "slope_per_month"), key)
           .withColumn("e", F.col("ya") - F.coalesce(F.col("slope_per_month"), F.lit(0.0)) * F.col("tc"))
           .withColumn("e_prev", F.lag("e").over(w_time))
           .withColumn("t_prev", F.lag("t").over(w_time))
           .groupBy(*key).agg(
               F.sum(F.col("e") * F.col("e")).alias("sse"),
               F.corr(F.when(consecutive, F.col("e")), F.when(consecutive, F.col("e_prev"))).alias("lag1_autocorr")))

# Cells x indicators with no valid values at all must still appear (as insufficient_data)
all_keys = (src.select("grid_cell_id").distinct()
               .crossJoin(spark.createDataFrame([(c,) for c in MEAS], "indicator_column string")))
stats = all_keys.join(fit, key, "left").join(resid, key, "left")

# --- inference on the driver (scipy t-distribution with per-row dof) ---
pdf = stats.toPandas()
pdf["n_obs"] = pdf["n_obs"].fillna(0).astype("int64")
pdf["n_months_of_year"] = pdf["n_months_of_year"].fillna(0).astype("int64")
df_base = pdf["n_obs"] - pdf["n_months_of_year"] - 1
ok = (pdf["n_obs"] >= MIN_OBS) & (pdf["sxx"] > 0) & (df_base > 2) & pdf["slope_per_month"].notna()

r1 = pdf["lag1_autocorr"].fillna(0.0).clip(lower=0.0, upper=R1_MAX)   # negative r1 -> no deflation
inflation = (1 + r1) / (1 - r1)
df_eff = np.maximum(df_base / inflation, 1.0)
se = np.sqrt((pdf["sse"] / df_base) * inflation / pdf["sxx"])
tstat = pdf["slope_per_month"] / se
pval = 2 * t_dist.sf(np.abs(tstat), df=df_eff)
tcrit = t_dist.ppf(1 - ALPHA / 2, df=df_eff)

span_months = (pd.to_datetime(pdf["last_period"]).dt.year * 12 + pd.to_datetime(pdf["last_period"]).dt.month
               - pd.to_datetime(pdf["first_period"]).dt.year * 12 - pd.to_datetime(pdf["first_period"]).dt.month)

out = pd.DataFrame({
    "grid_cell_id": pdf["grid_cell_id"].astype("int64"),
    "indicator": pdf["indicator_column"].map(SHORT),
    "indicator_column": pdf["indicator_column"],
    "unit": np.where(pdf["indicator_column"].str.endswith("_celsius"), "degC", "K"),
    "status": np.where(ok, "ok", "insufficient_data"),
    "first_period": pdf["first_period"],
    "last_period": pdf["last_period"],
    "n_obs": pdf["n_obs"],
    "n_months_of_year": pdf["n_months_of_year"],
    "lag1_autocorr": pdf["lag1_autocorr"].where(ok),
    "n_eff": (pdf["n_obs"] / inflation).where(ok),
    "df_eff": df_eff.where(ok),
    "slope_per_year": (pdf["slope_per_month"] * 12).where(ok),
    "slope_ci95_low_per_year": ((pdf["slope_per_month"] - tcrit * se) * 12).where(ok),
    "slope_ci95_high_per_year": ((pdf["slope_per_month"] + tcrit * se) * 12).where(ok),
    "change_over_period": (pdf["slope_per_month"] * span_months).where(ok),
    "r_squared_trend": (1 - pdf["sse"] / pdf["syy"]).where(ok & (pdf["syy"] > 0)),
    "t_statistic": tstat.where(ok),
    "p_value": pd.Series(pval, index=pdf.index).where(ok),
})

# Benjamini-Hochberg q-values per indicator (ok rows only)
def bh_qvalues(p: pd.Series) -> pd.Series:
    v = p.to_numpy(); n = len(v)
    order = np.argsort(v)
    ranked = v[order] * n / np.arange(1, n + 1)
    q = np.minimum.accumulate(ranked[::-1])[::-1].clip(max=1.0)
    res = np.empty(n); res[order] = q
    return pd.Series(res, index=p.index)

out["q_value_fdr"] = np.nan
mask = out["status"] == "ok"
out.loc[mask, "q_value_fdr"] = out[mask].groupby("indicator")["p_value"].transform(bh_qvalues)
out["alpha"] = ALPHA
out["is_significant"] = (out["p_value"] < ALPHA).where(mask)
out["is_significant_fdr"] = (out["q_value_fdr"] < ALPHA).where(mask)
sig = (out["is_significant"] == True).to_numpy()
out["trend_direction"] = np.select(
    [~mask.to_numpy(), sig & (out["slope_per_year"] > 0).to_numpy(), sig],
    ["insufficient data", "increasing", "decreasing"],
    default="no significant trend")
out["method"] = METHOD

# --- write (pandas NaN -> SQL NULL) ---
sdf = spark.createDataFrame(out)
double_cols = [f.name for f in sdf.schema.fields if f.dataType.typeName() == "double"]
sdf = sdf.select(*[F.when(F.isnan(c), None).otherwise(F.col(c)).alias(c) if c in double_cols else F.col(c)
                   for c in sdf.columns])
sdf = (sdf.withColumn("is_significant", F.col("is_significant").cast("boolean"))
          .withColumn("is_significant_fdr", F.col("is_significant_fdr").cast("boolean"))
          .withColumn("first_period", F.col("first_period").cast("date"))
          .withColumn("last_period", F.col("last_period").cast("date"))
          .withColumn("n_obs", F.col("n_obs").cast("int"))
          .withColumn("n_months_of_year", F.col("n_months_of_year").cast("int")))

(sdf.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(TARGET))

COMMENTS = {
    "grid_cell_id": "FK to refined.tb_dim_grid_0p5x0p625",
    "indicator": "Short code (T2M, TS, ...); joins to refined.tb_dim_indicators.short_code",
    "indicator_column": "Source column in data_grid.tb_agg_grid_cell_id_merra2_temperatura",
    "unit": "Native unit of the indicator (K or degC); slopes are in this unit per year",
    "status": "ok, or insufficient_data when fewer than 24 valid months (statistics NULL)",
    "n_obs": "Number of valid (non-null) monthly values used",
    "n_months_of_year": "Distinct calendar months present (seasonal fixed effects estimated)",
    "lag1_autocorr": "Lag-1 autocorrelation of deseasonalized residuals (consecutive months)",
    "n_eff": "Effective sample size n*(1-r1)/(1+r1), r1 clipped to [0, 0.95]",
    "df_eff": "Effective residual degrees of freedom used for the t-test",
    "slope_per_year": "Trend of deseasonalized values, unit per year (window 2024-01..2026-09 only)",
    "slope_ci95_low_per_year": "Lower 95% CI of slope_per_year (AR(1)-adjusted)",
    "slope_ci95_high_per_year": "Upper 95% CI of slope_per_year (AR(1)-adjusted)",
    "change_over_period": "slope x months between first_period and last_period (unit)",
    "r_squared_trend": "Share of deseasonalized variance explained by the linear trend",
    "t_statistic": "slope / AR(1)-adjusted standard error",
    "p_value": "Two-sided p-value, Student t with df_eff",
    "q_value_fdr": "Benjamini-Hochberg adjusted p-value across cells, per indicator",
    "is_significant": "p_value < alpha",
    "is_significant_fdr": "q_value_fdr < alpha (controls false discoveries across cells)",
    "trend_direction": "increasing, decreasing, no significant trend, or insufficient data (based on is_significant)",
}
for col, txt in COMMENTS.items():
    spark.sql(f"ALTER TABLE {TARGET} ALTER COLUMN {col} COMMENT '{txt}'")
spark.sql(f"COMMENT ON TABLE {TARGET} IS 'Per-cell deseasonalized linear trend for 14 MERRA-2 temperature indicators "
          f"(MERRA-2 reanalysis, 2024-01..2026-09). {METHOD}. Short window: describes interannual variability, not long-term climate trends.'")

# COMMAND ----------

# DBTITLE 1,Validate
written = spark.table(TARGET)
N_CELLS, N_IND = 207936, 14

# Shape and keys
assert written.count() == N_CELLS * N_IND
assert written.select("grid_cell_id", "indicator").distinct().count() == N_CELLS * N_IND
assert written.where("grid_cell_id IS NULL OR indicator IS NULL").count() == 0
assert set(r[0] for r in written.select("indicator").distinct().collect()) == set(SHORT.values())

# Status consistency
assert written.where("status = 'ok' AND (slope_per_year IS NULL OR p_value IS NULL OR q_value_fdr IS NULL)").count() == 0
assert written.where("status = 'insufficient_data' AND (slope_per_year IS NOT NULL OR p_value IS NOT NULL)").count() == 0
assert written.where("status = 'insufficient_data' AND n_obs >= 24").count() == 0
assert written.where("status = 'ok' AND (p_value < 0 OR p_value > 1 OR q_value_fdr < p_value - 1e-12)").count() == 0
assert written.where("status = 'ok' AND NOT (slope_ci95_low_per_year <= slope_per_year AND slope_per_year <= slope_ci95_high_per_year)").count() == 0
assert written.where("status = 'ok' AND is_significant AND slope_ci95_low_per_year * slope_ci95_high_per_year <= 0").count() == 0

# Independent check: numpy least squares with explicit month dummies + t on sample cells
sample_ids = [r[0] for r in written.where("indicator = 'TS_C' AND status = 'ok'")
              .select("grid_cell_id").orderBy(F.rand(7)).limit(40).collect()]
raw = (src.where(F.col("grid_cell_id").isin(sample_ids))
          .select("grid_cell_id", "period_start", F.col("surface_skin_temperature_celsius").alias("y")).toPandas())
exp = (written.where(F.col("grid_cell_id").isin(sample_ids) & (F.col("indicator") == "TS_C"))
              .select("grid_cell_id", "slope_per_year").toPandas().set_index("grid_cell_id")["slope_per_year"])
for gid, g in raw.groupby("grid_cell_id"):
    g = g.dropna().sort_values("period_start")
    ps = pd.to_datetime(g["period_start"])
    t = ((ps.dt.year - base_date.year) * 12 + ps.dt.month - base_date.month).to_numpy(float)
    X = np.column_stack([pd.get_dummies(ps.dt.month).to_numpy(float), t])
    beta = np.linalg.lstsq(X, g["y"].to_numpy(), rcond=None)[0]
    assert abs(beta[-1] * 12 - exp[gid]) < 1e-8, (gid, beta[-1] * 12, exp[gid])

# Known-answer check: the seasonal artifact must be gone. Pure seasonality + known slope -> recovered slope
rng = np.random.default_rng(0)
ps = pd.date_range(base_date, periods=33, freq="MS")
t = np.arange(33.0)
y = 15 * np.sin(2 * np.pi * (ps.month - 1) / 12) + 0.05 * t + rng.normal(0, 0.01, 33)  # 0.6 unit/year
X = np.column_stack([pd.get_dummies(ps.month).to_numpy(float), t])
assert abs(np.linalg.lstsq(X, y, rcond=None)[0][-1] * 12 - 0.6) < 0.01