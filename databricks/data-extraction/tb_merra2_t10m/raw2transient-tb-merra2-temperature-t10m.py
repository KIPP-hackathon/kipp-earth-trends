# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys
from pyspark.sql import functions as F

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.transient.tb_merra2_t10m"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/M2TMNXSLV_T10M/"

spark.conf.set("spark.sql.session.timeZone", "UTC")

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)

# COMMAND ----------

def read_csv(path, schema):
    return (
        spark.read.schema(schema)
        .option("pathGlobFilter", "M2TMNXSLV_T10M_*.csv")
        .option("enforceSchema", False)
        .option("mode", "FAILFAST")
        .csv(path, header=True)
        .select(
            "*",
            F.col("_metadata.file_path").alias("source_file"),
            F.col("_metadata.file_modification_time").alias("source_file_modified_at"),
        )
    )


# Keep legacy months and ingest the native history in year directories.
legacy_df = read_csv(
    STORAGE_PATH + "M2TMNXSLV_T10M_*.csv",
    "lat double, lon double, time timestamp, T10M_K double, T10M_C double",
)
native_df = (
    read_csv(
        STORAGE_PATH + "[0-9][0-9][0-9][0-9]/*.csv",
        "lat double, lon double, time timestamp, T10M double",
    )
    .withColumnRenamed("T10M", "T10M_K")
    .withColumn("T10M_C", F.col("T10M_K") - F.lit(273.15))
)
df = legacy_df.unionByName(native_df)

validate_columns(description, df.columns)

# COMMAND ----------

df.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(TABLE)

apply_comments(spark, TABLE, description)
