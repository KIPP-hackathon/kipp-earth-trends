# Databricks notebook source
# Read-only validation of a persisted reingestion (default: T10M).
from datetime import date
import json
import re
from pyspark.sql import functions as F

spark.conf.set("spark.sql.session.timeZone", "UTC")
dbutils.widgets.text("table", "tb_merra2_t10m")
table = dbutils.widgets.get("table")
if not re.fullmatch(r"tb_[a-z0-9_]+", table):
    raise ValueError("Invalid table name")
source = spark.table(f"`earth-trend-data`.transient.{table}")
trusted = spark.table(f"`earth-trend-data`.trusted.{table}")
source_rows = source.count()
trusted_rows = trusted.count()
keys = ["latitude", "longitude", "time"]
unique_rows = trusted.select(*keys).distinct().count()
assert trusted_rows == unique_rows, "Persisted trusted keys are duplicated"
assert trusted_rows <= source_rows
assert trusted.schema["time"].dataType.simpleString() == "date"
bounds = trusted.agg(F.min("time").alias("start"), F.max("time").alias("end")).first()
result = {
    "table": table, "source_rows": source_rows, "trusted_rows": trusted_rows,
    "removed_duplicate_rows": source_rows - trusted_rows,
    "start": str(bounds.start), "end": str(bounds.end), "unique_keys": True,
}
if table == "tb_merra2_t10m":
    # Compare a month present in both legacy and native files.
    cell = source.filter(
        (F.col("lat") == -90) & (F.col("lon") == -180)
        & (F.col("time").cast("date") == F.lit(date(2024, 1, 1))))
    expected = cell.orderBy(F.col("source_file_modified_at").desc(), F.col("source_file").desc()).first()
    actual = trusted.filter(
        (F.col("latitude") == -90) & (F.col("longitude") == -180)
        & (F.col("time") == F.lit(date(2024, 1, 1)))).first()
    assert actual.source_file == expected.source_file
    assert actual.air_temperature_at_10_meters_kelvin == expected.T10M_K
    assert actual.air_temperature_at_10_meters_celsius == expected.T10M_C
    assert source_rows > trusted_rows, "Expected overlapping legacy/native history"
    result["latest_file_cell_verified"] = True
    result["selected_source_file"] = actual.source_file
print(json.dumps(result))
dbutils.notebook.exit(json.dumps(result))
