import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDelayedFlag } from "./useDelayedFlag";

describe("delayed loading flag", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("never shows a busy state shorter than the delay", () => {
    const changes: boolean[] = [];
    const flag = createDelayedFlag((v) => changes.push(v), 450, 350);
    flag.update(true);
    vi.advanceTimersByTime(300);
    flag.update(false);
    vi.advanceTimersByTime(1000);
    expect(changes).toEqual([]);
  });

  it("shows after the delay and stays for the minimum time", () => {
    const changes: boolean[] = [];
    const flag = createDelayedFlag((v) => changes.push(v), 450, 350);
    flag.update(true);
    vi.advanceTimersByTime(450);
    expect(changes).toEqual([true]);
    vi.advanceTimersByTime(100);
    flag.update(false);
    expect(changes).toEqual([true]);
    vi.advanceTimersByTime(250);
    expect(changes).toEqual([true, false]);
  });

  it("keeps showing when busy resumes before the minimum ends", () => {
    const changes: boolean[] = [];
    const flag = createDelayedFlag((v) => changes.push(v), 450, 350);
    flag.update(true);
    vi.advanceTimersByTime(450);
    flag.update(false);
    vi.advanceTimersByTime(100);
    flag.update(true);
    vi.advanceTimersByTime(2000);
    expect(changes).toEqual([true]);
  });
});
