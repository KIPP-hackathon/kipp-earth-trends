import { createHash } from "node:crypto";
import { boundedEnv } from "./core.ts";
import type { PersistentEntry, PersistentStore } from "./core.ts";
import { googleRequest } from "./google-auth.ts";

// Shared, persistent second cache tier for public read responses (catalog,
// frames, series). It lives in the same Firestore database as the assistant's
// quota counters, so it is deliberately conservative: bounded daily operations
// per instance, short timeouts, a circuit breaker, and every failure is a cache
// miss. Nothing user-specific is stored here.
export type FirestoreCall = (
  operation: "batchGet" | "commit",
  body: unknown,
  signal: AbortSignal,
) => Promise<unknown>;

type StoreOptions = {
  call: FirestoreCall;
  database: string;
  // Entries from another Cloud Run revision are never read: new code is not
  // served responses shaped by old code, and smoke tests exercise real queries.
  namespace: string;
  collection?: string;
  now?: () => number;
  // Firestore documents are limited to 1 MiB including names and overhead.
  maxBytes?: number;
  dailyReads?: number;
  dailyWrites?: number;
  readTimeoutMs?: number;
  writeTimeoutMs?: number;
  failureThreshold?: number;
  pauseMs?: number;
};
type Field = {
  bytesValue?: string;
  stringValue?: string;
  integerValue?: string;
  timestampValue?: string;
};
const day = 86_400_000;

export function createFirestoreStore(options: StoreOptions): PersistentStore {
  const now = options.now ?? Date.now;
  const collection = options.collection ?? "kipp_response_cache";
  const maxBytes = options.maxBytes ?? 800_000;
  const dailyReads = options.dailyReads ?? 12_000;
  const dailyWrites = options.dailyWrites ?? 1_000;
  const failureThreshold = options.failureThreshold ?? 3;
  const pauseMs = options.pauseMs ?? 60_000;
  let budgetDay = Math.floor(now() / day);
  let reads = 0;
  let writes = 0;
  let failures = 0;
  let pausedUntil = 0;
  const documentName = (key: string) =>
    `${options.database}/documents/${collection}/${createHash("sha256")
      .update(`${options.namespace}\0${key}`)
      .digest("hex")}`;
  // Returns false when the operation should be skipped.
  const admit = (kind: "read" | "write") => {
    const today = Math.floor(now() / day);
    if (today !== budgetDay) {
      budgetDay = today;
      reads = 0;
      writes = 0;
    }
    if (now() < pausedUntil) return false;
    if (kind === "read") return reads++ < dailyReads;
    return writes++ < dailyWrites;
  };
  const run = async (
    operation: "batchGet" | "commit",
    body: unknown,
    timeoutMs: number,
  ) => {
    try {
      const result = await options.call(
        operation,
        body,
        AbortSignal.timeout(timeoutMs),
      );
      failures = 0;
      return result;
    } catch {
      if (++failures >= failureThreshold) pausedUntil = now() + pauseMs;
      return undefined;
    }
  };
  return {
    async read(key) {
      if (!admit("read")) return undefined;
      const name = documentName(key);
      const result = await run(
        "batchGet",
        { documents: [name] },
        options.readTimeoutMs ?? 1500,
      );
      if (!Array.isArray(result)) return undefined;
      const found = (
        result.find(
          (row: { found?: { name?: string } }) => row?.found?.name === name,
        ) as { found: { fields?: Record<string, Field> } } | undefined
      )?.found;
      const fields = found?.fields;
      if (!fields) return undefined;
      const soft = Number(fields.soft?.integerValue);
      const hard = Number(fields.hard?.integerValue);
      if (
        typeof fields.body?.bytesValue !== "string" ||
        typeof fields.type?.stringValue !== "string" ||
        typeof fields.etag?.stringValue !== "string" ||
        !Number.isSafeInteger(soft) ||
        !Number.isSafeInteger(hard) ||
        hard <= now()
      )
        return undefined;
      const body = Buffer.from(fields.body.bytesValue, "base64");
      if (!body.length || body.length > maxBytes) return undefined;
      return {
        response: {
          body,
          type: fields.type.stringValue,
          etag: fields.etag.stringValue,
          headers: {},
        },
        softExpires: soft,
        hardExpires: hard,
      } satisfies PersistentEntry;
    },
    async write(key, entry) {
      if (entry.response.body.length > maxBytes || !admit("write")) return;
      await run(
        "commit",
        {
          writes: [
            {
              update: {
                name: documentName(key),
                fields: {
                  body: { bytesValue: entry.response.body.toString("base64") },
                  type: { stringValue: entry.response.type },
                  etag: { stringValue: entry.response.etag },
                  soft: { integerValue: String(entry.softExpires) },
                  hard: { integerValue: String(entry.hardExpires) },
                  // Target of a Firestore TTL policy, so expired documents are deleted.
                  expiresAt: {
                    timestampValue: new Date(entry.hardExpires).toISOString(),
                  },
                } satisfies Record<string, Field>,
              },
            },
          ],
        },
        options.writeTimeoutMs ?? 3000,
      );
    },
  };
}

const defaultDatabase = "projects/kipp-space-apps-2026/databases/(default)";

// Opt-in: nothing is stored unless PERSISTENT_CACHE=firestore is configured.
export function persistentStoreFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): PersistentStore | undefined {
  if (env.PERSISTENT_CACHE !== "firestore") return undefined;
  const database = env.FIRESTORE_DATABASE ?? defaultDatabase;
  if (!/^projects\/[a-z0-9-]+\/databases\/[a-z0-9()-]+$/.test(database))
    throw new Error("Invalid configuration: FIRESTORE_DATABASE");
  return createFirestoreStore({
    database,
    namespace: env.K_REVISION ?? "local",
    dailyReads: boundedEnv("PERSISTENT_CACHE_DAILY_READS", 12_000, 0, 100_000),
    dailyWrites: boundedEnv("PERSISTENT_CACHE_DAILY_WRITES", 1_000, 0, 100_000),
    call: async (operation, body, signal) => {
      const response = await googleRequest(
        `https://firestore.googleapis.com/v1/${database}/documents:${operation}`,
        body,
        signal,
      );
      if (!response.ok) throw new Error(`Firestore ${response.status}`);
      return response.json();
    },
  });
}
