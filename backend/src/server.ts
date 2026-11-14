import { createHash } from "node:crypto";
import Fastify from "fastify";
import type { FastifyReply } from "fastify";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import {
  ApiError,
  ResponseCache,
  boundedEnv,
  withQueryBudget,
} from "./core.ts";
import type { Provider } from "./core.ts";
import {
  DataService,
  encodeFrame,
  frameJson,
  limitations,
  metadataOf,
  variableFor,
  excludedSources,
} from "./data.ts";
import { DatabricksProvider } from "./providers/databricks.ts";
import { PostgresProvider } from "./providers/postgres.ts";
import { configuration, historicalEvents, regions } from "./config.ts";
import { HybridDataService } from "./routing.ts";

import { createAssistant } from "./assistant.ts";
import { TrendReferenceService } from "./trend-reference.ts";
import { IndicatorReferenceService } from "./indicator-reference.ts";
import {
  assistantRequestSchema,
  validateAssistantRequest,
} from "./assistant-contract.ts";

const mode = process.env.DATA_PROVIDER ?? "databricks-sql";
if (!["databricks-sql", "lakebase-postgres", "hybrid"].includes(mode))
  throw new Error("Unsupported DATA_PROVIDER");
const providers: Provider[] = [];
const sql = mode !== "lakebase-postgres" ? new DatabricksProvider() : undefined;
const postgres =
  mode !== "databricks-sql"
    ? new PostgresProvider(process.env.LAKEBASE_DATABRICKS_HOST)
    : undefined;
if (sql) providers.push(sql);
if (postgres) providers.push(postgres);
const data =
  mode === "hybrid"
    ? new HybridDataService(sql!, postgres!)
    : new DataService(providers[0]);
const cache = new ResponseCache(
  boundedEnv("CACHE_BYTES", 64 * 1024 * 1024, 1024 * 1024, 256 * 1024 * 1024),
);
const api = Fastify({
  ajv: { customOptions: { removeAdditional: false } },
  logger: {
    level: "info",
    redact: ["req.headers.authorization", "req.headers.cookie"],
  },
  bodyLimit: 1024,
  requestTimeout: 60_000,
  connectionTimeout: 65_000,
  routerOptions: { maxParamLength: 100 },
});
const origins = (
  process.env.CORS_ORIGINS ??
  "https://kipp-earth-trends-lab.vercel.app,http://localhost:5173,http://127.0.0.1:5173"
).split(",");
await api.register(cors, {
  origin: origins,
  methods: ["GET", "HEAD", "OPTIONS"],
  maxAge: 3600,
  exposedHeaders: ["ETag", "X-Cache", "X-Data-Provider", "X-Request-Id"],
});
await api.register(compress, {
  threshold: 1024,
  encodings: ["gzip", "deflate"],
  customTypes: /application\/(json|vnd\.kipp\.grid)/,
});
api.addHook("onRequest", async (request, reply) => {
  reply
    .header("X-Content-Type-Options", "nosniff")
    .header("X-Request-Id", request.id);
});
api.setErrorHandler((error, request, reply) => {
  const known = error instanceof ApiError;
  const validation = Boolean((error as { validation?: unknown }).validation);
  const frameworkStatus = (error as { statusCode?: number }).statusCode;
  const status = known
    ? error.statusCode
    : validation
      ? 400
      : frameworkStatus === 413
        ? 413
        : frameworkStatus === 400
          ? 400
          : 500;
  if (status >= 500)
    request.log.warn(
      { code: known ? error.code : "INTERNAL_ERROR", requestId: request.id },
      "request failed",
    );
  if (status === 503) reply.header("Retry-After", "2");
  reply
    .header("Cache-Control", "no-store")
    .code(status)
    .send({
      error: {
        code: known
          ? error.code
          : validation
            ? "INVALID_PARAMETERS"
            : "INTERNAL_ERROR",
        message: known
          ? error.message
          : validation
            ? "Parâmetros inválidos. Consulte /v1 para o contrato."
            : "Não foi possível atender à requisição.",
        requestId: request.id,
      },
    });
});
const querySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    bbox: { type: "string", maxLength: 100 },
    factor: { type: "integer", enum: [1, 2, 4, 8, 16, 32], default: 4 },
    format: { type: "string", enum: ["f32", "json"], default: "f32" },
  },
};
const variableMonth = {
  type: "object",
  additionalProperties: false,
  required: ["variable", "month"],
  properties: {
    variable: { type: "string", maxLength: 40 },
    month: { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])$" },
  },
};
const serve = async (
  request: { headers: Record<string, unknown> },
  reply: FastifyReply,
  key: string,
  seconds: number,
  load: () => Promise<{ body: Buffer; type: string }>,
) => {
  const { response, hit } = await cache.get(key, seconds * 1000, async () => {
    const result = await withQueryBudget(load);
    return {
      ...result,
      etag: `W/"${createHash("sha256").update(result.body).digest("hex")}"`,
      headers: {},
    };
  });
  reply
    .header("X-Cache", hit ? "HIT" : "MISS")
    .header("X-Data-Provider", mode)
    .header("ETag", response.etag)
    .header(
      "Cache-Control",
      `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=60`,
    );
  if (request.headers["if-none-match"] === response.etag)
    return reply.code(304).send();
  return reply.type(response.type).send(response.body);
};
const json = (value: unknown) => ({
  body: Buffer.from(JSON.stringify(value)),
  type: "application/json; charset=utf-8",
});
api.get("/health", async () => ({
  status: "ok",
  service: "kipp-earth-data-api",
  provider: mode,
  region: process.env.DEPLOY_REGION ?? "local",
  version: process.env.K_REVISION ?? "local",
}));
api.get("/ready", async (_request, reply) => {
  await withQueryBudget(() =>
    Promise.all(
      providers.map((provider) => provider.query("SELECT 1 AS ready", {}, 1)),
    ),
  );
  reply.header("Cache-Control", "no-store");
  return { status: "ready", provider: mode };
});
api.get("/", async () => ({
  name: "KIPP Earth Data API",
  version: 1,
  endpoints: [
    "/health",
    "/ready",
    "/v1",
    "/v1/catalog",
    "/v1/availability/:variable",
    "/v1/frames/:variable/:month?factor=4&format=f32",
    "/v1/series/:variable?start=2024-01&end=2024-12&bbox=-60,-22,-54,-16",
  ],
}));
api.get("/v1", async () => ({
  version: 1,
  provider: mode,
  simulated: false,
  map: {
    factor: [1, 2, 4, 8, 16, 32],
    defaultFactor: 4,
    formats: ["f32", "json"],
    bbox: "west,south,east,north; crossing antimeridian is supported",
    maxCells: 210000,
    maxJsonCells: 65000,
    binary:
      "KIPP magic(4 bytes), headerLength uint32 LE(4), UTF-8 JSON header, zero padding to next multiple of 4, float32 LE values[width*height], float32 LE coverage[width*height]",
  },
  cache: { ttlSeconds: 300, scope: "per-instance bounded LRU plus HTTP cache" },
  limitations,
}));
// Share the catalog between the dataset and event endpoints during cold starts.
let catalogMemo:
  | { expires: number; data: Awaited<ReturnType<DataService["catalog"]>> }
  | undefined;
let catalogPending: ReturnType<DataService["catalog"]> | undefined;
async function catalogData() {
  if (catalogMemo && catalogMemo.expires > Date.now()) return catalogMemo.data;
  if (!catalogPending)
    catalogPending = data
      .catalog()
      .then((result) => {
        catalogMemo = { expires: Date.now() + 300_000, data: result };
        return result;
      })
      .finally(() => {
        catalogPending = undefined;
      });
  return catalogPending;
}
const assistant = createAssistant({
  data,
  catalog: catalogData,
  indicatorReference: sql ? new IndicatorReferenceService(sql) : undefined,
  trendReference: sql ? new TrendReferenceService(sql) : undefined,
});
api.post(
  "/v1/assistant",
  { bodyLimit: 32768, schema: { body: assistantRequestSchema } },
  async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const client = request.headers["x-kipp-agent-client"];
    if (typeof client !== "string" || !/^[a-f0-9]{64}$/.test(client))
      throw new ApiError(
        400,
        "INVALID_CLIENT",
        "A trusted client identity is required.",
      );
    try {
      return await assistant(
        validateAssistantRequest(request.body),
        client,
        request.id,
      );
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 429)
        reply.header("Retry-After", "3600");
      throw error;
    }
  },
);
api.get("/v1/catalog", async (request, reply) =>
  serve(request, reply, "catalog", 300, async () =>
    json({
      provider: mode,
      simulated: false,
      revision: process.env.K_REVISION ?? "local",
      variables: await catalogData(),
      unavailable: excludedSources,
      limitations,
    }),
  ),
);
api.get("/v1/config", async (request, reply) =>
  serve(request, reply, "config", 300, async () => json(configuration)),
);
api.get("/v1/events", async (request, reply) =>
  serve(request, reply, "events", 300, async () => {
    const catalog = await catalogData();
    return json({
      curated: true,
      detected: false,
      events: historicalEvents.map((event) => {
        const region = regions.find((r) => r.id === event.region)!;
        const variable = catalog.find((v) => v.id === event.variable);
        const months = (variable?.months ?? [])
          .filter(
            (m) =>
              m.month >= event.window[0] &&
              m.month <= event.window[1] &&
              (m.validSamples ?? 0) > 0,
          )
          .map((m) => m.month);
        const available = months.length > 0 && event.category !== "Tsunamis";
        return {
          ...event,
          bbox: region.bbox,
          longitude: region.longitude,
          latitude: region.latitude,
          available,
          months: available ? months : [],
          unavailableReason: available
            ? null
            : event.category === "Tsunamis"
              ? "Sem fonte de nível do mar ou dados sísmicos para este fenômeno."
              : "Sem sobreposição entre o período histórico do evento e os meses válidos da variável sugerida.",
        };
      }),
      limitations: configuration.limitations,
    });
  }),
);
api.get<{ Params: { variable: string } }>(
  "/v1/availability/:variable",
  {
    schema: {
      params: {
        type: "object",
        required: ["variable"],
        properties: { variable: { type: "string", maxLength: 40 } },
      },
    },
  },
  async (request, reply) => {
    const variable = variableFor(request.params.variable);
    return serve(request, reply, `availability:${variable.id}`, 300, async () =>
      json({
        ...metadataOf(variable),
        simulated: false,
        months: await data.availability(variable),
      }),
    );
  },
);
api.get<{
  Params: { variable: string; month: string };
  Querystring: { bbox?: string; factor: number; format: "f32" | "json" };
}>(
  "/v1/frames/:variable/:month",
  { schema: { params: variableMonth, querystring: querySchema } },
  async (request, reply) => {
    variableFor(request.params.variable);
    const { variable, month } = request.params;
    const { bbox, factor, format } = request.query;
    return serve(
      request,
      reply,
      `frame:${variable}:${month}:${bbox ?? "global"}:${factor}:${format}`,
      300,
      async () => {
        const frame = await data.frame(
          variable,
          month,
          bbox,
          factor,
          format === "json" ? 65_000 : 210_000,
        );
        return format === "json"
          ? json(frameJson(frame))
          : {
              body: encodeFrame(frame),
              type: "application/vnd.kipp.grid+octet-stream",
            };
      },
    );
  },
);
api.get<{
  Params: { variable: string };
  Querystring: { start: string; end: string; bbox: string };
}>(
  "/v1/series/:variable",
  {
    schema: {
      params: {
        type: "object",
        required: ["variable"],
        properties: { variable: { type: "string", maxLength: 40 } },
      },
      querystring: {
        type: "object",
        additionalProperties: false,
        required: ["start", "end", "bbox"],
        properties: {
          start: { type: "string", maxLength: 7 },
          end: { type: "string", maxLength: 7 },
          bbox: { type: "string", maxLength: 100 },
        },
      },
    },
  },
  async (request, reply) => {
    variableFor(request.params.variable);
    const { start, end, bbox } = request.query;
    return serve(
      request,
      reply,
      `series:${request.params.variable}:${start}:${end}:${bbox}`,
      300,
      async () =>
        json(await data.series(request.params.variable, start, end, bbox)),
    );
  },
);
api.addHook("onClose", async () => {
  await Promise.all(providers.map((provider) => provider.close()));
});
const stop = async () => {
  await api.close();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
await api.listen({ port: boundedEnv("PORT", 8080, 1, 65535), host: "0.0.0.0" });
