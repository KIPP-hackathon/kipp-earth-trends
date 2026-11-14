import { afterEach, describe, expect, it, vi } from "vitest";
import { EarthReadCache } from "./earthReadCache";
import { frameKey } from "./earthFrameCache";
import type { EarthVariable } from "./earthApi";

const signal = () => new AbortController().signal;

afterEach(() => vi.useRealTimers());

describe("public data cache", () => {
  it("deduplicates reads and isolates mutable consumer values", async () => {
    const cache = new EarthReadCache();
    const load = vi.fn(async () => ({ values: [1] }));
    const [a, b] = await Promise.all([
      cache.read("series", signal(), 1000, load),
      cache.read("series", signal(), 1000, load),
    ]);
    a.values[0] = 9;
    expect(b.values).toEqual([1]);
    expect(await cache.read("series", signal(), 1000, load)).toEqual({
      values: [1],
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not let one tab cancel another tab's shared request", async () => {
    const cache = new EarthReadCache();
    const first = new AbortController();
    let finish!: (value: number) => void;
    const load = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    );
    const a = expect(
      cache.read("shared", first.signal, 1000, load),
    ).rejects.toMatchObject({ name: "AbortError" });
    const b = cache.read("shared", signal(), 1000, load);
    await Promise.resolve();
    first.abort();
    finish(42);
    await a;
    await expect(b).resolves.toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const cache = new EarthReadCache();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true });
    await expect(cache.read("catalog", signal(), 1000, load)).rejects.toThrow(
      "offline",
    );
    await expect(cache.read("catalog", signal(), 1000, load)).resolves.toEqual({
      ok: true,
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("expires entries without extending TTL on cache hits", async () => {
    vi.useFakeTimers();
    const cache = new EarthReadCache();
    const load = vi.fn(async () => ({ value: 1 }));
    await cache.read("catalog", signal(), 1000, load);
    await vi.advanceTimersByTimeAsync(900);
    await cache.read("catalog", signal(), 1000, load);
    await vi.advanceTimersByTimeAsync(100);
    await cache.read("catalog", signal(), 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("evicts least recently used entries within its memory budget", async () => {
    const cache = new EarthReadCache(18, 10);
    const load = vi.fn(async () => "1234567"); // 9 UTF-8 bytes including quotes
    await cache.read("a", signal(), 1000, load);
    await cache.read("b", signal(), 1000, load);
    await cache.read("a", signal(), 1000, load);
    await cache.read("c", signal(), 1000, load);
    await cache.read("a", signal(), 1000, load);
    expect(load).toHaveBeenCalledTimes(3);
    await cache.read("b", signal(), 1000, load);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("does not store oversized responses", async () => {
    const cache = new EarthReadCache(4);
    const load = vi.fn(async () => "large");
    await cache.read("a", signal(), 1000, load);
    await cache.read("a", signal(), 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("prevents old in-flight results from repopulating a cleared cache", async () => {
    const cache = new EarthReadCache();
    let finish!: (value: number) => void;
    const old = expect(
      cache.read(
        "catalog",
        signal(),
        1000,
        () =>
          new Promise<number>((resolve) => {
            finish = resolve;
          }),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    cache.clear();
    const load = vi.fn(async () => 2);
    expect(await cache.read("catalog", signal(), 1000, load)).toBe(2);
    finish(1);
    await old;
    expect(await cache.read("catalog", signal(), 1000, load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("restarts a request after its last consumer cancels", async () => {
    const cache = new EarthReadCache();
    const controller = new AbortController();
    const old = expect(
      cache.read("catalog", controller.signal, 1000, async () => 1),
    ).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    const fresh = cache.read("catalog", signal(), 1000, async () => 2);
    await old;
    await expect(fresh).resolves.toBe(2);
  });

  it("separates frame cache entries by revision and quality policy", () => {
    const variable: EarthVariable = {
      id: "temperature",
      name: "Temperature",
      quantity: "temperature",
      unit: "degC",
      product: "MERRA-2",
      months: [],
      sourceRevision: "v1",
    };
    const key = frameKey(variable, "2024-01");
    expect(frameKey({ ...variable, sourceRevision: "v2" }, "2024-01")).not.toBe(
      key,
    );
    expect(
      frameKey(
        { ...variable, quality: { rule: "strict", notes: [] } },
        "2024-01",
      ),
    ).not.toBe(key);
  });
});
