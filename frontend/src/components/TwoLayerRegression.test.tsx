import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  buildInvestigation,
  monthText,
} from "../../../backend/src/investigation";
import { TwoLayerRegression } from "./TwoLayerRegression";

function build(months: number) {
  let seed = 5;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296 - 0.5;
  };
  const x = Array.from(
    { length: months },
    (_, i) => 0.4 * (i / 120) + rand() * 2,
  );
  const y = x.map(
    (v, i) =>
      -1.5 * v - 0.3 * (i / 120) + 3 * Math.sin(i * 0.5236) + rand() * 0.6,
  );
  const source = (variable: string, values: number[]) => ({
    variable,
    name: variable === "temperature" ? "Temperature" : "Rainfall",
    unit: "test",
    product: "Synthetic software fixture",
    source: "test",
    sourceLayer: "test",
    sourceTable: "test",
    sourceUC: "test",
    aggregation: "mean",
    method: "test",
    observations: values.map((value, i) => ({
      month: monthText(24000 + i),
      value,
      coverage: 1,
      samples: 10,
    })),
  });
  return buildInvestigation(
    {
      x: "temperature",
      y: "rainfall",
      bbox: "-60,-22,-54,-16",
      start: monthText(24000),
      end: monthText(24000 + months - 1),
      baselineStart: monthText(24000),
      baselineEnd: monthText(24000 + months - 1),
      method: "relationships-v1",
    },
    [source("temperature", x), source("rainfall", y)],
  );
}
const render = (months: number, lag = 0) =>
  renderToStaticMarkup(
    createElement(TwoLayerRegression, { data: build(months), lag }),
  );

it("shows both layers and the gap test for a usable study", () => {
  const html = render(240);
  expect(html).toContain("Layer 1");
  expect(html).toContain("Layer 2");
  expect(html).toContain("Trend carried by X");
  expect(html).toContain("Gap test");
  expect(html).toContain("Layer test");
  expect(html).toContain("Hidden block to display");
  expect(html).toContain("Association, not cause");
  expect(html).toContain("Show hidden block");
});

it("explains why nothing is shown when support is too short", () => {
  const html = render(20);
  expect(html).toContain("at least 24 common month pairs");
  expect(html).not.toContain("Gap test");
});

import { LayeredTrend } from "./LayeredTrend";
it("draws the layered trend with both lines and the change readout", () => {
  const html = renderToStaticMarkup(
    createElement(LayeredTrend, { data: build(240), lag: 0, onLag: () => {} }),
  );
  expect(html).toContain("Layer 1 · trend alone");
  expect(html).toContain("Layer 2 · with Temperature held fixed");
  expect(html).toContain("Moves with Temperature");
  expect(html).toContain("Point A");
  expect(html).toContain("Lag for the added layer");
});
it("layered trend explains missing support instead of drawing", () => {
  const html = renderToStaticMarkup(
    createElement(LayeredTrend, { data: build(20), lag: 0 }),
  );
  expect(html).toContain("at least 24 common month pairs");
  expect(html).not.toContain("Point A");
});
