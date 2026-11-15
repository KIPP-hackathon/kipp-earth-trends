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
it("forwards the batched comparison route with a long variable list and nothing else", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ version: 1 }));
  vi.stubGlobal("fetch", fetch);
  const variables = Array.from({ length: 6 }, (_, i) => `merra2_flx_variable_${i}_name`).join(",");
  const ok = await request(
    `/api/earth/v1/comparisons?variables=${variables}&start=2024-01&end=2024-12&bbox=-60,-22,-54,-16&analysis=trend-v1`,
  );
  expect(ok.status).toBe(200);
  expect(fetch.mock.calls[0][0]).toContain("https://fixed-api.example/v1/comparisons?variables=");
  const rejected = await request("/api/earth/v1/comparisons?variables=a&sql=drop&start=2024-01&end=2024-12&bbox=0,0,1,1");
  expect(rejected.status).toBe(400);
  expect(fetch).toHaveBeenCalledTimes(1);
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
