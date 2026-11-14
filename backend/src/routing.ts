import { DataService, variableFor, variables } from "./data.ts";
import type { Variable, CatalogVariable } from "./data.ts";
import type { Provider } from "./core.ts";
import { queryBudget, withQueryBudget } from "./core.ts";

export type DataSource = "databricks-sql" | "lakebase-postgres";
// Only these four tables have validated runtime access and synchronized data in
// Lakebase. Every other reviewed layer remains explicitly on the SQL Warehouse.
export const lakebaseVariableIds = new Set([
  "temperature",
  "surface_temperature",
  "rainfall",
  "rainfall_late",
]);
export class HybridDataService {
  private sql: DataService;
  private pg: DataService;
  constructor(sql: Provider, pg: Provider) {
    this.sql = new DataService(sql, {
      schema: "refined",
      variables: variables.filter((v) => !lakebaseVariableIds.has(v.id)),
    });
    this.pg = new DataService(pg, {
      schema: "default",
      variables: variables.filter((v) => lakebaseVariableIds.has(v.id)),
    });
  }
  sourceFor(id: string): DataSource {
    variableFor(id);
    return lakebaseVariableIds.has(id) ? "lakebase-postgres" : "databricks-sql";
  }
  private serviceFor(id: string) {
    return this.sourceFor(id) === "lakebase-postgres" ? this.pg : this.sql;
  }
  async catalog(): Promise<(CatalogVariable & { source: DataSource })[]> {
    if (!queryBudget.getStore()) return withQueryBudget(() => this.catalog());
    const [sql, pg] = await Promise.all([
      this.sql.catalog(),
      this.pg.catalog(),
    ]);
    const entries = new Map<string, CatalogVariable & { source: DataSource }>([
      ...sql.map(
        (v) => [v.id, { ...v, source: "databricks-sql" as const }] as const,
      ),
      ...pg.map(
        (v) => [v.id, { ...v, source: "lakebase-postgres" as const }] as const,
      ),
    ]);
    return variables.map((v) => entries.get(v.id)!);
  }
  async availability(variable: Variable) {
    return this.serviceFor(variable.id).availability(variable);
  }
  async frame(
    id: string,
    month: string,
    bbox: string | undefined,
    factor: number,
    maxCells = 210_000,
  ) {
    const frame = await this.serviceFor(id).frame(
      id,
      month,
      bbox,
      factor,
      maxCells,
    );
    return {
      ...frame,
      metadata: { ...frame.metadata, source: this.sourceFor(id) },
    };
  }
  async series(id: string, start: string, end: string, bbox: string) {
    const series = await this.serviceFor(id).series(id, start, end, bbox);
    return { ...series, source: this.sourceFor(id) };
  }
  async close() {
    await Promise.all([this.sql.provider.close(), this.pg.provider.close()]);
  }
}
