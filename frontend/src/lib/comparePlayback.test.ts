import { describe, expect, it, vi } from "vitest";
import {
  commonPlaybackMonths,
  playbackTargets,
  runComparisonPlayback,
} from "./comparePlayback";
import type { ComparePlaybackPanel } from "./comparePlayback";
const a = { months: ["2000-01", "2000-03", "2000-04"], month: "2000-01" };
const b = { months: ["2000-02", "2000-03", "2000-04"], month: "2000-02" };

describe("joint comparison calendar", () => {
  it("aligns only to exact common months, preserving gaps and wrapping together", () => {
    expect(commonPlaybackMonths(a.months, b.months)).toEqual([
      "2000-03",
      "2000-04",
    ]);
    expect(playbackTargets(a, b, true, true)).toEqual({
      A: "2000-03",
      B: "2000-03",
    });
    expect(playbackTargets({ ...a, month: "2000-03" }, b, true, false)).toEqual(
      { A: "2000-04", B: "2000-04" },
    );
    expect(playbackTargets({ ...a, month: "2000-04" }, b, true, false)).toEqual(
      { A: "2000-03", B: "2000-03" },
    );
  });
  it("preserves the current A date when aligning and advances independent periods separately", () => {
    expect(playbackTargets({ ...a, month: "2000-04" }, b, true, true)).toEqual({
      A: "2000-04",
      B: "2000-04",
    });
    const later = { months: ["2025-01", "2025-02"], month: "2025-01" };
    expect(
      playbackTargets({ ...a, month: "2000-04" }, later, false, false),
    ).toEqual({ A: "2000-01", B: "2025-02" });
    expect(playbackTargets(a, later, false, true)).toEqual({
      A: "2000-01",
      B: "2025-01",
    });
  });
  it("rejects nonoverlapping or single-common-month synchronized playback", () => {
    expect(
      playbackTargets(
        a,
        { months: ["2025-01", "2025-02"], month: "2025-01" },
        true,
        true,
      ),
    ).toBeNull();
    expect(
      playbackTargets(
        a,
        { months: ["2000-01", "2001-01"], month: "2000-01" },
        true,
        true,
      ),
    ).toBeNull();
    expect(
      playbackTargets(a, { months: [], month: "" }, false, true),
    ).toBeNull();
  });
});
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup() {
  const controller = new AbortController();
  const readyA = deferred(),
    readyB = deferred();
  const displayed: string[] = [];
  const make = (
    side: string,
    preparation: Promise<void>,
  ): ComparePlaybackPanel => ({
    ...a,
    loading: false,
    prepare: () => preparation,
    commit: (month) => {
      displayed.push(`${side}:${month}`);
      if (side === "B") controller.abort();
    },
    pause: () => {},
    setSpeed: () => {},
  });
  return {
    controller,
    readyA,
    readyB,
    displayed,
    panels: { A: make("A", readyA.promise), B: make("B", readyB.promise) },
  };
}
describe("joint frame barrier", () => {
  it("does not commit either panel while its partner is still buffering", async () => {
    const s = setup();
    const run = runComparisonPlayback(s.panels, {
      sameMonth: true,
      cadenceMs: 50,
      signal: s.controller.signal,
      onPreparing: () => {},
    });
    s.readyA.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(s.displayed).toEqual([]);
    s.readyB.resolve();
    await run;
    expect(s.displayed).toEqual(["A:2000-01", "B:2000-01"]);
  });
  it("cannot publish a prepared frame after Pause cancels the run", async () => {
    const s = setup();
    const run = runComparisonPlayback(s.panels, {
      sameMonth: false,
      cadenceMs: 50,
      signal: s.controller.signal,
      onPreparing: () => {},
    });
    s.controller.abort();
    s.readyA.resolve();
    s.readyB.resolve();
    await run;
    expect(s.displayed).toEqual([]);
  });
  it("preserves both displayed dates if preparing one source fails", async () => {
    const s = setup();
    const run = runComparisonPlayback(s.panels, {
      sameMonth: false,
      cadenceMs: 50,
      signal: s.controller.signal,
      onPreparing: () => {},
    });
    const failure = expect(run).rejects.toThrow("Source unavailable");
    s.readyA.resolve();
    s.readyB.reject(new Error("Source unavailable"));
    await failure;
    expect(s.displayed).toEqual([]);
  });
});

it("cancels the shared clock during its cadence wait without a late step", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const displayed: string[] = [];
  const make = (side: string): ComparePlaybackPanel => ({
    ...a,
    loading: false,
    prepare: async () => {},
    commit: (month) => {
      displayed.push(`${side}:${month}`);
    },
    pause: () => {},
    setSpeed: () => {},
  });
  const run = runComparisonPlayback(
    { A: make("A"), B: make("B") },
    {
      sameMonth: true,
      cadenceMs: 1000,
      signal: controller.signal,
      onPreparing: () => {},
    },
  );
  try {
    await vi.advanceTimersByTimeAsync(0);
    expect(displayed).toEqual(["A:2000-01", "B:2000-01"]);
    controller.abort();
    await vi.advanceTimersByTimeAsync(5000);
    await run;
    expect(displayed).toEqual(["A:2000-01", "B:2000-01"]);
  } finally {
    controller.abort();
    vi.useRealTimers();
  }
});
