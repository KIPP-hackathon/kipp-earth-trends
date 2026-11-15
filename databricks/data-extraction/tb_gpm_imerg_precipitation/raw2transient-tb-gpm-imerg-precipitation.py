# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.transient.tb_gpm_imerg_precipitation"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGM/"
SCHEMA = "lat double, lon double, time timestamp, precipitation_mm_h double, precipitation_mm_month double, native_random_error_mean_mm_h double, valid_area_fraction double"

spark.conf.set("spark.sql.session.timeZone", "UTC")

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)

# COMMAND ----------

df = (
    spark.read
    .schema(SCHEMA)
    .option("recursiveFileLookup", True)
    .option("pathGlobFilter", "GPM_3IMERGM_precipitation_*.csv")
    .option("enforceSchema", False)
    .option("mode", "FAILFAST")
    .option("timestampFormat", "yyyy-MM-dd HH:mm:ss")
    .option("nullValue", "")
    .csv(STORAGE_PATH, header=True)
)

validate_columns(description, df.columns)

# COMMAND ----------

df.write.format("delta").mode("overwrite").saveAsTable(TABLE)

apply_comments(spark, TABLE, description)
