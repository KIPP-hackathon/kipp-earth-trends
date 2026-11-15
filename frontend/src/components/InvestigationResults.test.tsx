import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  buildInvestigation,
  monthText,
} from "../../../backend/src/investigation";
import { InvestigationResults } from "./InvestigationResults";

const request = {
  x: "temperature",
  y: "rainfall",
  bbox: "-60,-22,-54,-16",
  start: "2000-01",
  end: "2019-12",
  baselineStart: "2000-01",
  baselineEnd: "2019-12",
  method: "relationships-v1" as const,
};
const data = buildInvestigation(
  request,
  [1, -1].map((sign, index) => ({
    variable: index ? "rainfall" : "temperature",
    name: index ? "Rainfall" : "Temperature",
    unit: "test",
    product: "Synthetic software fixture",
    source: "test",
    sourceLayer: "test",
    sourceTable: "test",
    sourceUC: "test",
    aggregation: "mean",
    method: "test",
    observations: Array.from({ length: 240 }, (_, i) => ({
      month: monthText(24000 + i),
      value: 20 + (sign * i) / 10 + Math.sin(i),
      coverage: 1,
      samples: 10,
    })),
  })),
);
const render = (study = data) =>
  renderToStaticMarkup(
    createElement(InvestigationResults, {
      data: study,
      regionName: "Synthetic QA box",
      onGuide: () => {},
      initialView: "Trend" as const,
    }),
  );

it("draws the default ahead extension and both fitted markers for each indicator", () => {
  const html = render();
  expect(html.match(/class="trend-chart-extension"/g)).toHaveLength(2);
  expect(html.match(/Point A:/g)).toHaveLength(2);
  expect(html.match(/Point B:/g)).toHaveLength(2);
  expect(html).toContain("Dec 2020");
  expect(html).toContain("Last observation · Dec 2019");
  expect(html).toContain("linear trend extension, not a forecast");
  expect(html).not.toMatch(/(?:NaN|Infinity)/);
});

it("anchors the extension at the last valid data month when the requested end is later", () => {
  const html = render({ ...data, request: { ...request, end: "2020-06" } });
  expect(html).toContain("Last observation · Dec 2019");
  expect(html).toContain("B: Dec 2020");
  expect(html.match(/class="trend-chart-extension"/g)).toHaveLength(2);
});

it("keeps source charts without inventing an extension when a fit is unavailable", () => {
  const html = render({
    ...data,
    series: data.series.map((s) => ({
      ...s,
      trend: { ...s.trend, slopePerYear: null, line: [] },
    })),
  });
  expect(html).not.toContain('class="trend-chart-extension"');
  expect(html).not.toContain('class="trend-chart-point-b"');
  expect(html).toContain('class="investigation-chart"');
  expect(html).not.toMatch(/(?:NaN|Infinity)/);
});

it("opens on seasonal departures with both indicators in one combined chart", () => {
  const html = renderToStaticMarkup(
    createElement(InvestigationResults, {
      data,
      regionName: "Synthetic QA box",
      onGuide: () => {},
    }),
  );
  expect(html).toMatch(/aria-pressed="true"[^>]*>Anomalies</);
  expect(html.match(/class="investigation-chart"/g)).toHaveLength(1);
  expect(html).toContain("Temperature (test) and Rainfall (test)");
  expect(html).not.toMatch(/(?:NaN|Infinity)/);
});

it("guides from setup through every result view", async () => {
  const { trendLabTourSteps } = await import("./trendLabTour");
  const steps = (hasResults: boolean) =>
    trendLabTourSteps({
      hasResults,
      hasSecond: true,
      loading: false,
      onRunExample: () => {},
    });
  const ids = steps(false).map((s) => s.id);
  expect(ids.slice(0, 5)).toEqual([
    "welcome",
    "area",
    "indicators",
    "period",
    "run",
  ]);
  expect(steps(false).flatMap((s) => (s.view ? [s.view] : []))).toEqual([
    "Anomalies",
    "Anomalies",
    "Trend",
    "Relationships",
  ]);
  const run = (r: boolean) => steps(r).find((s) => s.id === "run")!;
  expect(run(false).canNext).toBe(false);
  expect(run(false).actions).toBeTruthy();
  expect(run(true).canNext).toBe(true);
  expect(run(true).actions).toBeUndefined();
});

it("offers a results tour entry only when a handler is provided", () => {
  expect(render()).not.toContain("Tour the results");
  const html = renderToStaticMarkup(
    createElement(InvestigationResults, {
      data,
      regionName: "Synthetic QA box",
      onGuide: () => {},
      onTour: () => {},
    }),
  );
  expect(html).toContain("Tour the results");
  expect(html).toContain('class="trend-provenance trend-data-methods"');
});
