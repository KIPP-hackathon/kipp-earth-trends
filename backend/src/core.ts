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

export type CachedResponse = {
  body: Buffer;
  type: string;
  etag: string;
  headers: Record<string, string>;
};
// A second, shared cache tier that survives scale-to-zero. Implementations must
// fail open: a store problem is always a miss, never an error for the caller.
export type PersistentEntry = {
  response: CachedResponse;
  softExpires: number;
  hardExpires: number;
};
export type PersistentStore = {
  read(key: string): Promise<PersistentEntry | undefined>;
  write(key: string, entry: PersistentEntry): Promise<void>;
};
// Fresh until softMs; served stale (and refreshed in the background) until hardMs.
export type PersistPolicy = { softMs: number; hardMs: number };
export type CacheLayer = "memory" | "store" | "origin";
export class ResponseCache {
  private entries = new Map<
    string,
    { expires: number; response: CachedResponse }
  >();
  private pending = new Map<
    string,
    Promise<{ response: CachedResponse; layer: CacheLayer }>
  >();
  private refreshing = new Set<string>();
  private bytes = 0;
  private maxBytes: number;
  private maxEntries: number;
  private store?: PersistentStore;
  constructor(
    maxBytes = 64 * 1024 * 1024,
    maxEntries = 256,
    store?: PersistentStore,
  ) {
    this.maxBytes = maxBytes;
    this.maxEntries = maxEntries;
    this.store = store;
  }
  private remember(key: string, response: CachedResponse, ttlMs: number) {
    if (response.body.length > this.maxBytes) return;
    const previous = this.entries.get(key);
    if (previous) {
      this.bytes -= previous.response.body.length;
      this.entries.delete(key);
    }
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
  private persistResponse(
    key: string,
    response: CachedResponse,
    policy: PersistPolicy,
  ) {
    const now = Date.now();
    void this.store
      ?.write(key, {
        response,
        softExpires: now + policy.softMs,
        hardExpires: now + policy.hardMs,
      })
      .catch(() => {});
  }
  // Best effort: Cloud Run may throttle CPU after the response, in which case
  // the refresh simply completes during the next request.
  private refresh(
    key: string,
    ttlMs: number,
    load: () => Promise<CachedResponse>,
    policy: PersistPolicy,
  ) {
    if (this.refreshing.has(key)) return;
    this.refreshing.add(key);
    void load()
      .then((response) => {
        this.remember(key, response, ttlMs);
        this.persistResponse(key, response, policy);
      })
      .catch(() => {})
      .finally(() => this.refreshing.delete(key));
  }
  async get(
    key: string,
    ttlMs: number,
    load: () => Promise<CachedResponse>,
    persist?: PersistPolicy,
  ): Promise<{ response: CachedResponse; hit: boolean; layer: CacheLayer }> {
    const existing = this.entries.get(key);
    if (existing && existing.expires > Date.now()) {
      this.entries.delete(key);
      this.entries.set(key, existing);
      return { response: existing.response, hit: true, layer: "memory" };
    }
    if (existing) {
      this.entries.delete(key);
      this.bytes -= existing.response.body.length;
    }
    const inflight = this.pending.get(key);
    if (inflight) {
      const shared = await inflight;
      return { response: shared.response, hit: true, layer: shared.layer };
    }
    const promise = (async () => {
      if (persist && this.store) {
        const stored = await this.store.read(key).catch(() => undefined);
        if (stored && stored.hardExpires > Date.now()) {
          this.remember(key, stored.response, ttlMs);
          if (stored.softExpires <= Date.now())
            this.refresh(key, ttlMs, load, persist);
          return { response: stored.response, layer: "store" as CacheLayer };
        }
      }
      const response = await load();
      this.remember(key, response, ttlMs);
      if (persist) this.persistResponse(key, response, persist);
      return { response, layer: "origin" as CacheLayer };
    })();
    this.pending.set(key, promise);
    try {
      const result = await promise;
      return {
        response: result.response,
        hit: result.layer !== "origin",
        layer: result.layer,
      };
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
