# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
from datetime import datetime
import sys
from pyspark.sql import functions as F

sys.path.insert(0, str(Path.cwd().parent / "data-standardization"))
sys.path.insert(0, str(Path.cwd().parent / "data-extraction"))
from column_standardization import load_mapping, standardize_columns, deduplicate_rows, validate_key_data
from table_metadata import load_description

spark.conf.set("spark.sql.session.timeZone", "UTC")
folder = Path.cwd().parent / "data-standardization" / "tb_merra2_t10m"
mapping = load_mapping(folder / "column_mapping.yaml")
description = load_description(folder / mapping["source_description"], mapping["source_table"])
older = datetime(2026, 11, 14, 1)
newer = datetime(2026, 11, 14, 2)
first = datetime(2024, 1, 1, 0, 30)
later_same_day = datetime(2024, 1, 1, 12)
second = datetime(2024, 1, 2)
rows = [
    (0., 0., first, 280., 6.85, "gs://legacy.csv", older),
    (0., 0., later_same_day, 290., 16.85, "gs://native.csv", newer),
    (0., 0., second, 300., 26.85, "gs://next-day.csv", newer),
    (1., 0., first, 280., 6.85, "gs://legacy.csv", older),
    (1., 0., first, None, None, "gs://native.csv", newer),
    (2., 0., first, 280., 6.85, "gs://a.csv", newer),
    (2., 0., first, 290., 16.85, "gs://b.csv", newer),
]
source = spark.createDataFrame(rows, "lat double, lon double, time timestamp, T10M_K double, T10M_C double, source_file string, source_file_modified_at timestamp")
df, _ = standardize_columns(source, mapping, description)
assert df.schema["time"].dataType.simpleString() == "date"
result = deduplicate_rows(df, mapping)
validate_key_data(result, mapping)
assert result.count() == 4
assert result.filter("latitude = 0 AND time = DATE '2024-01-01'").first()["air_temperature_at_10_meters_kelvin"] == 290.
assert result.filter("latitude = 0 AND time = DATE '2024-01-02'").count() == 1
# Keep the entire latest row, including revised missing values.
assert result.filter("latitude = 1").first()["air_temperature_at_10_meters_kelvin"] is None
assert result.filter("latitude = 2").first()["source_file"] == "gs://b.csv"
assert deduplicate_rows(result, mapping).count() == 4
assert deduplicate_rows(df.repartition(3), mapping).orderBy("latitude", "time").collect() == result.orderBy("latitude", "time").collect()
assert deduplicate_rows(df.drop("source_file_modified_at", "source_file"), mapping).count() == 4
try:
    validate_key_data(result.withColumn("latitude", F.lit(None).cast("double")), mapping)
except ValueError:
    pass
else:
    raise AssertionError("NULL primary-key value was accepted")
print("PASS: DATE keys; latest file; whole-row selection; distinct days; URI tie-break; repartition stability; idempotence; fallback; NOT NULL")
