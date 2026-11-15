import { getVercelOidcToken } from "@vercel/oidc";

// Public identifiers only. Authentication credentials are short-lived and server-side.
import { cloudRunOrigin } from "./cloudRunOrigin.js";
export { cloudRunOrigin };
const provider =
  "//iam.googleapis.com/projects/696766216489/locations/global/workloadIdentityPools/kipp-vercel/providers/production";
const invoker =
  "kipp-vercel-invoker@kipp-space-apps-2026.iam.gserviceaccount.com";
let cached: { token: string; expires: number } | undefined;
let pending: Promise<string> | undefined;

export async function cloudRunIdentityToken(): Promise<string> {
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
        body: JSON.stringify({ audience: cloudRunOrigin, includeEmail: true }),
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
