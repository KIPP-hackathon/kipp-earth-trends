import { ApiError } from "./core.ts";
import { googleRequest } from "./google-auth.ts";
const database = "projects/kipp-space-apps-2026/databases/(default)";
const endpoint = `https://firestore.googleapis.com/v1/${database}/documents`;
export const assistantLimits = {
  daily: 120,
  clientHourly: 12,
  modelCalls: 4,
  tools: 6,
} as const;
const unavailable = () =>
  new ApiError(
    503,
    "ASSISTANT_LIMIT_UNAVAILABLE",
    "Assistant usage control is temporarily unavailable.",
  );
async function request(operation: string, body: unknown, signal: AbortSignal) {
  const response = await googleRequest(
    `${endpoint}:${operation}`,
    body,
    signal,
  );
  if (response.status === 409) return null;
  if (!response.ok) throw unavailable();
  return await response.json();
}
// Two transactional counters apply across instances and revisions. No prompts or raw IPs are stored.
export async function reserveAssistantRequest(
  client: string,
  signal: AbortSignal,
) {
  if (!/^[a-f0-9]{64}$/.test(client))
    throw new ApiError(
      400,
      "INVALID_CLIENT",
      "A trusted client identity is required.",
    );
  const utc = new Date().toISOString();
  const names = [
    `${database}/documents/kipp_assistant_limits/global_${utc.slice(0, 10)}`,
    `${database}/documents/kipp_assistant_limits/client_${client}_${utc.slice(0, 13)}`,
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    const started = (await request(
      "beginTransaction",
      { options: { readWrite: {} } },
      signal,
    )) as { transaction?: string } | null;
    if (!started?.transaction) throw unavailable();
    const transaction = started.transaction;
    try {
      const rows = (await request(
        "batchGet",
        { documents: names, transaction },
        signal,
      )) as
        | {
            found?: {
              name: string;
              fields?: { count?: { integerValue?: string } };
            };
            missing?: string;
          }[]
        | null;
      if (!Array.isArray(rows) || rows.length !== 2) throw unavailable();
      const counts = names.map((name) => {
        const row = rows.find(
          (r) => r.found?.name === name || r.missing === name,
        );
        if (!row) throw unavailable();
        if (row.missing) return 0;
        const count = Number(row.found?.fields?.count?.integerValue);
        if (!Number.isSafeInteger(count) || count < 0) throw unavailable();
        return count;
      });
      if (
        counts[0] >= assistantLimits.daily ||
        counts[1] >= assistantLimits.clientHourly
      )
        throw new ApiError(
          429,
          "ASSISTANT_USAGE_LIMIT",
          "Assistant usage limit reached. Please try again later.",
        );
      const committed = await request(
        "commit",
        {
          transaction,
          writes: names.map((name, i) => ({
            update: {
              name,
              fields: { count: { integerValue: String(counts[i] + 1) } },
            },
          })),
        },
        signal,
      );
      if (committed) return;
    } catch (error) {
      await request("rollback", { transaction }, signal).catch(() => {});
      throw error;
    }
  }
  throw unavailable();
}
