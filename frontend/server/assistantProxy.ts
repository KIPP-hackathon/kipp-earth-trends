import type { IncomingMessage, ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { cloudRunOrigin } from "./cloudRunOrigin.js";

export function createAssistantHandler(
  cloudRunIdentityToken: () => Promise<string>,
  allowedOrigin: string,
) {
  return async function handler(
    request: IncomingMessage,
    response: ServerResponse,
  ) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Type", "application/json");
    const fail = (status: number, code: string) => {
      response.statusCode = status;
      response.end(
        JSON.stringify({
          error: {
            code,
            message:
              "The assistant could not complete this request. Please try again shortly.",
          },
        }),
      );
    };
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return fail(405, "METHOD_NOT_ALLOWED");
    }
    if (request.headers.origin !== allowedOrigin)
      return fail(403, "ORIGIN_NOT_ALLOWED");
    if (
      request.headers["sec-fetch-site"] &&
      request.headers["sec-fetch-site"] !== "same-origin"
    )
      return fail(403, "CROSS_SITE_NOT_ALLOWED");
    if (
      !String(request.headers["content-type"] ?? "").startsWith(
        "application/json",
      )
    )
      return fail(415, "JSON_REQUIRED");
    // This header must be overwritten by the trusted hosting edge. Never accept a client quota key.
    const ip = request.headers["x-real-ip"];
    if (typeof ip !== "string" || !isIP(ip))
      return fail(503, "CLIENT_IDENTITY_UNAVAILABLE");
    const client = createHash("sha256")
      .update(`kipp-assistant-v1:${ip}`)
      .digest("hex");
    const deadline = Date.now() + 52000;
    try {
      const declaredSize = Number(request.headers["content-length"] ?? 0);
      if (!Number.isFinite(declaredSize) || declaredSize > 32768)
        return fail(413, "REQUEST_TOO_LARGE");
      const parsed = (request as IncomingMessage & { body?: unknown }).body;
      let body: string;
      if (parsed !== undefined) {
        body =
          typeof parsed === "string"
            ? parsed
            : Buffer.isBuffer(parsed)
              ? parsed.toString("utf8")
              : JSON.stringify(parsed);
        if (Buffer.byteLength(body) > 32768)
          return fail(413, "REQUEST_TOO_LARGE");
      } else {
        let size = 0;
        const chunks: Buffer[] = [];
        for await (const chunk of request) {
          const bytes = Buffer.from(chunk);
          size += bytes.length;
          if (size > 32768) return fail(413, "REQUEST_TOO_LARGE");
          chunks.push(bytes);
        }
        body = Buffer.concat(chunks).toString("utf8");
      }
      try {
        JSON.parse(body);
      } catch {
        return fail(400, "INVALID_JSON");
      }
      const token = await cloudRunIdentityToken();
      const result = await fetch(`${cloudRunOrigin}/v1/assistant`, {
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-kipp-agent-client": client,
        },
        body,
      });
      if (result.status >= 300 && result.status < 400) {
        await result.body?.cancel();
        return fail(502, "UPSTREAM_REDIRECT_BLOCKED");
      }
      if ([401, 403].includes(result.status))
        return fail(503, "ASSISTANT_AUTH_UNAVAILABLE");
      response.statusCode = result.status;
      const retry = result.headers.get("retry-after");
      if (retry) response.setHeader("Retry-After", retry);
      const reader = result.body?.getReader();
      const output: Uint8Array[] = [];
      let total = 0;
      if (reader) {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > 256000) {
              await reader.cancel();
              return fail(502, "RESPONSE_TOO_LARGE");
            }
            output.push(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      response.end(Buffer.concat(output));
    } catch {
      fail(503, "ASSISTANT_UNAVAILABLE");
    }
  };
}
