# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # tb_trend_grid_ts
# MAGIC
# MAGIC Per-cell deseasonalized trend of MERRA-2 TS (surface skin temperature, K) with the cell center coordinates. Source: `earth-trend-data.data_grid.tb_trend_grid_cell_id_merra2_temperatura` (filtered by `indicator`, column dropped) joined to `earth-trend-data.refined.tb_dim_grid_0p5x0p625` for `latitude`/`longitude` (cell center). Output: `earth-trend-data.data_grid.tb_trend_grid_ts`.

# COMMAND ----------

# DBTITLE 1,Build and write TS trend table
from pyspark.sql import functions as F

INDICATOR = "TS"
INDICATOR_COLUMN = "surface_skin_temperature_kelvin"

CATALOG = "earth-trend-data"
SOURCE  = f"`{CATALOG}`.data_grid.tb_trend_grid_cell_id_merra2_temperatura"
DIM     = f"`{CATALOG}`.refined.tb_dim_grid_0p5x0p625"
TARGET  = f"`{CATALOG}`.data_grid.tb_trend_grid_ts"

src = spark.table(SOURCE).where(F.col("indicator") == INDICATOR)

TREND_COLS = [c for c in src.columns if c not in ("grid_cell_id", "indicator", "indicator_column")]
dim = spark.table(DIM).select("grid_cell_id", "latitude", "longitude")

out = (src.join(dim, "grid_cell_id", "left")
          .select("latitude", "longitude", "grid_cell_id", *TREND_COLS))

(out.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(TARGET))

# Column comments: reuse source comments; add coordinate comments
comments = {f.name: f.metadata.get("comment") for f in spark.table(SOURCE).schema.fields}
comments["latitude"]  = "Cell center latitude in degrees, from refined.tb_dim_grid_0p5x0p625"
comments["longitude"] = "Cell center longitude in degrees, from refined.tb_dim_grid_0p5x0p625"
comments["first_period"] = "First month with a valid value"
comments["last_period"]  = "Last month with a valid value"
for col in out.columns:
    txt = comments.get(col)
    if txt:
        txt = txt.replace("'", "\\'")
        spark.sql(f"ALTER TABLE {TARGET} ALTER COLUMN {col} COMMENT '{txt}'")
spark.sql(f"COMMENT ON TABLE {TARGET} IS 'Per-cell deseasonalized linear trend of MERRA-2 {INDICATOR} "
          f"(source column {INDICATOR_COLUMN}, MERRA-2 reanalysis, 2024-01..2026-09) with cell center coordinates. "
          f"Derived from data_grid.tb_trend_grid_cell_id_merra2_temperatura. Short window: describes interannual variability, "
          f"not long-term climate trends.'")