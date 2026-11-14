# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.refined.tb_merra2_tox"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/M2TMNXSLV_TOX/"
SCHEMA = "lat double, lon double, time timestamp, TOX double"

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)
spark.conf.set("spark.sql.session.timeZone", "UTC")

# COMMAND ----------

df = (
    spark.read
    .schema(SCHEMA)
    .option("recursiveFileLookup", True)
    .option("pathGlobFilter", "M2TMNXSLV_TOX_*.csv")
    .option("enforceSchema", False)
    .option("mode", "FAILFAST")
    .csv(STORAGE_PATH, header=True)
)

validate_columns(description, df.columns)

# COMMAND ----------

df.write.format("delta").saveAsTable(TABLE)

apply_comments(spark, TABLE, description)
