import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EarthFrame, EarthVariable } from "./earthApi";

const started: { id: string; month: string; finish: () => void; signal: AbortSignal }[] = [];
vi.mock("./earthApi", () => ({
  variableDataKey: (variable: EarthVariable) => variable.id,
  loadFrame: (id: string, month: string, signal: AbortSignal) =>
    new Promise<EarthFrame>((resolve, reject) => {
      const frame = {
        variable: id, month, values: new Float32Array(4), coverage: new Float32Array(4),
      } as unknown as EarthFrame;
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      started.push({ id, month, signal, finish: () => resolve(frame) });
    }),
}));
const { bufferWindow, invalidateFrames, requestFrame, upcomingMonths } = await import("./earthFrameCache");

// Requests left pending are rejected by invalidateFrames() between tests.
const ask = (...args: Parameters<typeof requestFrame>) => {
  const request = requestFrame(...args);
  request.catch(() => {});
  return request;
};
const variable = (id: string) => ({ id, months: [] }) as unknown as EarthVariable;

beforeEach(() => {
  invalidateFrames();
  started.length = 0;
});

describe("frame download scheduling", () => {
  it("downloads every layer of a month at once, up to four", () => {
    const signal = new AbortController().signal;
    for (const id of ["a", "b", "c", "d", "e"]) void ask(variable(id), "2024-01", signal, "foreground");
    expect(started.map(job => job.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("lets look-ahead use only two slots so a seek is never starved", () => {
    const signal = new AbortController().signal;
    for (const month of ["2024-02", "2024-03", "2024-04"])
      void ask(variable("a"), month, signal, "background");
    expect(started).toHaveLength(2);
    void ask(variable("a"), "2024-01", signal, "foreground");
    void ask(variable("b"), "2024-01", signal, "foreground");
    expect(started.map(job => job.month)).toEqual(["2024-02", "2024-03", "2024-01", "2024-01"]);
  });

  it("interrupts look-ahead for a foreground request when every slot is busy", () => {
    const signal = new AbortController().signal;
    for (const id of ["a", "b", "c", "d"]) void ask(variable(id), "2024-02", signal, id < "c" ? "foreground" : "background");
    expect(started).toHaveLength(4);
    void ask(variable("e"), "2024-01", signal, "foreground");
    expect(started.find(job => job.id === "c")?.signal.aborted).toBe(true);
  });

  it("serves a buffered frame without another download", async () => {
    const signal = new AbortController().signal;
    const first = ask(variable("a"), "2024-01", signal, "background");
    started[0].finish();
    await first;
    await ask(variable("a"), "2024-01", signal, "foreground");
    expect(started).toHaveLength(1);
  });
});

describe("playback buffer window", () => {
  const months = ["2024-01", "2024-02", "2024-03", "2024-04"];
  it("lists the following months and wraps like playback", () => {
    expect(upcomingMonths(months, 1, 2)).toEqual(["2024-03", "2024-04"]);
    expect(upcomingMonths(months, 3, 2)).toEqual(["2024-01", "2024-02"]);
  });
  it("never includes the current month or repeats a month", () => {
    expect(upcomingMonths(months, 0, 10)).toEqual(["2024-02", "2024-03", "2024-04"]);
    expect(upcomingMonths(["2024-01"], 0, 3)).toEqual([]);
  });
  it("shrinks the window as layers are added to stay inside the cache", () => {
    expect(bufferWindow(6, 1)).toBe(6);
    expect(bufferWindow(6, 4)).toBe(6);
    expect(bufferWindow(6, 8)).toBe(3);
    expect(bufferWindow(6, 40)).toBe(1);
  });
});
