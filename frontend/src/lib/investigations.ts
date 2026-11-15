import type { GlobeView } from "./comparison";
import type { EarthColorRange, EarthRegion } from "./earthApi";

export type InvestigationView = {
  tab: "explore" | "compare" | "analysis";
  panels: {
    side: "A" | "B";
    variable: string;
    month: string;
    start: string;
    end: string;
    region: EarthRegion;
  }[];
  camera: GlobeView;
  colorRanges: Record<string, EarthColorRange>;
  eventId?: string;
};
export type SavedInvestigation = {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  view: InvestigationView;
};
export const INVESTIGATION_LIMITS = {
  records: 25,
  storageBytes: 1_048_576,
  fileBytes: 32_768,
  shareChars: 12_000,
  nameChars: 120,
  notesChars: 4_000,
} as const;
export const INVESTIGATION_STORAGE_KEY = "kipp.investigations.v1";
const FORMAT = "kipp-investigation";
const HASH_PREFIX = "#investigation=";
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text).length;
function fail(message: string): never {
  throw new Error(message);
}
function object(
  value: unknown,
  required: string[],
  optional: string[] = [],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return fail("Invalid investigation object.");
  const keys = Object.keys(value);
  if (
    keys.some(
      (key) => forbidden.has(key) || ![...required, ...optional].includes(key),
    ) ||
    required.some((key) => !Object.hasOwn(value, key))
  )
    return fail("Unexpected or missing investigation fields.");
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number, empty = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!empty && !value.trim()) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    return fail("Invalid or oversized investigation text.");
  return value;
}
function identifier(value: unknown): string {
  const text = string(value, 80);
  if (forbidden.has(text) || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(text))
    return fail("Invalid investigation identifier.");
  return text;
}
function number(value: unknown, low: number, high: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < low ||
    value > high
  )
    return fail("Invalid investigation numeric bounds.");
  return value;
}
function month(value: unknown): string {
  const text = string(value, 7);
  if (!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(text))
    return fail("Invalid monthly date.");
  return text;
}
function region(value: unknown): EarthRegion {
  const r = object(value, ["id", "name", "bbox", "longitude", "latitude"]);
  const bbox = string(r.bbox, 120);
  const parts = bbox.split(",");
  if (
    parts.length !== 4 ||
    parts.some((v) => !/^-?\d+(?:\.\d+)?$/.test(v.trim()))
  )
    return fail("Invalid area bounding box.");
  const [west, south, east, north] = parts.map(Number);
  number(west, -180, 180);
  number(east, -180, 180);
  number(south, -90, 90);
  number(north, -90, 90);
  if (west === east || north <= south || (west === 180 && east === -180))
    return fail("Area bounding box has no extent.");
  return {
    id: identifier(r.id),
    name: string(r.name, 80),
    bbox: [west, south, east, north].join(","),
    longitude: number(r.longitude, -180, 180),
    latitude: number(r.latitude, -90, 90),
  };
}
/** Strict schema; constructs fresh objects and never spreads untrusted keys. Catalog availability is checked by the restore callback. */
export function validateInvestigationView(value: unknown): InvestigationView {
  const v = object(
    value,
    ["tab", "panels", "camera", "colorRanges"],
    ["eventId"],
  );
  if (v.tab !== "explore" && v.tab !== "compare" && v.tab !== "analysis")
    return fail("Unsupported investigation workspace.");
  if (
    !Array.isArray(v.panels) ||
    v.panels.length !== (v.tab === "compare" ? 2 : 1)
  )
    return fail("Invalid investigation panel count.");
  const panels = v.panels.map((value, index) => {
    const p = object(value, [
      "side",
      "variable",
      "month",
      "start",
      "end",
      "region",
    ]);
    if (p.side !== (index === 0 ? "A" : "B"))
      return fail("Investigation panels must be ordered A, B.");
    const start = month(p.start),
      end = month(p.end),
      current = month(p.month);
    if (start > end || current < start || current > end)
      return fail("Current month must be inside the investigation period.");
    return {
      side: p.side as "A" | "B",
      variable: identifier(p.variable),
      month: current,
      start,
      end,
      region: region(p.region),
    };
  });
  const areaById = new Map<string, string>();
  for (const panel of panels) {
    const encoded = JSON.stringify(panel.region);
    if (
      areaById.has(panel.region.id) &&
      areaById.get(panel.region.id) !== encoded
    )
      return fail(
        "The same study-area ID cannot describe different areas across panels.",
      );
    areaById.set(panel.region.id, encoded);
  }
  const c = object(v.camera, ["zoom", "longitude", "latitude", "showLayer"]);
  if (typeof c.showLayer !== "boolean")
    return fail("Invalid layer visibility.");
  const camera: GlobeView = {
    zoom: number(c.zoom, 0.8, 1.8),
    longitude: number(c.longitude, -180, 180),
    latitude: number(c.latitude, -90, 90),
    showLayer: c.showLayer,
  };
  const rangeKeys = panels.map((p) => p.variable);
  const ranges = object(v.colorRanges, [], rangeKeys);
  const colorRanges: Record<string, EarthColorRange> = {};
  for (const key of Object.keys(ranges)) {
    identifier(key);
    const range = object(ranges[key], ["domain", "hideOutside"]);
    if (
      !Array.isArray(range.domain) ||
      range.domain.length !== 2 ||
      typeof range.hideOutside !== "boolean"
    )
      return fail("Invalid visual color range.");
    const domain: [number, number] = [
      number(range.domain[0], -1e15, 1e15),
      number(range.domain[1], -1e15, 1e15),
    ];
    if (domain[0] >= domain[1])
      return fail("Visual minimum must be below maximum.");
    colorRanges[key] = { domain, hideOutside: range.hideOutside };
  }
  return {
    tab: v.tab,
    panels,
    camera,
    colorRanges,
    ...(v.eventId === undefined ? {} : { eventId: identifier(v.eventId) }),
  };
}
function timestamp(value: unknown): string {
  const text = string(value, 24);
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(text) ||
    !Number.isFinite(Date.parse(text)) ||
    new Date(text).toISOString() !== text
  )
    return fail("Invalid saved date.");
  return text;
}
function validateRecord(value: unknown): SavedInvestigation {
  const r = object(value, [
    "id",
    "name",
    "notes",
    "createdAt",
    "updatedAt",
    "view",
  ]);
  const createdAt = timestamp(r.createdAt),
    updatedAt = timestamp(r.updatedAt);
  if (createdAt > updatedAt) return fail("Invalid saved date order.");
  return {
    id: identifier(r.id),
    name: string(r.name, INVESTIGATION_LIMITS.nameChars).trim(),
    notes: string(r.notes, INVESTIGATION_LIMITS.notesChars, true),
    createdAt,
    updatedAt,
    view: validateInvestigationView(r.view),
  };
}
function parse(text: string, max: number): unknown {
  if (typeof text !== "string" || text.length > max || bytes(text) > max)
    return fail("Investigation exceeds the size limit.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return fail("Invalid investigation JSON.");
  }
}
function storage(): Storage {
  try {
    return window.localStorage;
  } catch {
    return fail(
      "Browser storage is blocked. Export JSON to keep your investigation.",
    );
  }
}
export function loadInvestigations(): SavedInvestigation[] {
  let text: string | null;
  try {
    text = storage().getItem(INVESTIGATION_STORAGE_KEY);
  } catch {
    return fail(
      "Browser storage is blocked. Export JSON to keep your investigation.",
    );
  }
  if (text === null) return [];
  try {
    const saved = object(parse(text, INVESTIGATION_LIMITS.storageBytes), [
      "version",
      "records",
    ]);
    if (
      saved.version !== 1 ||
      !Array.isArray(saved.records) ||
      saved.records.length > INVESTIGATION_LIMITS.records
    )
      return fail("Unsupported saved investigations.");
    const records = saved.records.map(validateRecord);
    if (new Set(records.map((r) => r.id)).size !== records.length)
      return fail("Duplicate saved investigation identifiers.");
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return fail(
      "Saved investigations are unreadable or from an unsupported version. Existing browser data was preserved; use JSON export/import for recovery.",
    );
  }
}
function write(records: SavedInvestigation[]): SavedInvestigation[] {
  if (records.length > INVESTIGATION_LIMITS.records)
    return fail(
      `This browser can hold ${INVESTIGATION_LIMITS.records} investigations. Export and delete one first.`,
    );
  const text = JSON.stringify({
    version: 1,
    records: records.map(validateRecord),
  });
  if (bytes(text) > INVESTIGATION_LIMITS.storageBytes)
    return fail(
      "Saved investigations exceed the 1 MiB limit. Export and delete one first.",
    );
  try {
    storage().setItem(INVESTIGATION_STORAGE_KEY, text);
  } catch {
    return fail(
      "Could not save in this browser: storage is blocked or full. Existing records were preserved. Export JSON to keep this view.",
    );
  }
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function makeInvestigation(
  view: InvestigationView,
  name: string,
  notes = "",
): SavedInvestigation {
  const now = new Date().toISOString();
  return validateRecord({
    id: crypto.randomUUID(),
    name,
    notes,
    createdAt: now,
    updatedAt: now,
    view,
  });
}
export function saveInvestigation(
  record: SavedInvestigation,
  replaceId?: string,
): SavedInvestigation[] {
  const valid = validateRecord(record);
  const records = loadInvestigations();
  if (replaceId) {
    const index = records.findIndex((r) => r.id === replaceId);
    if (index < 0)
      return fail(
        "This investigation no longer exists in browser storage. Save a copy.",
      );
    records[index] = {
      ...valid,
      id: replaceId,
      createdAt: records[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
  } else {
    if (records.some((r) => r.id === valid.id))
      return fail(
        "This investigation already exists. Save a copy or update it.",
      );
    records.push(valid);
  }
  return write(records);
}
export function deleteInvestigation(id: string): SavedInvestigation[] {
  return write(loadInvestigations().filter((record) => record.id !== id));
}
export function exportInvestigation(record: SavedInvestigation): string {
  const text = JSON.stringify(
    { format: FORMAT, version: 1, investigation: validateRecord(record) },
    null,
    2,
  );
  if (bytes(text) > INVESTIGATION_LIMITS.fileBytes)
    return fail("Investigation is too large to export.");
  return text;
}
export function importInvestigation(text: string): SavedInvestigation {
  const value = object(parse(text, INVESTIGATION_LIMITS.fileBytes), [
    "format",
    "version",
    "investigation",
  ]);
  if (value.format !== FORMAT || value.version !== 1)
    return fail("Unsupported investigation file format or version.");
  return validateRecord(value.investigation);
}
export function investigationShareHash(view: InvestigationView): string {
  const text = JSON.stringify({
    version: 1,
    view: validateInvestigationView(view),
  });
  if (bytes(text) > INVESTIGATION_LIMITS.shareChars)
    return fail(
      "This view is too large for a share link. Export JSON instead.",
    );
  const data = encoder.encode(text);
  const encoded = btoa(
    Array.from(data, (byte) => String.fromCharCode(byte)).join(""),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  const hash = HASH_PREFIX + encoded;
  if (hash.length > INVESTIGATION_LIMITS.shareChars)
    return fail(
      "This view is too large for a share link. Export JSON instead.",
    );
  return hash;
}
/** Unrelated URL fragments are ignored; malformed investigation fragments fail without a partial restore. */
export function parseInvestigationHash(hash: string): InvestigationView | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  if (hash.length > INVESTIGATION_LIMITS.shareChars)
    return fail("Shared investigation link is too large.");
  const data = hash.slice(HASH_PREFIX.length);
  if (!data || !/^[A-Za-z0-9_-]+$/.test(data))
    return fail("Invalid shared investigation link.");
  let text: string;
  try {
    const binary = atob(data.replaceAll("-", "+").replaceAll("_", "/"));
    text = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (c) => c.charCodeAt(0)),
    );
  } catch {
    return fail("Invalid shared investigation encoding.");
  }
  const payload = object(parse(text, INVESTIGATION_LIMITS.shareChars), [
    "version",
    "view",
  ]);
  if (payload.version !== 1)
    return fail("Unsupported shared investigation version.");
  return validateInvestigationView(payload.view);
}
