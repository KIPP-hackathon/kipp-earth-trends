import { describe, expect, it } from "vitest";
import {
  comparisonReducer,
  comparisonTimeline,
  createComparison,
  createScenario,
} from "./comparison";

const pair = () =>
  createComparison(
    createScenario({
      region: "pantanal",
      timeline: { start: 10, end: 20, frame: 10 },
    }),
    createScenario({
      region: "amazonia",
      timeline: { start: 15, end: 30, frame: 15 },
    }),
  );

describe("independent comparison scenarios", () => {
  it("changes only the selected side and duplicates without sharing mutable state", () => {
    let state = comparisonReducer(pair(), {
      type: "filter",
      side: 0,
      patch: { variable: "rainfall" },
    });
    expect(state.scenarios[1].variable).toBe("temperature");
    state = comparisonReducer(state, { type: "duplicate", side: 0 });
    expect(state.scenarios[1].region).toBe("pantanal");
    state = comparisonReducer(state, {
      type: "playback",
      side: 1,
      action: { type: "seek", frame: 17 },
    });
    expect(state.scenarios[0].timeline.frame).toBe(10);
    expect(state.scenarios[1].timeline.frame).toBe(17);
  });

  it("keeps a manual zoom independent until view linking is enabled", () => {
    let state = comparisonReducer(pair(), {
      type: "view",
      side: 1,
      view: { zoom: 1.6, showLayer: false, longitude: 60, latitude: 20 },
    });
    expect(state.scenarios[0].view.zoom).toBe(1);
    state = comparisonReducer(state, {
      type: "link-view",
      linked: true,
      side: 1,
    });
    expect(state.scenarios[0].view).toEqual({
      zoom: 1.6,
      showLayer: false,
      longitude: 60,
      latitude: 20,
    });
    state = comparisonReducer(state, {
      type: "view",
      side: 0,
      view: { zoom: 1.2, showLayer: true, longitude: -10, latitude: -15 },
    });
    expect(state.scenarios[1].view.zoom).toBe(1.2);
  });
});

describe("synchronized playback", () => {
  it("uses the intersection of absolute dates without changing filter periods", () => {
    let state = comparisonReducer(pair(), { type: "sync", mode: "date" });
    expect(comparisonTimeline(state, 0)).toMatchObject({
      start: 15,
      end: 20,
      frame: 15,
    });
    expect(state.scenarios[0].timeline.start).toBe(10);
    state = comparisonReducer(state, {
      type: "playback",
      side: 1,
      action: { type: "seek", frame: 18 },
    });
    expect(state.scenarios.map((s) => s.timeline.frame)).toEqual([18, 18]);
  });

  it("refuses date synchronization without an overlap", () => {
    let state = comparisonReducer(pair(), {
      type: "playback",
      side: 1,
      action: { type: "preset", start: 40, end: 50 },
    });
    state = comparisonReducer(state, { type: "sync", mode: "date" });
    expect(state.timeMode).toBe("independent");
  });

  it("releases date linking when editing removes the overlap", () => {
    let state = comparisonReducer(pair(), { type: "sync", mode: "date" });
    state = comparisonReducer(state, {
      type: "playback",
      side: 0,
      action: { type: "preset", start: 0, end: 5 },
    });
    expect(state.timeMode).toBe("independent");
    expect(state.scenarios.every((s) => !s.timeline.playing)).toBe(true);
  });

  it("aligns elapsed months and stops both sides at the shorter period", () => {
    let state = comparisonReducer(pair(), { type: "sync", mode: "relative" });
    expect(comparisonTimeline(state, 1)).toMatchObject({ start: 15, end: 25 });
    state = comparisonReducer(state, {
      type: "playback",
      side: 1,
      action: { type: "seek", frame: 24 },
    });
    expect(state.scenarios.map((s) => s.timeline.frame)).toEqual([19, 24]);
    state = comparisonReducer(state, {
      type: "playback",
      side: 1,
      action: { type: "toggle" },
    });
    state = comparisonReducer(state, {
      type: "playback",
      side: 0,
      action: { type: "tick" },
    });
    expect(state.scenarios.map((s) => s.timeline.frame)).toEqual([20, 25]);
    expect(state.scenarios.every((s) => !s.timeline.playing)).toBe(true);
  });

  it("links repeat, speed and restart from either side", () => {
    let state = comparisonReducer(pair(), { type: "sync", mode: "relative" });
    state = comparisonReducer(state, {
      type: "playback",
      side: 1,
      action: { type: "speed", speed: 4 },
    });
    state = comparisonReducer(state, {
      type: "playback",
      side: 1,
      action: { type: "loop" },
    });
    state = comparisonReducer(state, {
      type: "playback",
      side: 1,
      action: { type: "seek", frame: 25 },
    });
    state = comparisonReducer(state, {
      type: "playback",
      side: 0,
      action: { type: "toggle" },
    });
    expect(state.scenarios.map((s) => s.timeline)).toEqual([
      expect.objectContaining({
        frame: 10,
        speed: 4,
        loop: true,
        playing: true,
      }),
      expect.objectContaining({
        frame: 15,
        speed: 4,
        loop: true,
        playing: true,
      }),
    ]);
  });

  it("pauses both scenarios without losing filters or the current frame", () => {
    let state = comparisonReducer(pair(), {
      type: "playback",
      side: 0,
      action: { type: "toggle" },
    });
    state = comparisonReducer(state, { type: "pause" });
    expect(state.scenarios[0].timeline).toMatchObject({
      start: 10,
      end: 20,
      frame: 10,
      playing: false,
    });
  });
});
