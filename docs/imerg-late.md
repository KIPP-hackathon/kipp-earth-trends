# IMERG Late monthly extension after September 2025

Status: authenticated extraction and upload completed on **2026-11-14** for
October 2025–October 2026. Offline validation also uses clearly synthetic fixtures.
Code, tests and documentation were prepared with Codex assistance; exported
measurements come from original NASA daily files, not generated observations.

`data/imerg_late.py` follows the team's Earthdata → CMR → original download →
`xarray` → CSV workflow. It uses **GPM_3IMERGDL V07 (Late daily)** and derives
monthly estimates independently of **GPM_3IMERGM V07 (Final monthly)**. The
existing Final extraction, originals, CSVs and bucket objects are unchanged.

## Period and commands

Defaults: start **2025-10-01**, end at the last completed UTC calendar month.
As of 2026-11-14, this means **October 2025–October 2026**: 13 months and 396 daily
original files. November 2026 is incomplete and cannot be exported as a full month.
Catalog completeness is checked at execution time before authentication/download.

From the repository root, inspect the public catalog without downloading:

```sh
uv run --with-requirements requirements.txt python data/imerg_late.py \
  --start 2025-10-01 --end 2026-10-31 --plan
```

To download and process:

```sh
uv run --with-requirements requirements.txt python data/imerg_late.py \
  --start 2025-10-01 --end 2026-10-31 \
  --reference-csv transient_M2TMNXSLV_M2TMNXSLV_TS_2025_01.csv
```

An interactive **NASA Earthdata Login** is required for uncached downloads, once
per execution, with credentials not persisted. Explicit
`--auth-strategy environment` also works with project-specific Earthdata
environment credentials. Google Cloud authentication is separate.

Downloads are staged and decoded before caching. Daily originals are reused.
Processing streams one day at a time and exports each month after its downloads
finish; it does not load the entire period into memory. Hundreds of global daily
files require substantially more disk space and transfer than Final monthly files.
Use a one-month period first to validate the authenticated service integration.

To process cached originals without NASA calls, add `--offline`. Dates must span
whole calendar months. Missing or duplicate daily files cause an error; partial
months are never rescaled into complete-month estimates. Existing outputs are
protected unless `--overwrite` is explicitly selected. After interruption, select
the remaining months to preserve completed CSVs.

Paths:

- Originals: `data/data/raw/GPM_3IMERGDL/`.
- Outputs: `data/data/processed/csv/GPM_3IMERGDL/YYYY/`.
- Filename: `GPM_3IMERGDL_Late_precipitation_YYYY_MM.csv`.
- Per-month provenance: adjacent `.metadata.json` with all daily filenames,
  processing versions, SHA-256 hashes and methods.
- Intended bucket prefix: `gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGDL/`.
  The script never uploads automatically.

## Units, grid and coverage

The original daily NetCDF files use root-level variables, unlike the Final monthly
HDF5 `Grid` group. The daily `precipitation` field is a mean daily rate in
**mm/day**, already scaled from the mean half-hourly rate by NASA. Each daily value
represents a one-day depth estimate: sum the daily values to get **mm per month**.
Do **not** multiply each daily value by 24 again. Monthly mean mm/h is monthly
mm divided by actual calendar hours. Leap years are handled explicitly.

Native 0.1° grid cells are aggregated to the confirmed **0.5° latitude × 0.625°
longitude** grid using the Final pipeline's tested spherical area-overlap code.
The export includes polar caps and wraps longitude at −180°. Global monthly CSVs
have **207,936 rows**, ordered by latitude then longitude.

NASA normalizes daily estimates using available half-hourly samples when fewer
than 48 are valid. This export applies a stricter coverage policy: a nonblank
monthly precipitation value requires **all calendar days**, **full contributing
native area**, and **48 valid half-hour samples per native cell per day**.
Under-sampled daily values are kept in the original files and flagged through
coverage diagnostics rather than treated as full observations. This policy may
produce additional blanks, especially at high latitudes. No missing value is
filled with zero or extrapolated. Genuine zero rainfall is valid.

| CSV field | Meaning |
| --- | --- |
| `lat`, `lon`, `time` | Reference coordinates and month-start UTC |
| `precipitation_mm_month` | Sum of daily depth estimates for a fully covered month |
| `precipitation_mm_h` | Monthly total divided by calendar hours |
| `native_daily_random_error_mean_mm_day` | Descriptive mean of daily native errors, mm/day |
| `valid_day_count` | Days satisfying complete native spatial/sampling coverage |
| `valid_area_fraction` | Minimum daily fraction of native area satisfying that policy |
| `mean_halfhourly_sample_fraction` | Mean spatial and temporal fraction of the 48 expected daily samples |
| `source_product`, `source_run` | Explicit `GPM_3IMERGDL`, `Late` identifiers |
| `source_processing_versions` | Daily file versions represented in this month, e.g. `V07B;V07C` |

The error column is **not propagated monthly uncertainty**, a confidence interval,
or equivalent to the Final monthly error column. Temporal and spatial covariance
are not known. IMERG estimates total precipitation, including frozen precipitation.

## Comparability and the 2026 transition

These are **Late daily-derived monthly estimates**, not Final monthly observations.
The NASA transition notice describes hybrid V07 inputs during 2026 and warns of
possible discontinuities. The pipeline records actual filename versions per day
and per month, including months spanning V07B/V07C; that record does not by itself
remove all input or calibration changes.

Keep Late in its own folder and identify its product/run in charts and exports.
Do not silently join it to the Final series as homogeneous input for a trend test.
A combined display needs an explicit product boundary; a combined statistical
analysis needs an assessment of run differences and transition effects. Subsequent
trend results must report period, magnitude, units, method and uncertainty, including
nonsignificant results.

## Offline checks

```sh
uv run --with-requirements requirements.txt python -m unittest discover \
  -s data -p 'test_imerg*.py' -v
```

Checks use synthetic measurements only. They cover daily units, dimension order,
native grid normalization, calendar completeness, leap years, missing and duplicate
days, zero rainfall, half-hourly sample coverage, mixed processing-version metadata,
checksums and overwrite protection, along with the Final pipeline's polar/dateline
and area-conservation tests.

## Completed authenticated extraction: 2026-11-14

All **396 daily originals** were downloaded from NASA Earthdata and decoded
successfully. The resulting **13 monthly CSVs** contain **207,936 rows each**,
totaling **2,703,168 rows** and **263,032,557 CSV bytes**. Per-month verification
covered calendar completeness, units, reference coordinates, coverage, source
labels, source SHA-256 hashes and CSV SHA-256 hashes.

The source files contain **153 V07B days and 243 V07C days**. March 2026 has
**2 V07B days and 29 V07C days**; the exact versions appear in its CSV and metadata.
Monthly blank precipitation-cell counts range from **3,769 to 5,028**, reflecting
the documented strict spatial and half-hourly sampling coverage policy. Those
cells remain blank; no rainfall is imputed.

All **26 objects** (13 CSVs and 13 metadata sidecars) were uploaded to
`gs://nasa-earth-trends-lab-raw/transient/GPM_3IMERGDL/` with no overwrite. Remote
sizes and MD5 hashes match local files. The **42 existing Final objects** under
`transient/GPM_3IMERGM/` retain their original generations and hashes. The ignored
local report `artifacts/imerg-late-validation-and-upload.json` records each month's
validation and remote object identifiers.

## Sources

- NASA GES DISC, *GPM IMERG Late Precipitation L3 1 day 0.1 degree x 0.1 degree
  V07*: [DOI](https://doi.org/10.5067/GPM/IMERGDL/DAY/07).
- [NASA CMR collection metadata, including daily rate and count definitions](https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=GPM_3IMERGDL&version=07).
- [NASA IMERG V08 transition schedule](https://gpm.nasa.gov/data/news/imerg-v08-transition-schedule).
- [NASA August 2026 transition update](https://gpm.nasa.gov/data/news/update-imerg-v08-transition-schedule-aug-2026).
- [NASA Late daily catalog](https://www.earthdata.nasa.gov/data/catalog/ges-disc-gpm-3imergdl-07).
