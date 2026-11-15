import { createServer } from "node:http";
import { handleAsNodeRequest } from "cloudflare:node";
import { env } from "cloudflare:workers";
import { createEarthHandler } from "../server/earthProxy.ts";
import { createAssistantHandler } from "../server/assistantProxy.ts";
import { googleIdentityToken } from "./googleIdentity.mjs";

const identity = () => googleIdentityToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
const earth = createEarthHandler(identity);
const server = createServer((request, response) => {
  const path = new URL(request.url, "https://kipp-nasa.space").pathname;
  const handler =
    path === "/api/assistant"
      ? createAssistantHandler(identity, request.headers["x-kipp-app-origin"])
      : earth;
  // The only entry point below overwrites these headers before this adapter.
  delete request.headers["x-kipp-app-origin"];
  void handler(request, response).catch(() => {
    response.statusCode = 503;
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    response.end(
      JSON.stringify({
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "Please try again shortly.",
        },
      }),
    );
  });
});
server.listen(8080);

export default {
  async fetch(request, bindings) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/"))
      return bindings.ASSETS.fetch(request);
    if (
      url.pathname !== "/api/assistant" &&
      !url.pathname.startsWith("/api/earth/")
    )
      return new Response("Not found", { status: 404 });
    const allowed = new Set([
      "https://kipp-nasa.space",
      bindings.WORKER_ORIGIN,
    ]);
    if (!allowed.has(url.origin))
      return new Response("Forbidden", { status: 403 });
    const headers = new Headers(request.headers);
    headers.set("x-kipp-app-origin", url.origin);
    // CF overwrites CF-Connecting-IP at its public edge; ignore visitor x-real-ip.
    headers.set("x-real-ip", request.headers.get("cf-connecting-ip") ?? "");
    headers.delete("authorization");
    headers.delete("cookie");
    return handleAsNodeRequest(8080, new Request(request, { headers }));
  },
};
