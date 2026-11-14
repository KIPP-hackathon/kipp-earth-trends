import { ApiError } from "./core.ts";
let credentials: { token: string; expires: number } | undefined;
let refreshing: Promise<string> | undefined;
export async function googleAccessToken(signal: AbortSignal): Promise<string> {
  // A local smoke may pass a short-lived token in memory. Production always uses metadata.
  if (!process.env.K_SERVICE && process.env.GOOGLE_OAUTH_ACCESS_TOKEN)
    return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if (credentials && credentials.expires > Date.now() + 60000)
    return credentials.token;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const response = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      {
        headers: { "Metadata-Flavor": "Google" },
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      },
    );
    if (!response.ok)
      throw new ApiError(
        503,
        "ASSISTANT_AUTH_UNAVAILABLE",
        "Assistant authentication is temporarily unavailable.",
      );
    const result = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!result.access_token || !Number.isFinite(result.expires_in))
      throw new ApiError(
        503,
        "ASSISTANT_AUTH_UNAVAILABLE",
        "Assistant authentication is temporarily unavailable.",
      );
    credentials = {
      token: result.access_token,
      expires: Date.now() + Number(result.expires_in) * 1000,
    };
    return credentials.token;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = undefined;
  }
}
export async function googleRequest(
  url: string,
  body: unknown,
  signal: AbortSignal,
) {
  const target = new URL(url);
  if (
    ![
      "https://aiplatform.googleapis.com",
      "https://firestore.googleapis.com",
    ].includes(target.origin) ||
    target.username ||
    target.password
  )
    throw new Error("Unsupported Google API origin");
  return fetch(target, {
    method: "POST",
    redirect: "error",
    signal,
    headers: {
      authorization: `Bearer ${await googleAccessToken(signal)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
