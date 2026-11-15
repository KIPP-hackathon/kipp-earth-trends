import {
  ApiError,
  quoteIdentifier,
  queryBudget,
  withQueryBudget,
} from "./core.ts";
import type { Parameters, Provider } from "./core.ts";

import { variables } from "./registry.ts";
import { trustedColumns } from "./trusted-map.ts";
import { comparisonReference, transformComparison } from "./comparison.ts";
import { buildInvestigation, validateInvestigation } from "./investigation.ts";
import type { InvestigationRequest } from "./investigation.ts";
import type { Variable } from "./registry.ts";
export { variables, excludedSources } from "./registry.ts";
export type { Variable, RenderMetadata } from "./registry.ts";

export const limitations = [
  "Real data derived from NASA products; no automatic event classification or causal attribution.",
  "The returned grid is aggregated for display; it does not increase source resolution.",
  "Air temperature at 10 m differs from air temperature at 2 m and surface temperature.",
  "MERRA-2 precipitation fields are modeled fluxes in their stated units, not IMERG monthly rainfall totals.",
  "COSP satellite-simulator diagnostics are model outputs, not direct MODIS or ISCCP observations; native variance is not regional uncertainty.",
  "Color scales are display ranges, not scientific limits or global observed minima/maxima.",
];
export function variableFor(id: string): Variable {
  const variable = variables.find((v) => v.id === id);
  if (!variable)
    throw new ApiError(
      404,
      "VARIABLE_NOT_FOUND",
      "Variable unavailable. See /v1/catalog.",
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
    throw new ApiError(400, "INVALID_BBOX", "Invalid geographic bounds.");
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
    throw new ApiError(400, "INVALID_MONTH", "Use a month in YYYY-MM format.");
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

export type MonthAvailability = {
  month: string;
  samples: number | null;
  validSamples: number | null;
  processingRun?: string;
};
export type CatalogVariable = ReturnType<typeof metadataOf> & {
  months: MonthAvailability[];
  available: boolean;
  firstMonth: string | null;
  lastMonth: string | null;
  unavailableReason: { code: string; message: string } | null;
  colorRangeSource: "indicator_coverage_p5_p95" | "configured_default";
  coverageFlag: boolean | null;
};

export function coverageFlags(rows: Record<string, unknown>[], entries: Variable[]) {
  const flags = new Map<string, boolean | null>();
  for (const v of entries) {
    const column = trustedColumns[v.table]?.[v.column];
    const matching = rows.filter((row) => column &&
      row.full_table_name === `earth-trend-data.trusted.${v.table}` && row.indicator === column);
    const values = matching.map((row) => row.valid_flag);
    flags.set(v.id, values.some((value) => value === false || value === "false")
      ? false : values.some((value) => value === true || value === "true") ? true : null);
  }
  return flags;
}

export function percentileDomains(rows: Record<string, unknown>[], entries: Variable[]) {
  const matches = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = `${row.full_table_name}.${row.indicator}`;
    matches.set(key, [...(matches.get(key) ?? []), row]);
  }
  const domains = new Map<string, [number, number]>();
  for (const v of entries) {
    if (v.render.kind !== "continuous") continue;
    const column = trustedColumns[v.table]?.[v.column];
    const candidates = matches.get(`earth-trend-data.trusted.${v.table}.${column}`);
    if (!column || candidates?.length !== 1) continue;
    const low = numeric(candidates[0].p5), high = numeric(candidates[0].p95);
    if (low === null || high === null || low >= high) continue;
    const converted = [low * v.conversion.scale + v.conversion.offset, high * v.conversion.scale + v.conversion.offset].sort((a, b) => a - b);
    if (converted.every(Number.isFinite) && converted[0] < converted[1])
      domains.set(v.id, [converted[0], converted[1]]);
  }
  return domains;
}
export type DataServiceOptions = { schema?: string; variables?: Variable[] };
export class DataService {
  provider: Provider;
  readonly variables: Variable[];
  private schema: string;
  constructor(provider: Provider, options: DataServiceOptions = {}) {
    this.provider = provider;
    this.variables = options.variables ?? variables;
    this.schema = "trusted";
    if (provider.dialect !== "databricks")
      throw new Error("The active DataService requires SQL Warehouse. Lakebase remains a separate future adapter.");
  }
  private variable(id: string) {
    const variable = this.variables.find((v) => v.id === id);
    if (!variable)
      throw new ApiError(
        404,
        "VARIABLE_NOT_FOUND",
        "Variable unavailable from this source. See /v1/catalog.",
      );
    return variable;
  }
  private q(value: string) {
    return quoteIdentifier(value, this.provider.dialect);
  }
  private physical(variable: Variable, column: string) {
    const name = trustedColumns[variable.table]?.[column];
    if (!name) throw new Error("Unreviewed trusted source column");
    return this.q(name);
  }
  private table(v: Variable) {
    // Fixed reviewed trusted contract. Never route to refined or a Lakebase table.
    return ["earth-trend-data", this.schema, v.table].map((part) => this.q(part)).join(".");
  }
  private month(expr = this.q("time")) {
    return this.provider.dialect === "databricks"
      ? `date_format(${expr}, 'yyyy-MM')`
      : `to_char(${expr}, 'YYYY-MM')`;
  }
  private finite(expr: string) {
    return this.provider.dialect === "databricks"
      ? `${expr} IS NOT NULL AND NOT isnan(${expr}) AND ABS(${expr}) < 1e30`
      : `${expr} IS NOT NULL AND ${expr} > '-Infinity'::float8 AND ${expr} < 'Infinity'::float8 AND ABS(${expr}) < 1e30`;
  }
  private valid(variable: Variable) {
    const value = this.physical(variable, variable.column);
    const clauses = [this.finite(value)];
    const [min, max] = variable.validRange ?? [null, null];
    if (min !== null) clauses.push(`${value} >= ${min}`);
    if (max !== null) clauses.push(`${value} <= ${max}`);
    if (variable.table === "tb_gpm_imerg_precipitation_final_late") {
      const run = this.physical(variable, "imerg_run");
      if (variable.run === "Final") clauses.push(`${run} = 'Final'`);
      else if (variable.run === "Late") clauses.push(`${run} = 'Late'`);
      else if (variable.run === "Final + Late") clauses.push(`${run} IN ('Final','Late')`);
      else throw new ApiError(500, "INVALID_RUN", "IMERG requires an explicit reviewed run.");
    }
    if (variable.qa === "modis_good")
      clauses.push(
        `${this.physical(variable, "pixel_reliability")} = 0`,
        `${this.physical(variable, "vi_quality")} <> 65535`,
      );
    if (variable.qa === "ice_valid")
      clauses.push(`${this.physical(variable, "valid_sample")} = 1`, `${value} IN (0,1)`);
    if (variable.coverage) {
      const coverage = this.physical(variable, variable.coverage);
      clauses.push(
        this.finite(coverage),
        `${coverage} > 0 AND ${coverage} <= 1`,
      );
    }
    return clauses.join(" AND ");
  }
  private converted(variable: Variable) {
    return `(${this.physical(variable, variable.column)} * ${variable.conversion.scale} + (${variable.conversion.offset}))`;
  }
  private aggregate(variable: Variable) {
    if (variable.aggregation === "sum") return "SUM(value)";
    if (variable.aggregation === "weighted_mode") {
      const weight = (category: number) =>
        `SUM(CASE WHEN value = ${category} THEN coverage*area_weight ELSE 0.0 END)`;
      return `CASE WHEN ${weight(0)} + ${weight(1)} <= 0 THEN NULL WHEN ${weight(1)} > ${weight(0)} THEN 1 ELSE 0 END`;
    }
    return "SUM(value*coverage*area_weight)/NULLIF(SUM(coverage*area_weight),0)";
  }
  private aggregationDescription(variable: Variable) {
    return variable.aggregation === "sum"
      ? "sum of valid source cell mass in each geographic bin / selected bbox; no extra area weighting; bbox is not a basin polygon"
      : variable.aggregation === "weighted_mode"
        ? "mode weighted by cos(latitude); ties choose class 0; no valid weight yields null; not regional ice extent in km²"
        : "mean weighted by cos(latitude) and valid area coverage over source grid points; display aggregation; bbox is not a basin polygon";
  }
  private processingAggregate(variable: Variable, expression = "source_run") {
    if (variable.table !== "tb_gpm_imerg_precipitation_final_late")
      return `CAST(NULL AS ${this.provider.dialect === "databricks" ? "STRING" : "TEXT"})`;
    return this.provider.dialect === "databricks"
      ? `array_join(sort_array(collect_set(${expression})), '+')`
      : `string_agg(DISTINCT ${expression}, '+' ORDER BY ${expression})`;
  }
  private async availabilityGroup(group: Variable[], source: number, width = group.length) {
    const validCounts = group.map(
      (v, i) => `SUM(CASE WHEN ${this.valid(v)} THEN 1 ELSE 0 END) AS v${i}`,
    );
    // Consolidated tables have different numbers of indicators. Pad every
    // branch to the same width so a UNION cannot misalign their valid counts.
    while (validCounts.length < width)
      validCounts.push(`CAST(NULL AS BIGINT) AS v${validCounts.length}`);
    return `SELECT ${source} AS source, ${this.month()} AS month, COUNT(*) AS samples,
      ${validCounts.join(", ")}, ${this.processingAggregate(group[0], group[0].table === "tb_gpm_imerg_precipitation_final_late" ? this.physical(group[0], "imerg_run") : "NULL")} AS processing_run FROM ${this.table(group[0])}
      WHERE ${this.q("time")} IS NOT NULL GROUP BY ${this.month()}`;
  }
  async availability(variable: Variable) {
    const sql = await this.availabilityGroup([variable], 0);
    const rows = await this.provider.query(
      `${sql} ORDER BY month LIMIT 2400`,
      {},
      2400,
    );
    return rows.map((r) => ({
      month: String(r.month),
      samples: numeric(r.samples),
      validSamples: numeric(r.v0),
      ...(r.processing_run ? {processingRun: String(r.processing_run)} : {}),
    }));
  }
  async catalog(): Promise<CatalogVariable[]> {
    if (!queryBudget.getStore()) return withQueryBudget(() => this.catalog());
    let rows: Record<string, unknown>[];
    try {
      rows = await this.provider.query(
        "SELECT full_table_name, indicator, valid_flag, p5, p95 FROM `earth-trend-data`.`trusted`.`tb_indicator_coverage` WHERE catalogo = 'earth-trend-data' AND schema = 'trusted' LIMIT 10001",
        {}, 10001,
      );
    } catch {
      throw new ApiError(503, "COVERAGE_INVENTORY_UNAVAILABLE", "The indicator visibility configuration is unavailable. Please try again.");
    }
    if (rows.length > 10000)
      throw new ApiError(503, "COVERAGE_INVENTORY_TOO_LARGE", "The indicator visibility configuration exceeds the supported size.");
    const domains = percentileDomains(rows, this.variables);
    const flags = coverageFlags(rows, this.variables);
    const groups: Variable[][] = [];
    for (const variable of this.variables) {
      if (flags.get(variable.id) === false) continue;
      const existing = groups.find(
        (g) => this.table(g[0]) === this.table(variable),
      );
      if (existing) existing.push(variable);
      else groups.push([variable]);
    }
    const months = new Map<string, MonthAvailability[]>();
    const width = Math.max(...groups.map((group) => group.length));
    const errors = new Map<string, { code: string; message: string }>();
    const load = async (indices: number[]): Promise<void> => {
      const budget = queryBudget.getStore()!;
      try {
        if (Date.now() >= budget.deadline || budget.signal.aborted)
          throw new ApiError(
            504,
            "QUERY_TIMEOUT",
            "Catalog query budget exceeded.",
          );
        const branches = await Promise.all(
          indices.map((i) => this.availabilityGroup(groups[i], i, width)),
        );
        const rows = await this.provider.query(
          branches.join(" UNION ALL "),
          {},
          indices.length * 2400,
        );
        for (const i of indices)
          for (const v of groups[i]) months.set(v.id, []);
        for (const row of rows) {
          const index = numeric(row.source);
          if (index === null || !indices.includes(index)) continue;
          groups[index].forEach((v, i) =>
            months.get(v.id)!.push({
              month: String(row.month),
              samples: numeric(row.samples),
              validSamples: numeric(row[`v${i}`]),
              ...(row.processing_run ? {processingRun: String(row.processing_run)} : {}),
            }),
          );
        }
      } catch (error) {
        // Preserve source failures explicitly; never substitute observations.
        if (
          indices.length > 1 &&
          Date.now() < budget.deadline - 1000 &&
          !budget.signal.aborted &&
          !(
            error instanceof ApiError &&
            ["QUERY_TIMEOUT", "UPSTREAM_BUSY"].includes(error.code)
          )
        ) {
          const middle = Math.ceil(indices.length / 2);
          await load(indices.slice(0, middle));
          await load(indices.slice(middle));
          return;
        }
        const code =
          error instanceof ApiError ? error.code : "SOURCE_UNAVAILABLE";
        for (const i of indices)
          for (const v of groups[i])
            errors.set(v.id, {
              code,
              message:
                "The source could not be queried during this catalog refresh; no observations were substituted.",
            });
      }
    };
    const chunks = groups.map((_, i) => [i]);
    let next = 0;
    const worker = async () => {
      while (next < chunks.length) await load(chunks[next++]);
    };
    // Keep slots for frames/series during a cold catalog load.
    const concurrency = Math.max(
      1,
      Math.min(2, Number(process.env.UPSTREAM_CONCURRENCY ?? 4)),
    );
    await Promise.all(Array.from({ length: concurrency }, worker));
    // Do not cache a brief timeout/saturation as missing scientific sources.
    if (
      [...errors.values()].some((error) =>
        ["QUERY_TIMEOUT", "UPSTREAM_BUSY"].includes(error.code),
      )
    )
      throw new ApiError(
        503,
        "CATALOG_BUSY",
        "The catalog is temporarily busy. Try again.",
      );
    if (errors.size === this.variables.length)
      throw new ApiError(
        502,
        "CATALOG_UNAVAILABLE",
        "Could not query the real-data catalog.",
      );
    return this.variables.map((v) => {
      const availableMonths = (months.get(v.id) ?? []).sort((a, b) =>
        a.month.localeCompare(b.month),
      );
      const validMonths = availableMonths.filter(
        (m) => (m.validSamples ?? 0) > 0,
      );
      return {
        ...metadataOf(v),
        render: domains.has(v.id) ? { ...v.render, domain: domains.get(v.id)! } : v.render,
        colorRangeSource: domains.has(v.id) ? "indicator_coverage_p5_p95" : "configured_default",
        coverageFlag: flags.get(v.id) ?? null,
        months: availableMonths,
        available: flags.get(v.id) !== false && validMonths.length > 0,
        firstMonth: validMonths[0]?.month ?? null,
        lastMonth: validMonths.at(-1)?.month ?? null,
        unavailableReason:
          (flags.get(v.id) === false ? { code: "HIDDEN_BY_COVERAGE_FLAG", message: "Hidden by indicator coverage configuration." } : null) ?? errors.get(v.id) ??
          (validMonths.length
            ? null
            : {
                code: "NO_VALID_OBSERVATIONS",
                message:
                  "No valid observations remain after source quality filters.",
              }),
      };
    });
  }
  private selected(
    variable: Variable,
    bounds: Bounds,
    start: string,
    endExclusive: string,
  ) {
    const latitude = this.physical(variable, "lat"),
      longitude = this.physical(variable, "lon");
    const coverage = variable.coverage ? this.physical(variable, variable.coverage) : "1.0";
    const valid = this.valid(variable);
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
      CASE WHEN ${valid} THEN ${this.converted(variable)} ELSE NULL END AS value,
      CASE WHEN ${valid} THEN ${goodCoverage} ELSE 0.0 END AS coverage,
      GREATEST(0.0, COS(RADIANS(${latitude}))) AS area_weight,
      ${variable.table === "tb_gpm_imerg_precipitation_final_late" ? `CASE WHEN ${valid} THEN ${this.physical(variable, "imerg_run")} END` : "NULL"} AS source_run
      FROM ${this.table(variable)} WHERE ${this.q("time")} >= CAST(:start AS TIMESTAMP)
      AND ${this.q("time")} < CAST(:end AS TIMESTAMP)
      AND ${this.finite(latitude)} AND ${this.finite(longitude)}
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
    const variable = this.variable(id),
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
      value, coverage, area_weight, source_run FROM selected)
      SELECT x, y, ${this.aggregate(variable)} AS value,
      ${this.processingAggregate(variable)} AS processing_run,
      SUM(coverage*area_weight)/NULLIF(SUM(area_weight),0) AS coverage, COUNT(*) AS samples
      FROM binned GROUP BY x,y ORDER BY y,x`,
      { ...parameters, width, height, dx, dy },
      width * height + 1,
    );
    if (!rows.length)
      throw new ApiError(
        404,
        "NO_DATA",
        "No data for the requested variable, month and area.",
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
          "The source returned invalid grid coordinates.",
        );
      const i = y * width + x;
      coverage[i] = Math.min(1, Math.max(0, fraction ?? 0));
      if (value !== null && coverage[i] > 0) {
        values[i] = value;
        validCells++;
      }
    }
    const metadata = {
      ...sourceMetadata(variable),
      version: 1,
      variable: variable.id,
      quantity: variable.quantity,
      unit: variable.unit,
      product: variable.product,
      run: variable.run,
      processingRun: [...new Set(rows.flatMap(r=>r.processing_run ? String(r.processing_run).split('+') : []))].sort().join('+') || undefined,
      processingNote: variable.processingNote,
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
      aggregation: variable.aggregation,
      method: this.aggregationDescription(variable),
      render: variable.render,
      quality: variable.quality,
      conversion: variable.conversion,
      simulated: false,
      limitations,
    };
    return { metadata, values, coverage };
  }
  async comparison(id: string, startInput: string, endInput: string, bbox: string) {
    const variable=this.variable(id), start=parseMonth(startInput), end=parseMonth(endInput), bounds=parseBounds(bbox);
    const span=(Number(end.slice(0,4))-Number(start.slice(0,4)))*12+Number(end.slice(5))-Number(start.slice(5));
    if (span<0 || span>=2400) throw new ApiError(400,"INVALID_PERIOD","Select an ordered period of at most2400months.");
    const first=start<comparisonReference.start?start:comparisonReference.start;
    const last=end>comparisonReference.end?end:comparisonReference.end;
    const {sql,parameters}=this.selected(variable,parseBounds(),`${first}-01`,monthAfter(last));
    Object.assign(parameters,{areaWest:bounds.west,areaEast:bounds.wrap?bounds.east-360:bounds.east,
      areaSouth:bounds.south,areaNorth:bounds.north});
    const inside=`lat BETWEEN :areaSouth AND :areaNorth AND ${bounds.wrap?"(lon >= :areaWest OR lon <= :areaEast)":"lon BETWEEN :areaWest AND :areaEast"}`;
    const categorical=variable.aggregation==="weighted_mode";
    const aggregate=categorical?
      "100.0*SUM(CASE WHEN value=1 THEN coverage*area_weight ELSE 0.0 END)/NULLIF(SUM(coverage*area_weight),0)":this.aggregate(variable);
    // Share the source scan; regional conditional aggregates preserve the same QA/conversions as global.
    const regional=aggregate.replace(/\bvalue\b/g,`(CASE WHEN ${inside} THEN value ELSE NULL END)`)
      .replace(/\bcoverage\b/g,`(CASE WHEN ${inside} THEN coverage ELSE 0.0 END)`);
    const rows=await this.provider.query(`WITH selected AS (${sql})
      SELECT ${this.month("observed_time")} AS month, ${aggregate} AS global_value, ${regional} AS regional_value,
      ${this.processingAggregate(variable)} AS processing_run,
      SUM(coverage*area_weight)/NULLIF(SUM(area_weight),0) AS global_coverage,
      SUM(CASE WHEN ${inside} THEN coverage*area_weight ELSE 0.0 END)/NULLIF(SUM(CASE WHEN ${inside} THEN area_weight ELSE 0.0 END),0) AS regional_coverage,
      COUNT(*) AS global_samples, SUM(CASE WHEN ${inside} THEN 1 ELSE 0 END) AS regional_samples
      FROM selected GROUP BY ${this.month("observed_time")} ORDER BY month`,parameters,2412);
    const scope=(name:"global"|"regional")=>transformComparison(rows.map(row=>({month:String(row.month),
      value:numeric(row[`${name}_value`]),coverage:numeric(row[`${name}_coverage`]),samples:numeric(row[`${name}_samples`]),
      ...(row.processing_run ? {processingRun:String(row.processing_run)} : {})})),start,end);
    return {...sourceMetadata(variable), variable:id, name:variable.name, product:variable.product, run:variable.run, processingNote:variable.processingNote,
      unit:categorical?"%":variable.unit, sourceUnit:variable.unit, simulated:false, start,end,
      bbox:[bounds.west,bounds.south,bounds.wrap?bounds.east-360:bounds.east,bounds.north],
      aggregation:categorical?"valid_area_ice_fraction":variable.aggregation,
      method:categorical?"Ice-class1 fraction of valid area weighted by cos(latitude) and coverage; not a mean of category codes or ice extent in km²":this.aggregationDescription(variable),
      reference:comparisonReference, quality:variable.quality,
      trendAnalysis:{version:1,method:"OLS linear calendar time +12month effects; Newey-West HAC12 Bartlett; n/(n-13) correction; approximate two-sided normal Wald inference",
        minimumFitMonths:24,minimumInferenceMonths:60,requiresConsecutiveMonthsForInference:true,
        pValueNullHypothesis:"zero time slope in the indicated representation",alpha:.05,
        multipleComparisons:"Holm adjustment is computed for the full selected family across available scopes in the frontend; per-variable API p-values are unadjusted.",
        assumptions:"Adequate linear trend, fixed calendar-month seasonality and short-memory residual dependence. Historical normalization parameters are treated as fixed; their estimation uncertainty is not propagated."},
      global:scope("global"),regional:scope("regional"),
      limitations:[...limitations,"Historical reference2001–2020 is a project reference, not a30-year climate normal. At least10valid years per calendar month are required; zero reference variance is unavailable.",
        "Each spatial scope has its own reference and min/max.0–100 uses the displayed period; a constant series is50. Normalized values compare relative behavior, not physical magnitudes, probabilities, statistical significance or causal effects."]};
  }
  async investigation(request: InvestigationRequest) {
    validateInvestigation(request);
    const bounds = parseBounds(request.bbox);
    const selected = [request.x, ...(request.y ? [request.y] : [])].map(id => this.variable(id));
    if (selected.some(v => v.aggregation === 'weighted_mode' || v.render?.kind === 'categorical'))
      throw new ApiError(400, 'UNSUPPORTED_INDICATOR', 'Select continuous numeric indicators for this investigation.');
    const first = request.start < request.baselineStart ? request.start : request.baselineStart;
    const last = request.end > request.baselineEnd ? request.end : request.baselineEnd;
    // Sequential bounded scans leave provider slots for other visitors.
    const sources = [];
    for (const variable of selected) {
      const {sql, parameters} = this.selected(variable, bounds, `${first}-01`, monthAfter(last));
      const rows = await this.provider.query(`WITH selected AS (${sql}) SELECT ${this.month('observed_time')} AS month,
        ${this.aggregate(variable)} AS value, SUM(coverage*area_weight)/NULLIF(SUM(area_weight),0) AS coverage,
        ${this.processingAggregate(variable)} AS processing_run, COUNT(*) AS samples FROM selected GROUP BY ${this.month('observed_time')} ORDER BY month`, parameters, 601);
      sources.push({...sourceMetadata(variable), variable: variable.id, name: variable.name, unit: variable.unit,
        product: variable.product, run: variable.run, processingNote: variable.processingNote, quality: variable.quality, aggregation: variable.aggregation,
        method: this.aggregationDescription(variable), observations: rows.map(r => ({month:String(r.month),
          value:numeric(r.value), coverage:numeric(r.coverage), samples:numeric(r.samples),
          ...(r.processing_run ? {processingRun:String(r.processing_run)} : {})}))});
    }
    return {...buildInvestigation(request, sources), sourceRevision: process.env.K_REVISION ?? 'local', limitations: [...limitations, ...new Set(selected.map(v=>v.processingNote).filter((note): note is string=>!!note))]};
  }
  async series(id: string, startInput: string, endInput: string, bbox: string) {
    const variable = this.variable(id),
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
        "Select an ordered period of at most 120 months.",
      );
    const { sql, parameters } = this.selected(
      variable,
      bounds,
      `${start}-01`,
      monthAfter(end),
    );
    const rows = await this.provider.query(
      `WITH selected AS (${sql}) SELECT ${this.month("observed_time")} AS month,
      ${this.aggregate(variable)} AS value,
      ${this.processingAggregate(variable)} AS processing_run,
      SUM(coverage*area_weight)/NULLIF(SUM(area_weight),0) AS coverage,
      COUNT(*) AS samples FROM selected GROUP BY ${this.month("observed_time")} ORDER BY month`,
      parameters,
      120,
    );
    if (!rows.length)
      throw new ApiError(
        404,
        "NO_DATA",
        "No data for the requested period and area.",
      );
    return {
      ...sourceMetadata(variable),
      variable: variable.id,
      quantity: variable.quantity,
      unit: variable.unit,
      product: variable.product,
      run: variable.run,
      processingNote: variable.processingNote,
      bbox: [bounds.west, bounds.south, bounds.east, bounds.north],
      start,
      end,
      simulated: false,
      aggregation: variable.aggregation,
      method: this.aggregationDescription(variable),
      render: variable.render,
      quality: variable.quality,
      observations: rows.map((r) => ({
        month: String(r.month),
        value: numeric(r.value),
        coverage: numeric(r.coverage),
        samples: numeric(r.samples),
        ...(r.processing_run ? {processingRun: String(r.processing_run)} : {}),
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

function sourceMetadata(variable: Variable) {
  const source = `earth-trend-data.trusted.${variable.table}`;
  return { source: "databricks-sql" as const, sourceLayer: "trusted" as const,
    sourceTable: source, sourceUC: source,
    sourceColumn: trustedColumns[variable.table]?.[variable.column],
    dataType: variable.dataType ?? "reanalysis" };
}

export function metadataOf(variable: Variable) {
  const {
    table: _table,
    column: _column,
    coverage: _coverage,
    validRange: _validRange,
    qa: _qa,
    ...publicMetadata
  } = variable;
  return { ...publicMetadata, ...sourceMetadata(variable) };
}
