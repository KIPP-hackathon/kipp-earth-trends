# Databricks notebook source
TABLE = "`earth-trend-data`.refined.tb_gpm_imerg_late_precipitation"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGDL/"

# COMMAND ----------

df = (
    spark.read
    .option("pathGlobFilter", "GPM_3IMERGDL_Late_precipitation_*.csv")
    .csv(STORAGE_PATH, header=True, inferSchema=True)
)

# COMMAND ----------

df.write.format("delta").saveAsTable(TABLE)
