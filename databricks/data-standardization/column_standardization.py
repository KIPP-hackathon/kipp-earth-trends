"""Apply the column mapping and descriptions used by trusted notebooks."""

from pathlib import Path
import re

import yaml

from table_metadata import validate_columns


def load_mapping(path):
    with Path(path).open(encoding="utf-8") as handle:
        mapping = yaml.safe_load(handle)

    if not isinstance(mapping["write_enabled"], bool):
        raise ValueError("write_enabled deve ser true ou false no YAML.")
    if mapping["source_table"] == mapping["target_table"]:
        raise ValueError("As tabelas de origem e destino devem ser diferentes.")

    columns = mapping["columns"]
    if not isinstance(columns, dict) or not columns:
        raise ValueError("O mapeamento deve definir as colunas de origem e destino.")
    if not all(isinstance(name, str) and name.strip() for name in columns.values()):
        raise ValueError("Cada coluna de destino deve ter um nome válido.")
    if len({name.casefold() for name in columns.values()}) != len(columns):
        raise ValueError("O mapeamento contém nomes de destino duplicados.")

    column_types = mapping.get("column_types", {})
    if not isinstance(column_types, dict) or any(
        name not in columns.values() or not isinstance(dtype, str) or not dtype.strip()
        for name, dtype in column_types.items()
    ):
        raise ValueError("column_types deve mapear colunas de destino para tipos Spark SQL.")

    constraints = mapping.get("constraints", {})
    primary_key = constraints.get("primary_key", [])
    not_null = constraints.get("not_null", [])
    for label, names in (("primary_key", primary_key), ("not_null", not_null)):
        if not isinstance(names, list) or any(name not in columns.values() for name in names):
            raise ValueError(f"constraints.{label} deve listar colunas de destino existentes.")
        if len(set(names)) != len(names):
            raise ValueError(f"constraints.{label} contém colunas repetidas.")
    if not set(primary_key).issubset(not_null):
        raise ValueError("Todas as colunas da PK devem constar em not_null.")
    return mapping


def standardize_columns(source_df, mapping, source_description):
    columns = mapping["columns"]
    validate_columns(source_description, source_df.columns)
    if set(columns) != set(source_df.columns):
        raise ValueError("O mapeamento deve cobrir exatamente todas as colunas da origem.")

    df = source_df.select(*[
        source_df["`" + source.replace("`", "``") + "`"].alias(target)
        for source, target in columns.items()
    ])

    # Cast before checking keys: timestamps on the same day may become duplicates.
    for name, dtype in mapping.get("column_types", {}).items():
        df = df.withColumn(name, df[quote_identifier(name)].cast(dtype))

    name_pattern = re.compile(r"\b(" + "|".join(re.escape(name) for name in columns) + r")\b")
    descriptions = {}
    for source, target in columns.items():
        metadata = dict(source_description["columns"][source])
        metadata["description"] = name_pattern.sub(
            lambda match: columns[match.group()], metadata["description"]
        )
        if mapping.get("column_types", {}).get(target) == "date":
            metadata["description"] += " Na camada trusted, convertido para DATE em UTC, preservando o dia da referência de origem."
        descriptions[target] = metadata

    description = {
        "table": {**source_description["table"], "name": mapping["target_table"]},
        "columns": descriptions,
    }
    validate_columns(description, df.columns)
    return df, description


def quote_identifier(name):
    return "`" + name.replace("`", "``") + "`"


def validate_key_data(df, mapping):
    """Reject invalid keys before replacing the existing trusted data."""
    constraints = mapping.get("constraints", {})
    not_null = constraints.get("not_null", [])
    primary_key = constraints.get("primary_key", [])
    if not_null:
        predicate = " OR ".join(f"{quote_identifier(name)} IS NULL" for name in not_null)
        if df.filter(predicate).limit(1).count():
            raise ValueError(f"Valores nulos nas colunas obrigatórias: {not_null}")
    if primary_key:
        keys = df.select(*[df[quote_identifier(name)] for name in primary_key])
        if keys.groupBy(*primary_key).count().filter("count > 1").limit(1).count():
            raise ValueError(f"Chave primária duplicada: {primary_key}")


def apply_constraints(spark, mapping):
    """Declare enforced NOT NULL and informational PK; safe to run repeatedly."""
    table = mapping["target_table"]
    constraints = mapping.get("constraints", {})
    for name in constraints.get("not_null", []):
        spark.sql(f"ALTER TABLE {table} ALTER COLUMN {quote_identifier(name)} SET NOT NULL")
    primary_key = constraints.get("primary_key", [])
    if not primary_key:
        return
    # Mapping targets are three-part Unity Catalog identifiers.
    parts = table.replace("`", "").split(".")
    if len(parts) != 3:
        raise ValueError("A tabela de destino deve incluir catálogo, schema e nome.")
    catalog, schema, name = parts
    literal = lambda value: "'" + value.replace("'", "''") + "'"
    existing = spark.sql(f"""
        SELECT k.column_name
        FROM {quote_identifier(catalog)}.information_schema.table_constraints AS t
        JOIN {quote_identifier(catalog)}.information_schema.key_column_usage AS k
          ON t.constraint_catalog = k.constraint_catalog
         AND t.constraint_schema = k.constraint_schema
         AND t.constraint_name = k.constraint_name
        WHERE t.table_catalog = {literal(catalog)}
          AND t.table_schema = {literal(schema)}
          AND t.table_name = {literal(name)}
          AND t.constraint_type = 'PRIMARY KEY'
        ORDER BY k.ordinal_position
    """).collect()
    if existing:
        if [row["column_name"] for row in existing] != primary_key:
            raise ValueError(f"A PK existente em {table} difere do YAML.")
        return
    columns = ", ".join(quote_identifier(column) for column in primary_key)
    constraint_name = quote_identifier("pk_" + name)
    spark.sql(f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} PRIMARY KEY ({columns})")
