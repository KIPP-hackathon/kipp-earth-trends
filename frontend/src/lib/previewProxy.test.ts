import { afterEach, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
vi.mock("../../server/cloudRunAuth.js", () => ({
  cloudRunOrigin: "https://fixed-private-api.example",
  cloudRunIdentityToken: vi.fn(async () => "test-token"),
}));
import handler from "../../api/earth";
import { cloudRunIdentityToken } from "../../server/cloudRunAuth.js";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
async function request(url: string, method = "GET") {
  let body = "";
  const headers: Record<string, string> = {};
  const response = {
    statusCode: 200,
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    end: (v?: Buffer | string) => {
      body = v?.toString() ?? "";
    },
  };
  await handler(
    { method, url, headers: {} } as IncomingMessage,
    response as unknown as ServerResponse,
  );
  return { status: response.statusCode, body };
}
it("preview reads the existing public API without invoking production-only federation", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  const calls: { url: string; options: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
    calls.push({ url, options });
    return Response.json({ simulated: false });
  });
  const result = await request("/api/earth/v1/catalog");
  expect(result).toEqual({ status: 200, body: '{"simulated":false}' });
  expect(calls[0].url).toBe(
    "https://kipp-earth-trends-lab.vercel.app/api/earth/v1/catalog?",
  );
  expect(calls[0].options.headers).toEqual({});
  expect(cloudRunIdentityToken).not.toHaveBeenCalled();
});
it("preview keeps write requests, arbitrary URLs and SQL blocked", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect((await request("/api/earth/v1/catalog", "POST")).status).toBe(405);
  expect(
    (await request("/api/earth/v1/catalog?url=https://example.com")).status,
  ).toBe(400);
  expect((await request("/api/earth/v1/catalog?sql=SELECT+1")).status).toBe(
    400,
  );
  expect((await request("/api/earth/https://example.com")).status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
it("production continues using authenticated private Cloud Run", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  const calls: { url: string; options: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
    calls.push({ url, options });
    return Response.json({ simulated: false });
  });
  expect((await request("/api/earth/v1/config")).status).toBe(200);
  expect(calls[0].url).toBe("https://fixed-private-api.example/v1/config?");
  expect(calls[0].options.headers).toEqual({
    authorization: "Bearer test-token",
  });
});
