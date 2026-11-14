# Databricks notebook source
TABLE = "`earth-trend-data`.refined.tb_merra2_t10m"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/M2TMNXSLV_T10M/"

# COMMAND ----------

df = (
    spark.read
    .option("pathGlobFilter", "M2TMNXSLV_T10M_*.csv")
    .csv(STORAGE_PATH, header=True, inferSchema=True)
)

# COMMAND ----------

df.write.format("delta").saveAsTable(TABLE)
