import { afterEach, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
vi.mock("../../server/cloudRunAuth.js", () => ({
  cloudRunOrigin: "https://fixed-api.example",
  cloudRunIdentityToken: async () => "test-token",
}));
import handler from "../../api/earth";

afterEach(() => vi.unstubAllGlobals());
async function request(url: string) {
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
    { method: "GET", url, headers: {} } as IncomingMessage,
    response as unknown as ServerResponse,
  );
  return { status: response.statusCode, body, headers };
}
it("forwards only the allowed investigation route to the fixed private API", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ version: 1 }));
  vi.stubGlobal("fetch", fetch);
  const r = await request(
    "/api/earth/v1/investigation?x=temperature&y=rainfall&bbox=-60,-22,-54,-16&start=2000-01&end=2025-09&baselineStart=2003-01&baselineEnd=2020-12&method=relationships-v1",
  );
  expect(r.status).toBe(200);
  expect(fetch.mock.calls[0][0]).toContain(
    "https://fixed-api.example/v1/investigation?",
  );
});
it("rejects unreviewed methods, arbitrary SQL, duplicate parameters and routes before fetching", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  for (const query of [
    "method=unreviewed",
    "sql=SELECT+*",
    "x=temperature&x=rainfall",
  ])
    expect((await request(`/api/earth/v1/investigation?${query}`)).status).toBe(
      400,
    );
  expect((await request("/api/earth/v1/investigation/other")).status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
