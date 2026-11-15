# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Surface skin temperature trend per region (tb_trend_merra2_ts)
# MAGIC
# MAGIC Trend tables are named `tb_trend_<source table suffix>`: this notebook reads `trusted.tb_merra2_ts` and writes `refined.tb_trend_merra2_ts`.
# MAGIC
# MAGIC Area-weighted regional monthly series of MERRA-2 surface skin temperature (TS, reanalysis), using `area_weight` from `refined.tb_dim_grid_0p5x0p625`. Rate of change and significance from Mann-Kendall, Seasonal Mann-Kendall, Sen's slope and OLS on monthly anomalies (with and without lag-1 autocorrelation adjustment). Output is long format: one row per region x method.

# COMMAND ----------

# DBTITLE 1,Configuration and regions
import numpy as np
import pandas as pd
from scipy import stats
from datetime import datetime, timezone
from pyspark.sql import functions as F

CATALOG = "earth-trend-data"
SOURCE_TABLE_NAME = "tb_merra2_ts"
SOURCE_TABLE = f"`{CATALOG}`.trusted.{SOURCE_TABLE_NAME}"
GRID_TABLE = f"`{CATALOG}`.refined.tb_dim_grid_0p5x0p625"
TABLE_NAME = "tb_trend_" + SOURCE_TABLE_NAME.removeprefix("tb_")
TARGET_TABLE = f"`{CATALOG}`.refined.{TABLE_NAME}"

VALUE_COL = "surface_skin_temperature_celsius"
VARIABLE = "surface_skin_temperature"
UNIT = "degC"
ALPHA = 0.05
SOURCE_DATASET = "NASA GMAO MERRA-2 M2TMNXSLV v5.12.4 (TS)"
DATA_TYPE = "reanalysis"  # not direct observations
AGGREGATION = "monthly mean, weighted by exact spherical cell area (tb_dim_grid_0p5x0p625.area_weight)"

# Grid definition used to compute join indices (source lat/lon carry float noise)
LAT0, DLAT = -90.0, 0.5
LON0, DLON, NLON = -180.0, 0.625, 576

# Regions on cell centers: latitude in [lat_min, lat_max), longitude in [lon_min, lon_max)
REGIONS = pd.DataFrame(
    [
        ("global", "Global", "bbox", -90.0, 90.01, -180.0, 180.0),
        ("tropics", "Tropics (23.5S-23.5N)", "lat_band", -23.5, 23.5, -180.0, 180.0),
        ("nh_extratropics", "NH extratropics (23.5N-66.5N)", "lat_band", 23.5, 66.5, -180.0, 180.0),
        ("sh_extratropics", "SH extratropics (66.5S-23.5S)", "lat_band", -66.5, -23.5, -180.0, 180.0),
        ("arctic", "Arctic (66.5N-90N)", "lat_band", 66.5, 90.01, -180.0, 180.0),
        ("antarctic", "Antarctic (90S-66.5S)", "lat_band", -90.0, -66.5, -180.0, 180.0),
        ("amazon_box", "Amazon box (20S-5N, 80W-45W)", "bbox", -20.0, 5.0, -80.0, -45.0),
    ],
    columns=["region_id", "region_name", "region_type", "lat_min", "lat_max", "lon_min", "lon_max"],
)


def with_grid_index(df, lat_col="latitude", lon_col="longitude"):
    """Same join rule as tb_dim_grid_0p5x0p625: never join on exact lat/lon equality."""
    return df.withColumns({
        "lat_idx": F.round((F.col(lat_col) - LAT0) / DLAT).cast("int"),
        "lon_idx": F.pmod(F.round((F.col(lon_col) - LON0) / DLON).cast("int"), F.lit(NLON)),
    })

# COMMAND ----------

# DBTITLE 1,Build area-weighted regional monthly series
regions_sdf = spark.createDataFrame(REGIONS)

cells_in_region = (
    spark.table(GRID_TABLE)
    .select("lat_idx", "lon_idx", "latitude", "longitude", "area_weight")
    .join(
        F.broadcast(regions_sdf),
        (F.col("latitude") >= F.col("lat_min")) & (F.col("latitude") < F.col("lat_max"))
        & (F.col("longitude") >= F.col("lon_min")) & (F.col("longitude") < F.col("lon_max")),
    )
    .select("region_id", "lat_idx", "lon_idx", "area_weight")
)

src = (
    with_grid_index(spark.table(SOURCE_TABLE))
    .select("lat_idx", "lon_idx", "time", F.col(VALUE_COL).alias("value"))
    .where(F.col("value").isNotNull())
)

series = (
    src.join(cells_in_region, ["lat_idx", "lon_idx"])
    .groupBy("region_id", "time")
    .agg(
        (F.sum(F.col("value") * F.col("area_weight")) / F.sum("area_weight")).alias("value"),
        F.count("*").alias("n_cells"),
    )
    .orderBy("region_id", "time")
    .toPandas()
)
series["time"] = pd.to_datetime(series["time"])
series["month"] = series["time"].dt.month
# Monthly anomaly relative to the period's own monthly climatology (baseline = full available period)
series["anomaly"] = series["value"] - series.groupby(["region_id", "month"])["value"].transform("mean")

# COMMAND ----------

# DBTITLE 1,Trend and significance test functions
def mk_s_var(x):
    """Mann-Kendall S statistic and variance (with tie correction)."""
    x = np.asarray(x, dtype=float)
    n = len(x)
    s = sum(np.sign(x[i + 1:] - x[i]).sum() for i in range(n - 1))
    _, c = np.unique(x, return_counts=True)
    var = (n * (n - 1) * (2 * n + 5) - np.sum(c * (c - 1) * (2 * c + 5))) / 18.0
    return float(s), float(var)


def mk_z_p(s, var):
    if var <= 0 or s == 0:
        return 0.0, 1.0
    z = (s - np.sign(s)) / np.sqrt(var)
    return float(z), float(2 * stats.norm.sf(abs(z)))


def month_index(t):
    return ((t.dt.year - t.dt.year.min()) * 12 + t.dt.month - 1).to_numpy(dtype=float)


def test_region(df):
    """Return a list of result dicts (one per method) for one regional series."""
    df = df.sort_values("time")
    t = month_index(df["time"])
    y = df["value"].to_numpy()
    a = df["anomaly"].to_numpy()
    n = len(y)
    out = []

    # 1) Mann-Kendall + Sen on RAW series (reference only: seasonal cycle not removed)
    s, v = mk_s_var(y); z, p = mk_z_p(s, v)
    sen = stats.theilslopes(y, t, alpha=1 - ALPHA)
    out.append(dict(method="mann_kendall_raw", statistic=s, z_score=z, tau=s / (n * (n - 1) / 2), p_value=p,
                    slope_per_month=sen.slope, ci_low=sen.low_slope, ci_high=sen.high_slope,
                    notes="Reference only: seasonal cycle not removed, slope is biased by the start/end months"))

    # 2) Seasonal Mann-Kendall (Hirsch) + seasonal Sen slope (within-month pairs)
    S = V = 0.0; slopes = []
    for _, g in df.groupby("month"):
        if len(g) < 2:
            continue
        s_m, v_m = mk_s_var(g["value"].to_numpy()); S += s_m; V += v_m
        yrs = g["time"].dt.year.to_numpy(); vals = g["value"].to_numpy()
        for i in range(len(vals) - 1):
            for j in range(i + 1, len(vals)):
                slopes.append((vals[j] - vals[i]) / (yrs[j] - yrs[i]) / 12.0)  # per month
    z, p = mk_z_p(S, V)
    out.append(dict(method="seasonal_mann_kendall", statistic=S, z_score=z, tau=np.nan, p_value=p,
                    slope_per_month=float(np.median(slopes)) if slopes else np.nan, ci_low=np.nan, ci_high=np.nan,
                    notes="Seasonal Sen slope; few years per calendar month -> low power"))

    # 3) Mann-Kendall + Sen slope on monthly ANOMALIES
    s, v = mk_s_var(a); z, p = mk_z_p(s, v)
    sen = stats.theilslopes(a, t, alpha=1 - ALPHA)
    out.append(dict(method="mann_kendall_sen_anomaly", statistic=s, z_score=z, tau=s / (n * (n - 1) / 2), p_value=p,
                    slope_per_month=sen.slope, ci_low=sen.low_slope, ci_high=sen.high_slope,
                    notes="Anomalies vs. monthly climatology of the same period"))

    # 4) OLS on anomalies, 95% CI (Student-t)
    lr = stats.linregress(t, a)
    tcrit = stats.t.ppf(1 - ALPHA / 2, n - 2)
    out.append(dict(method="ols_anomaly", statistic=lr.slope / lr.stderr, z_score=np.nan, tau=np.nan, p_value=lr.pvalue,
                    slope_per_month=lr.slope, ci_low=lr.slope - tcrit * lr.stderr, ci_high=lr.slope + tcrit * lr.stderr,
                    notes=f"t statistic, df={n - 2}; assumes independent residuals"))

    # 5) OLS on anomalies with lag-1 autocorrelation adjustment (effective sample size)
    resid = a - (lr.intercept + lr.slope * t)
    r1 = float(np.corrcoef(resid[:-1], resid[1:])[0, 1])
    n_eff = n * (1 - r1) / (1 + r1) if r1 > 0 else n
    if n_eff > 3:
        se_adj = lr.stderr * np.sqrt((n - 2) / (n_eff - 2))
        t_adj = lr.slope / se_adj
        p_adj = 2 * stats.t.sf(abs(t_adj), n_eff - 2)
        tc = stats.t.ppf(1 - ALPHA / 2, n_eff - 2)
        lo, hi = lr.slope - tc * se_adj, lr.slope + tc * se_adj
    else:
        t_adj = p_adj = lo = hi = np.nan
    out.append(dict(method="ols_anomaly_ar1", statistic=t_adj, z_score=np.nan, tau=np.nan, p_value=p_adj,
                    slope_per_month=lr.slope, ci_low=lo, ci_high=hi,
                    notes=f"Lag-1 autocorrelation r1={r1:.2f}, effective n={n_eff:.1f}"
                          + ("" if n_eff > 3 else "; too few effective samples, test not computed")))
    return out

# COMMAND ----------

# DBTITLE 1,Compute trend results (one row per region x method)
computed_at = datetime.now(timezone.utc)
regions_by_id = REGIONS.set_index("region_id")
rows = []
for rid, g in series.groupby("region_id"):
    reg = regions_by_id.loc[rid]
    for r in test_region(g):
        sig = bool(r["p_value"] < ALPHA) if pd.notna(r["p_value"]) else None
        rows.append(dict(
            region_id=rid, region_name=reg.region_name, region_type=reg.region_type,
            lat_min=float(reg.lat_min), lat_max=float(min(reg.lat_max, 90.0)),
            lon_min=float(reg.lon_min), lon_max=float(reg.lon_max),
            source_table=f"trusted.{SOURCE_TABLE_NAME}", variable=VARIABLE, unit=UNIT, aggregation=AGGREGATION,
            period_start=g["time"].min().date(), period_end=g["time"].max().date(), n_obs=int(len(g)),
            method=r["method"], statistic=float(r["statistic"]), z_score=float(r["z_score"]), tau=float(r["tau"]),
            slope_per_month=float(r["slope_per_month"]), slope_per_decade=float(r["slope_per_month"] * 120),
            slope_ci_low_per_decade=float(r["ci_low"] * 120), slope_ci_high_per_decade=float(r["ci_high"] * 120),
            p_value=float(r["p_value"]), alpha=ALPHA, is_significant=sig,
            trend_direction=("increasing" if r["slope_per_month"] > 0 else "decreasing") if sig else "no significant trend",
            source_dataset=SOURCE_DATASET, data_type=DATA_TYPE, notes=r["notes"], computed_at=computed_at,
        ))

TREND_SCHEMA = """
region_id STRING, region_name STRING, region_type STRING,
lat_min DOUBLE, lat_max DOUBLE, lon_min DOUBLE, lon_max DOUBLE,
source_table STRING, variable STRING, unit STRING, aggregation STRING,
period_start DATE, period_end DATE, n_obs INT,
method STRING, statistic DOUBLE, z_score DOUBLE, tau DOUBLE,
slope_per_month DOUBLE, slope_per_decade DOUBLE, slope_ci_low_per_decade DOUBLE, slope_ci_high_per_decade DOUBLE,
p_value DOUBLE, alpha DOUBLE, is_significant BOOLEAN, trend_direction STRING,
source_dataset STRING, data_type STRING, notes STRING, computed_at TIMESTAMP
"""
# NaN -> NULL so missing statistics are explicit in the table
trend_sdf = spark.createDataFrame(rows, schema=TREND_SCHEMA).replace(float("nan"), None)

# COMMAND ----------

# DBTITLE 1,Validate trend results
n_methods = 5
n_expected = len(REGIONS) * n_methods
validation = trend_sdf.agg(
    F.count("*").alias("n_rows"),
    F.countDistinct("region_id", "method").alias("n_keys"),
    F.min("n_obs").alias("min_obs"),
    F.sum(F.when((F.col("p_value") < 0) | (F.col("p_value") > 1), 1).otherwise(0)).alias("bad_p"),
).first()

assert set(series["region_id"]) == set(REGIONS["region_id"]), "Some region has no grid cells"
assert validation["n_rows"] == n_expected == validation["n_keys"], "Missing or duplicated region x method rows"
assert validation["min_obs"] >= 24, "Series shorter than 2 years"
assert validation["bad_p"] == 0, "p-values outside [0, 1]"

# COMMAND ----------

# DBTITLE 1,Write tb_trend_merra2_ts with comments
trend_sdf.createOrReplaceTempView(f"vw_{TABLE_NAME}")
spark.sql(f"""
CREATE OR REPLACE TABLE {TARGET_TABLE}
COMMENT 'Trend and significance of {VARIABLE} ({SOURCE_DATASET}, {DATA_TYPE}) per region, from trusted.{SOURCE_TABLE_NAME}. Long format: one row per region x method. Short record (about 33 months): results describe this period only, not long-term climate trends. Use seasonal_mann_kendall, mann_kendall_sen_anomaly or ols_anomaly_ar1 for interpretation; mann_kendall_raw is reference only.'
AS SELECT * FROM vw_{TABLE_NAME}
""")

COLUMN_COMMENTS = {
    "region_id": "Region key",
    "region_name": "Region display name",
    "region_type": "bbox or lat_band",
    "lat_min": "Region southern limit on cell centers (degrees, inclusive)",
    "lat_max": "Region northern limit on cell centers (degrees, exclusive except 90)",
    "lon_min": "Region western limit on cell centers (degrees, inclusive)",
    "lon_max": "Region eastern limit on cell centers (degrees, exclusive)",
    "source_table": "Source table of the input series",
    "variable": "Analyzed variable",
    "unit": "Unit of the variable and of the slopes (per month / per decade)",
    "aggregation": "How the regional monthly series was built",
    "period_start": "First month of the series",
    "period_end": "Last month of the series",
    "n_obs": "Number of monthly values",
    "method": "mann_kendall_raw, seasonal_mann_kendall, mann_kendall_sen_anomaly, ols_anomaly or ols_anomaly_ar1",
    "statistic": "Test statistic: Mann-Kendall S or OLS t",
    "z_score": "Normal score of the Mann-Kendall tests",
    "tau": "Kendall tau (Mann-Kendall tests on the full series)",
    "slope_per_month": "Trend slope in unit per month (Sen or OLS)",
    "slope_per_decade": "Trend slope in unit per decade (slope_per_month x 120)",
    "slope_ci_low_per_decade": "Lower bound of the slope confidence interval (1 - alpha), unit per decade",
    "slope_ci_high_per_decade": "Upper bound of the slope confidence interval (1 - alpha), unit per decade",
    "p_value": "Two-sided p-value; NULL when the test could not be computed",
    "alpha": "Significance level",
    "is_significant": "p_value < alpha; no multiple-comparison correction",
    "trend_direction": "increasing, decreasing or no significant trend",
    "source_dataset": "Product, collection and version",
    "data_type": "reanalysis, observation, satellite estimate or simulation",
    "notes": "Method caveats and diagnostics",
    "computed_at": "Computation timestamp (UTC)",
}
for col, comment in COLUMN_COMMENTS.items():
    spark.sql(f"ALTER TABLE {TARGET_TABLE} ALTER COLUMN {col} COMMENT '{comment}'")

assert spark.table(TARGET_TABLE).count() == n_expected, "Written table has an unexpected number of rows"

# COMMAND ----------

# DBTITLE 1,Method notes and limitations
# MAGIC %md
# MAGIC ## Method notes and limitations
# MAGIC
# MAGIC * **Data**: MERRA-2 M2TMNXSLV v5.12.4, variable TS (surface skin temperature), a **reanalysis** product, not direct observations. TS is not T2M (2 m air temperature).
# MAGIC * **Regional aggregation**: grid cells whose centers fall inside each box/band, weighted by exact spherical cell area from `tb_dim_grid_0p5x0p625`. A grid point is not a regional mean.
# MAGIC * **Seasonality**: `mann_kendall_raw` is kept only for reference. Use `seasonal_mann_kendall`, `mann_kendall_sen_anomaly` or `ols_anomaly_ar1` for interpretation.
# MAGIC * **Anomaly baseline**: monthly climatology of the same available period (no external baseline such as 1991-2020).
# MAGIC * **Period**: about 33 months (2024-01 to 2026-09). Not enough to infer long-term climate trends; results describe this period only. Absence of significance is an expected, valid result.
# MAGIC * **Multiple comparisons**: several regions x methods are tested; no correction (Bonferroni/FDR) is applied.
# MAGIC * Significance does not imply practical importance, causality or a forecast.

# COMMAND ----------

# DBTITLE 1,Drop all refined tables
# MAGIC %sql
# MAGIC SELECT * FROM `earth-trend-data`.trusted.tb_merra2_ts;