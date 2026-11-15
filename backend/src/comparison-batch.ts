export type BatchError = { code: string; message: string };
export type BatchPart = { body: Buffer } | { error: BatchError };

/** Splice already-serialized per-variable documents into one response without re-parsing them. */
export function assembleBatch(ids: string[], parts: Map<string, BatchPart>) {
  const chunks: Buffer[] = [];
  const errors: Record<string, BatchError> = {};
  for (const id of ids) {
    const part = parts.get(id);
    if (!part) errors[id] = { code: "UPSTREAM_ERROR", message: "Could not query this variable. Try again." };
    else if ("error" in part) errors[id] = part.error;
    else {
      if (chunks.length) chunks.push(Buffer.from(","));
      chunks.push(Buffer.from(`${JSON.stringify(id)}:`), part.body);
    }
  }
  const body = Buffer.concat([
    Buffer.from('{"version":1,"results":{'),
    ...chunks,
    Buffer.from(`},"errors":${JSON.stringify(errors)}}`),
  ]);
  return { body, complete: !Object.keys(errors).length };
}

/** Run `task` for each id with at most `limit` in flight; results land in `parts` as they finish. */
export async function runBounded<T>(ids: string[], limit: number, task: (id: string) => Promise<T>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, ids.length) }, async () => {
    while (next < ids.length) await task(ids[next++]);
  }));
}
