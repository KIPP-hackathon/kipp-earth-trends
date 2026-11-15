import { cloudRunOrigin } from "../server/cloudRunOrigin.ts";
import { Buffer } from "node:buffer";

const account =
  "kipp-cloudflare-invoker@kipp-space-apps-2026.iam.gserviceaccount.com";
let cached;
let pending;

const encode = (value) => Buffer.from(value).toString("base64url");

// Only the Worker server receives this secret. Never import this module in src/.
export async function googleIdentityToken(secret) {
  if (!secret) throw new Error("CLOUDFLARE_IDENTITY_UNCONFIGURED");
  const credentials = JSON.parse(secret);
  if (
    credentials.client_email !== account ||
    credentials.type !== "service_account"
  )
    throw new Error("CLOUDFLARE_IDENTITY_INVALID");
  const keyId = credentials.private_key_id;
  if (cached?.keyId === keyId && cached.expires > Date.now() + 60_000)
    return cached.token;
  if (pending?.keyId === keyId) return pending.promise;
  const promise = (async () => {
    const now = Math.floor(Date.now() / 1000);
    const header = encode(
      JSON.stringify({ alg: "RS256", typ: "JWT", kid: keyId }),
    );
    const claims = encode(
      JSON.stringify({
        iss: account,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        target_audience: cloudRunOrigin,
      }),
    );
    const der = Buffer.from(
      credentials.private_key.replace(/-----[^-]+-----|\s/g, ""),
      "base64",
    );
    const key = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const input = `${header}.${claims}`;
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(input),
    );
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${input}.${encode(signature)}`,
      }),
    });
    if (!response.ok) throw new Error("CLOUDFLARE_IDENTITY_FAILED");
    const { id_token: token } = await response.json();
    if (typeof token !== "string")
      throw new Error("CLOUDFLARE_IDENTITY_INVALID");
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    if (payload.aud !== cloudRunOrigin || !Number.isFinite(payload.exp))
      throw new Error("CLOUDFLARE_IDENTITY_INVALID");
    cached = { keyId, token, expires: payload.exp * 1000 };
    return token;
  })();
  const flight = { keyId, promise };
  pending = flight;
  try {
    return await promise;
  } finally {
    if (pending === flight) pending = undefined;
  }
}
