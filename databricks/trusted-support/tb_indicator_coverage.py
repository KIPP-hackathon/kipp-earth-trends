# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # tb_indicator_coverage
# MAGIC
# MAGIC Builds `earth-trend-data`.trusted.tb_indicator_coverage: one row per (trusted table, indicator column) with the first and last month that has non-null values, and `null_ratio` (share of null/nonfinite rows in the table), approximate percentiles `p5`, `p10`, `p90`, `p95`, and `history_eligible` = min_date <= 2001-01-01 AND null_ratio <= 0.9. `valid_flag` enables new explicitly selected application sources with non-null data, including polar/short records; otherwise it follows history_eligible. Enabling does not establish scientific validity or long-term trend suitability. `table_name` + `indicator` join to `refined.tb_dim_indicators` (`source_table`, `indicator_name`).

# COMMAND ----------

# DBTITLE 1,Build indicator coverage table
from pyspark.sql import functions as F
from pathlib import Path
import sys
sys.path.insert(0, str(Path.cwd().parent))
from indicator_catalog import coverage_enabled
from datetime import date

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
      AND lower(column_name) NOT IN ('time', 'latitude', 'longitude', 'lat', 'lon', 'lat_idx', 'lon_idx')
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
        raw = F.col(f"`{c}`")
        finite = raw.isNotNull() & ~F.isnan(raw.cast("double")) & (F.abs(raw.cast("double")) < 1e30)
        col = F.when(finite, raw)
        t = F.when(finite, F.col("time"))
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
        first, last = row[f"min__{c}"], row[f"max__{c}"]
        if hasattr(first, "date"):
            first = first.date()
        if hasattr(last, "date"):
            last = last.date()
        history = bool(first and first <= date.fromisoformat(VALID_START)
                       and null_ratio is not None and null_ratio <= MAX_NULL_RATIO)
        enabled = coverage_enabled(table_name, row[f"nn__{c}"] > 0 and first is not None and last is not None, history)
        parts.append((f"{CATALOG}.{SCHEMA}.{table_name}", CATALOG, SCHEMA, table_name, c,
                      first, last, null_ratio, *pct, history, enabled))

result = spark.createDataFrame(
    parts, "full_table_name string, catalogo string, schema string, table_name string, indicator string, "
           "min_date date, max_date date, null_ratio double, p5 double, p10 double, p90 double, p95 double, "
           "history_eligible boolean, valid_flag boolean"
)

assert result.count() == len(cols)
assert result.select("full_table_name", "indicator").distinct().count() == len(cols)

result.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(TARGET)

spark.sql(f"""COMMENT ON TABLE {TARGET} IS 'Time coverage per trusted table and indicator column. history_eligible = min_date <= 2001-01-01 AND null_ratio <= 0.9. valid_flag enables explicitly selected new app sources when non-null data exist, otherwise follows history_eligible; it is not scientific validation or a long-term trend criterion. p5/p10/p90/p95 = approximate percentiles (percentile_approx) of non-null values. Join to refined.tb_dim_indicators on indicator = indicator_name plus array_contains(source_tables, table_name); source_table is the canonical alias.'""")

assert spark.table(TARGET).count() == len(cols)

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT valid_flag, count(1) FROM`earth-trend-data`.trusted.tb_indicator_coverage
# MAGIC GROUP BY 1;