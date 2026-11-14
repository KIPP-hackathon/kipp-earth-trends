import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCatalog, loadConfig } from "./earthApi";
import { earthReadCache } from "./earthReadCache";

const config = {
  regions: [{ id: "pantanal" }],
  playback: { cadenceMs: 1000 },
  comparison: { maxGlobes: 2 },
};

describe("Earth API connection recovery", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    earthReadCache.clear();
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the catalog after a temporary network interruption", async () => {
    const catalog = {
      simulated: false,
      variables: [{ id: "temperature", months: [{ month: "2024-01" }] }],
    };
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(Response.json(catalog));
    const result = loadCatalog(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(499);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual(catalog);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("limits network retries and reports an actionable error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = expect(
      loadConfig(new AbortController().signal),
    ).rejects.toThrow("Verifique sua conexão");
    await vi.advanceTimersByTimeAsync(3500);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("recovers config after all three permitted retries", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(Response.json(config));
    const result = loadConfig(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(3500);
    await expect(result).resolves.toEqual(config);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("stops pending retries when the selection is cancelled", async () => {
    const controller = new AbortController();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = expect(loadConfig(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await result;
    await vi.advanceTimersByTimeAsync(3500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not start a request if already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(loadConfig(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the original request deadline across retries", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(Response.json(config));
    const result = loadConfig(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(500);
    await result;
    expect(timeout).toHaveBeenCalledExactlyOnceWith(58_000);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(
      fetchMock.mock.calls[1][1]?.signal,
    );
  });

  it("still respects Retry-After on a saturated backend", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, { status: 503, headers: { "Retry-After": "2" } }),
      )
      .mockResolvedValueOnce(Response.json(config));
    const result = loadConfig(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual(config);
  });

  it("does not retry HTTP validation errors", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: { message: "Invalid selection" } },
        { status: 400 },
      ),
    );
    await expect(loadConfig(new AbortController().signal)).rejects.toThrow(
      "Invalid selection",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
