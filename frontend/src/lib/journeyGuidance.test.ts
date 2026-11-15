import { expect, it } from "vitest";
import { journeyGuidance, agentStudyContext } from "./journeyGuidance";
import type { AssistantContext } from "./assistant";
const context = {
  version: 3,
  tab: "explore",
  panels: [
    {
      variable: "temperature",
      region: { name: "Brazil" },
      start: "2024-01",
      end: "2024-03",
      layers: [{ variable: "temperature" }],
    },
  ],
  camera: {},
  colorRanges: { temperature: { domain: [0, 20] } },
} as unknown as AssistantContext;
it("keeps Trend Lab and introduction questions free of another workspace study", () => {
  expect(agentStudyContext("trend", context)).toMatchObject({
    tab: "learn",
    panels: [],
    colorRanges: {},
  });
  expect(agentStudyContext("start", context)).toMatchObject({
    tab: "learn",
    panels: [],
  });
  expect(agentStudyContext("explore", context)).toBe(context);
});
it("guides the actual region/period without inventing inference for a short study", () => {
  const tip = journeyGuidance("explore", context.panels[0]);
  expect(tip.detail).toContain("Brazil");
  expect(tip.detail).toContain("2024-01");
  expect(tip.detail).toContain("short");
  expect(tip.prompt).toContain("limitations");
});
