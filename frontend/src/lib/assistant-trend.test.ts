import { expect, it } from "vitest";
import { validTrendSelection, validateAssistantActions } from "./assistant";
import { validateAssistantRequest } from "../../../backend/src/assistant-contract";
import { metadataOf, variableFor } from "../../../backend/src/data";
import type { EarthCatalog, EarthConfig } from "./earthApi";
import type { AssistantContext } from "./assistant";
const catalog = {
  simulated: false,
  capabilities: { investigations: true },
  variables: ["temperature", "rainfall"].map((id) => ({
    ...metadataOf(variableFor(id)),
    available: true,
    months: [
      { month: "2000-01", samples: 10, validSamples: 10 },
      { month: "2024-12", samples: 10, validSamples: 10 },
    ],
  })),
} as EarthCatalog;
const config = { regions: [] } as unknown as EarthConfig;
const selection = {
  x: "temperature",
  y: "rainfall",
  bbox: "170,-10,-170,10",
  start: "2000-01",
  end: "2024-12",
};
const context: AssistantContext = {
  version: 1,
  tab: "trend",
  panels: [],
  camera: { longitude: 0, latitude: 0, zoom: 1, showLayer: true },
  colorRanges: {},
  trendLab: {
    selection,
    applied: { ...selection, end: "2000-01" },
    loading: false,
  },
};
it("accepts the independent Trend Lab context, including different draft/applied periods", () => {
  expect(
    validateAssistantRequest({
      message: "Explain these results",
      history: [],
      context,
    }).context.trendLab,
  ).toEqual(context.trendLab);
  expect(() =>
    validateAssistantRequest({
      message: "Explain",
      history: [],
      context: { ...context, trendLab: { ...context.trendLab, pValue: 0.001 } },
    }),
  ).toThrow();
});
it("allows a long wrapped two-variable investigation and rejects invalid or mixed commands", () => {
  const action = {
    type: "run_investigation",
    selection,
    name: "Wrapped rectangle",
  };
  expect(validTrendSelection(selection, catalog)).toBe(true);
  expect(validateAssistantActions([action], catalog, config, context)).toEqual([
    action,
  ]);
  expect(
    validateAssistantActions(
      [action, { type: "set_tab", tab: "explore" }],
      catalog,
      config,
      context,
    ),
  ).toBeUndefined();
  for (const bad of [
    { ...selection, y: "temperature" },
    { ...selection, start: "1900-01" },
    { ...selection, start: "2024-13" },
    { ...selection, bbox: "bad" },
    { ...selection, end: "2025-01" },
    { ...selection, sql: "ignored" },
  ])
    expect(validTrendSelection(bad, catalog)).toBe(false);
  expect(
    validateAssistantActions(
      [action],
      { ...catalog, capabilities: {} },
      config,
      context,
    ),
  ).toBeUndefined();
});
