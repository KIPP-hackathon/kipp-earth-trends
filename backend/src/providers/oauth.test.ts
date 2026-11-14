import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { DatabricksOAuth } from "./oauth.ts";

const host = "https://8259554586019913.3.gcp.databricks.com";
const originalEnv = { ...process.env };
const jwt = (aud = host, exp = Math.floor(Date.now() / 1000) + 3600) =>
  `header.${Buffer.from(JSON.stringify({ aud, exp })).toString("base64url")}.signature`;

beforeEach(() => {
  process.env.DATABRICKS_HOST = host;
  process.env.DATABRICKS_AUTH_TYPE = "google-id";
  delete process.env.DATABRICKS_CREDENTIALS;
  delete process.env.DATABRICKS_CLIENT_ID;
  delete process.env.DATABRICKS_CLIENT_SECRET;
});
afterEach(() => {
  process.env = { ...originalEnv };
  mock.restoreAll();
});

test("Google SA uses workspace audience, no client secret, and shares token refresh", async () => {
  const token = jwt();
  const fetchMock = mock.method(globalThis, "fetch", async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "http://metadata.google.internal");
    assert.equal(url.pathname, "/computeMetadata/v1/instance/service-accounts/default/identity");
    assert.equal(url.searchParams.get("audience"), host);
    assert.equal(new Headers(init?.headers).get("Metadata-Flavor"), "Google");
    return new Response(token);
  });
  const auth = new DatabricksOAuth();
  assert.deepEqual(await Promise.all([auth.accessToken(), auth.accessToken()]), [token, token]);
  assert.equal(await auth.accessToken(), token);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("expired, malformed, or wrong-audience metadata tokens fail closed", async () => {
  for (const token of ["not-a-jwt", jwt(host, 1), jwt("https://wrong.example")]) {
    const fetchMock = mock.method(globalThis, "fetch", async () => new Response(token));
    await assert.rejects(new DatabricksOAuth().accessToken());
    fetchMock.mock.restore();
  }
});

test("cached Google token is refreshed before expiry", async () => {
  const start = Date.now();
  const clock = mock.method(Date, "now", () => start);
  let calls = 0;
  mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response(jwt());
  });
  const auth = new DatabricksOAuth();
  const first = await auth.accessToken();
  clock.mock.mockImplementation(() => start + 3500_000);
  assert.notEqual(await auth.accessToken(), first);
  assert.equal(calls, 2);
});

test("metadata errors do not expose upstream details and allow the next refresh", async () => {
  let calls = 0;
  const token = jwt();
  mock.method(globalThis, "fetch", async () => ++calls === 1
    ? new Response("private upstream detail", { status: 500 }) : new Response(token));
  const auth = new DatabricksOAuth();
  await assert.rejects(auth.accessToken(), (error: Error) => !error.message.includes("private upstream detail"));
  assert.equal(await auth.accessToken(), token);
});

test("OAuth M2M remains available explicitly and sends client credentials", async () => {
  process.env.DATABRICKS_AUTH_TYPE = "oauth-m2m";
  process.env.DATABRICKS_CLIENT_ID = "test-client";
  process.env.DATABRICKS_CLIENT_SECRET = "test-secret";
  mock.method(globalThis, "fetch", async (input: string | URL, init?: RequestInit) => {
    assert.equal(String(input), `${host}/oidc/v1/token`);
    assert.equal(new Headers(init?.headers).get("authorization"), `Basic ${Buffer.from("test-client:test-secret").toString("base64")}`);
    return Response.json({ access_token: "oauth-test-token", expires_in: 3600 });
  });
  assert.equal(await new DatabricksOAuth().accessToken(), "oauth-test-token");
});

test("unknown auth modes fail at startup", () => {
  process.env.DATABRICKS_AUTH_TYPE = "typo";
  assert.throws(() => new DatabricksOAuth(), /DATABRICKS_AUTH_TYPE/);
});
