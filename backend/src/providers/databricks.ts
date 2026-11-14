import { ApiError, Gate, boundedEnv, required, queryBudget } from "../core.ts";
import type { Parameters, Provider, Row } from "../core.ts";
import { DatabricksOAuth } from "./oauth.ts";

type Statement = {
  statement_id: string;
  status: { state: string; error?: { error_code?: string } };
  manifest?: {
    truncated?: boolean;
    total_row_count?: number;
    schema: { columns: { name: string }[] };
  };
  result?: Chunk;
};
type Chunk = {
  data_array?: (string | null)[][];
  next_chunk_index?: number;
  next_chunk_internal_link?: string;
};

export class DatabricksProvider implements Provider {
  readonly dialect = "databricks" as const;
  private auth: DatabricksOAuth;
  private warehouse = required("DATABRICKS_WAREHOUSE_ID");
  private gate = new Gate(boundedEnv("UPSTREAM_CONCURRENCY", 4, 1, 16));
  constructor(host?: string) {
    this.auth = new DatabricksOAuth(host);
  }
  async query(
    statement: string,
    parameters: Parameters = {},
    rowLimit = 210_000,
  ): Promise<Row[]> {
    return this.gate.run(async () => {
      const budget = queryBudget.getStore() ?? {
        deadline: Date.now() + 45_000,
        signal: AbortSignal.timeout(45_000),
      };
      const { deadline, signal } = budget;
      let result: Statement | undefined;
      try {
        result = (await (
          await this.auth.request("/api/2.0/sql/statements", {
            method: "POST",
            signal,
            body: JSON.stringify({
              warehouse_id: this.warehouse,
              statement,
              parameters: Object.entries(parameters).map(([name, value]) => ({
                name,
                value: String(value),
                type: typeof value === "number" ? "DOUBLE" : "STRING",
              })),
              wait_timeout: "10s",
              on_wait_timeout: "CONTINUE",
              disposition: "INLINE",
              format: "JSON_ARRAY",
              row_limit: rowLimit,
              byte_limit: 24_000_000,
            }),
          })
        ).json()) as Statement;
        while (["PENDING", "RUNNING"].includes(result.status.state)) {
          if (Date.now() >= deadline)
            throw new ApiError(
              504,
              "QUERY_TIMEOUT",
              "Consulta excedeu o tempo disponível. Tente um recorte menor.",
            );
          await new Promise((resolve) => setTimeout(resolve, 350));
          result = (await (
            await this.auth.request(
              `/api/2.0/sql/statements/${encodeURIComponent(result.statement_id)}`,
              { signal },
            )
          ).json()) as Statement;
        }
        if (result.status.state !== "SUCCEEDED") {
          console.warn(
            JSON.stringify({
              source: "databricks",
              statementId: result.statement_id,
              code: result.status.error?.error_code,
            }),
          );
          throw new ApiError(
            502,
            "QUERY_FAILED",
            "A consulta à fonte de dados falhou.",
          );
        }
        if (result.manifest?.truncated)
          throw new ApiError(
            413,
            "RESULT_TOO_LARGE",
            "Consulta grande demais; reduza a área ou o nível de detalhe.",
          );
        const columns =
          result.manifest?.schema.columns.map((c) => c.name) ?? [];
        const rows: Row[] = [];
        let chunk = result.result;
        let chunks = 0;
        while (chunk) {
          for (const values of chunk.data_array ?? [])
            rows.push(
              Object.fromEntries(columns.map((name, i) => [name, values[i]])),
            );
          if (rows.length > rowLimit || ++chunks > 100)
            throw new ApiError(
              413,
              "RESULT_TOO_LARGE",
              "Resultado excedeu o limite de segurança.",
            );
          if (
            chunk.next_chunk_index === undefined ||
            chunk.next_chunk_index === null
          )
            break;
          if (Date.now() >= deadline)
            throw new ApiError(
              504,
              "QUERY_TIMEOUT",
              "Leitura dos dados excedeu o tempo disponível.",
            );
          // Construct our own path; never follow an upstream-supplied external URL.
          chunk = (await (
            await this.auth.request(
              `/api/2.0/sql/statements/${encodeURIComponent(result.statement_id)}/result/chunks/${chunk.next_chunk_index}`,
              { signal },
            )
          ).json()) as Chunk;
        }
        if (
          result.manifest?.total_row_count !== undefined &&
          rows.length !== result.manifest.total_row_count
        )
          throw new ApiError(
            502,
            "INCOMPLETE_RESULT",
            "A fonte retornou um resultado incompleto.",
          );
        return rows;
      } catch (error) {
        if (result && ["PENDING", "RUNNING"].includes(result.status.state))
          await this.auth
            .request(
              `/api/2.0/sql/statements/${encodeURIComponent(result.statement_id)}/cancel`,
              { method: "POST", signal: AbortSignal.timeout(2000) },
            )
            .catch(() => undefined);
        if (signal.aborted)
          throw new ApiError(
            504,
            "QUERY_TIMEOUT",
            "Consulta excedeu o tempo disponível. Tente um recorte menor.",
          );
        throw error;
      }
    });
  }
  async close() {}
}
