"""Configuração de extração para tb_gpm_imerg_precipitation_final_late.

Final e Late mantêm caches, CSVs e indicadores de qualidade separados.
"""

from pathlib import Path

# Produtos NASA; Final é mensal nativo, Late é diário agregado para mensal.
TABLE_NAME = "tb_gpm_imerg_precipitation_final_late"
SHORT_NAME = "GPM_3IMERGM"
LATE_SHORT_NAME = "GPM_3IMERGDL"
SHORT_NAMES = (SHORT_NAME, LATE_SHORT_NAME)
VERSION = "07"
VARIABLE = "precipitation"
VARIABLES = [VARIABLE, "randomError"]
LATE_VARIABLES = [*VARIABLES, "precipitation_cnt"]
OUTPUT_VARIABLES = ["precipitation_mm_h", "precipitation_mm_month"]

# Período solicitado, igual ao exemplo MERRA-2.
START_DATE = "2000-01-01"
END_DATE = "2026-10-31"

# Fronteira explícita do inventário reduzido, não descoberta automática.
# Rever estes dois valores juntos se houver uma nova política de transição.
FINAL_END_DATE = "2025-09-30"
LATE_START_DATE = "2025-10-01"

# Diretórios; cada produto continua no prefixo esperado pela ingestão atual.
BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "data" / "raw" / SHORT_NAME
LATE_RAW_DIR = BASE_DIR / "data" / "raw" / LATE_SHORT_NAME
PROCESSED_DIR = BASE_DIR / "data" / "processed"
NETCDF_DIR = PROCESSED_DIR / "netcdf"
CSV_DIR = PROCESSED_DIR / "csv"
FINAL_CSV_DIR = CSV_DIR / SHORT_NAME
LATE_CSV_DIR = CSV_DIR / LATE_SHORT_NAME
MAP_DIR = PROCESSED_DIR / "maps"
LOG_DIR = BASE_DIR / "logs"

OUTPUT_UNIT = "mm month-1"
RESOLUTION = (0.5, 0.625)  # latitude, longitude, em graus
PERIODICITY = "Monthly"
MINIMUM_COVERAGE = 1.0  # parâmetro do Final; Late já exige cobertura integral

for directory in [RAW_DIR, LATE_RAW_DIR, NETCDF_DIR, FINAL_CSV_DIR, LATE_CSV_DIR, MAP_DIR, LOG_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


def main(argv=None):
    import argparse
    from datetime import date, timedelta
    from bucket_months import add_options, inventory, describe

    from imerg import main as extract_final, period
    from imerg_late import main as extract_late

    # --start/--end são interpretados aqui para recortar ambos os produtos;
    # não podem ser repassados sem recorte, pois criariam sobreposição.
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--run", choices=["all", "final", "late"], default="all")
    parser.add_argument("--start", default=START_DATE)
    parser.add_argument("--end", default=END_DATE)
    add_options(parser)
    args, forwarded = parser.parse_known_args(argv)
    args.forwarded = forwarded
    period(args.start, args.end)
    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)
    final_end, late_start = date.fromisoformat(FINAL_END_DATE), date.fromisoformat(LATE_START_DATE)
    if final_end + timedelta(days=1) != late_start or late_start.day != 1:
        raise ValueError("Final deve terminar no fim do mês anterior ao início do Late.")
    jobs = [
        ("final", extract_final, start, min(end, final_end), RAW_DIR, FINAL_CSV_DIR),
        ("late", extract_late, max(start, late_start), end, LATE_RAW_DIR, LATE_CSV_DIR),
    ]
    jobs = [job for job in jobs if args.run in {"all", job[0]} and job[2] <= job[3]]
    if not jobs:
        print("No IMERG run intersects the requested period.")
        return
    snapshot = inventory([SHORT_NAME if job[0] == "final" else LATE_SHORT_NAME for job in jobs], args)
    for run, extract, first, last, raw, output in jobs:
        product = SHORT_NAME if run == "final" else LATE_SHORT_NAME
        _, ranges = describe(snapshot, product, first.isoformat(), last.isoformat())
        if args.show_missing:
            continue
        for missing_start, missing_end in ranges:
            options = ["--start", missing_start.isoformat(), "--end", missing_end.isoformat(),
                       "--raw-dir", str(raw), "--output-dir", str(output)]
            if run == "final":
                options += ["--minimum-coverage", str(MINIMUM_COVERAGE)]
            print(f"IMERG {run}: {missing_start} a {missing_end}", flush=True)
            extract([*options, *forwarded])


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
