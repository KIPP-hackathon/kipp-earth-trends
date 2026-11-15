# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Why do regions at the same latitude show opposite surface temperature trends?
# MAGIC
# MAGIC Picks pairs of rectangular regions at the same latitude where the deseasonalized surface skin temperature trend (TS, 2024-01..2026-09, MERRA-2 reanalysis) goes up in one and down in the other, then checks which other MERRA-2 variables (clouds, surface solar flux, precipitation, humidity, heat fluxes, pressure, winds) change in a way that is consistent with that contrast. This is an exploratory, correlational analysis over 33 months; it suggests mechanisms but does not prove causality.

# COMMAND ----------

# DBTITLE 1,Region selection
# MAGIC %md
# MAGIC ## 1. Region pairs
# MAGIC
# MAGIC Candidates came from 10° × 20° boxes: for each latitude band, the boxes with the highest and lowest area-weighted mean TS slope (from `tb_trend_grid_cell_id_merra2_temperatura`).
# MAGIC
# MAGIC | Pair | Region | Lat | Lon | Mean TS slope (K/yr) | Area with robust trend (FDR) |
# MAGIC | --- | --- | --- | --- | --- | --- |
# MAGIC | A (40–50°N) | A+ Central Asia (Kazakhstan) | 40..50 | 60..80 | +0.98 | 18.3% up |
# MAGIC | A (40–50°N) | A− Eastern Europe / Black Sea | 40..50 | 20..40 | −0.83 | 0.2% down |
# MAGIC | B (20–30°S) | B+ Southeast Pacific off Chile | −30..−20 | −100..−80 | +0.51 | 13.9% up |
# MAGIC | B (20–30°S) | B− Southern Brazil / SW Atlantic | −30..−20 | −60..−40 | −0.37 | 1.1% down |
# MAGIC
# MAGIC Why these: pair A compares two mostly continental regions at the same latitude (a land-vs-land contrast, about 40° of longitude apart), and pair B compares the two sides of South America at the same latitude. The "down" boxes have weak cell-level significance, so the first check below is whether the contrast holds for the region-mean series. Edit `REGIONS` in the next cell to test other boxes.

# COMMAND ----------

# DBTITLE 1,Config and map of the regions
from pyspark.sql import functions as F
import numpy as np, pandas as pd, matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from matplotlib.patches import Patch, Rectangle
from scipy.stats import t as t_dist
from functools import reduce

CAT   = "`earth-trend-data`"
GRID  = f"{CAT}.refined.tb_dim_grid_0p5x0p625"
TREND = f"{CAT}.data_grid.tb_trend_grid_cell_id_merra2_temperatura"

REGIONS = {   # name: pair, (lat_min, lat_max), (lon_min, lon_max) -- half-open [min, max)
    "A+ Central Asia":                {"pair": "A (40-50N)", "lat": (40, 50),   "lon": (60, 80)},
    "A- Eastern Europe / Black Sea":  {"pair": "A (40-50N)", "lat": (40, 50),   "lon": (20, 40)},
    "B+ SE Pacific off Chile":        {"pair": "B (20-30S)", "lat": (-30, -20), "lon": (-100, -80)},
    "B- S Brazil / SW Atlantic":      {"pair": "B (20-30S)", "lat": (-30, -20), "lon": (-60, -40)},
}
REG_COLORS = {"A+ Central Asia": "#d62728", "A- Eastern Europe / Black Sea": "#1f77b4",
              "B+ SE Pacific off Chile": "#ff7f0e", "B- S Brazil / SW Atlantic": "#17becf"}

# Map: TS trend class (same 4-colour scheme as before) with the regions outlined
m = (spark.table(TREND).where("indicator = 'TS_C'")
     .join(spark.table(GRID).select("grid_cell_id", "lat_idx", "lon_idx"), "grid_cell_id")
     .select("lat_idx", "lon_idx", "slope_per_year", "is_significant_fdr").toPandas())
up, sig = m["slope_per_year"] > 0, m["is_significant_fdr"] == True
m["cls"] = np.select([~up & sig, ~up & ~sig, up & ~sig, up & sig], [0, 1, 2, 3])
arr = np.full((361, 576), np.nan); arr[m["lat_idx"], m["lon_idx"]] = m["cls"]

colors = ["#08306b", "#9ecae1", "#fcae91", "#99000d"]
fig, ax = plt.subplots(figsize=(16, 8))
ax.imshow(arr, origin="lower", extent=[-180.3125, 179.6875, -90.25, 90.25], cmap=ListedColormap(colors),
          vmin=-0.5, vmax=3.5, interpolation="nearest")
for name, r in REGIONS.items():
    (la0, la1), (lo0, lo1) = r["lat"], r["lon"]
    ax.add_patch(Rectangle((lo0, la0), lo1 - lo0, la1 - la0, fill=False, ec="black", lw=2.5))
    ax.text(lo0, la1 + 1.5, name, fontsize=9, weight="bold", bbox=dict(fc="white", alpha=0.8, lw=0))
ax.legend(handles=[Patch(color=c, label=l) for c, l in zip(colors, ["Decrease, significant (FDR)", "Decrease, n.s.",
          "Increase, n.s.", "Increase, significant (FDR)"])], loc="lower left", fontsize=9)
ax.set_title("TS deseasonalized trend 2024-01..2026-09 (MERRA-2) and the selected region pairs")
ax.set_xticks(range(-180, 181, 30)); ax.set_yticks(range(-90, 91, 30)); ax.grid(alpha=0.25)
plt.tight_layout(); plt.show()

# COMMAND ----------

# DBTITLE 1,Build area-weighted monthly series per region
# label -> (trusted table, SQL expression). Values are kept in native MERRA-2 units; trends are compared in
# standardized form (slope / std of deseasonalized anomaly), so unit conversions are not needed.
VARIABLES = {
    "TS skin temperature":        ("tb_merra2_temperatura", "surface_skin_temperature_celsius"),
    "T2M air temperature":        ("tb_merra2_temperatura", "air_temperature_at_2_meters_kelvin"),
    "Total cloud fraction":       ("tb_merra2_nuvens", "simulated_modis_cloud_fraction_total_mean"),
    "Low cloud fraction":         ("tb_merra2_nuvens", "simulated_modis_cloud_fraction_low_mean"),
    "Surface solar NIR (down)":   ("tb_merra2_fluxos", "surface_downwelling_nearinfrared_beam_flux + surface_downwelling_nearinfrared_diffuse_flux"),
    "Precipitation":              ("tb_merra2_fluxos", "bias_corrected_total_precipitation"),
    "Latent heat flux":           ("tb_merra2_fluxos", "total_latent_energy_flux"),
    "Sensible heat flux":         ("tb_merra2_fluxos", "sensible_heat_flux_from_turbulence"),
    "Snowfall":                   ("tb_merra2_fluxos", "snowfall"),
    "Specific humidity 2 m":      ("tb_merra2_umidade", "specific_humidity_at_2_meters_kilograms_per_kilogram"),
    "Column water vapour":        ("tb_merra2_umidade", "total_column_water_vapor_kilograms_per_square_meter"),
    "Sea level pressure":         ("tb_merra2_pressao_altura", "sea_level_pressure_pascals"),
    "Geopotential height 500 hPa":("tb_merra2_pressao_altura", "geopotential_height_at_500_hpa_meters"),
    "Eastward wind 850 hPa":      ("tb_merra2_vento", "eastward_wind_at_850_hpa_meters_per_second"),
    "Northward wind 850 hPa":     ("tb_merra2_vento", "northward_wind_at_850_hpa_meters_per_second"),
    "Surface wind speed":         ("tb_merra2_vento", "surface_wind_speed"),
}

grid = spark.table(GRID).select("lat_idx", "lon_idx", "latitude", "longitude", "area_weight")
reg_cells = reduce(lambda a, b: a.unionByName(b), [
    grid.where((F.col("latitude") >= r["lat"][0]) & (F.col("latitude") < r["lat"][1]) &
               (F.col("longitude") >= r["lon"][0]) & (F.col("longitude") < r["lon"][1]))
        .select("lat_idx", "lon_idx", "area_weight", F.lit(name).alias("region"))
    for name, r in REGIONS.items()])

parts = []
for table in sorted({t for t, _ in VARIABLES.values()}):
    vs = {lab: expr for lab, (t, expr) in VARIABLES.items() if t == table}
    src = (spark.table(f"{CAT}.trusted.{table}")
           .select(F.col("time").alias("period_start"),
                   F.round((F.col("latitude") + 90) / 0.5).cast("int").alias("lat_idx"),   # float-noise-safe keys
                   F.pmod(F.round((F.col("longitude") + 180) / 0.625).cast("int"), F.lit(576)).alias("lon_idx"),
                   *[F.expr(e).alias(f"v{i}") for i, e in enumerate(vs.values())]))
    j = src.join(F.broadcast(reg_cells), ["lat_idx", "lon_idx"])
    agg = j.groupBy("region", "period_start").agg(*[
        (F.sum(F.col(f"v{i}") * F.col("area_weight")) /
         F.sum(F.when(F.col(f"v{i}").isNotNull(), F.col("area_weight")))).alias(lab)
        for i, lab in enumerate(vs)])
    parts.append(agg.toPandas().melt(id_vars=["region", "period_start"], var_name="variable", value_name="value"))

series = pd.concat(parts, ignore_index=True)
series["period_start"] = pd.to_datetime(series["period_start"])
series = series.sort_values(["region", "variable", "period_start"]).reset_index(drop=True)

cov = series.groupby(["region", "variable"])["value"].agg(n_months="count")
print(f"Regional series: {len(series):,} rows, {series['variable'].nunique()} variables x {series['region'].nunique()} regions")
print("Months per series (min/max):", cov["n_months"].min(), "/", cov["n_months"].max())
print("Cells per region:", reg_cells.groupBy("region").count().toPandas().set_index("region")["count"].to_dict())

# COMMAND ----------

# DBTITLE 1,Region-mean TS trend: does the contrast hold?
def trend_stats(ps: pd.Series, y: pd.Series, alpha=0.05):
    """Deseasonalized OLS slope (month-of-year fixed effects) with AR(1)-adjusted SE/dof; same method as the trend table."""
    d = pd.DataFrame({"ps": ps.values, "y": y.values}).dropna().sort_values("ps")
    m = d["ps"].dt.month
    t = ((d["ps"].dt.year - 2024) * 12 + m - 1).astype(float)
    X = np.column_stack([pd.get_dummies(m).to_numpy(float), t])
    beta = np.linalg.lstsq(X, d["y"].to_numpy(), rcond=None)[0]
    e = d["y"].to_numpy() - X @ beta
    n, k = len(d), m.nunique(); dfb = n - k - 1
    tc = (t - t.groupby(m).transform("mean")).to_numpy()
    cons = np.diff(t.to_numpy()) == 1
    r1 = np.corrcoef(e[1:][cons], e[:-1][cons])[0, 1] if cons.sum() > 3 else 0.0
    r1 = float(np.clip(np.nan_to_num(r1), 0, 0.95)); infl = (1 + r1) / (1 - r1)
    se = np.sqrt((e @ e) / dfb * infl / (tc @ tc)); dfe = max(dfb / infl, 1.0)
    slope = beta[-1]; p = 2 * t_dist.sf(abs(slope / se), dfe); tc95 = t_dist.ppf(1 - alpha / 2, dfe)
    anom = d["y"] - d.groupby(m)["y"].transform("mean")
    return {"slope_per_year": slope * 12, "ci_low": (slope - tc95 * se) * 12, "ci_high": (slope + tc95 * se) * 12,
            "p_value": p, "lag1": r1, "anom_sd": anom.std(ddof=1), "n": n}

rows = []
for (reg, var), g in series.groupby(["region", "variable"]):
    rows.append({"region": reg, "pair": REGIONS[reg]["pair"], "variable": var, **trend_stats(g["period_start"], g["value"])})
stats = pd.DataFrame(rows)
stats["z_slope"] = stats["slope_per_year"] / stats["anom_sd"]   # trend in std-devs of monthly anomaly per year

# Cross-check: region-series slope must equal the area-weighted mean of cell slopes from the trend table
# (the estimator is linear in y and all cells share the same design when there are no gaps)
cell = (spark.table(TREND).where("indicator = 'TS_C' AND status = 'ok'")
        .join(spark.table(GRID).select("grid_cell_id", "lat_idx", "lon_idx"), "grid_cell_id")
        .join(reg_cells, ["lat_idx", "lon_idx"])
        .groupBy("region").agg((F.sum(F.col("slope_per_year") * F.col("area_weight")) / F.sum("area_weight")).alias("cell_mean"))
        .toPandas().set_index("region")["cell_mean"])
ts = stats[stats["variable"] == "TS skin temperature"].set_index("region")
for reg in REGIONS:
    assert abs(ts.loc[reg, "slope_per_year"] - cell[reg]) < 1e-6, (reg, ts.loc[reg, "slope_per_year"], cell[reg])

display(ts[["pair", "slope_per_year", "ci_low", "ci_high", "p_value", "lag1", "n"]].round(4).reset_index())

# COMMAND ----------

# DBTITLE 1,Which variables change consistently with the TS contrast?
# For each region and variable:
#   z_slope    = standardized trend of the variable
#   r_with_TS  = correlation of its deseasonalized monthly anomaly with the TS anomaly (does it track TS month to month?)
#   TS_implied = TS trend implied by this variable alone = (regression slope of TS anom on var anom) x var trend
def anomalies(g):
    m = g["period_start"].dt.month
    return (g.set_index("period_start")["value"] - g.groupby(m)["value"].transform("mean").values)

anom = {(reg, var): anomalies(g) for (reg, var), g in series.groupby(["region", "variable"])}
recs = []
for (reg, var), a in anom.items():
    ts_a = anom[(reg, "TS skin temperature")]
    jj = pd.concat([ts_a, a], axis=1, keys=["ts", "v"]).dropna()
    r = jj["ts"].corr(jj["v"]); b = np.polyfit(jj["v"], jj["ts"], 1)[0] if jj["v"].std() > 0 else np.nan
    s = stats[(stats["region"] == reg) & (stats["variable"] == var)].iloc[0]
    recs.append({"region": reg, "pair": REGIONS[reg]["pair"], "variable": var, "z_slope": s["z_slope"],
                 "p_value": s["p_value"], "r_with_TS": r, "TS_implied_K_per_yr": b * s["slope_per_year"]})
drv = pd.DataFrame(recs)

# Contrast per pair: does the variable's trend flip between the + and - region, and does it explain the TS gap?
out = []
for pair, g in drv.groupby("pair"):
    is_plus = g["region"].str[1] == "+"          # region names start with "<pair letter><+|->"
    plus, minus = g[is_plus].set_index("variable"), g[~is_plus].set_index("variable")
    ts_slope = stats[stats["variable"] == "TS skin temperature"].set_index("region")["slope_per_year"]
    gap = ts_slope[g[is_plus]["region"].iloc[0]] - ts_slope[g[~is_plus]["region"].iloc[0]]
    for var in plus.index:
        out.append({"pair": pair, "variable": var,
                    "z_slope_plus": plus.loc[var, "z_slope"], "z_slope_minus": minus.loc[var, "z_slope"],
                    "p_plus": plus.loc[var, "p_value"], "p_minus": minus.loc[var, "p_value"],
                    "r_TS_plus": plus.loc[var, "r_with_TS"], "r_TS_minus": minus.loc[var, "r_with_TS"],
                    "TS_gap_observed": gap,
                    "TS_gap_implied": plus.loc[var, "TS_implied_K_per_yr"] - minus.loc[var, "TS_implied_K_per_yr"]})
contrast = pd.DataFrame(out)
contrast["opposite_trends"] = np.sign(contrast["z_slope_plus"]) != np.sign(contrast["z_slope_minus"])
contrast["share_of_gap_implied"] = contrast["TS_gap_implied"] / contrast["TS_gap_observed"]
contrast = contrast[~contrast["variable"].isin(["TS skin temperature", "T2M air temperature"])]
contrast = contrast.sort_values(["pair", "share_of_gap_implied"], ascending=[True, False])
display(contrast.round(3))

# COMMAND ----------

# DBTITLE 1,Standardized trends per variable and region
fig, axes = plt.subplots(1, 2, figsize=(18, 7), sharey=True)
vars_order = [v for v in VARIABLES if v not in ("TS skin temperature",)]
for ax, pair in zip(axes, sorted(drv["pair"].unique())):
    regs = [r for r in REGIONS if REGIONS[r]["pair"] == pair]
    y = np.arange(len(vars_order)); h = 0.38
    for i, reg in enumerate(regs):
        d = drv[drv["region"] == reg].set_index("variable").loc[vars_order]
        bars = ax.barh(y + (i - 0.5) * h, d["z_slope"], height=h, color=REG_COLORS[reg], label=reg)
        for b, p in zip(bars, d["p_value"]):
            if p < 0.05:
                ax.text(b.get_width(), b.get_y() + h / 2, " *", va="center", fontsize=11, weight="bold")
    ax.axvline(0, color="grey", lw=0.8)
    ax.set_yticks(y, vars_order); ax.invert_yaxis()
    ax.set_title(f"Pair {pair}: standardized trend (anomaly SD per year); * p<0.05")
    ax.set_xlabel("z-slope"); ax.legend(fontsize=9, loc="lower right"); ax.grid(axis="x", alpha=0.3)
plt.tight_layout(); plt.show()

# COMMAND ----------

# DBTITLE 1,Anomaly series: TS vs the most consistent variables
# For each pair, the two variables with the largest implied share of the TS gap (and opposite trends in the two regions)
top = (contrast[contrast["opposite_trends"]].sort_values("share_of_gap_implied", ascending=False)
       .groupby("pair").head(2))
fig, axes = plt.subplots(len(REGIONS), 1, figsize=(15, 3.2 * len(REGIONS)), sharex=True)
for ax, reg in zip(axes, REGIONS):
    pair = REGIONS[reg]["pair"]
    ts_a = anom[(reg, "TS skin temperature")]
    ax.bar(ts_a.index, ts_a.values, width=20, color=np.where(ts_a.values > 0, "#d6604d", "#4393c3"), alpha=0.6, label="TS anomaly (K)")
    ax2 = ax.twinx()
    for var, ls in zip(top[top["pair"] == pair]["variable"], ["-", "--"]):
        a = anom[(reg, var)]
        ax2.plot(a.index, a / a.std(), color="k", ls=ls, lw=1.6, label=f"{var} (standardized)")
    ax.set_title(reg, fontsize=10); ax.set_ylabel("TS anom (K)"); ax2.set_ylabel("std. anom")
    h1, l1 = ax.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels()
    ax.legend(h1 + h2, l1 + l2, fontsize=8, loc="upper left")
    ax.axhline(0, color="grey", lw=0.5)
plt.tight_layout(); plt.show()

# COMMAND ----------

# DBTITLE 1,Findings
# MAGIC %md
# MAGIC ## Findings
# MAGIC
# MAGIC All values are MERRA-2 reanalysis, deseasonalized, 2024-01..2026-09. `z` = standardized trend (anomaly SD per year); `r` = correlation of the monthly anomaly with the TS anomaly; "share of gap" = part of the TS trend difference that a variable implies on its own. The shares overlap (the variables are correlated with each other), so they do not add up to 100%.
# MAGIC
# MAGIC **Does the contrast hold for the region mean?**
# MAGIC
# MAGIC | Region | TS slope (K/yr) | 95% CI | p |
# MAGIC | --- | --- | --- | --- |
# MAGIC | A+ Central Asia | +0.98 | [+0.51, +1.44] | < 0.001 |
# MAGIC | A− Eastern Europe / Black Sea | −0.83 | [−1.41, −0.25] | 0.008 |
# MAGIC | B+ SE Pacific off Chile | +0.51 | [+0.23, +0.79] | 0.004 |
# MAGIC | B− S Brazil / SW Atlantic | −0.37 | [−0.82, +0.07] | 0.093 |
# MAGIC
# MAGIC Pair A is a clear contrast (both sides significant). In pair B only the SE Pacific is significant; S Brazil / SW Atlantic is weakly negative.
# MAGIC
# MAGIC **Pair A (40–50°N): Central Asia warming vs Eastern Europe cooling. Circulation pattern.**
# MAGIC * 500 hPa geopotential height rises over Central Asia (z +0.77, p = 0.016) and falls over Eastern Europe (z −0.54, p = 0.049). It tracks TS closely in both regions (r 0.66 and 0.80) and alone implies 59% of the TS gap. This looks like a ridge over Central Asia and a trough over Eastern Europe.
# MAGIC * Low clouds decrease over Central Asia (z −0.42, n.s.) and increase over Eastern Europe (z +0.62, p = 0.022), implying 32% of the gap. That fits more sunshine under the ridge and more cloud under the trough.
# MAGIC * Caveat: 500 hPa height also rises when the air column below warms, so it is partly a consequence of the warming, not only a cause. Sea level pressure does not show an opposing trend (z −0.21 vs −0.02).
# MAGIC
# MAGIC **Pair B (20–30°S): SE Pacific warming vs S Brazil / SW Atlantic. Fewer clouds, more sunshine.**
# MAGIC * In the SE Pacific, total cloud fraction falls (z −0.81, p = 0.012) while surface solar near-infrared flux rises (z +0.83, p = 0.007), and both track TS (r −0.64 and +0.64). This is consistent with thinning of the subtropical stratocumulus deck letting more sunlight reach the ocean.
# MAGIC * 2 m specific humidity rises strongly there (z +1.04, p < 0.001, r 0.91 with TS). This is most likely a consequence of the warmer ocean surface (more evaporation), not a cause.
# MAGIC * Caveat: the simulated low cloud fraction barely changes (z +0.14), so the cloud loss is in the total, not clearly in the low clouds. That deserves checking with an observational cloud product. On the S Brazil side, no variable has an opposing and significant trend, which matches its weak TS trend.
# MAGIC
# MAGIC **Limitations.** 33 months, regions chosen because they had extreme trends (selection bias), reanalysis variables that are physically linked to each other (and partly to TS by construction), and simple one-variable regressions. These are hypotheses for the investigation, not attribution.