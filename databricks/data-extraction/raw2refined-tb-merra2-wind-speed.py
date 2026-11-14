# Databricks notebook source
TABLE = "`earth-trend-data`.refined.tb_merra2_speed"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/M2TMNXFLX_SPEED/"

# COMMAND ----------

df = (
    spark.read
    .option("pathGlobFilter", "M2TMNXFLX_SPEED_*.csv")
    .csv(STORAGE_PATH, header=True, inferSchema=True)
)

# COMMAND ----------

df.write.format("delta").saveAsTable(TABLE)
