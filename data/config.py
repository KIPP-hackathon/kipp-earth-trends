
from pathlib import Path

# Produto NASA
SHORT_NAME = "M2TMNXSLV"
VERSION = "5.12.4"
VARIABLE = "TS"

# Período de interesse
START_DATE = "2024-01-01"
END_DATE = "2025-12-31"
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
