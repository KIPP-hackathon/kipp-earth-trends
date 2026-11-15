// Edge cache for the public, read-only Earth API routes, in front of Cloud Run.
// Freshness comes from the API's own Cache-Control (s-maxage), so the edge never
// outlives what the backend allows. The assistant and anything else is untouched.
// The Cache API only stores on custom domains; on workers.dev it is a no-op.
const routes =
  /^\/api\/earth\/v1\/(?:catalog|config|events|investigation|frames\/[a-z0-9_]{1,60}\/\d{4}-(?:0[1-9]|1[0-2])|comparisons|(?:series|comparison)\/[a-z0-9_]{1,60})$/;

export function edgeCacheable(request) {
  if (request.method !== "GET" || request.headers.has("range")) return false;
  return routes.test(new URL(request.url).pathname);
}

function storable(response) {
  if (response.status !== 200 || response.headers.has("set-cookie")) return false;
  const control = (response.headers.get("cache-control") ?? "").toLowerCase();
  if (/\b(no-store|no-cache|private)\b/.test(control)) return false;
  const lifetime = /s-maxage=(\d+)/.exec(control) ?? /max-age=(\d+)/.exec(control);
  return Boolean(lifetime && Number(lifetime[1]) > 0);
}

export async function withEdgeCache(request, context, cache, origin) {
  if (!cache || !edgeCacheable(request)) return origin();
  // Key on the URL alone: browser headers must not fragment the shared entry.
  const key = new Request(request.url, { method: "GET" });
  const hit = await cache.match(key).catch(() => undefined);
  if (hit) {
    const etag = hit.headers.get("etag");
    const response =
      etag && request.headers.get("if-none-match") === etag
        ? new Response(null, { status: 304, headers: hit.headers })
        : new Response(hit.body, hit);
    response.headers.set("x-edge-cache", "HIT");
    return response;
  }
  const response = await origin();
  if (storable(response))
    context.waitUntil(cache.put(key, response.clone()).catch(() => {}));
  const result = new Response(response.body, response);
  result.headers.set("x-edge-cache", "MISS");
  return result;
}
