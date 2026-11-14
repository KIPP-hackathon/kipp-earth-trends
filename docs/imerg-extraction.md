# NASA GPM IMERG Final monthly extraction

This pipeline follows the team's MERRA-2 workflow in `data/main.py`: query NASA
CMR using `earthaccess`, download original files, decode using `xarray`, select
the requested months, and export one global CSV per month. It does not use Earth
Engine or a third-party mirror. The temperature pipeline and configuration remain
independent. Implementation, documentation and synthetic test fixtures were
prepared with Codex assistance. No test fixture is an observation or a finding.

## Run from the repository root

Install the dependencies using `pip install -r requirements.txt` in your Python
environment, or use the `uv` commands below. First inspect the public catalog:

```sh
uv run --with-requirements requirements.txt python data/imerg.py --plan
```

`--plan` only queries CMR and prints original filenames. It does not authenticate,
download observations, create CSVs, or upload to the bucket. It defaults to
January 2025 through the last completed UTC calendar month. Final V07 may end
before that date. The pipeline reports unavailable months and never fabricates
them or substitutes Early/Late runs or another version.

To extract a specific period, using the existing reference CSV:

```sh
uv run --with-requirements requirements.txt python data/imerg.py \
  --start 2025-01-01 --end 2025-09-30 \
  --reference-csv transient_M2TMNXSLV_M2TMNXSLV_TS_2025_01.csv
```

Dates are inclusive: start on the first day, end on the last day of a month.
Downloading requires a **NASA Earthdata Login**, separate from Google Cloud.
The default is an interactive login with `persist=False`; it does not read a
global `.netrc` automatically. Alternatively, explicitly select
`--auth-strategy environment` for project-specific `EARTHDATA_USERNAME` and
`EARTHDATA_PASSWORD`, or `EARTHDATA_TOKEN`. Do not put secrets in source files.

Files are stored under the same local structure as the team's first pipeline:

- Originals: `data/data/raw/GPM_3IMERGM/`.
- CSVs and metadata: `data/data/processed/csv/GPM_3IMERGM/YYYY/`.
- Example: `GPM_3IMERGM_precipitation_2025_01.csv` and its `.metadata.json`.

Existing nonempty originals are reused. New downloads are staged and decoded
before entering the cache. Only files returned by the current CMR query are used.
Existing output files raise an error; replace them only with explicit
`--overwrite`. Interrupted processing can be resumed by selecting the remaining
months. To process previously downloaded originals without NASA requests:

```sh
uv run --with-requirements requirements.txt python data/imerg.py \
  --offline --start 2025-01-01 --end 2025-09-30
```

## Scientific processing and CSV schema

Product: **GPM_3IMERGM, version 07, Final Run**, variable `Grid/precipitation`.
Original monthly HDF5 files are opened at `group="Grid"`. Dimensions are explicitly
transposed, decoded fill values/negative values are treated as missing, and
longitudes are normalized. An unexpected native grid or unit stops processing.

The target reproduces the inspected MERRA-2 CSV: **361 latitude coordinates**
from −90° to 90°, step 0.5°, and **576 longitude coordinates** from −180° to
179.375°, step 0.625°. Every monthly file contains **207,936 rows**, ordered by
latitude then longitude. Values are aggregated using overlapping **spherical cell
areas**, accounting for latitude, half-height polar caps and longitude wraparound
at −180°. Rainfall depths are averaged spatially, never summed across pixels.

| Column | Meaning |
| --- | --- |
| `lat`, `lon` | Reference grid coordinates, degrees, EPSG:4326 |
| `time` | First day of the represented month at 00:00:00 UTC |
| `precipitation_mm_h` | Area-weighted monthly mean precipitation rate, mm/h |
| `precipitation_mm_month` | Rate × actual hours in that month, mm |
| `native_random_error_mean_mm_h` | Area-weighted mean of source `randomError`, mm/h |
| `valid_area_fraction` | Fraction of the target cell covered by valid precipitation, 0–1 |

IMERG includes frozen precipitation; the field is not restricted to liquid rain.
The reference CSV uses 00:30:00. IMERG's output deliberately uses month-start UTC;
join the two products by **latitude, longitude, year and month**, rather than by
an exact timestamp from different products.

By default, a cell with incomplete valid coverage has a **blank** precipitation
value, while genuine zero precipitation remains zero. An explicit
`--minimum-coverage 0.9`, for example, permits an average over at least 90% valid
cell area; coverage is always exported. This option changes the effective area
represented by values and must be considered in subsequent analysis.

The random-error column is a descriptive average of native error estimates,
**not propagated coarse-cell uncertainty, a total error estimate, or a confidence
interval**. Spatial error covariance is unavailable. Metadata records this limit,
source/version/DOI, original and CSV checksums, conversion hours, aggregation
method, and missing-cell counts. Raw extraction does not compute trends: later
analysis must report magnitude, period, units, method and statistical uncertainty,
including nonsignificant results. A nine-month series alone is insufficient for
interpreting a long-term climate trend without accounting for seasonality.

## Bucket upload is a separate operation

The Python command never uploads automatically. After inspecting the outputs,
the destination matching the team's layout is
`gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGM/`.

With the project-specific personal Google Cloud login, these commands upload
the 2025 CSVs and their provenance sidecars without replacing existing objects:

```sh
CLOUDSDK_CONFIG="$PWD/artifacts/gcloud-kipp" gcloud storage cp --no-clobber \
  data/data/processed/csv/GPM_3IMERGM/2025/*.csv \
  gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGM/
CLOUDSDK_CONFIG="$PWD/artifacts/gcloud-kipp" gcloud storage cp --no-clobber \
  data/data/processed/csv/GPM_3IMERGM/2025/*.metadata.json \
  gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGM/
```

## Offline validation

```sh
uv run --with-requirements requirements.txt python -m unittest discover \
  -s data -p 'test_imerg.py' -v
```

Tests use clearly synthetic measurements. They cover spherical area conservation,
polar cells, dateline wraparound, missing coverage versus zero rainfall, native
dimension order, leap-month accumulation, unit checks, checksums and overwrite
protection. They do not call NASA or Google Cloud.

## First authenticated extraction: 2026-11-14

The actual NASA Earthdata download and HDF5 decoding completed successfully for
**January–September 2025**, using IMERG Final **V07B** originals. The reference CSV
was checked, and nine CSVs were generated with **207,936 rows each**, totaling
**1,871,424 rows**. Verification covered coordinate order, uniqueness, timestamps,
nonnegative precipitation, monthly conversion, valid-area fractions and original
and CSV SHA-256 hashes.

With the default requirement for complete valid cell coverage, January–August
contain **2,304 blank precipitation cells per month**, at latitudes −90°, −89.5°,
89.5° and 90°. September contains **2,364 blanks**, including 60 additional cells
at 89°. These reflect absent or incomplete native coverage; no missing values
were changed to zero or interpolated.

The nine CSVs and nine metadata sidecars were uploaded to
`gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGM/` without replacing existing
objects. All **18 remote objects** were checked against local byte counts and MD5
hashes. CSVs total **131,902,934 bytes**. Local validation reports are saved under
ignored `artifacts/imerg-validation-2025.json` and
`artifacts/imerg-upload-validation-2025.json`; the bucket sidecars retain the
per-month provenance and processing details.

### Extension to January–December 2024

The same authenticated extraction completed for all **12 months of 2024** on
2026-11-14, using Final V07B originals and the same global reference grid. The
12 CSVs contain **2,495,232 rows** in total. Calendar conversion was verified for
every month, including **696 hours in February 2024**. Each monthly file retains
2,304 blank precipitation cells under the complete-coverage requirement.

All 12 CSVs and 12 metadata sidecars were uploaded to the same bucket prefix.
Remote byte counts and MD5 hashes match the local files; the 18 previously
uploaded 2025 objects retain their original generations and hashes. The 2024
CSVs total **176,012,669 bytes**. Reports are saved under ignored
`artifacts/imerg-validation-2024.json` and
`artifacts/imerg-upload-validation-2024.json`.

The bucket now contains **21 monthly CSVs, January 2024–September 2025**, plus
their 21 metadata sidecars.

## Sources

- Huffman et al. (2019), *GPM IMERG Final Precipitation L3 1 month 0.1 degree x
  0.1 degree V07*, NASA GES DISC: [DOI](https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07).
- [NASA IMERG V07 technical documentation](https://gpm.nasa.gov/resources/documents/imerg-v07-technical-documentation).
- [NASA IMERG V07 ATBD](https://gpm.nasa.gov/sites/default/files/2023-07/IMERG_V07_ATBD_final_230712.pdf).
- [NASA precipitation data directory](https://gpm.nasa.gov/data/directory).
- [earthaccess authentication](https://earthaccess.readthedocs.io/en/stable/user/howto/authenticate/).
- [earthaccess download workflow](https://earthaccess.readthedocs.io/en/stable/user/explanation/access/).
