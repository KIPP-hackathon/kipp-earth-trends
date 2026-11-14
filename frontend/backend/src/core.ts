import { AsyncLocalStorage } from "node:async_hooks";

export const queryBudget = new AsyncLocalStorage<{
  deadline: number;
  signal: AbortSignal;
}>();
export function withQueryBudget<T>(fn: () => Promise<T>): Promise<T> {
  return queryBudget.run(
    { deadline: Date.now() + 45_000, signal: AbortSignal.timeout(45_000) },
    fn,
  );
}
export type Row = Record<string, unknown>;
export type Parameters = Record<string, string | number>;
export type Provider = {
  dialect: "databricks" | "postgres";
  query(
    sql: string,
    parameters?: Parameters,
    rowLimit?: number,
  ): Promise<Row[]>;
  close(): Promise<void>;
};

export class ApiError extends Error {
  statusCode: number;
  code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class Gate {
  active = 0;
  limit: number;
  constructor(limit: number) {
    this.limit = limit;
  }
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit)
      throw new ApiError(
        503,
        "UPSTREAM_BUSY",
        "Capacidade de consultas ocupada; tente novamente em instantes.",
      );
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
    }
  }
}

type Cached = {
  body: Buffer;
  type: string;
  etag: string;
  headers: Record<string, string>;
};
export class ResponseCache {
  private entries = new Map<string, { expires: number; response: Cached }>();
  private pending = new Map<string, Promise<Cached>>();
  private bytes = 0;
  private maxBytes: number;
  private maxEntries: number;
  constructor(maxBytes = 64 * 1024 * 1024, maxEntries = 256) {
    this.maxBytes = maxBytes;
    this.maxEntries = maxEntries;
  }
  async get(
    key: string,
    ttlMs: number,
    load: () => Promise<Cached>,
  ): Promise<{ response: Cached; hit: boolean }> {
    const existing = this.entries.get(key);
    if (existing && existing.expires > Date.now()) {
      this.entries.delete(key);
      this.entries.set(key, existing);
      return { response: existing.response, hit: true };
    }
    if (existing) {
      this.entries.delete(key);
      this.bytes -= existing.response.body.length;
    }
    const inflight = this.pending.get(key);
    if (inflight) return { response: await inflight, hit: true };
    const promise = (async () => {
      const response = await load();
      if (response.body.length <= this.maxBytes) {
        while (
          this.bytes + response.body.length > this.maxBytes ||
          this.entries.size >= this.maxEntries
        ) {
          const oldest = this.entries.keys().next().value;
          if (oldest === undefined) break;
          this.bytes -= this.entries.get(oldest)!.response.body.length;
          this.entries.delete(oldest);
        }
        this.entries.set(key, { expires: Date.now() + ttlMs, response });
        this.bytes += response.body.length;
      }
      return response;
    })();
    this.pending.set(key, promise);
    try {
      return { response: await promise, hit: false };
    } finally {
      this.pending.delete(key);
    }
  }
  stats() {
    return {
      entries: this.entries.size,
      bytes: this.bytes,
      pending: this.pending.size,
    };
  }
}

export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
export function boundedEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`Invalid configuration: ${name}`);
  return value;
}
export function quoteIdentifier(value: string, dialect: Provider["dialect"]) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value))
    throw new Error("Invalid configured SQL identifier");
  const q = dialect === "databricks" ? "`" : '"';
  return `${q}${value}${q}`;
}
