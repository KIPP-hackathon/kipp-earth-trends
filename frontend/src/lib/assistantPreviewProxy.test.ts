import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
vi.mock("../../server/cloudRunAuth.js", () => ({
  cloudRunOrigin: "https://private-api.example",
  cloudRunIdentityToken: vi.fn(async () => "private-test-token"),
}));
import handler from "../../api/assistant";
import { cloudRunIdentityToken } from "../../server/cloudRunAuth.js";
const production = "https://kipp-earth-trends-lab.vercel.app";
beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_URL", "preview-123.vercel.app");
  vi.stubEnv("VERCEL_BRANCH_URL", "preview-branch.vercel.app");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
async function request(
  origin: string,
  body: unknown = { message: "Explain trends" },
  extra: Record<string, string> = {},
) {
  let text = "";
  const response = {
    statusCode: 200,
    setHeader: vi.fn(),
    end: (value?: Buffer | string) => {
      text = value?.toString() ?? "";
    },
  };
  await handler(
    {
      method: "POST",
      url: "/api/assistant",
      headers: {
        origin,
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
        "x-real-ip": "203.0.113.1",
        ...extra,
      },
      body,
    } as unknown as IncomingMessage,
    response as unknown as ServerResponse,
  );
  return {
    status: response.statusCode,
    text,
    headers: response.setHeader.mock.calls,
  };
}
it("relays Preview chat only to the fixed existing public assistant without Google credentials or browser auth", async () => {
  const calls: { url: string; options: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
    calls.push({ url, options });
    return Response.json({ reply: "Check coverage before fitting a trend." });
  });
  expect((await request("https://preview-branch.vercel.app")).status).toBe(200);
  expect(calls[0].url).toBe(production + "/api/assistant");
  expect(calls[0].options.headers).toEqual({
    "content-type": "application/json",
    origin: production,
    "sec-fetch-site": "same-origin",
  });
  expect(cloudRunIdentityToken).not.toHaveBeenCalled();
});
it("rejects arbitrary origins, lookalike subdomains, foreign fetch sites, invalid JSON and oversized bodies before fetch", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  for (const origin of [
    "https://evil.example",
    "https://preview-123.vercel.app.evil.example",
    production,
  ])
    expect((await request(origin)).status).toBe(403);
  expect(
    (
      await request(
        "https://preview-123.vercel.app",
        {},
        { "sec-fetch-site": "cross-site" },
      )
    ).status,
  ).toBe(403);
  expect(
    (await request("https://preview-123.vercel.app", "not json")).status,
  ).toBe(400);
  expect(
    (
      await request("https://preview-123.vercel.app", {
        message: "a".repeat(33000),
      })
    ).status,
  ).toBe(413);
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves quota responses and retry-after for preview users", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json(
      { error: { code: "RATE_LIMITED" } },
      { status: 429, headers: { "retry-after": "3600" } },
    ),
  );
  const response = await request("https://preview-123.vercel.app");
  expect(response.status).toBe(429);
  expect(response.headers).toContainEqual(["Retry-After", "3600"]);
});
it("production retains exact production origin and authenticated private upstream", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  const calls: { url: string; options: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
    calls.push({ url, options });
    return Response.json({ reply: "ok" });
  });
  expect((await request("https://preview-123.vercel.app")).status).toBe(403);
  expect((await request(production)).status).toBe(200);
  expect(calls[0].url).toBe("https://private-api.example/v1/assistant");
  expect(calls[0].options.headers).toMatchObject({
    authorization: "Bearer private-test-token",
  });
});

it("answers preview chart-method questions through the labelled interface guide rather than stale service UI instructions", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const response = await request("https://preview-123.vercel.app", {
    message: "How does Holm adjustment work on these charts?",
    context: { version: 7 },
  });
  const body = JSON.parse(response.text);
  expect(body.interfaceGuide).toBe(true);
  expect(body.contextVersion).toBe(7);
  expect(body.reply).toContain("Global and Selected area");
  expect(body.reply).toContain("both scopes");
  expect(body.actions).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});
