
import calendar
import logging
import os
from pathlib import Path

import earthaccess
import numpy as np
import pandas as pd
import xarray as xr
import matplotlib.pyplot as plt
from google.cloud import storage

from config import (
    SHORT_NAME,
    VERSION,
    VARIABLE,
    VARIABLES,
    START_DATE,
    END_DATE,
    RAW_DIR,
    NETCDF_DIR,
    CSV_DIR,
    MAP_DIR,
    LOG_DIR
)


# ==========================================================
# 1. LOGGING
# ==========================================================

logging.basicConfig(
    filename=LOG_DIR / "pipeline.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# ==========================================================
# 2. VALIDAR PERÍODO
# ==========================================================

def validate_period():

    start = pd.Timestamp(START_DATE)
    end = pd.Timestamp(END_DATE)

    if start.day != 1:
        raise ValueError("START_DATE deve ser o primeiro dia do mês.")

    last_day = calendar.monthrange(
        end.year, end.month
    )[1]

    if end.day != last_day:
        raise ValueError("END_DATE deve ser o último dia do mês.")

    if end < start:
        raise ValueError("Período inválido.")

    return start, end


# ==========================================================
# 3. AUTENTICAÇÃO
# ==========================================================

def authenticate():

    logger.info("Iniciando autenticação Earthdata.")

    auth = earthaccess.login()

    if not auth.authenticated:
        raise RuntimeError("Falha na autenticação Earthdata.")

    logger.info("Autenticação concluída.")

    return auth


# ==========================================================
# 4. BUSCAR GRANULES NO CMR
# ==========================================================

def search_granules():

    logger.info("Buscando granules no catálogo NASA.")

    start, end = validate_period()

    granules = earthaccess.search_data(
        short_name=SHORT_NAME,
        version=VERSION,
        temporal=(
            start.strftime("%Y-%m-%d"),
            end.strftime("%Y-%m-%d")
        ),
        count=2000
    )

    if not granules:
        raise RuntimeError(
            "Nenhum arquivo encontrado para o período solicitado."
        )

    logger.info(
        "Granules encontrados: %s",
        len(granules)
    )

    return granules


# ==========================================================
# 5. DOWNLOAD DOS ARQUIVOS ORIGINAIS
# ==========================================================


def download_data(granules):

    logger.info("Verificando arquivos existentes.")

    # Identifica arquivos já baixados
    existing_files = {
        f.name
        for f in RAW_DIR.iterdir()
        if f.is_file()
    }

    # Identifica os arquivos necessários
    missing_granules = []

    for granule in granules:

        filename = Path(
            granule.data_links()[0].split("?")[0]
        ).name

        if filename not in existing_files:
            missing_granules.append(granule)

    logger.info(
        "Granules encontrados: %s",
        len(granules)
    )

    logger.info(
        "Arquivos já existentes: %s",
        len(granules) - len(missing_granules)
    )

    logger.info(
        "Arquivos pendentes: %s",
        len(missing_granules)
    )

    # Baixa somente os arquivos ausentes
    if missing_granules:

        logger.info("Iniciando download dos arquivos pendentes.")

        earthaccess.download(
            missing_granules,
            local_path=str(RAW_DIR)
        )

    else:

        logger.info("Todos os arquivos já existem. Download ignorado.")

    # Retorna os arquivos disponíveis
    paths = sorted(
        list(RAW_DIR.glob("*.nc4")) +
        list(RAW_DIR.glob("*.nc"))
    )

    if not paths:
        raise RuntimeError("Nenhum arquivo NetCDF disponível.")

    return paths



# ==========================================================
# 6. ABRIR DATASETS
# ==========================================================

def open_datasets(files):

    logger.info("Abrindo arquivos NetCDF.")

    ds = xr.open_mfdataset(
        [str(f) for f in files],
        combine="by_coords",
        decode_times=True,
        mask_and_scale=True,
        parallel=False
    )

    return ds


# ==========================================================
# 7. IDENTIFICAR VARIÁVEL E COORDENADAS
# ==========================================================

def find_name(names, target):

    matches = [
        name for name in names
        if name.lower() == target.lower()
    ]

    if not matches:
        raise KeyError(
            f"Não foi possível encontrar {target}. "
            f"Nomes disponíveis: {list(names)}"
        )

    return matches[0]


# ==========================================================
# 8. REPRODUZIR TIME-AVERAGED MAP
# ==========================================================

def calculate_time_average(ds):
    logger.info("Selecionando dados mensais.")

    time_name = find_name(ds.coords, "time")
    start, end = validate_period()

    # Seleciona o período solicitado, mantendo todas as variáveis
    ds = ds.sel({time_name: slice(start, end)})

    if ds.sizes[time_name] == 0:
        raise RuntimeError("Nenhum dado encontrado.")

    # Normaliza longitude no dataset todo
    lon_name = find_name(ds.coords, "lon")
    longitude = ((ds[lon_name] + 180) % 360) - 180

    result = (
        ds.assign_coords({lon_name: longitude})
        .sortby(lon_name)
    )

    logger.info("Meses encontrados: %s", result.sizes[time_name])
    logger.info("Variáveis encontradas: %s", list(result.data_vars))

    return result



# ==========================================================
# 9. SALVAR NETCDF PROCESSADO
# ==========================================================

def save_netcdf(result):

    logger.info("Salvando NetCDF processado.")

    output = result.to_dataset(
        name=f"{VARIABLE}_mean_K"
    )

    output[f"{VARIABLE}_mean_C"] = (
        result - 273.15
    )

    output[f"{VARIABLE}_mean_K"].attrs.update({
        "long_name": "Time averaged surface skin temperature",
        "units": "K"
    })

    output[f"{VARIABLE}_mean_C"].attrs.update({
        "long_name": "Time averaged surface skin temperature",
        "units": "degree_Celsius"
    })

    output.attrs.update({
        "dataset": SHORT_NAME,
        "version": VERSION,
        "variable": VARIABLE,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "processing": "Linear temporal mean, skip missing values",
        "spatial_coverage": "Global"
    })

    filename = (
        f"{SHORT_NAME}_{VARIABLE}_"
        f"{START_DATE}_{END_DATE}.nc"
    )

    path = NETCDF_DIR / filename

    output.to_netcdf(
        path,
        encoding={
            f"{VARIABLE}_mean_K": {
                "zlib": True,
                "complevel": 4
            },
            f"{VARIABLE}_mean_C": {
                "zlib": True,
                "complevel": 4
            }
        }
    )

    logger.info("NetCDF salvo: %s", path)

    return path


# ==========================================================
# 10. EXPORTAR CSV GLOBAL
# ==========================================================

def save_csv(result):

    logger.info("Exportando CSV.")

    df = result.to_dataframe(
        name=f"{VARIABLE}_mean_K"
    ).reset_index()

    df[f"{VARIABLE}_mean_C"] = (
        df[f"{VARIABLE}_mean_K"] - 273.15
    )

    filename = (
        f"{SHORT_NAME}_{VARIABLE}_"
        f"{START_DATE}_{END_DATE}.csv"
    )

    path = CSV_DIR / filename

    df.to_csv(
        path,
        index=False
    )

    logger.info("CSV salvo: %s", path)

    return path

def save_monthly_csv(result):
    time_name = find_name(result.coords, "time")

    bucket_name = "nasa-earth-trends-lab-raw"
    gcs_prefix = "transient"

    client = storage.Client()
    bucket = client.bucket(bucket_name)

    uploaded_paths = []

    for variable_name in (name for name in VARIABLES if name):
        variable = result[variable_name]
        variable_folder = str(variable_name)

        for i in range(result.sizes[time_name]):
            monthly = variable.isel({time_name: i})
            date = pd.Timestamp(result[time_name].values[i])

            year_month = date.strftime("%Y_%m")
            year = date.strftime("%Y")

            df = monthly.to_dataframe(name=variable_folder).reset_index()

            filename = f"{SHORT_NAME}_{variable_folder}_{year_month}.csv"
            blob_name = (
                f"{gcs_prefix}/{SHORT_NAME}_{variable_folder}/{year}/{filename}"
            )

            bucket.blob(blob_name).upload_from_string(
                df.to_csv(index=False),
                content_type="text/csv"
            )

            gcs_path = f"gs://{bucket_name}/{blob_name}"
            uploaded_paths.append(gcs_path)
            logger.info("CSV mensal salvo no GCS: %s", gcs_path)

    return uploaded_paths
# ==========================================================
# 11. GERAR MAPA GLOBAL
# ==========================================================

def generate_map(result):

    logger.info("Gerando mapa global.")

    lat_name = find_name(result.coords, "lat")
    lon_name = find_name(result.coords, "lon")

    temperature = result - 273.15

    fig, ax = plt.subplots(
        figsize=(15, 7)
    )

    mesh = ax.pcolormesh(
        result[lon_name].values,
        result[lat_name].values,
        temperature.values,
        cmap="coolwarm",
        shading="auto"
    )

    colorbar = fig.colorbar(
        mesh,
        ax=ax,
        orientation="vertical",
        pad=0.02
    )

    colorbar.set_label(
        "Surface Skin Temperature (°C)"
    )

    ax.set_title(
        f"MERRA-2 Surface Skin Temperature\n"
        f"{START_DATE} to {END_DATE}"
    )

    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")

    ax.set_xlim(-180, 180)
    ax.set_ylim(-90, 90)

    ax.grid(
        alpha=0.25,
        linestyle="--"
    )

    filename = (
        f"{SHORT_NAME}_{VARIABLE}_"
        f"{START_DATE}_{END_DATE}.png"
    )

    path = MAP_DIR / filename

    plt.savefig(
        path,
        dpi=200,
        bbox_inches="tight"
    )

    plt.close(fig)

    logger.info("Mapa salvo: %s", path)

    return path


# ==========================================================
# 12. EXECUÇÃO PRINCIPAL
# ==========================================================

def main():

    logger.info("===== PIPELINE INICIADO =====")
    print(f"===== {SHORT_NAME} =====")

    try:

        authenticate()

        granules = search_granules()

        files = download_data(granules)

        ds = open_datasets(files)

        try:
            result = calculate_time_average(ds)

            # netcdf_path = save_netcdf(result)

            csv_paths = save_monthly_csv(result)

            # map_path = generate_map(result)

            logger.info("===== PIPELINE CONCLUÍDO =====")

            print("\nProcessamento concluído!")

            print("Arquivos gerados:")
            # print(netcdf_path)
            for path in csv_paths:
                print(path)
            # print(map_path)

        finally:
            ds.close()

    except Exception:

        logger.exception("Erro no pipeline.")

        raise


if __name__ == "__main__":
    main()
