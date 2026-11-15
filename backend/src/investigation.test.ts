import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anomalies,
  buildInvestigation,
  cleanObservations,
  holm,
  monthText,
  relationships,
  validateInvestigation,
} from "./investigation.ts";
import type {
  Observation,
  InvestigationSource,
  InvestigationRequest,
} from "./investigation.ts";
import { DataService } from "./data.ts";

const rows = (n = 240): Observation[] =>
  Array.from({ length: n }, (_, i) => ({
    month: monthText(24000 + i),
    value:
      20 + 5 * Math.sin((i * Math.PI) / 6) + i * 0.01 + Math.sin(i * 1.713),
    samples: 10,
    coverage: 1,
  }));
const request: InvestigationRequest = {
  x: "temperature",
  y: "rainfall",
  start: "2000-01",
  end: "2019-12",
  bbox: "-60,-22,-54,-16",
  baselineStart: "2000-01",
  baselineEnd: "2019-12",
  method: "relationships-v1",
};
const source = (
  variable: string,
  observations: Observation[],
): InvestigationSource => ({
  variable,
  name: variable,
  unit: "test-unit",
  product: "Synthetic numerical fixture",
  source: "test",
  sourceUC: "test",
  sourceLayer: "test",
  sourceTable: "test",
  aggregation: "mean",
  method: "fixture",
  observations,
});
test("fixed reference is independent of display dates; insufficient and constant references stay explicit", () => {
  const input = rows();
  const a = anomalies(input, "2000-01", "2019-12");
  assert.equal(a.reference[0].count, 20);
  assert.equal(
    a.observations[0].anomaly,
    input[0].value! - a.reference[0].mean!,
  );
  assert.equal(
    anomalies(input.slice(0, 3), "2000-01", "2019-12").observations[0].anomaly,
    null,
  );
  const c = anomalies(
    input.map((r) => ({ ...r, value: 3 })),
    "2000-01",
    "2019-12",
  );
  assert.equal(c.observations[0].anomaly, 0);
  assert.equal(c.observations[0].standardized, null);
  const full = buildInvestigation(request, [
    source("temperature", input),
    source("rainfall", input),
  ]);
  const short = buildInvestigation({ ...request, start: "2015-01" }, [
    source("temperature", input),
    source("rainfall", input),
  ]);
  assert.deepEqual(full.series[0].reference, short.series[0].reference);
});
test("known association, fixed common support, and full Holm family", () => {
  const x = rows();
  const y = x.map((r, i) => ({
    ...r,
    value: r.value! * 2 + Math.cos(i * 0.71),
  }));
  const result = buildInvestigation(request, [
    source("temperature", x),
    source("rainfall", y),
  ]);
  assert.equal(result.family.length, 9);
  assert.equal(result.lags.length, 7);
  assert.ok(result.lags[0].adjustedR! > 0.8);
  assert.equal(result.lags[0].inferenceStatus, "available");
  assert.ok(Math.abs(result.lags[0].beta! - 2) < 0.1);
  // Independent statsmodels full-design OLS/HAC12, n/(n-14), normal inference.
  assert.ok(Math.abs(result.lags[0].beta! - 2.003208912034824) < 1e-10);
  assert.ok(
    Math.abs(result.lags[0].standardError! - 0.009436142877094739) < 1e-10,
  );
  assert.ok(Math.abs(result.lags[0].betaCi95![0] - 1.9847144118427442) < 1e-10);
  assert.ok(Math.abs(result.lags[0].betaCi95![1] - 2.0217034122269038) < 1e-10);
  for (const lag of result.lags) {
    assert.equal(lag.n, 234);
    assert.deepEqual(
      lag.pairs.map((p) => p.xMonth),
      result.lags[0].pairs.map((p) => p.xMonth),
    );
  }
  assert.equal(result.lags[6].pairs[0].yMonth, "2000-07");
  assert.equal(result.lags[6].pairs.at(-1)!.yMonth, "2019-12");
});
test("gaps retain calendar alignment and suppress inference; no interpolation", () => {
  const x = rows(),
    y = rows().filter((r) => r.month !== "2008-06");
  const lags = relationships(x, y);
  assert.equal(lags[0].inferenceStatus, "gaps");
  assert.equal(lags[0].pValue, null);
  assert.ok(lags[0].adjustedR !== null);
  assert.ok(lags.every((l) => l.pairs.every((p) => p.yMonth !== "2008-06")));
  const result = buildInvestigation(request, [
    source("temperature", x),
    source("rainfall", y),
  ]);
  assert.equal(
    result.series[1].observations.find((r) => r.month === "2008-06")?.value,
    null,
  );
});
test("constant, short, seasonal-collinear and invalid data do not manufacture evidence", () => {
  assert.equal(relationships(rows(12), rows(12))[0].adjustedR, null);
  assert.equal(
    relationships(
      rows(),
      rows().map((r) => ({ ...r, value: 3 })),
    )[0].pValue,
    null,
  );
  const seasonal = rows().map((r, i) => ({ ...r, value: i % 12 }));
  assert.equal(relationships(seasonal, rows())[0].adjustedR, null);
  assert.throws(() => cleanObservations([rows()[0], rows()[0]]), /duplicate/);
  assert.equal(
    cleanObservations([{ ...rows()[0], coverage: 0 }])[0].value,
    null,
  );
  assert.equal(
    cleanObservations([{ ...rows()[0], samples: 0 }])[0].value,
    null,
  );
});
test("affine units preserve r and p; beta converts units", () => {
  const x = rows(),
    y = x.map((r, i) => ({ ...r, value: r.value! * 2 + Math.cos(i * 0.71) }));
  const a = relationships(x, y)[0],
    b = relationships(
      x.map((r) => ({ ...r, value: r.value! * 1000 + 273 })),
      y,
    )[0];
  assert.ok(Math.abs(a.adjustedR! - b.adjustedR!) < 1e-10);
  assert.ok(Math.abs(a.beta! / 1000 - b.beta!) < 1e-10);
  assert.ok(Math.abs(a.standardError! / 1000 - b.standardError!) < 1e-10);
});
test("Holm retains unavailable tests in the family", () => {
  assert.deepEqual(
    holm([
      { id: "a", pValue: 0.01 },
      { id: "b", pValue: null },
      { id: "c", pValue: 0.04 },
    ]).map((t) => t.adjustedP),
    [0.03, null, 0.08],
  );
});
test("request bounds reject huge baseline union and duplicate variables", () => {
  assert.throws(
    () => validateInvestigation({ ...request, baselineStart: "1900-01" }),
    /600/,
  );
  assert.throws(
    () => validateInvestigation({ ...request, y: request.x }),
    /distinct/,
  );
  assert.throws(
    () => validateInvestigation({ ...request, start: "2000-13" }),
    /period/,
  );
});
test("data service performs one bounded regional query per source, preserves antimeridian and QA", async () => {
  const queries: { sql: string; parameters: unknown; limit: unknown }[] = [];
  const service = new DataService({
    dialect: "databricks",
    close: async () => {},
    query: async (sql, parameters, limit) => {
      queries.push({ sql, parameters, limit });
      return rows().map((r) => ({ ...r }));
    },
  });
  const result = await service.investigation({
    ...request,
    bbox: "170,-10,-170,10",
  });
  assert.equal(queries.length, 2);
  assert.equal(queries[0].limit, 601);
  assert.match(queries[0].sql, /OR/);
  assert.match(queries[1].sql, /valid_area_fraction/);
  assert.equal(result.request.bbox, "170,-10,-170,10");
  assert.equal(result.series.length, 2);
  await assert.rejects(service.investigation({ ...request, bbox: "bad" }));
});
