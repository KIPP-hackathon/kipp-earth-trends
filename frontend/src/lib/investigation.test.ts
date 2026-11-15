import { afterEach, expect, it, vi } from "vitest";
import {
  buildInvestigation,
  monthText,
} from "../../../backend/src/investigation.ts";
import type { InvestigationRequest } from "./earthApi";
import { loadInvestigation } from "./earthApi";
import { earthReadCache } from "./earthReadCache";
import { investigationCsv, parseSavedStudy } from "./investigation";
const request: InvestigationRequest = {
  x: "temperature",
  y: "rainfall",
  bbox: "-60,-22,-54,-16",
  start: "2000-01",
  end: "2019-12",
  baselineStart: "2000-01",
  baselineEnd: "2019-12",
  method: "relationships-v1",
};
const observations = Array.from({ length: 240 }, (_, i) => ({
  month: monthText(24000 + i),
  value: 20 + Math.sin(i) + i / 100,
  coverage: 1,
  samples: 10,
}));
const data = buildInvestigation(
  request,
  ["temperature", "rainfall"].map((variable) => ({
    variable,
    name: variable,
    unit: "test",
    product: "Synthetic software fixture",
    source: "test",
    sourceLayer: "test",
    sourceTable: "test",
    sourceUC: "test",
    aggregation: "mean",
    method: "test",
    observations,
  })),
);
afterEach(() => {
  vi.unstubAllGlobals();
  earthReadCache.clear();
});
it("exports all dates, baseline rows, pairs and family tests, regardless of selected view", () => {
  const csv = investigationCsv(data);
  expect(csv).toContain("baseline_observation");
  expect(csv).toContain("lag:6");
  expect(csv).toContain("2000-01");
  expect(
    csv.split("\r\n").filter((r) => r.startsWith('"family_test"')),
  ).toHaveLength(9);
  expect(csv).toContain("reference");
  expect(csv).toContain("source");
});
it("saved settings use an explicit version and reject malformed settings", () => {
  expect(
    parseSavedStudy(
      JSON.stringify({ version: 1, request, regionName: "Pantanal box" }),
    ).request,
  ).toEqual(request);
  expect(() => parseSavedStudy("null")).toThrow();
  expect(() =>
    parseSavedStudy(JSON.stringify({ version: 2, request })),
  ).toThrow();
  expect(() =>
    parseSavedStudy(
      JSON.stringify({
        version: 1,
        request: { ...request, y: "temperature" },
        regionName: "x",
      }),
    ),
  ).toThrow();
});
it("validates response identity and caches repeated identical investigations", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(data));
  vi.stubGlobal("fetch", fetch);
  const signal = new AbortController().signal;
  await expect(loadInvestigation(request, [], signal)).resolves.toMatchObject({
    version: 1,
  });
  await loadInvestigation(request, [], signal);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0][0])).toContain("baselineStart=2000-01");
  fetch.mockResolvedValue(
    Response.json({ ...data, request: { ...request, bbox: "0,0,1,1" } }),
  );
  await expect(
    loadInvestigation({ ...request, baselineStart: "2001-01" }, [], signal),
  ).rejects.toThrow("does not match");
});


it("preserves original monthly processing in investigation exports", () => {
  const copy=structuredClone(data);
  copy.series[0].observations[0].processingRun="Final";
  copy.series[0].observations[1].processingRun="Late";
  const csv=investigationCsv(copy);
  expect(csv).toContain('""processingRun"":""Final""');
  expect(csv).toContain('""processingRun"":""Late""');
});
