import type { IncomingMessage, ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import { cloudRunOrigin as origin } from "./cloudRunOrigin.js";

export function createEarthHandler(
  identityToken: () => Promise<string>,
  upstreamOrigin = origin,
) {
  return async function handler(
    request: IncomingMessage,
    response: ServerResponse,
  ) {
    const deadline = Date.now() + 52_000;
    response.setHeader("X-Content-Type-Options", "nosniff");
    const fail = (status: number, code: string) => {
      response.statusCode = status;
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          error: {
            code,
            message: "Could not query the data source. Try again.",
          },
        }),
      );
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      return fail(405, "METHOD_NOT_ALLOWED");
    }
    let path: string, query: URLSearchParams;
    try {
      const url = new URL(
        request.url ?? "",
        "https://kipp-earth-trends-lab.vercel.app",
      );
      query = url.searchParams;
      const routedPath = query.get("__path");
      if (query.getAll("__path").length > 1)
        return fail(400, "INVALID_PARAMETERS");
      path = decodeURIComponent(
        routedPath === null
          ? url.pathname.replace(/^\/api\/earth/, "")
          : `/${routedPath}`,
      );
      query.delete("__path");
      // Vercel also exposes a rewrite capture as a query parameter.
      if (
        routedPath !== null &&
        query.getAll("path").length === 1 &&
        query.get("path") === routedPath
      )
        query.delete("path");
      // No arbitrary upstream URLs, SQL, methods, paths or browser authorization headers.
      if (
        !/^\/v1\/(catalog|config|events|trends|investigation|frames\/[a-z0-9_]{1,60}\/\d{4}-(0[1-9]|1[0-2])|comparisons|(?:series|comparison)\/[a-z0-9_]{1,60})$/.test(
          path,
        )
      )
        return fail(404, "ROUTE_NOT_FOUND");
      // CI verifies a newly promoted revision without reusing a previous CDN entry.
      // This identifier never changes the fixed upstream destination.
      if (query.has("deployment")) {
        if (
          query.getAll("deployment").length !== 1 ||
          !/^[a-z0-9-]{1,100}$/.test(query.get("deployment")!)
        )
          return fail(400, "INVALID_PARAMETERS");
        query.delete("deployment");
      }
      const allowed = new Set(
        path === "/v1/investigation"
          ? [
              "x",
              "y",
              "bbox",
              "start",
              "end",
              "baselineStart",
              "baselineEnd",
              "method",
            ]
          : path === "/v1/trends"
            ? ["variable", "bbox", "start", "end"]
            : path === "/v1/comparisons"
              ? ["variables", "bbox", "start", "end", "analysis"]
              : path.startsWith("/v1/comparison/")
                ? ["bbox", "start", "end", "analysis"]
              : ["bbox", "factor", "format", "start", "end"],
      );
      for (const [key, value] of query)
        if (
          !allowed.has(key) ||
          (key === "analysis" && value !== "trend-v1") ||
          (key === "method" && value !== "relationships-v1") ||
          value.length > (key === "variables" ? 400 : 200) ||
          query.getAll(key).length !== 1
        ) {
          console.warn(
            JSON.stringify({
              source: "earth-proxy",
              code: "INVALID_PARAMETERS",
              parameterNames: [...query.keys()]
                .slice(0, 10)
                .map((key) => key.slice(0, 40)),
            }),
          );
          return fail(400, "INVALID_PARAMETERS");
        }
    } catch {
      return fail(400, "INVALID_PARAMETERS");
    }
    try {
      const token = await identityToken();
      const headers: Record<string, string> = {
        authorization: `Bearer ${token}`,
      };
      const etag = request.headers["if-none-match"];
      if (typeof etag === "string" && etag.length < 200)
        headers["if-none-match"] = etag;
      const result = await fetch(`${upstreamOrigin}${path}?${query}`, {
        method: request.method,
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      });
      if (
        result.status >= 300 &&
        result.status < 400 &&
        result.status !== 304
      ) {
        await result.body?.cancel();
        return fail(502, "UPSTREAM_REDIRECT_BLOCKED");
      }
      if (result.status === 401 || result.status === 403)
        return fail(503, "BACKEND_AUTH_UNAVAILABLE");
      response.statusCode = result.status;
      for (const key of [
        "content-type",
        "cache-control",
        "etag",
        "x-data-provider",
        "x-cache",
        "x-cache-layer",
        "x-request-id",
        "retry-after",
      ]) {
        const value = result.headers.get(key);
        if (value) response.setHeader(key, value);
      }
      // Native fetch decompresses upstream bodies; never forward Content-Encoding or Content-Length.
      if (request.method === "HEAD" || result.status === 304)
        return response.end();
      const reader = result.body?.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      if (reader) {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > 4_000_000) {
              await reader.cancel();
              return fail(502, "UPSTREAM_RESPONSE_TOO_LARGE");
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      response.end(Buffer.concat(chunks));
    } catch (error) {
      // Never log assertions, access/identity tokens, headers or provider response bodies.
      console.warn(
        JSON.stringify({
          source: "earth-proxy",
          code:
            error instanceof Error && /^[A-Z_]+$/.test(error.message)
              ? error.message
              : "UPSTREAM_UNAVAILABLE",
        }),
      );
      fail(503, "UPSTREAM_UNAVAILABLE");
    }
  };
}
