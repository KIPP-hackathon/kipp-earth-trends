# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.transient.tb_merra2_csp_mdscldfrclo"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/M2TMNXCSP_MDSCLDFRCLO/"
SCHEMA = "lat double, lon double, time timestamp, MDSCLDFRCLO double"

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)
spark.conf.set("spark.sql.session.timeZone", "UTC")

# COMMAND ----------

df = (
    spark.read
    .schema(SCHEMA)
    .option("recursiveFileLookup", True)
    .option("pathGlobFilter", "M2TMNXCSP_MDSCLDFRCLO_*.csv")
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
