import { ApiError } from "./core.ts";
import { parseBounds, parseMonth, variables } from "./data.ts";

export const assistantTabs = [
  "explore",
  "compare",
  "events",
  "analysis",
  "learn",
] as const;
export type AssistantTab = (typeof assistantTabs)[number];
export type AssistantSide = "A" | "B";
export type AssistantRegion = {
  id: string;
  name: string;
  bbox: string;
  longitude: number;
  latitude: number;
};
export type AssistantPanel = {
  side: AssistantSide;
  variable: string;
  selectedMonth: string | null;
  displayedMonth: string | null;
  start: string;
  end: string;
  region: AssistantRegion;
  loading: boolean;
  playing: boolean;
};
export type AssistantContext = {
  version: number;
  tab: AssistantTab;
  panels: AssistantPanel[];
  camera: {
    longitude: number;
    latitude: number;
    zoom: number;
    showLayer: boolean;
  };
  colorRanges: Record<
    string,
    { domain: [number, number]; hideOutside: boolean }
  >;
};
export type AssistantRequest = {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  context: AssistantContext;
};
export type AssistantAction =
  | { type: "set_tab"; tab: AssistantTab }
  | {
      type: "set_panel";
      side: AssistantSide;
      variable: string;
      month: string;
      start?: string;
      end?: string;
      regionId?: string;
    }
  | { type: "set_camera"; longitude: number; latitude: number; zoom?: number }
  | {
      type: "set_range";
      variable: string;
      minimum: number;
      maximum: number;
      hideOutside: boolean;
    }
  | { type: "set_playback"; side: AssistantSide; playing: boolean }
  | { type: "set_area"; bbox: string; name: string };
export type AssistantEvidence = {
  title: string;
  detail: string;
  source?: string;
};
export type JsonSchema = Record<string, unknown>;
const text = (maxLength: number, minLength = 1): JsonSchema => ({
  type: "string",
  minLength,
  maxLength,
});
const num = (minimum: number, maximum: number): JsonSchema => ({
  type: "number",
  minimum,
  maximum,
});
const bool = { type: "boolean" };
export const objectSchema = (
  properties: Record<string, JsonSchema>,
  required = Object.keys(properties),
): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});
export const variableSchema: JsonSchema = {
  type: "string",
  enum: variables.map((v) => v.id),
};
export const monthSchema: JsonSchema = {
  type: "string",
  minLength: 7,
  maxLength: 7,
  pattern: "^(19[0-9]{2}|20[0-9]{2}|2100)-(0[1-9]|1[0-2])$",
};
export const bboxSchema = text(120);
const sideSchema = { type: "string", enum: ["A", "B"] };
const tabSchema = { type: "string", enum: [...assistantTabs] };
const lon = num(-180, 180),
  lat = num(-90, 90),
  zoom = num(0.8, 8);
const nullableMonth = { anyOf: [monthSchema, { type: "null" }] };
const rangeSchema = objectSchema({
  domain: { type: "array", items: num(-1e20, 1e20), minItems: 2, maxItems: 2 },
  hideOutside: bool,
});
export const assistantRequestSchema = objectSchema({
  message: text(2000),
  history: {
    type: "array",
    minItems: 0,
    maxItems: 8,
    items: objectSchema({
      role: { type: "string", enum: ["user", "assistant"] },
      content: text(3000),
    }),
  },
  context: objectSchema({
    version: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    tab: tabSchema,
    panels: {
      type: "array",
      minItems: 0,
      maxItems: 2,
      items: objectSchema({
        side: sideSchema,
        variable: variableSchema,
        selectedMonth: nullableMonth,
        displayedMonth: nullableMonth,
        start: monthSchema,
        end: monthSchema,
        region: objectSchema({
          id: { ...text(80), pattern: "^[a-zA-Z0-9_-]+$" },
          name: text(80),
          bbox: bboxSchema,
          longitude: lon,
          latitude: lat,
        }),
        loading: bool,
        playing: bool,
      }),
    },
    camera: objectSchema({
      longitude: lon,
      latitude: lat,
      zoom,
      showLayer: bool,
    }),
    colorRanges: {
      type: "object",
      maxProperties: variables.length,
      properties: Object.fromEntries(variables.map((v) => [v.id, rangeSchema])),
      additionalProperties: false,
    },
  }),
});
export const assistantActionSchema: JsonSchema = {
  anyOf: [
    objectSchema({ type: { const: "set_tab" }, tab: tabSchema }),
    objectSchema(
      {
        type: { const: "set_panel" },
        side: sideSchema,
        variable: variableSchema,
        month: monthSchema,
        start: monthSchema,
        end: monthSchema,
        regionId: { ...text(80), pattern: "^[a-zA-Z0-9_-]+$" },
      },
      ["type", "side", "variable", "month"],
    ),
    objectSchema(
      { type: { const: "set_camera" }, longitude: lon, latitude: lat, zoom },
      ["type", "longitude", "latitude"],
    ),
    objectSchema({
      type: { const: "set_range" },
      variable: variableSchema,
      minimum: num(-1e20, 1e20),
      maximum: num(-1e20, 1e20),
      hideOutside: bool,
    }),
    objectSchema({
      type: { const: "set_playback" },
      side: sideSchema,
      playing: bool,
    }),
    objectSchema({
      type: { const: "set_area" },
      bbox: bboxSchema,
      name: text(80),
    }),
  ],
};

// The same bounded schema is checked without coercion or removing unknown fields.
// Fastify's default removeAdditional behavior is insufficient for assistant inputs.
function matches(value: unknown, schema: JsonSchema): boolean {
  if (Array.isArray(schema.anyOf))
    return (schema.anyOf as JsonSchema[]).some((s) => matches(value, s));
  if ("const" in schema && value !== schema.const) return false;
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return false;
  if (schema.type === "null") return value === null;
  if (schema.type === "string")
    return (
      typeof value === "string" &&
      value.length >= Number(schema.minLength ?? 0) &&
      value.length <= Number(schema.maxLength ?? Infinity) &&
      (!schema.pattern ||
        new RegExp(String(schema.pattern)).exec(value)?.[0] === value)
    );
  if (schema.type === "boolean") return typeof value === "boolean";
  if (schema.type === "number" || schema.type === "integer")
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (schema.type !== "integer" || Number.isInteger(value)) &&
      value >= Number(schema.minimum ?? -Infinity) &&
      value <= Number(schema.maximum ?? Infinity)
    );
  if (schema.type === "array")
    return (
      Array.isArray(value) &&
      value.length >= Number(schema.minItems ?? 0) &&
      value.length <= Number(schema.maxItems ?? Infinity) &&
      value.every((v) => matches(v, schema.items as JsonSchema))
    );
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    const record = value as Record<string, unknown>;
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    if (Object.keys(record).length > Number(schema.maxProperties ?? Infinity))
      return false;
    if (
      ((schema.required as string[]) ?? []).some(
        (k) => !Object.hasOwn(record, k),
      )
    )
      return false;
    return Object.entries(record).every(([k, v]) =>
      Object.hasOwn(properties, k)
        ? matches(v, properties[k])
        : schema.additionalProperties !== false,
    );
  }
  return true;
}
export function assertSchema(value: unknown, schema: JsonSchema): void {
  if (!matches(value, schema))
    throw new ApiError(
      400,
      "INVALID_ASSISTANT_INPUT",
      "Invalid assistant input or unsupported fields.",
    );
}
export function validatePeriod(start: string, end: string): string[] {
  parseMonth(start);
  parseMonth(end);
  const index = (m: string) =>
    Number(m.slice(0, 4)) * 12 + Number(m.slice(5)) - 1;
  const first = index(start),
    last = index(end);
  if (last < first || last - first >= 360)
    throw new ApiError(
      400,
      "INVALID_PERIOD",
      "Select an ordered period of at most 360 months.",
    );
  return Array.from(
    { length: last - first + 1 },
    (_, i) =>
      `${Math.floor((first + i) / 12)}-${String(((first + i) % 12) + 1).padStart(2, "0")}`,
  );
}
export function validateAssistantRequest(raw: unknown): AssistantRequest {
  assertSchema(raw, assistantRequestSchema);
  const request = raw as AssistantRequest;
  if (!request.message.trim() || request.history.some((h) => !h.content.trim()))
    throw new ApiError(
      400,
      "INVALID_ASSISTANT_INPUT",
      "Message cannot be blank.",
    );
  const sides = new Set<string>();
  for (const panel of request.context.panels) {
    if (sides.has(panel.side))
      throw new ApiError(
        400,
        "INVALID_ASSISTANT_INPUT",
        "Panel sides must be unique.",
      );
    sides.add(panel.side);
    validatePeriod(panel.start, panel.end);
    parseBounds(panel.region.bbox);
  }
  for (const [id, range] of Object.entries(request.context.colorRanges)) {
    if (
      range.domain[0] >= range.domain[1] ||
      variables.find((v) => v.id === id)?.render.kind === "categorical"
    )
      throw new ApiError(
        400,
        "INVALID_RANGE",
        "Invalid continuous display range.",
      );
  }
  return request;
}
