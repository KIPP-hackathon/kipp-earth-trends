import { test } from "node:test";
import assert from "node:assert/strict";
import { historicalEvents } from "./config.ts";
import { eventSuggestions } from "./event-context.ts";
import { metadataOf } from "./data.ts";
import type { CatalogVariable } from "./data.ts";
import { variables } from "./registry.ts";

function entry(id: string, overrides: Partial<CatalogVariable> = {}): CatalogVariable {
  return {
    ...metadataOf(variables.find((variable) => variable.id === id)!),
    available: true,
    coverageFlag: true,
    colorRangeSource: "configured_default",
    months: [{ month: "2024-06", samples: 1, validSamples: 1 }],
    firstMonth: "2024-06",
    lastMonth: "2024-06",
    unavailableReason: null,
    ...overrides,
  };
}

test("event choices omit hidden, unqueryable and missing catalog sources", () => {
  const event = historicalEvents.find((event) => event.id === "pantanal-2024")!;
  const result = eventSuggestions(event, [
    entry("rainfall", { available: false }),
    entry("temperature"),
    entry("ndvi", { coverageFlag: false }),
    entry("evi", { available: false, coverageFlag: false }),
  ]);
  assert.deepEqual(result.suggestedVariables.map((choice) => choice.id), ["temperature"]);
  assert.equal(result.variable, "temperature");
  assert.equal(result.available, true);
  assert.deepEqual(result.months, ["2024-06"]);
});

test("event availability requires valid months in its original historical window", () => {
  const event = historicalEvents.find((event) => event.id === "pantanal-2024")!;
  const result = eventSuggestions(event, [entry("rainfall", {
    months: [
      { month: "2024-05", samples: 1, validSamples: 1 },
      { month: "2024-06", samples: 1, validSamples: 0 },
      { month: "2024-10", samples: 1, validSamples: 1 },
    ],
  })]);
  assert.equal(result.available, false);
  assert.deepEqual(result.months, []);
  assert.equal(result.suggestedVariables[0].available, false);
  assert.deepEqual(result.suggestedVariables[0].months, []);
});

test("available environmental records never become tsunami measurements", () => {
  const event = historicalEvents.find((event) => event.id === "tohoku-2011")!;
  const result = eventSuggestions(event, [entry("rainfall", {
    months: [{ month: "2011-03", samples: 1, validSamples: 1 }],
  })]);
  assert.equal(result.available, false);
  assert.deepEqual(result.suggestedVariables, []);
  assert.match(result.unavailableReason!, /No sea-level or seismic data layer/);
});
