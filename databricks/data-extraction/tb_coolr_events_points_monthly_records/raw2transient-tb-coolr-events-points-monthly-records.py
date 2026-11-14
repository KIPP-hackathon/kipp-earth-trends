# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.transient.tb_coolr_events_points_monthly_records"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/COOLR_EVENTS_POINTS_MONTHLY_RECORDS/"
SCHEMA = "lat double, lon double, time timestamp, reported_record_count long"

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)
spark.conf.set("spark.sql.session.timeZone", "UTC")

# COMMAND ----------

df = (
    spark.read
    .schema(SCHEMA)
    .option("recursiveFileLookup", True)
    .option("pathGlobFilter", "COOLR_EVENTS_POINTS_MONTHLY_RECORDS_*.csv")
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
