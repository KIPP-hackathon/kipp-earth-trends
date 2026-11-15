import assert from "node:assert/strict";
import { test } from "node:test";
import { assembleBatch, runBounded } from "./comparison-batch.ts";
import type { BatchPart } from "./comparison-batch.ts";

const doc = (variable: string) => ({ body: Buffer.from(JSON.stringify({ variable, simulated: false })) });

test("assembles valid JSON that keeps request order and per-variable documents", () => {
  const parts = new Map<string, BatchPart>([["b", doc("b")], ["a", doc("a")]]);
  const { body, complete } = assembleBatch(["a", "b"], parts);
  const parsed = JSON.parse(body.toString());
  assert.equal(complete, true);
  assert.deepEqual(Object.keys(parsed.results), ["a", "b"]);
  assert.equal(parsed.results.b.variable, "b");
  assert.deepEqual(parsed.errors, {});
});

test("reports a failed variable without hiding the others", () => {
  const parts = new Map<string, BatchPart>([
    ["a", doc("a")],
    ["b", { error: { code: "NO_DATA", message: "none" } }],
  ]);
  const { body, complete } = assembleBatch(["a", "b", "c"], parts);
  const parsed = JSON.parse(body.toString());
  assert.equal(complete, false);
  assert.deepEqual(Object.keys(parsed.results), ["a"]);
  assert.equal(parsed.errors.b.code, "NO_DATA");
  assert.equal(parsed.errors.c.code, "UPSTREAM_ERROR");
});

test("is valid JSON when every variable failed", () => {
  const { body } = assembleBatch(["a"], new Map([["a", { error: { code: "X", message: "m" } }]]));
  assert.deepEqual(JSON.parse(body.toString()).results, {});
});

test("never runs more tasks than the limit at once", async () => {
  let active = 0, peak = 0;
  const seen: string[] = [];
  await runBounded(["a", "b", "c", "d", "e"], 2, async id => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    seen.push(id); active--;
  });
  assert.equal(peak, 2);
  assert.deepEqual(seen.sort(), ["a", "b", "c", "d", "e"]);
});
