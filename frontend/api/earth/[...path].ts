import type { IncomingMessage, ServerResponse } from "node:http";
import { getVercelOidcToken } from "@vercel/oidc";

// Public identifiers only. Authentication credentials are short-lived and server-side.
const origin = "https://kipp-earth-api-2md4zr4rcq-uk.a.run.app";
const provider =
  "//iam.googleapis.com/projects/583662795760/locations/global/workloadIdentityPools/kipp-vercel/providers/production";
const invoker =
  "kipp-vercel-invoker@nasa-earth-trends-lab.iam.gserviceaccount.com";
let cached: { token: string; expires: number } | undefined;
let pending: Promise<string> | undefined;

async function identityToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  if (pending) return pending;
  pending = (async () => {
    const assertion = await getVercelOidcToken();
    const response = await fetch("https://sts.googleapis.com/v1/token", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        audience: provider,
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
        scope: "https://www.googleapis.com/auth/cloud-platform",
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        subject_token: assertion,
      }),
    });
    if (!response.ok) throw new Error("FEDERATION_FAILED");
    const credentials = (await response.json()) as { access_token?: string };
    if (!credentials.access_token)
      throw new Error("FEDERATION_RESPONSE_INVALID");
    const idResponse = await fetch(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${invoker}:generateIdToken`,
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(12_000),
        headers: {
          authorization: `Bearer ${credentials.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ audience: origin, includeEmail: true }),
      },
    );
    if (!idResponse.ok) throw new Error("IDENTITY_FAILED");
    const { token } = (await idResponse.json()) as { token?: string };
    if (!token) throw new Error("IDENTITY_RESPONSE_INVALID");
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    if (!Number.isFinite(claims.exp))
      throw new Error("IDENTITY_EXPIRATION_INVALID");
    cached = { token, expires: claims.exp * 1000 };
    return token;
  })();
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}

export default async function handler(
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
          message:
            "Não foi possível consultar a fonte de dados. Tente novamente.",
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
    path = decodeURIComponent(url.pathname).replace(/^\/api\/earth/, "");
    query = url.searchParams;
    // No arbitrary upstream URLs, SQL, methods, paths or browser authorization headers.
    if (
      !/^\/v1\/(catalog|config|events|frames\/[a-z0-9_]{1,60}\/\d{4}-(0[1-9]|1[0-2])|series\/[a-z0-9_]{1,60})$/.test(
        path,
      )
    )
      return fail(404, "ROUTE_NOT_FOUND");
    const allowed = new Set(["bbox", "factor", "format", "start", "end"]);
    for (const [key, value] of query)
      if (
        !allowed.has(key) ||
        value.length > 200 ||
        query.getAll(key).length !== 1
      )
        return fail(400, "INVALID_PARAMETERS");
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
    const result = await fetch(`${origin}${path}?${query}`, {
      method: request.method,
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    });
    if (result.status === 401 || result.status === 403)
      return fail(503, "BACKEND_AUTH_UNAVAILABLE");
    response.statusCode = result.status;
    for (const key of [
      "content-type",
      "cache-control",
      "etag",
      "x-data-provider",
      "x-cache",
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
}
