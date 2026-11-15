"""Configuração de extração para tb_sea_ice_concentration_global.

Segue data/config.py; executa o leitor de concentração, não o de extensão.
"""

from pathlib import Path

# Produto NOAA/NSIDC (não é uma coleção CMR de temperatura).
TABLE_NAME = "tb_sea_ice_concentration_global"
SHORT_NAME = "G02135"
VERSION = "4.0"
VARIABLE = "concentration"
VARIABLES = [VARIABLE]
HEMISPHERES = ("N", "S")
OUTPUT_PRODUCTS = [f"SEA_ICE_CONCENTRATION_G02135_V4_{pole}" for pole in HEMISPHERES]
OUTPUT_VARIABLES = ["sea_ice_concentration_pct", "valid_area_fraction"]

# Período solicitado; meses sem original permanecem ausentes.
START_DATE = "2000-01-01"
END_DATE = "2026-10-31"

# Diretórios; reaproveita os originais e os prefixos do extrator existente.
BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "data" / "raw" / "G02135_V4_CONCENTRATION"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
NETCDF_DIR = PROCESSED_DIR / "netcdf"
CSV_DIR = PROCESSED_DIR / "csv"
MAP_DIR = PROCESSED_DIR / "maps"
LOG_DIR = BASE_DIR / "logs"

# Contrato da saída e remapeamento polar.
OUTPUT_UNIT = "percent"
RESOLUTION = (0.5, 0.625)  # latitude, longitude, em graus
PERIODICITY = "Monthly"
MINIMUM_COVERAGE = 1.0
QUADRATURE_SAMPLES = 16

for directory in [RAW_DIR, NETCDF_DIR, CSV_DIR, MAP_DIR, LOG_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


def main(argv=None):
    import argparse
    from bucket_months import add_options, inventory, describe
    from phase_concentration import main as extract

    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--start", default=START_DATE)
    parser.add_argument("--end", default=END_DATE)
    parser.add_argument("--hemispheres", nargs="+", choices=HEMISPHERES, default=HEMISPHERES)
    add_options(parser)
    args, forwarded = parser.parse_known_args(argv)
    args.forwarded = forwarded
    from imerg import period
    period(args.start, args.end)
    poles = list(dict.fromkeys(args.hemispheres))
    products = [f"SEA_ICE_CONCENTRATION_G02135_V4_{pole}" for pole in poles]
    snapshot = inventory(products, args)
    for pole, product in zip(poles, products):
        _, ranges = describe(snapshot, product, args.start, args.end)
        if args.show_missing:
            continue
        for first, last in ranges:
            extract([
                "sea-ice-concentration", "--hemispheres", pole,
                "--start", first.isoformat(), "--end", last.isoformat(),
                "--raw-dir", str(RAW_DIR), "--output-dir", str(CSV_DIR),
                "--minimum-coverage", str(MINIMUM_COVERAGE),
                "--quadrature-samples", str(QUADRATURE_SAMPLES), *forwarded,
            ])


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
