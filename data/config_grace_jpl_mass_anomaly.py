"""Configuração de extração para tb_grace_jpl_mass_anomaly.

O original GRACE é cumulativo; não é um NetCDF separado por mês.
"""

from pathlib import Path

# Produto NASA/JPL, com a mesma versão do extrator e contrato existentes.
TABLE_NAME = "tb_grace_jpl_mass_anomaly"
SHORT_NAME = "TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4"
VERSION = "RL06.3Mv04"
VARIABLE = "lwe_thickness"
VARIABLES = [VARIABLE, "uncertainty"]  # uncertainty é opcional no original
OUTPUT_PRODUCT = "GRACE_JPL_CRI_RL06.3Mv04"
OUTPUT_VARIABLES = [
    "mass_anomaly_mm_we", "valid_area_fraction", "cell_mass_anomaly_gt",
    "native_uncertainty_mean_mm_we",
]

# Mesmo pedido temporal do config.py. O leitor exporta apenas meses reais do
# original, preservando o início efetivo da missão e as lacunas temporais.
START_DATE = "2000-01-01"
END_DATE = "2026-10-31"

# Diretórios.
BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "data" / "raw" / SHORT_NAME
PROCESSED_DIR = BASE_DIR / "data" / "processed"
NETCDF_DIR = PROCESSED_DIR / "netcdf"
CSV_DIR = PROCESSED_DIR / "csv"
MAP_DIR = PROCESSED_DIR / "maps"
LOG_DIR = BASE_DIR / "logs"

# Anomalia de massa total em equivalente de água; não água subterrânea isolada.
OUTPUT_UNIT = "mm water equivalent"
RESOLUTION = (0.5, 0.625)  # grade de saída; não aumenta a resolução dos mascons
PERIODICITY = "Monthly"
MINIMUM_COVERAGE = 1.0

# Escolhas explícitas do usuário entre as soluções históricas sobrepostas.
# A seleção exige que os limites de datas coincidam com time_bounds nativos.
MONTH_SELECTIONS = {
    "2012-01": ["2012-01-01", "2012-01-31"],
    "2015-04": ["2015-04-01", "2015-04-30"],
}

for directory in [RAW_DIR, NETCDF_DIR, CSV_DIR, MAP_DIR, LOG_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


def main(argv=None):
    import argparse
    import json
    from bucket_months import add_options, inventory, describe, requested_months
    from water_ice import main as extract

    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--start", default=START_DATE)
    parser.add_argument("--end", default=END_DATE)
    add_options(parser)
    args, forwarded = parser.parse_known_args(argv)
    args.forwarded = forwarded
    from imerg import period
    period(args.start, args.end)
    snapshot = inventory([OUTPUT_PRODUCT], args)
    existing, ranges = describe(snapshot, OUTPUT_PRODUCT, args.start, args.end)
    if args.show_missing or not ranges:
        return
    skip = sorted(existing & set(requested_months(args.start, args.end)))
    extract([
        "grace",
        "--start", args.start,
        "--end", args.end,
        "--raw-dir", str(RAW_DIR),
        "--output-dir", str(CSV_DIR),
        "--minimum-coverage", str(MINIMUM_COVERAGE),
        "--month-selections", json.dumps(MONTH_SELECTIONS),
        *(["--skip-months", *skip] if skip else []),
        *forwarded,
    ])


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
