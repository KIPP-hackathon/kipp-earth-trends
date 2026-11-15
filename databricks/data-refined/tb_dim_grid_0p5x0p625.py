# Databricks notebook source
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Grid cell dimension 0.5 x 0.625 deg (tb_dim_grid_0p5x0p625)
# MAGIC
# MAGIC Tables are named by grid resolution: `tb_dim_grid_<dlat>x<dlon>` in degrees, with `.` written as `p` (0.5 x 0.625 -> `0p5x0p625`). This grid is the native MERRA-2 grid, so every MERRA-2 variable can share it.
# MAGIC
# MAGIC Builds the grid-cell dimension for the regular 0.5 x 0.625 degree lat/lon grid: one row per cell with indices, center and bounds, exact spherical cell area, area weight, H3 indexes (res 2 and 3) and WKT boundary. Validated against `trusted.tb_merra2_ts` before writing to `refined`.

# COMMAND ----------

# DBTITLE 1,Configuration
import math
from pyspark.sql import functions as F

CATALOG = "earth-trend-data"
SOURCE_TABLE = f"`{CATALOG}`.trusted.tb_merra2_ts"  # used only to validate grid coverage

LAT0, DLAT, NLAT = -90.0, 0.5, 361    # centers -90, -89.5, ..., 90
LON0, DLON, NLON = -180.0, 0.625, 576  # centers -180, -179.375, ..., 179.375

# Naming by resolution: 0.5 x 0.625 -> "0p5x0p625"
GRID_ID = f"{DLAT:g}x{DLON:g}".replace(".", "p")
TABLE_NAME = f"tb_dim_grid_{GRID_ID}"
TARGET_TABLE = f"`{CATALOG}`.refined.{TABLE_NAME}"
GRID_DESCRIPTION = "regular lat/lon grid of 0.5 deg lat x 0.625 deg lon (cell centers), native grid of NASA GMAO MERRA-2"
EARTH_RADIUS_KM = 6371.0088            # IUGG mean Earth radius (spherical approximation)
H3_RESOLUTIONS = [2, 3]                # coarser than or comparable to the native cell; finer would imply false resolution


def with_grid_index(df, lat_col="latitude", lon_col="longitude"):
    """Add lat_idx/lon_idx from source coordinates. Source doubles carry float noise (~1e-13),
    so join source tables to the dimension on these indices, never on exact lat/lon equality."""
    return df.withColumns({
        "lat_idx": F.round((F.col(lat_col) - LAT0) / DLAT).cast("int"),
        "lon_idx": F.pmod(F.round((F.col(lon_col) - LON0) / DLON).cast("int"), F.lit(NLON)),
    })

# COMMAND ----------

# DBTITLE 1,Build grid cell dimension
lat = spark.range(NLAT).select(F.col("id").cast("int").alias("lat_idx"))
lon = spark.range(NLON).select(F.col("id").cast("int").alias("lon_idx"))

grid = (
    lat.crossJoin(lon)
    .withColumns({
        "grid_cell_id": (F.col("lat_idx") * NLON + F.col("lon_idx")).cast("bigint"),
        "latitude": F.lit(LAT0) + F.col("lat_idx") * F.lit(DLAT),
        "longitude": F.lit(LON0) + F.col("lon_idx") * F.lit(DLON),
    })
    .withColumns({
        # Polar rows are half-height cells clipped at +/-90
        "lat_south": F.greatest(F.col("latitude") - DLAT / 2, F.lit(-90.0)),
        "lat_north": F.least(F.col("latitude") + DLAT / 2, F.lit(90.0)),
        # Longitude bounds are not wrapped: the first column spans -180.3125 to -179.6875 (crosses the antimeridian)
        "lon_west": F.col("longitude") - DLON / 2,
        "lon_east": F.col("longitude") + DLON / 2,
        "cos_lat_weight": F.cos(F.radians("latitude")),
        "is_polar_cell": F.abs(F.col("latitude")) == 90.0,
    })
    # Exact spherical area of a lat/lon cell: R^2 * dlon_rad * (sin(lat_north) - sin(lat_south))
    .withColumn(
        "cell_area_km2",
        F.lit(EARTH_RADIUS_KM ** 2 * math.radians(DLON))
        * (F.sin(F.radians("lat_north")) - F.sin(F.radians("lat_south"))),
    )
)

# Area weight relative to the whole globe (aggregate broadcast back)
total_area = grid.agg(F.sum("cell_area_km2").alias("total_area_km2"))
grid = (
    grid.crossJoin(F.broadcast(total_area))
    .withColumn("area_weight", F.col("cell_area_km2") / F.col("total_area_km2"))
    .drop("total_area_km2")
    .withColumns({f"h3_res{r}": F.expr(f"h3_longlatash3(longitude, latitude, {r})") for r in H3_RESOLUTIONS})
    .withColumns({
        "cell_boundary_wkt": F.format_string(
            "POLYGON ((%s %s, %s %s, %s %s, %s %s, %s %s))",
            "lon_west", "lat_south", "lon_east", "lat_south", "lon_east", "lat_north",
            "lon_west", "lat_north", "lon_west", "lat_south",
        ),
        "grid_id": F.lit(GRID_ID),
        "created_at": F.current_timestamp(),
    })
    .select(
        "grid_cell_id", "grid_id", "lat_idx", "lon_idx", "latitude", "longitude",
        "lat_south", "lat_north", "lon_west", "lon_east",
        "cell_area_km2", "area_weight", "cos_lat_weight", "is_polar_cell",
        *[f"h3_res{r}" for r in H3_RESOLUTIONS], "cell_boundary_wkt", "created_at",
    )
)

# COMMAND ----------

# DBTITLE 1,Validate grid against source table
src_coords = with_grid_index(spark.table(SOURCE_TABLE).select("latitude", "longitude").distinct())
missing_in_grid = src_coords.join(grid, ["lat_idx", "lon_idx"], "left_anti").count()
missing_in_source = grid.join(src_coords, ["lat_idx", "lon_idx"], "left_anti").count()
# Max distance between source coordinates and the matched cell center (float noise only expected)
max_coord_dev = (
    src_coords.alias("s").join(grid.alias("g"), ["lat_idx", "lon_idx"])
    .agg(F.max(F.greatest(F.abs(F.col("s.latitude") - F.col("g.latitude")),
                          F.abs(F.col("s.longitude") - F.col("g.longitude")))).alias("d"))
    .first()["d"]
)
check = grid.agg(
    F.count("*").alias("n_cells"),
    F.countDistinct("grid_cell_id").alias("n_distinct_ids"),
    F.sum("cell_area_km2").alias("total_area_km2"),
).first()

assert check["n_cells"] == NLAT * NLON == check["n_distinct_ids"], "Unexpected number of cells or duplicate ids"
assert abs(check["total_area_km2"] / (4 * math.pi * EARTH_RADIUS_KM ** 2) - 1) < 1e-9, "Cell areas do not sum to the sphere area"
assert missing_in_grid == 0 and missing_in_source == 0, "Grid does not match source coordinates"
assert max_coord_dev < 1e-6, "Source coordinates are not on the regular grid"

# COMMAND ----------

# DBTITLE 1,Write grid dimension table with comments and primary key
grid.createOrReplaceTempView(f"vw_dim_grid_{GRID_ID}")
spark.sql(f"""
CREATE OR REPLACE TABLE {TARGET_TABLE}
COMMENT 'Grid cell dimension for the {GRID_DESCRIPTION}. One row per cell. Join source tables on this grid on (lat_idx, lon_idx) computed as round((lat + 90) / 0.5) and pmod(round((lon + 180) / 0.625), 576); source lat/lon doubles carry float noise, so avoid exact coordinate equality.'
AS SELECT * FROM vw_dim_grid_{GRID_ID}
""")

COLUMN_COMMENTS = {
    "grid_cell_id": "Surrogate key: lat_idx * 576 + lon_idx",
    "grid_id": "Grid identifier by resolution in degrees (dlat x dlon, dot written as p)",
    "lat_idx": "Row index from south (0 = -90) to north (360 = 90)",
    "lon_idx": "Column index from west (0 = -180) to east (575 = 179.375)",
    "latitude": "Cell center latitude in degrees (canonical value; source tables may differ by float noise)",
    "longitude": "Cell center longitude in degrees (canonical value; source tables may differ by float noise)",
    "lat_south": "Southern cell bound in degrees (clipped at -90)",
    "lat_north": "Northern cell bound in degrees (clipped at 90)",
    "lon_west": "Western cell bound in degrees (not wrapped; first column starts at -180.3125)",
    "lon_east": "Eastern cell bound in degrees (not wrapped)",
    "cell_area_km2": "Spherical cell area in km2, R = 6371.0088 km",
    "area_weight": "Cell area divided by total Earth area (sums to 1)",
    "cos_lat_weight": "cos(latitude) approximate weight; zero at the poles, prefer area_weight",
    "is_polar_cell": "True for half-height cells centered at +/-90",
    "cell_boundary_wkt": "Cell boundary polygon as WKT (lon lat order)",
    "created_at": "Build timestamp (UTC)",
}
for r in H3_RESOLUTIONS:
    COLUMN_COMMENTS[f"h3_res{r}"] = f"H3 cell (resolution {r}) containing the cell center, from h3_longlatash3"

for col, comment in COLUMN_COMMENTS.items():
    spark.sql(f"ALTER TABLE {TARGET_TABLE} ALTER COLUMN {col} COMMENT '{comment}'")

spark.sql(f"ALTER TABLE {TARGET_TABLE} ALTER COLUMN grid_cell_id SET NOT NULL")
spark.sql(f"ALTER TABLE {TARGET_TABLE} ADD CONSTRAINT pk_{TABLE_NAME} PRIMARY KEY (grid_cell_id)")

# COMMAND ----------

# DBTITLE 1,Verify written table covers every source row
dim = spark.table(TARGET_TABLE)
src = with_grid_index(spark.table(SOURCE_TABLE)).drop("latitude", "longitude")

assert dim.count() == NLAT * NLON, "Written table has an unexpected number of rows"
assert src.count() == src.join(dim, ["lat_idx", "lon_idx"], "inner").count(), "Some source rows do not match a grid cell"

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from `earth-trend-data`.refined.tb_dim_grid_0p5x0p625;