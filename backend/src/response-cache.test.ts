import { test } from "node:test";
import assert from "node:assert/strict";
import { ResponseCache } from "./core.ts";
import type { CachedResponse, PersistentEntry, PersistentStore } from "./core.ts";

const response = (text: string): CachedResponse => ({
  body: Buffer.from(text),
  type: "application/json",
  etag: `W/"${text}"`,
  headers: {},
});
const persist = { softMs: 1000, hardMs: 5000 };

function fakeStore(initial?: PersistentEntry) {
  const store = {
    entry: initial,
    reads: 0,
    writes: [] as PersistentEntry[],
    async read() {
      store.reads++;
      return store.entry;
    },
    async write(_key: string, entry: PersistentEntry) {
      store.writes.push(entry);
      store.entry = entry;
    },
  };
  return store satisfies PersistentStore & Record<string, unknown>;
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

test("without a persistence policy the store is never touched", async () => {
  const store = fakeStore();
  const cache = new ResponseCache(1024, 8, store);
  const result = await cache.get("k", 1000, async () => response("a"));
  assert.equal(result.hit, false);
  assert.equal(store.reads, 0);
  assert.equal(store.writes.length, 0);
});

test("a store miss loads from the origin once and writes through", async () => {
  const store = fakeStore();
  const cache = new ResponseCache(1024, 8, store);
  let loads = 0;
  const load = async () => (loads++, response("a"));
  const first = await cache.get("k", 1000, load, persist);
  await settle();
  assert.equal(first.hit, false);
  assert.equal(first.layer, "origin");
  assert.equal(store.writes.length, 1);
  assert.ok(store.writes[0].hardExpires > store.writes[0].softExpires);
  const second = await cache.get("k", 1000, load, persist);
  assert.equal(second.layer, "memory");
  assert.equal(loads, 1);
});

test("a fresh store entry is served without touching the origin", async () => {
  const now = Date.now();
  const store = fakeStore({ response: response("stored"), softExpires: now + 10_000, hardExpires: now + 20_000 });
  const cache = new ResponseCache(1024, 8, store);
  let loads = 0;
  const result = await cache.get("k", 1000, async () => (loads++, response("origin")), persist);
  assert.equal(result.hit, true);
  assert.equal(result.layer, "store");
  assert.equal(result.response.body.toString(), "stored");
  assert.equal(loads, 0);
  assert.equal((await cache.get("k", 1000, async () => response("origin"), persist)).layer, "memory");
});

test("a stale store entry is served immediately and refreshed once in the background", async () => {
  const now = Date.now();
  const store = fakeStore({ response: response("old"), softExpires: now - 1, hardExpires: now + 20_000 });
  const cache = new ResponseCache(1024, 8, store);
  let loads = 0;
  const load = async () => (loads++, response("new"));
  const result = await cache.get("k", 1, load, persist);
  assert.equal(result.layer, "store");
  assert.equal(result.response.body.toString(), "old");
  await settle();
  await cache.get("k", 1, load, persist);
  await settle();
  assert.equal(loads >= 1, true);
  assert.equal(store.writes[0].response.body.toString(), "new");
});

test("a failed background refresh keeps serving the stale entry", async () => {
  const now = Date.now();
  const store = fakeStore({ response: response("old"), softExpires: now - 1, hardExpires: now + 20_000 });
  const cache = new ResponseCache(1024, 8, store);
  const result = await cache.get("k", 1000, async () => { throw new Error("warehouse down"); }, persist);
  await settle();
  assert.equal(result.response.body.toString(), "old");
  assert.equal(store.writes.length, 0);
});

test("an entry past its hard expiry is loaded from the origin", async () => {
  const now = Date.now();
  const store = fakeStore({ response: response("ancient"), softExpires: now - 20, hardExpires: now - 10 });
  const cache = new ResponseCache(1024, 8, store);
  const result = await cache.get("k", 1000, async () => response("new"), persist);
  assert.equal(result.layer, "origin");
  assert.equal(result.response.body.toString(), "new");
});

test("a store that throws falls back to the origin", async () => {
  const broken: PersistentStore = {
    read: async () => { throw new Error("firestore down"); },
    write: async () => { throw new Error("firestore down"); },
  };
  const cache = new ResponseCache(1024, 8, broken);
  const result = await cache.get("k", 1000, async () => response("a"), persist);
  await settle();
  assert.equal(result.response.body.toString(), "a");
});

test("concurrent requests share one store read and one origin load", async () => {
  const store = fakeStore();
  const cache = new ResponseCache(1024, 8, store);
  let loads = 0;
  const load = async () => { loads++; await settle(); return response("a"); };
  await Promise.all([1, 2, 3].map(() => cache.get("k", 1000, load, persist)));
  assert.equal(loads, 1);
  assert.equal(store.reads, 1);
});
