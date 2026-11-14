"""Load versioned descriptions and apply them to Delta tables."""

from pathlib import Path

import yaml


def load_description(path, table):
    with Path(path).open(encoding="utf-8") as handle:
        description = yaml.safe_load(handle)

    if not isinstance(description, dict) or description.get("table", {}).get("name") != table:
        raise ValueError("O YAML deve descrever a mesma tabela definida em TABLE.")

    table_description = description["table"].get("description")
    if not isinstance(table_description, str) or not table_description.strip():
        raise ValueError("A descrição da tabela é obrigatória.")

    columns = description.get("columns")
    if not isinstance(columns, dict) or not columns:
        raise ValueError("O YAML deve conter descrições das colunas.")

    for name, metadata in columns.items():
        if not isinstance(name, str) or not isinstance(metadata, dict):
            raise ValueError("Cada coluna deve ter nome e metadados válidos.")
        text = metadata.get("description")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"Descrição ausente para a coluna {name}.")

    return description


def validate_columns(description, columns):
    documented = set(description["columns"])
    actual = set(columns)
    if documented != actual:
        raise ValueError(
            f"Colunas sem descrição: {sorted(actual - documented)}. "
            f"Descrições sem coluna: {sorted(documented - actual)}."
        )


def sql_literal(value):
    # Escape Spark SQL string literals, including backslashes from source text.
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def apply_comments(spark, table, description):
    # Check the persisted schema before applying comments.
    validate_columns(description, spark.table(table).columns)
    spark.sql(
        f"COMMENT ON TABLE {table} IS {sql_literal(description['table']['description'])}"
    )
    for name, metadata in description["columns"].items():
        quoted_name = "`" + name.replace("`", "``") + "`"
        spark.sql(
            f"ALTER TABLE {table} ALTER COLUMN {quoted_name} "
            f"COMMENT {sql_literal(metadata['description'])}"
        )
