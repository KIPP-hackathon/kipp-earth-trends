# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys
from pyspark.sql import functions as F

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.transient.tb_merra2_csp_mdsopthckicelg"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/M2TMNXCSP_MDSOPTHCKICELG/"
SCHEMA = "lat double, lon double, time timestamp, MDSOPTHCKICELG double"

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)
spark.conf.set("spark.sql.session.timeZone", "UTC")

# COMMAND ----------

df = (
    spark.read
    .schema(SCHEMA)
    .option("recursiveFileLookup", True)
    .option("pathGlobFilter", "M2TMNXCSP_MDSOPTHCKICELG_*.csv")
    .option("enforceSchema", False)
    .option("mode", "FAILFAST")
    .option("timestampFormat", "yyyy-MM-dd HH:mm:ss")
    .option("nullValue", "")
    .csv(STORAGE_PATH, header=True)
    .select(
        "*",
        F.col("_metadata.file_path").alias("source_file"),
        F.col("_metadata.file_modification_time").alias("source_file_modified_at"),
    )
)

validate_columns(description, df.columns)

# COMMAND ----------

df.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(TABLE)

apply_comments(spark, TABLE, description)
