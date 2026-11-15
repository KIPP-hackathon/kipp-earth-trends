# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # tb_agg_grid_cell_id_merra2_temperatura
# MAGIC
# MAGIC Aggregates the 14 MERRA-2 temperature indicators from `earth-trend-data.trusted.tb_merra2_temperatura` into a consumption table keyed by `(grid_cell_id, period_start)`. Temperatures originally in Kelvin are kept as-is (the dim table carries the unit); the two pre-computed Celsius columns are also preserved. Joins on integer grid indices to avoid MERRA-2 float noise. Writes to `earth-trend-data.data_grid`.

# COMMAND ----------

# DBTITLE 1,Build and write table
from pyspark.sql import functions as F

CATALOG = "earth-trend-data"
SCHEMA = "data_grid"
TARGET = f"`{CATALOG}`.{SCHEMA}.tb_agg_grid_cell_id_merra2_temperatura"
SOURCE = f"`{CATALOG}`.trusted.tb_merra2_temperatura"
GRID   = f"`{CATALOG}`.refined.tb_dim_grid_0p5x0p625"

spark.sql(f"CREATE SCHEMA IF NOT EXISTS `{CATALOG}`.{SCHEMA}")

# --- source ---
src = spark.table(SOURCE)

# --- grid dimension (only the join key and the cell id) ---
grid = (spark.table(GRID)
        .select("grid_cell_id", "lat_idx", "lon_idx"))

# --- join on integer indices (avoids ~1e-13 float noise in MERRA-2 coords) ---
MEASUREMENT_COLS = [
    # core
    "air_temperature_at_2_meters_kelvin",
    "air_temperature_at_10_meters_kelvin",
    "air_temperature_at_10_meters_celsius",
    "surface_skin_temperature_kelvin",
    "surface_skin_temperature_celsius",
    # intermediate
    "air_temperature_at_250_hpa_kelvin",
    "air_temperature_at_500_hpa_kelvin",
    "air_temperature_at_850_hpa_kelvin",
    "dew_point_temperature_at_2_meters_kelvin",
    "wet_bulb_temperature_at_2_meters_kelvin",
    # scientific
    "tropopause_temperature_kelvin",
    "surface_air_temperature",
    "effective_surface_skin_temperature",
    "surface_temperature_scale",
]

df = (src
      .withColumn("lat_idx", F.round((F.col("latitude") + 90) / 0.5).cast("int"))
      .withColumn("lon_idx", F.pmod(F.round((F.col("longitude") + 180) / 0.625).cast("int"), F.lit(576)))
      .join(grid, ["lat_idx", "lon_idx"], "inner")
      .select(
          "grid_cell_id",
          F.col("time").alias("period_start"),
          *[F.col(c) for c in MEASUREMENT_COLS],
      ))

# --- write ---
(df.write
   .mode("overwrite")
   .option("overwriteSchema", "true")
   .saveAsTable(TARGET))

# --- column comments ---
spark.sql(f"ALTER TABLE {TARGET} ALTER COLUMN grid_cell_id    COMMENT 'FK to tb_dim_grid_0p5x0p625'")
spark.sql(f"ALTER TABLE {TARGET} ALTER COLUMN period_start    COMMENT 'First day of the month (DATE)'")
spark.sql(f"COMMENT ON TABLE {TARGET} IS 'MERRA-2 temperature indicators by grid cell and month, joined to grid dim via integer indices.'")

# COMMAND ----------

# DBTITLE 1,Validate
written = spark.table(TARGET)
src_count = spark.table(SOURCE).count()

assert written.count() == src_count, f"Row count mismatch: {written.count()} vs {src_count}"
assert written.select("grid_cell_id").filter(F.col("grid_cell_id").isNull()).count() == 0, "NULL grid_cell_id found"
assert written.select(F.countDistinct("grid_cell_id", "period_start")).collect()[0][0] == src_count, "Duplicate keys"
assert set(MEASUREMENT_COLS).issubset(set(written.columns)), "Missing measurement columns"