# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3

# COMMAND ----------

from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd().parents[1] / "data-extraction"))
sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, apply_comments
from column_standardization import (
    load_mapping, standardize_columns, validate_key_data, apply_constraints,
)

mapping = load_mapping(Path.cwd() / "column_mapping.yaml")
SOURCE_TABLE = mapping["source_table"]
TABLE = mapping["target_table"]
WRITE_ENABLED = mapping["write_enabled"]
source_description = load_description(Path.cwd() / mapping["source_description"], SOURCE_TABLE)

# COMMAND ----------

spark.conf.set("spark.sql.session.timeZone", "UTC")
source_df = spark.table(SOURCE_TABLE)
df, description = standardize_columns(source_df, mapping, source_description)

# COMMAND ----------

if WRITE_ENABLED:
    validate_key_data(df, mapping)
    (
        df.write.format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .saveAsTable(TABLE)
    )
    apply_constraints(spark, mapping)
    apply_comments(spark, TABLE, description)
else:
    display(df.limit(5))
