import pg from "pg";
import { ApiError, Gate, boundedEnv, queryBudget, required } from "../core.ts";
import type { Parameters, Provider, Row } from "../core.ts";
import { DatabricksOAuth } from "./oauth.ts";

export class PostgresProvider implements Provider {
  readonly dialect = "postgres" as const;
  private pool: pg.Pool;
  private gate = new Gate(boundedEnv("UPSTREAM_CONCURRENCY", 4, 1, 16));
  constructor(authHost?: string) {
    const password = process.env.PGPASSWORD;
    const auth = password ? null : new DatabricksOAuth(authHost);
    const endpoint = password ? null : required("LAKEBASE_ENDPOINT");
    this.pool = new pg.Pool({
      host: required("PGHOST"),
      database: required("PGDATABASE"),
      user: required("PGUSER"),
      port: Number(process.env.PGPORT ?? 5432),
      ssl: { rejectUnauthorized: true },
      max: 4,
      options: "-c default_transaction_read_only=on -c timezone=UTC",
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
    return this.gate.run(async () => {
      const deadline = queryBudget.getStore()?.deadline ?? Date.now() + 45_000;
      const timeout = () => {
        const remaining = Math.floor(deadline - Date.now());
        if (remaining <= 0 || queryBudget.getStore()?.signal.aborted)
          throw new ApiError(
            504,
            "QUERY_TIMEOUT",
            "Consulta excedeu o tempo disponível.",
          );
        return remaining;
      };
      timeout();
      const client = await this.pool.connect();
      try {
        // Each borrowed connection receives the remaining request budget. The
        // PostgreSQL server cancels the query too, rather than just the HTTP wait.
        await client.query(
          "SELECT set_config('statement_timeout', $1, false)",
          [String(timeout())],
        );
        const config: pg.QueryConfig & { query_timeout: number } = {
          text,
          values: names.map((name) => parameters[name]),
          query_timeout: timeout(),
        };
        const result = await client.query(config);
        if (result.rows.length > rowLimit)
          throw new ApiError(
            413,
            "RESULT_TOO_LARGE",
            "Consulta excedeu o limite de resultados.",
          );
        return result.rows;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "57014" || Date.now() >= deadline)
          throw new ApiError(
            504,
            "QUERY_TIMEOUT",
            "Consulta excedeu o tempo disponível.",
          );
        throw error;
      } finally {
        client.release();
      }
    });
  }
  async close() {
    await this.pool.end();
  }
}
