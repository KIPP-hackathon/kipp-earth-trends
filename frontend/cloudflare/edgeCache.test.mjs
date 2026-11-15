import { describe, expect, it } from "vitest";
import { edgeCacheable, withEdgeCache } from "./edgeCache.mjs";

// Minimal Cache API stand-in keyed by URL.
function fakeCache() {
  const entries = new Map();
  return {
    entries,
    async match(request) {
      const stored = entries.get(request.url);
      return stored?.clone();
    },
    async put(request, response) {
      entries.set(request.url, response);
    },
  };
}
const context = () => {
  const tasks = [];
  return { tasks, waitUntil: (task) => tasks.push(task) };
};
const get = (path, headers = {}) =>
  new Request(`https://kipp-nasa.space${path}`, { headers });
const upstream = (init = {}) =>
  new Response("frame-bytes", {
    status: 200,
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=21600",
      etag: 'W/"abc"',
      ...init.headers,
    },
    ...init,
  });

describe("edgeCacheable", () => {
  it("accepts only public read routes", () => {
    for (const path of [
      "/api/earth/v1/catalog",
      "/api/earth/v1/config",
      "/api/earth/v1/events",
      "/api/earth/v1/frames/temperature/2024-06?factor=4&format=f32",
      "/api/earth/v1/series/temperature?start=2024-01&end=2024-12&bbox=-60,-22,-54,-16",
      "/api/earth/v1/comparison/temperature?start=2024-01&end=2024-12&bbox=0,0,1,1",
      "/api/earth/v1/comparisons?variables=temperature,rainfall&start=2024-01&end=2024-12&bbox=0,0,1,1",
      "/api/earth/v1/investigation?x=temperature",
    ])
      expect(edgeCacheable(get(path))).toBe(true);
  });
  it("rejects the assistant, other methods, ranges and unknown routes", () => {
    expect(edgeCacheable(get("/api/assistant"))).toBe(false);
    expect(edgeCacheable(get("/api/earth/v1/trends?variable=a"))).toBe(false);
    expect(edgeCacheable(get("/api/earth/v2/catalog"))).toBe(false);
    expect(
      edgeCacheable(
        new Request("https://kipp-nasa.space/api/earth/v1/catalog", { method: "POST", body: "x" }),
      ),
    ).toBe(false);
    expect(edgeCacheable(get("/api/earth/v1/catalog", { range: "bytes=0-9" }))).toBe(false);
  });
});

describe("withEdgeCache", () => {
  it("stores a public 200 response and serves the next request from the edge", async () => {
    const cache = fakeCache();
    const ctx = context();
    let calls = 0;
    const origin = async () => (calls++, upstream());
    const first = await withEdgeCache(get("/api/earth/v1/catalog"), ctx, cache, origin);
    expect(first.headers.get("x-edge-cache")).toBe("MISS");
    expect(await first.text()).toBe("frame-bytes");
    await Promise.all(ctx.tasks);
    const second = await withEdgeCache(get("/api/earth/v1/catalog"), ctx, cache, origin);
    expect(second.headers.get("x-edge-cache")).toBe("HIT");
    expect(await second.text()).toBe("frame-bytes");
    expect(calls).toBe(1);
  });

  it("answers a matching If-None-Match from the edge with 304", async () => {
    const cache = fakeCache();
    const ctx = context();
    const origin = async () => upstream();
    await withEdgeCache(get("/api/earth/v1/catalog"), ctx, cache, origin);
    await Promise.all(ctx.tasks);
    const revalidated = await withEdgeCache(
      get("/api/earth/v1/catalog", { "if-none-match": 'W/"abc"' }),
      ctx,
      cache,
      async () => {
        throw new Error("origin must not be called");
      },
    );
    expect(revalidated.status).toBe(304);
    expect(revalidated.headers.get("etag")).toBe('W/"abc"');
  });

  it("never stores errors, no-store, private or uncacheable responses", async () => {
    for (const response of [
      () => new Response("bad", { status: 503, headers: { "cache-control": "public, max-age=60" } }),
      () => new Response("ok", { headers: { "cache-control": "no-store" } }),
      () => new Response("ok", { headers: { "cache-control": "private, max-age=60" } }),
      () => new Response("ok", { headers: { "cache-control": "public, max-age=0" } }),
      () => new Response("ok"),
      () => new Response("ok", { headers: { "cache-control": "public, max-age=60", "set-cookie": "a=b" } }),
    ]) {
      const cache = fakeCache();
      const ctx = context();
      await withEdgeCache(get("/api/earth/v1/catalog"), ctx, cache, async () => response());
      await Promise.all(ctx.tasks);
      expect(cache.entries.size).toBe(0);
    }
  });

  it("passes non-cacheable requests straight through", async () => {
    const cache = fakeCache();
    const ctx = context();
    const response = await withEdgeCache(get("/api/assistant"), ctx, cache, async () => upstream());
    expect(response.headers.get("x-edge-cache")).toBeNull();
    expect(cache.entries.size).toBe(0);
  });

  it("works without a Cache API (local development)", async () => {
    const response = await withEdgeCache(get("/api/earth/v1/catalog"), context(), undefined, async () => upstream());
    expect(await response.text()).toBe("frame-bytes");
  });

  it("treats a failing Cache API as a miss", async () => {
    const broken = {
      match: async () => { throw new Error("cache down"); },
      put: async () => { throw new Error("cache down"); },
    };
    const ctx = context();
    const response = await withEdgeCache(get("/api/earth/v1/catalog"), ctx, broken, async () => upstream());
    expect(await response.text()).toBe("frame-bytes");
    await Promise.all(ctx.tasks);
  });
});
