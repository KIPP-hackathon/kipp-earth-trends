# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.transient.tb_merra2_speed"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/M2TMNXFLX_SPEED/"

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)

# COMMAND ----------

df = (
    spark.read
    .option("pathGlobFilter", "M2TMNXFLX_SPEED_*.csv")
    .csv(STORAGE_PATH, header=True, inferSchema=True)
)

validate_columns(description, df.columns)

# COMMAND ----------

df.write.format("delta").mode("overwrite").saveAsTable(TABLE)

apply_comments(spark, TABLE, description)
