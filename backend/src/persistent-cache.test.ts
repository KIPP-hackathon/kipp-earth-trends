import { test } from "node:test";
import assert from "node:assert/strict";
import { createFirestoreStore } from "./persistent-cache.ts";
import type { FirestoreCall } from "./persistent-cache.ts";

// Minimal in-memory stand-in for the two Firestore REST operations the cache uses.
function fakeFirestore() {
  const documents = new Map<string, Record<string, unknown>>();
  const calls: string[] = [];
  const call: FirestoreCall = async (operation, body) => {
    calls.push(operation);
    if (operation === "commit") {
      for (const write of (body as { writes: { update: { name: string; fields: Record<string, unknown> } }[] }).writes)
        documents.set(write.update.name, write.update.fields);
      return {};
    }
    return (body as { documents: string[] }).documents.map((name) =>
      documents.has(name) ? { found: { name, fields: documents.get(name) } } : { missing: name },
    );
  };
  return { call, documents, calls };
}

const response = (text = "hello") => ({
  body: Buffer.from(text),
  type: "application/json; charset=utf-8",
  etag: 'W/"abc"',
  headers: {},
});
const entry = (now: number, soft = 1000, hard = 5000) => ({
  response: response(),
  softExpires: now + soft,
  hardExpires: now + hard,
});
const base = { database: "projects/p/databases/(default)", namespace: "rev-1" };

test("an entry written to the store is read back byte for byte", async () => {
  const firestore = fakeFirestore();
  const store = createFirestoreStore({ ...base, call: firestore.call, now: () => 1000 });
  await store.write("series:a", entry(1000));
  const read = await store.read("series:a");
  assert.equal(read?.response.body.toString(), "hello");
  assert.equal(read?.response.etag, 'W/"abc"');
  assert.equal(read?.softExpires, 2000);
  assert.equal(read?.hardExpires, 6000);
});

test("entries past their hard expiry and unknown keys are misses", async () => {
  const firestore = fakeFirestore();
  let now = 1000;
  const store = createFirestoreStore({ ...base, call: firestore.call, now: () => now });
  await store.write("k", entry(now));
  assert.equal(await store.read("missing"), undefined);
  now = 6001;
  assert.equal(await store.read("k"), undefined);
});

test("a different namespace (Cloud Run revision) never sees another namespace's entries", async () => {
  const firestore = fakeFirestore();
  const first = createFirestoreStore({ ...base, call: firestore.call, now: () => 1000 });
  const second = createFirestoreStore({ ...base, namespace: "rev-2", call: firestore.call, now: () => 1000 });
  await first.write("k", entry(1000));
  assert.ok(await first.read("k"));
  assert.equal(await second.read("k"), undefined);
});

test("responses above the document size limit are not written", async () => {
  const firestore = fakeFirestore();
  const store = createFirestoreStore({ ...base, call: firestore.call, maxBytes: 10, now: () => 1000 });
  await store.write("big", { ...entry(1000), response: response("x".repeat(11)) });
  assert.equal(firestore.calls.length, 0);
});

test("daily read and write budgets stop traffic to Firestore and reset on the next UTC day", async () => {
  const firestore = fakeFirestore();
  let now = Date.UTC(2026, 10, 15, 12);
  const store = createFirestoreStore({
    ...base, call: firestore.call, now: () => now, dailyReads: 2, dailyWrites: 1,
  });
  await store.write("a", entry(now));
  await store.write("b", entry(now));
  assert.equal(firestore.calls.filter((c) => c === "commit").length, 1);
  await store.read("a");
  await store.read("a");
  assert.equal(await store.read("a"), undefined);
  assert.equal(firestore.calls.filter((c) => c === "batchGet").length, 2);
  now = Date.UTC(2026, 10, 16, 0, 1);
  await store.write("c", entry(now));
  assert.equal(firestore.calls.filter((c) => c === "commit").length, 2);
});

test("failures never throw; repeated failures pause the store, then it recovers", async () => {
  let now = 1000;
  let failing = true;
  let attempts = 0;
  const store = createFirestoreStore({
    ...base,
    now: () => now,
    call: async () => {
      attempts++;
      if (failing) throw new Error("unavailable");
      return [{ missing: "x" }];
    },
  });
  for (let i = 0; i < 3; i++) assert.equal(await store.read("k"), undefined);
  await store.write("k", entry(now));
  assert.equal(attempts, 3);
  now += 61_000;
  failing = false;
  assert.equal(await store.read("k"), undefined);
  assert.equal(attempts, 4);
});

test("a malformed Firestore document is treated as a miss", async () => {
  const store = createFirestoreStore({
    ...base,
    now: () => 1000,
    call: async (_operation, body) => [
      { found: { name: (body as { documents: string[] }).documents[0], fields: { body: { stringValue: "oops" } } } },
    ],
  });
  assert.equal(await store.read("k"), undefined);
});
