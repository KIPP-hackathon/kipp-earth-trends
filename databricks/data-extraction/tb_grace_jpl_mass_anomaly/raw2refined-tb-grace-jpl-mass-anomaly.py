# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.refined.tb_grace_jpl_mass_anomaly"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/GRACE_JPL_CRI_RL06.3Mv04/"
SCHEMA = "lat double, lon double, time timestamp, mass_anomaly_mm_we double, valid_area_fraction double, cell_mass_anomaly_gt double, native_uncertainty_mean_mm_we double"

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)
spark.conf.set("spark.sql.session.timeZone", "UTC")

# COMMAND ----------

df = (
    spark.read
    .schema(SCHEMA)
    .option("recursiveFileLookup", True)
    .option("pathGlobFilter", "GRACE_JPL_CRI_RL06.3Mv04_*.csv")
    .option("enforceSchema", False)
    .option("mode", "FAILFAST")
    .csv(STORAGE_PATH, header=True)
)

validate_columns(description, df.columns)

# COMMAND ----------

df.write.format("delta").saveAsTable(TABLE)

apply_comments(spark, TABLE, description)
