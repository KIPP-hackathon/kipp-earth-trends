# Databricks notebook source
# MAGIC %pip install PyYAML==6.0.3 pyhdf==0.11.7

# COMMAND ----------

from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd().parent))
from table_metadata import load_description, validate_columns, apply_comments

TABLE = "`earth-trend-data`.refined.tb_modis_mod13c2_vegetation"
STORAGE_PATH = "gs://nasa-earth-trends-lab-raw/kipp/raw/nasa/MOD13C2/version=061/"
SCHEMA = (
    "lat double, lon double, time timestamp, ndvi_raw int, evi_raw int, "
    "ndvi double, evi double, vi_quality int, pixel_reliability int, source_file string"
)

description = load_description(Path.cwd() / "description_schema.yaml", TABLE)
spark.conf.set("spark.sql.session.timeZone", "UTC")

# COMMAND ----------

def read_mod13_batches(batches):
    import re
    import tempfile
    from datetime import datetime
    from pathlib import Path

    import numpy as np
    import pandas as pd
    from pyhdf.SD import SD, SDC

    for batch in batches:
        for record in batch.itertuples(index=False):
            match = re.search(r"MOD13C2\.A(\d{7})\.061\.", record.path)
            if match is None:
                raise ValueError(f"Nome MOD13C2 inesperado: {record.path}")
            timestamp = datetime.strptime(match.group(1), "%Y%j")
            if timestamp.day != 1:
                raise ValueError("O arquivo mensal deve referenciar o início do mês.")

            # HDF4 needs a filesystem path. Each worker owns its temporary file.
            with tempfile.TemporaryDirectory(prefix="kipp-mod13-") as temporary:
                local_path = Path(temporary) / "source.hdf"
                local_path.write_bytes(bytes(record.content))
                source = SD(str(local_path), SDC.READ)
                datasets = []
                try:
                    structure = source.attributes()["StructMetadata.0"]
                    if "Projection=GCTP_GEO" not in structure:
                        raise ValueError("MOD13C2 deve usar a grade geográfica CMG.")
                    upper = re.search(r"UpperLeftPointMtrs=\(([^,]+),([^\)]+)\)", structure)
                    lower = re.search(r"LowerRightMtrs=\(([^,]+),([^\)]+)\)", structure)
                    bounds = tuple(float(value) / 1e6 for value in (*upper.groups(), *lower.groups()))
                    if bounds != (-180.0, 90.0, 180.0, -90.0):
                        raise ValueError(f"Domínio MOD13C2 inesperado: {bounds}")

                    for name in ["NDVI", "EVI", "VI Quality", "pixel reliability"]:
                        datasets.append(source.select("CMG 0.05 Deg Monthly " + name))
                    shapes = [tuple(dataset.info()[2]) for dataset in datasets]
                    if shapes != [(3600, 7200)] * 4:
                        raise ValueError(f"Dimensões MOD13C2 inesperadas: {shapes}")

                    attributes = [dataset.attributes() for dataset in datasets[:2]]
                    for values in attributes:
                        # This collection encodes its divisor as scale_factor=10000.
                        if values["scale_factor"] != 10000 or values["add_offset"] != 0:
                            raise ValueError("Rever a calibração MOD13C2 desta versão.")

                    longitudes = -180.0 + (np.arange(7200) + 0.5) * 0.05
                    for start in range(0, 3600, 16):
                        count = min(16, 3600 - start)
                        arrays = [
                            dataset.get(start=(start, 0), count=(count, 7200)).astype(np.int32)
                            for dataset in datasets
                        ]
                        physical = []
                        for raw, values in zip(arrays[:2], attributes):
                            valid = (
                                (raw != values["_FillValue"])
                                & (raw >= values["valid_range"][0])
                                & (raw <= values["valid_range"][1])
                            )
                            physical.append(np.where(valid, raw / 10000.0, np.nan))

                        latitudes = 90.0 - (np.arange(start, start + count) + 0.5) * 0.05
                        yield pd.DataFrame({
                            "lat": np.repeat(latitudes, 7200),
                            "lon": np.tile(longitudes, count),
                            "time": timestamp,
                            "ndvi_raw": arrays[0].ravel(),
                            "evi_raw": arrays[1].ravel(),
                            "ndvi": physical[0].ravel(),
                            "evi": physical[1].ravel(),
                            "vi_quality": arrays[2].ravel(),
                            "pixel_reliability": arrays[3].ravel(),
                            "source_file": record.path,
                        })
                finally:
                    for dataset in datasets:
                        dataset.endaccess()
                    source.end()


files = (
    spark.read.format("binaryFile")
    .option("recursiveFileLookup", True)
    .option("pathGlobFilter", "MOD13C2.A*.061.*.hdf")
    .load(STORAGE_PATH)
    .select("path", "content")
)
df = files.mapInPandas(read_mod13_batches, schema=SCHEMA)
validate_columns(description, df.columns)

# COMMAND ----------

df.write.format("delta").mode("overwrite").saveAsTable(TABLE)

apply_comments(spark, TABLE, description)
