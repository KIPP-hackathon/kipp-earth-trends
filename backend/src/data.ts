import { ApiError, quoteIdentifier } from "./core.ts";
import type { Parameters, Provider } from "./core.ts";

type Variable = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  product: string;
  run?: string;
  table: string;
  column: string;
  coverage?: string;
  nativeGrid: [number, number];
};
export const variables: Variable[] = [
  {
    id: "temperature",
    name: "Temperatura do ar a 10 m",
    quantity: "air_temperature_10m",
    unit: "degC",
    product: "MERRA-2 M2TMNXSLV",
    table: "tb_merra2_t10m",
    column: "T10M_C",
    nativeGrid: [0.625, 0.5],
  },
  {
    id: "surface_temperature",
    name: "Temperatura de superfície",
    quantity: "surface_temperature",
    unit: "degC",
    product: "MERRA-2 M2TMNXSLV",
    table: "tb_merra2_ts",
    column: "TS_C",
    nativeGrid: [0.625, 0.5],
  },
  {
    id: "rainfall",
    name: "Precipitação mensal · Final",
    quantity: "monthly_precipitation",
    unit: "mm/month",
    product: "GPM IMERG V07",
    run: "Final",
    table: "tb_gpm_imerg_precipitation",
    column: "precipitation_mm_month",
    coverage: "valid_area_fraction",
    nativeGrid: [0.625, 0.5],
  },
  {
    id: "rainfall_late",
    name: "Precipitação mensal · Late",
    quantity: "monthly_precipitation",
    unit: "mm/month",
    product: "GPM IMERG V07",
    run: "Late",
    table: "tb_gpm_imerg_late_precipitation",
    column: "precipitation_mm_month",
    coverage: "valid_area_fraction",
    nativeGrid: [0.625, 0.5],
  },
];
export const limitations = [
  "Dados reais derivados de produtos NASA, sem classificação automática de eventos ou atribuição causal.",
  "A grade retornada é agregada para visualização; não adiciona resolução à fonte.",
  "Temperatura do ar a 10 m é distinta da temperatura a 2 m e da temperatura de superfície.",
  "IMERG Final e Late permanecem separados por terem processamento e cobertura diferentes.",
  "Sem anomalias ou inferência de tendências climáticas nesta API.",
];
export function variableFor(id: string): Variable {
  const variable = variables.find((v) => v.id === id);
  if (!variable)
    throw new ApiError(
      404,
      "VARIABLE_NOT_FOUND",
      "Variável indisponível. Consulte /v1/catalog.",
    );
  return variable;
}
export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
  wrap: boolean;
};
export function parseBounds(input = "-180,-90,180,90"): Bounds {
  const numbers = input.split(",").map(Number);
  if (
    numbers.length !== 4 ||
    input.split(",").some((s) => !s.trim()) ||
    numbers.some((n) => !Number.isFinite(n))
  )
    throw new ApiError(
      400,
      "INVALID_BBOX",
      "bbox deve conter oeste,sul,leste,norte.",
    );
  const [west, south, east, north] = numbers;
  if (
    west < -180 ||
    west > 180 ||
    east < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90 ||
    south >= north ||
    west === east ||
    (west === 180 && east === -180)
  )
    throw new ApiError(400, "INVALID_BBOX", "Limites geográficos inválidos.");
  return {
    west,
    south,
    east: east < west ? east + 360 : east,
    north,
    wrap: east < west,
  };
}
export function parseMonth(input: string): string {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(input) ||
    input < "1900-01" ||
    input > "2100-12"
  )
    throw new ApiError(400, "INVALID_MONTH", "Use um mês no formato YYYY-MM.");
  return input;
}
export function monthAfter(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
}
function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export class DataService {
  provider: Provider;
  constructor(provider: Provider) {
    this.provider = provider;
  }
  private q(value: string) {
    return quoteIdentifier(value, this.provider.dialect);
  }
  private table(v: Variable) {
    const override = process.env[`TABLE_${v.id.toUpperCase()}`] ?? v.table;
    const schema = process.env.DATA_SCHEMA ?? "refined";
    const parts =
      this.provider.dialect === "databricks"
        ? [process.env.DATA_CATALOG ?? "earth-trend-data", schema, override]
        : [schema, override];
    return parts.map((p) => this.q(p)).join(".");
  }
  private month(expr = this.q("time")) {
    return this.provider.dialect === "databricks"
      ? `date_format(${expr}, 'yyyy-MM')`
      : `to_char(${expr}, 'YYYY-MM')`;
  }
  private finite(expr: string) {
    return this.provider.dialect === "databricks"
      ? `${expr} IS NOT NULL AND NOT isnan(${expr}) AND ABS(${expr}) < 1e30`
      : `${expr} IS NOT NULL AND ${expr} > '-Infinity'::float8 AND ${expr} < 'Infinity'::float8`;
  }
  async availability(variable: Variable) {
    const value = this.q(variable.column);
    const rows = await this.provider.query(
      `SELECT ${this.month()} AS month, COUNT(*) AS samples,
      SUM(CASE WHEN ${this.finite(value)} THEN 1 ELSE 0 END) AS valid_samples
      FROM ${this.table(variable)} GROUP BY ${this.month()} ORDER BY month LIMIT 2400`,
      {},
      2400,
    );
    return rows.map((r) => ({
      month: String(r.month),
      samples: numeric(r.samples),
      validSamples: numeric(r.valid_samples),
    }));
  }
  private selected(
    variable: Variable,
    bounds: Bounds,
    start: string,
    endExclusive: string,
  ) {
    const value = this.q(variable.column),
      latitude = this.q("lat"),
      longitude = this.q("lon");
    const coverage = variable.coverage ? this.q(variable.coverage) : "1.0";
    const valid = `${this.finite(value)}${variable.quantity === "monthly_precipitation" ? ` AND ${value} >= 0` : ""}`;
    const goodCoverage = variable.coverage
      ? `CASE WHEN ${this.finite(coverage)} AND ${coverage} BETWEEN 0 AND 1 THEN ${coverage} ELSE 0.0 END`
      : "1.0";
    const parameters: Parameters = {
      west: bounds.west,
      east: bounds.wrap ? bounds.east - 360 : bounds.east,
      south: bounds.south,
      north: bounds.north,
      start,
      end: endExclusive,
    };
    const sql = `SELECT ${this.q("time")} AS observed_time, ${latitude} AS lat,
      ${bounds.wrap ? `CASE WHEN ${longitude} < :west THEN ${longitude}+360 ELSE ${longitude} END` : longitude} AS lon,
      CASE WHEN ${valid} THEN ${value} ELSE NULL END AS value,
      CASE WHEN ${valid} THEN ${goodCoverage} ELSE 0.0 END AS coverage,
      GREATEST(0.0, COS(RADIANS(${latitude}))) AS area_weight
      FROM ${this.table(variable)} WHERE ${this.q("time")} >= CAST(:start AS TIMESTAMP)
      AND ${this.q("time")} < CAST(:end AS TIMESTAMP)
      AND ${latitude} BETWEEN :south AND :north
      AND ${bounds.wrap ? `(${longitude} >= :west OR ${longitude} <= :east)` : `${longitude} BETWEEN :west AND :east`}`;
    return { sql, parameters };
  }
  async frame(
    id: string,
    monthInput: string,
    bbox: string | undefined,
    factor: number,
    maxCells = 210_000,
  ) {
    const variable = variableFor(id),
      month = parseMonth(monthInput),
      bounds = parseBounds(bbox);
    if (![1, 2, 4, 8, 16, 32].includes(factor))
      throw new ApiError(
        400,
        "INVALID_FACTOR",
        "factor deve ser 1, 2, 4, 8, 16 ou 32.",
      );
    const nominalDx = variable.nativeGrid[0] * factor,
      nominalDy = variable.nativeGrid[1] * factor;
    const width = Math.ceil((bounds.east - bounds.west) / nominalDx),
      height = Math.ceil((bounds.north - bounds.south) / nominalDy);
    // Fit a regular grid exactly to the requested bounds; no short edge cells.
    const dx = (bounds.east - bounds.west) / width,
      dy = (bounds.north - bounds.south) / height;
    if (width * height > maxCells)
      throw new ApiError(
        413,
        maxCells === 65_000 ? "USE_BINARY" : "GRID_TOO_LARGE",
        maxCells === 65_000
          ? "Use format=f32 para esta grade ou aumente factor."
          : "Grade grande demais. Aumente factor ou reduza bbox.",
      );
    const { sql, parameters } = this.selected(
      variable,
      bounds,
      `${month}-01`,
      monthAfter(month),
    );
    const rows = await this.provider.query(
      `WITH selected AS (${sql}), binned AS (
      -- Source coordinates contain tiny floating-point offsets near zero.
      -- Snap within 1e-9 of a cell boundary before assigning the display bin.
      SELECT LEAST(CAST(:width AS INT)-1, GREATEST(0, FLOOR((lon - (:west)) / (:dx) + 1e-9))) AS x,
      LEAST(CAST(:height AS INT)-1, GREATEST(0, FLOOR(((:north) - lat) / (:dy) + 1e-9))) AS y,
      value, coverage, area_weight FROM selected)
      SELECT x, y, SUM(value*coverage*area_weight)/NULLIF(SUM(coverage*area_weight),0) AS value,
      SUM(coverage*area_weight)/NULLIF(SUM(area_weight),0) AS coverage, COUNT(*) AS samples
      FROM binned GROUP BY x,y ORDER BY y,x`,
      { ...parameters, width, height, dx, dy },
      width * height + 1,
    );
    if (!rows.length)
      throw new ApiError(
        404,
        "NO_DATA",
        "Não há dados para a variável, mês e área solicitados.",
      );
    const count = width * height,
      values = new Float32Array(count),
      coverage = new Float32Array(count);
    values.fill(NaN);
    let validCells = 0;
    for (const row of rows) {
      const x = numeric(row.x),
        y = numeric(row.y),
        value = numeric(row.value),
        fraction = numeric(row.coverage);
      if (
        x === null ||
        y === null ||
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 0 ||
        y < 0 ||
        x >= width ||
        y >= height
      )
        throw new ApiError(
          502,
          "INVALID_GRID",
          "A fonte retornou coordenadas de grade inválidas.",
        );
      const i = y * width + x;
      coverage[i] = Math.min(1, Math.max(0, fraction ?? 0));
      if (value !== null && coverage[i] > 0) {
        values[i] = value;
        validCells++;
      }
    }
    const metadata = {
      version: 1,
      variable: variable.id,
      quantity: variable.quantity,
      unit: variable.unit,
      product: variable.product,
      run: variable.run,
      month,
      grid: {
        width,
        height,
        bounds: [bounds.west, bounds.south, bounds.east, bounds.north],
        longitudeStep: dx,
        latitudeStep: dy,
        nominalLongitudeStep: nominalDx,
        nominalLatitudeStep: nominalDy,
        orientation: "north_to_south,west_to_east",
        antimeridian: bounds.wrap,
      },
      validCells,
      totalCells: count,
      factor,
      nodata: "NaN",
      dtype: "float32",
      byteOrder: "little",
      components: ["value", "valid_area_fraction"],
      layout: "planar",
      aggregation:
        "geographic bins; mean weighted by cos(latitude) and available area coverage; display only",
      simulated: false,
      limitations,
    };
    return { metadata, values, coverage };
  }
  async series(id: string, startInput: string, endInput: string, bbox: string) {
    const variable = variableFor(id),
      start = parseMonth(startInput),
      end = parseMonth(endInput),
      bounds = parseBounds(bbox);
    const months =
      (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
      Number(end.slice(5)) -
      Number(start.slice(5));
    if (months < 0 || months >= 120)
      throw new ApiError(
        400,
        "INVALID_PERIOD",
        "Selecione um período ordenado de até 120 meses.",
      );
    const { sql, parameters } = this.selected(
      variable,
      bounds,
      `${start}-01`,
      monthAfter(end),
    );
    const rows = await this.provider.query(
      `WITH selected AS (${sql}) SELECT ${this.month("observed_time")} AS month,
      SUM(value*coverage*area_weight)/NULLIF(SUM(coverage*area_weight),0) AS value,
      SUM(coverage*area_weight)/NULLIF(SUM(area_weight),0) AS coverage,
      COUNT(*) AS samples FROM selected GROUP BY ${this.month("observed_time")} ORDER BY month`,
      parameters,
      120,
    );
    if (!rows.length)
      throw new ApiError(
        404,
        "NO_DATA",
        "Não há dados no período e área solicitados.",
      );
    return {
      variable: variable.id,
      quantity: variable.quantity,
      unit: variable.unit,
      product: variable.product,
      run: variable.run,
      bbox: [bounds.west, bounds.south, bounds.east, bounds.north],
      start,
      end,
      simulated: false,
      method:
        "mean weighted by cos(latitude) and valid_area_fraction over selected source grid points; bbox, not a basin polygon",
      observations: rows.map((r) => ({
        month: String(r.month),
        value: numeric(r.value),
        coverage: numeric(r.coverage),
        samples: numeric(r.samples),
      })),
      limitations,
    };
  }
}

export function encodeFrame(frame: Awaited<ReturnType<DataService["frame"]>>) {
  const header = Buffer.from(JSON.stringify(frame.metadata));
  const offset = Math.ceil((8 + header.length) / 4) * 4;
  const buffer = Buffer.alloc(offset + frame.values.length * 8);
  buffer.write("KIPP", 0, "ascii");
  buffer.writeUInt32LE(header.length, 4);
  header.copy(buffer, 8);
  for (let i = 0; i < frame.values.length; i++) {
    buffer.writeFloatLE(frame.values[i], offset + i * 4);
    buffer.writeFloatLE(
      frame.coverage[i],
      offset + frame.values.length * 4 + i * 4,
    );
  }
  return buffer;
}
export function frameJson(frame: Awaited<ReturnType<DataService["frame"]>>) {
  if (frame.values.length > 65_000)
    throw new ApiError(
      413,
      "USE_BINARY",
      "Use format=f32 para esta grade ou aumente factor.",
    );
  return {
    ...frame.metadata,
    nodata: null,
    values: Array.from(frame.values, (v) => (Number.isFinite(v) ? v : null)),
    coverage: Array.from(frame.coverage),
  };
}

export function metadataOf(variable: Variable) {
  const {
    table: _table,
    column: _column,
    coverage: _coverage,
    ...publicMetadata
  } = variable;
  return publicMetadata;
}
