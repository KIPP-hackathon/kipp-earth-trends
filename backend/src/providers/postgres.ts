import pg from "pg";
import { ApiError, required } from "../core.ts";
import type { Parameters, Provider, Row } from "../core.ts";
import { DatabricksOAuth } from "./oauth.ts";

export class PostgresProvider implements Provider {
  readonly dialect = "postgres" as const;
  private pool: pg.Pool;
  constructor() {
    const password = process.env.PGPASSWORD;
    const auth = password ? null : new DatabricksOAuth();
    const endpoint = password ? null : required("LAKEBASE_ENDPOINT");
    this.pool = new pg.Pool({
      host: required("PGHOST"),
      database: required("PGDATABASE"),
      user: required("PGUSER"),
      port: Number(process.env.PGPORT ?? 5432),
      ssl: { rejectUnauthorized: true },
      max: 4,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      maxLifetimeSeconds: 3000,
      statement_timeout: 40_000,
      query_timeout: 45_000,
      password:
        password ??
        (async () => {
          const response = await auth!.request(
            "/api/2.0/postgres/credentials",
            { method: "POST", body: JSON.stringify({ endpoint }) },
          );
          const result = (await response.json()) as { token: string };
          if (!result.token)
            throw new ApiError(
              502,
              "UPSTREAM_AUTH",
              "Credencial Lakebase indisponível.",
            );
          return result.token;
        }),
    });
    this.pool.on("error", () => {
      /* A failed idle connection is evicted by pg; never log connection secrets. */
    });
  }
  async query(
    sql: string,
    parameters: Parameters = {},
    rowLimit = 210_000,
  ): Promise<Row[]> {
    const names: string[] = [];
    const text = sql.replace(
      /(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (_, name: string) => {
        if (!(name in parameters)) throw new Error("Missing SQL parameter");
        if (!names.includes(name)) names.push(name);
        return `$${names.indexOf(name) + 1}`;
      },
    );
    const result = await this.pool.query(
      text,
      names.map((name) => parameters[name]),
    );
    if (result.rows.length > rowLimit)
      throw new ApiError(
        413,
        "RESULT_TOO_LARGE",
        "Consulta excedeu o limite de resultados.",
      );
    return result.rows;
  }
  async close() {
    await this.pool.end();
  }
}
