# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # tb_indicator_coverage
# MAGIC
# MAGIC Builds `earth-trend-data`.trusted.tb_indicator_coverage: one row per (trusted table, indicator column) with the first and last month that has non-null values, and `null_ratio` (share of null rows in the table), approximate percentiles `p5`, `p10`, `p90`, `p95`, and `valid_flag` = indicator has data from 2001 onwards (min_date <= 2001-01-01) AND null_ratio <= 0.9. `table_name` + `indicator` join to `refined.tb_dim_indicators` (`source_table`, `indicator_name`).

# COMMAND ----------

# DBTITLE 1,Build indicator coverage table
from pyspark.sql import functions as F

CATALOG = "earth-trend-data"
SCHEMA = "trusted"
TARGET = f"`{CATALOG}`.{SCHEMA}.tb_indicator_coverage"
VALID_START = "2001-01-01"
MAX_NULL_RATIO = 0.9
PERCENTILES = [0.05, 0.10, 0.90, 0.95]

NUMERIC_TYPES = ("DOUBLE", "FLOAT", "INT", "LONG", "BIGINT", "DECIMAL", "SHORT", "SMALLINT", "BYTE", "TINYINT")

# Indicator columns = numeric columns other than lat/lon/time (metadata columns such as source_file are strings/timestamps)
cols = spark.sql(f"""
    SELECT table_name, column_name
    FROM `{CATALOG}`.information_schema.columns
    WHERE table_schema = '{SCHEMA}'
      AND table_name <> 'tb_indicator_coverage'
      AND lower(column_name) NOT IN ('time', 'latitude', 'longitude')
      AND data_type IN {NUMERIC_TYPES}
""").collect()

by_table = {}
for r in cols:
    by_table.setdefault(r.table_name, []).append(r.column_name)

parts = []
for table_name, indicators in sorted(by_table.items()):
    df = spark.table(f"`{CATALOG}`.{SCHEMA}.{table_name}")
    # one pass per table: first/last month with non-null values, null ratio and approx percentiles per indicator
    aggs = [F.count(F.lit(1)).alias("n_rows")]
    for c in indicators:
        col = F.col(f"`{c}`")
        t = F.when(col.isNotNull(), F.col("time"))
        aggs += [
            F.min(t).alias(f"min__{c}"),
            F.max(t).alias(f"max__{c}"),
            F.count(col).alias(f"nn__{c}"),
            F.percentile_approx(col.cast("double"), PERCENTILES).alias(f"pct__{c}"),
        ]
    row = df.agg(*aggs).collect()[0]
    n_rows = row["n_rows"]
    for c in indicators:
        pct = row[f"pct__{c}"] or [None] * len(PERCENTILES)
        null_ratio = (1 - row[f"nn__{c}"] / n_rows) if n_rows else None
        parts.append((f"{CATALOG}.{SCHEMA}.{table_name}", CATALOG, SCHEMA, table_name, c,
                      row[f"min__{c}"], row[f"max__{c}"], null_ratio, *pct))

result = (
    spark.createDataFrame(parts, "full_table_name string, catalogo string, schema string, table_name string, indicator string, "
                                 "min_date date, max_date date, null_ratio double, p5 double, p10 double, p90 double, p95 double")
    .withColumn("valid_flag", F.coalesce(
        (F.col("min_date") <= F.lit(VALID_START).cast("date")) & (F.col("null_ratio") <= MAX_NULL_RATIO),
        F.lit(False)))
)

assert result.count() == len(cols)
assert result.select("full_table_name", "indicator").distinct().count() == len(cols)

result.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(TARGET)

spark.sql(f"""COMMENT ON TABLE {TARGET} IS 'Time coverage per trusted table and indicator column. valid_flag = has non-null values from 2001-01-01 onwards (min_date <= 2001-01-01) AND null_ratio <= 0.9 (share of null rows over the whole table). p5/p10/p90/p95 = approximate percentiles (percentile_approx) of non-null values. Join to refined.tb_dim_indicators on table_name = source_table AND indicator = indicator_name.'""")

assert spark.table(TARGET).count() == len(cols)

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT valid_flag, count(1) FROM`earth-trend-data`.trusted.tb_indicator_coverage
# MAGIC GROUP BY 1;