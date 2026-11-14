import { describe, expect, it } from "vitest";
import { eventScenario, naturalEvents, referenceScenario } from "./events";

describe("historical event presets", () => {
  it("loads the chosen context window and equal before/after windows", () => {
    const event = naturalEvents.find((e) => e.id === "pantanal-2020")!;
    expect(eventScenario(event, "during")).toMatchObject({
      region: "pantanal",
      variable: "vegetation",
      timeline: { start: 235, end: 237, frame: 235, playing: false },
    });
    expect(eventScenario(event, "before")?.timeline).toMatchObject({
      start: 232,
      end: 234,
    });
    expect(eventScenario(event, "after")?.timeline).toMatchObject({
      start: 238,
      end: 240,
    });
  });
  it("does not substitute a Brazilian region for an unsupported global event", () => {
    for (const id of ["katrina-2005", "tohoku-2011"]) {
      const event = naturalEvents.find((e) => e.id === id)!;
      expect(eventScenario(event, "during")).toBeNull();
    }
  });
  it("compares the latest supported calendar season rather than claiming live data", () => {
    const event = naturalEvents.find((e) => e.id === "pantanal-2020")!;
    const scenario = referenceScenario(eventScenario(event, "during")!);
    expect(scenario.timeline).toMatchObject({ start: 283, end: 285 });
    expect(scenario.region).toBe("pantanal");
  });
});
