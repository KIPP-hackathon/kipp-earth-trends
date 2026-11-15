
from pathlib import Path

# Produto NASA
# PEGAR ESSAS VARIÁVEIS DO ARQUIVO variables.txt
SHORT_NAME = "M2TMNXSLV"
VARIABLES = [
    'T2M', 'T10M', 'TS', 'T850', 'T500', 'CLDTMP', 'TQV', 'QV2M', 'TQL', 'TQI', 'SLP', 'U10M', 'V10M', 'U850', 'V850', 'CLDTOT', 'CLDPRS', 'SWGDN', 'LWGNET', 'TO3'
]

# Período de interesse
START_DATE = "2000-01-01"
END_DATE = "2026-10-31"
# Diretórios
BASE_DIR = Path(__file__).resolve().parent

RAW_DIR = BASE_DIR / "data" / "raw" / SHORT_NAME

PROCESSED_DIR = BASE_DIR / "data" / "processed"

NETCDF_DIR = PROCESSED_DIR / "netcdf"
CSV_DIR = PROCESSED_DIR / "csv"
MAP_DIR = PROCESSED_DIR / "maps"

LOG_DIR = BASE_DIR / "logs"

# Configuração de visualização
OUTPUT_UNIT = "C"

for directory in [
    RAW_DIR,
    NETCDF_DIR,
    CSV_DIR,
    MAP_DIR,
    LOG_DIR
]:
    directory.mkdir(parents=True, exist_ok=True)

VERSION = "5.12.4"
VARIABLE = "T10M"