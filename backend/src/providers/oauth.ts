import { ApiError, required } from "../core.ts";

export class DatabricksOAuth {
  readonly host: string;
  private clientId = "";
  private clientSecret = "";
  private authType: string;
  private token = "";
  private expires = 0;
  private refreshing: Promise<string> | null = null;
  constructor() {
    const host = new URL(required("DATABRICKS_HOST"));
    if (
      host.protocol !== "https:" ||
      host.username ||
      host.password ||
      host.pathname !== "/"
    )
      throw new Error("DATABRICKS_HOST must be an HTTPS origin");
    this.host = host.origin;
    this.authType = process.env.DATABRICKS_AUTH_TYPE ?? "oauth-m2m";
    if (!["google-id", "oauth-m2m"].includes(this.authType))
      throw new Error("Unsupported DATABRICKS_AUTH_TYPE");
    if (this.authType === "google-id") return;
    const credentials = process.env.DATABRICKS_CREDENTIALS
      ? JSON.parse(process.env.DATABRICKS_CREDENTIALS)
      : {};
    this.clientId = credentials.clientId ?? required("DATABRICKS_CLIENT_ID");
    this.clientSecret =
      credentials.clientSecret ?? required("DATABRICKS_CLIENT_SECRET");
  }
  async accessToken(): Promise<string> {
    if (this.token && this.expires > Date.now() + 120_000) return this.token;
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      if (this.authType === "google-id") {
        const url = new URL("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity");
        url.searchParams.set("audience", this.host);
        url.searchParams.set("format", "full");
        const response = await fetch(url, {
          headers: { "Metadata-Flavor": "Google" },
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok)
          throw new ApiError(502, "UPSTREAM_AUTH", "Falha na autenticação da fonte de dados.");
        const token = (await response.text()).trim();
        try {
          const parts = token.split(".");
          if (parts.length !== 3) throw new Error("Invalid token");
          const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString());
          if (claims.aud !== this.host || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now() + 120_000)
            throw new Error("Invalid claims");
          // The token comes directly from Google's fixed metadata endpoint.
          // Databricks verifies its signature; decode only to bound the cache.
          this.token = token;
          this.expires = claims.exp * 1000;
          return token;
        } catch {
          throw new ApiError(502, "UPSTREAM_AUTH", "Resposta de autenticação inválida.");
        }
      }
      const response = await fetch(`${this.host}/oidc/v1/token`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "all-apis",
        }),
      });
      if (!response.ok)
        throw new ApiError(
          502,
          "UPSTREAM_AUTH",
          "Falha na autenticação da fonte de dados.",
        );
      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };
      if (!data.access_token || !Number.isFinite(data.expires_in))
        throw new ApiError(
          502,
          "UPSTREAM_AUTH",
          "Resposta de autenticação inválida.",
        );
      this.token = data.access_token;
      this.expires = Date.now() + data.expires_in * 1000;
      return this.token;
    })();
    try {
      return await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }
  async request(path: string, init: RequestInit = {}) {
    if (
      !path.startsWith("/api/2.0/") ||
      path.includes("..") ||
      path.includes("?")
    )
      throw new Error("Invalid upstream API path");
    const response = await fetch(`${this.host}${path}`, {
      ...init,
      redirect: "error",
      signal: init.signal ?? AbortSignal.timeout(35_000),
      headers: {
        ...init.headers,
        authorization: `Bearer ${await this.accessToken()}`,
        "content-type": "application/json",
      },
    });
    if (!response.ok)
      throw new ApiError(
        response.status === 429 ? 503 : 502,
        "UPSTREAM_ERROR",
        "A fonte de dados não conseguiu atender à consulta.",
      );
    return response;
  }
}
