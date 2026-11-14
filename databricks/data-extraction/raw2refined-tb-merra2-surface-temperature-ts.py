# Databricks notebook source
TABLE = "`earth-trend-data`.refined.tb_merra2_ts"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/M2TMNXSLV/"

# COMMAND ----------

df = (
    spark.read
    .option("pathGlobFilter", "M2TMNXSLV_TS_*.csv")
    .csv(STORAGE_PATH, header=True, inferSchema=True)
)

# COMMAND ----------

df.write.format("delta").saveAsTable(TABLE)