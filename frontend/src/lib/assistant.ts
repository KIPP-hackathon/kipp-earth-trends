import { MIN_GLOBE_ZOOM, MAX_GLOBE_ZOOM } from "./globeZoom";
import type { LabTab } from "../components/LabTabs";
import { realScale, validColorDomain } from "./earthApi";
import type {
  EarthCatalog,
  EarthColorRange,
  EarthConfig,
  EarthRegion,
  ComparisonMode,
} from "./earthApi";
import type { GlobeView } from "./comparison";
import type { LayerSetting } from "./layers";

export type PanelSide = "A" | "B";
export type PanelPreset = {
  comparisonMode?:ComparisonMode;
  variable: string;
  month: string;
  region: string;
  start?: string;
  end?: string;
  nonce?: number;
  layers?: LayerSetting[];
};
export type PlaybackCommand = { playing: boolean; nonce: number };
export type PanelSnapshot = {
  comparisonMode?:ComparisonMode;
  side: PanelSide;
  variable: string;
  selectedMonth: string;
  displayedMonth: string | null;
  start: string;
  end: string;
  region: EarthRegion;
  loading: boolean;
  playing: boolean;
  layers?: LayerSetting[];
  layerMonths?: Record<string, string | null>;
};
export type AssistantContext = {
  version: number;
  tab: LabTab;
  panels: PanelSnapshot[];
  camera: GlobeView;
  colorRanges: Record<string, EarthColorRange>;
};
export type AssistantAction =
  | { type: "set_tab"; tab: LabTab }
  | {
      type: "set_panel";
      side: PanelSide;
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
  | { type: "set_playback"; side: PanelSide; playing: boolean }
  | { type: "set_area"; bbox: string; name: string };
export type AssistantEvidence = {
  title: string;
  detail: string;
  source?: string;
};
export type AssistantResponse = {
  reply: string;
  actions: unknown[];
  evidence: AssistantEvidence[];
  requestId: string;
  contextVersion: number;
};

export function safeEvidenceUrl(value?: string) {
  if (!value || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function parseAssistantResponse(value: unknown): AssistantResponse {
  if (!value || typeof value !== "object") throw new Error("Invalid response");
  const data = value as Record<string, unknown>;
  if (
    typeof data.reply !== "string" ||
    data.reply.length > 24_000 ||
    !Array.isArray(data.actions) ||
    data.actions.length > 12 ||
    !Array.isArray(data.evidence) ||
    data.evidence.length > 30 ||
    !Number.isSafeInteger(data.contextVersion) ||
    (data.contextVersion as number) < 0 ||
    typeof data.requestId !== "string" ||
    data.requestId.length > 256
  )
    throw new Error("Invalid response");
  const evidence = data.evidence.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid evidence");
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.title !== "string" ||
      entry.title.length > 500 ||
      typeof entry.detail !== "string" ||
      entry.detail.length > 12_000 ||
      (entry.source !== undefined && typeof entry.source !== "string")
    )
      throw new Error("Invalid evidence");
    return {
      title: entry.title,
      detail: entry.detail,
      source: safeEvidenceUrl(entry.source as string | undefined),
    };
  });
  return {
    reply: data.reply,
    actions: data.actions,
    evidence,
    requestId: data.requestId,
    contextVersion: data.contextVersion as number,
  };
}

export function parseStudyBbox(
  value: unknown,
): [number, number, number, number] | undefined {
  const parts: unknown[] =
    typeof value === "string"
      ? value.split(",").map((part) => (part.trim() ? Number(part) : NaN))
      : Array.isArray(value)
        ? value
        : [];
  if (
    parts.length !== 4 ||
    !parts.every((part) => typeof part === "number" && Number.isFinite(part))
  )
    return undefined;
  const [west, south, east, north] = parts as number[];
  return west >= -180 &&
    west <= 180 &&
    east >= -180 &&
    east <= 180 &&
    south >= -90 &&
    north <= 90 &&
    west !== east &&
    !(west === 180 && east === -180) &&
    south < north
    ? [west, south, east, north]
    : undefined;
}

// Validate the entire batch before any React state is changed. The server is not
// a trusted source of executable UI commands, even when its prose is useful.
export function validateAssistantActions(
  raw: unknown[],
  catalog: EarthCatalog,
  config: EarthConfig,
  context: AssistantContext,
): AssistantAction[] | undefined {
  if (!Array.isArray(raw) || raw.length > 12) return undefined;
  const actions: AssistantAction[] = [];
  const tabs = ["explore", "compare", "events", "learn"];
  const finite = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n);
  const side = (s: unknown) => s === "A" || s === "B";
  const panels = new Map(
    context.panels.map((panel) => [
      panel.side,
      { variable: panel.variable, start: panel.start, end: panel.end },
    ]),
  );
  for (const input of raw) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      return undefined;
    const a = input as Record<string, unknown>;
    const schemas: Record<string, string[]> = {
      set_tab: ["type", "tab"],
      set_panel: [
        "type",
        "side",
        "variable",
        "month",
        "start",
        "end",
        "regionId",
      ],
      set_camera: ["type", "longitude", "latitude", "zoom"],
      set_range: ["type", "variable", "minimum", "maximum", "hideOutside"],
      set_playback: ["type", "side", "playing"],
      set_area: ["type", "bbox", "name"],
    };
    if (
      typeof a.type !== "string" ||
      !Object.hasOwn(schemas, a.type) ||
      Object.keys(a).some((key) => !schemas[a.type as string].includes(key))
    )
      return undefined;
    const variable = catalog.variables.find(
      (v) => v.id === a.variable && v.available !== false && v.months.length,
    );
    if (a.type === "set_tab" && !tabs.includes(a.tab as string))
      return undefined;
    if (a.type === "set_panel") {
      if (
        !side(a.side) ||
        !variable ||
        typeof a.month !== "string" ||
        !variable.months.some(
          (m) => m.month === a.month && m.validSamples > 0,
        ) ||
        (a.regionId !== undefined &&
          !config.regions.some((r) => r.id === a.regionId))
      )
        return undefined;
      const previous = panels.get(a.side as PanelSide);
      const current = previous?.variable === a.variable ? previous : undefined;
      const start = a.start ?? current?.start ?? variable.months[0].month;
      const end = a.end ?? current?.end ?? variable.months.at(-1)!.month;
      if (
        typeof start !== "string" ||
        typeof end !== "string" ||
        !variable.months.some((m) => m.month === start) ||
        !variable.months.some((m) => m.month === end) ||
        start > end ||
        a.month < start ||
        a.month > end
      )
        return undefined;
      panels.set(a.side as PanelSide, { variable: variable.id, start, end });
      actions.push({
        type: "set_panel",
        side: a.side as PanelSide,
        variable: variable.id,
        month: a.month,
        start,
        end,
        ...(typeof a.regionId === "string" ? { regionId: a.regionId } : {}),
      });
      continue;
    }
    if (
      a.type === "set_camera" &&
      (!finite(a.longitude) ||
        a.longitude < -180 ||
        a.longitude > 180 ||
        !finite(a.latitude) ||
        a.latitude < -90 ||
        a.latitude > 90 ||
        (a.zoom !== undefined &&
          (!finite(a.zoom) ||
            a.zoom < MIN_GLOBE_ZOOM ||
            a.zoom > MAX_GLOBE_ZOOM)))
    )
      return undefined;
    if (
      a.type === "set_range" &&
      (!variable ||
        realScale(variable).kind !== "continuous" ||
        !finite(a.minimum) ||
        !finite(a.maximum) ||
        !validColorDomain([a.minimum, a.maximum]) ||
        Math.abs(a.minimum) > 1e20 ||
        Math.abs(a.maximum) > 1e20 ||
        typeof a.hideOutside !== "boolean")
    )
      return undefined;
    if (
      a.type === "set_playback" &&
      (!side(a.side) || typeof a.playing !== "boolean")
    )
      return undefined;
    if (a.type === "set_area") {
      const bbox = parseStudyBbox(a.bbox);
      if (
        !bbox ||
        typeof a.name !== "string" ||
        !a.name.trim() ||
        a.name.length > 120
      )
        return undefined;
      actions.push({
        type: "set_area",
        bbox: bbox.join(","),
        name: a.name.trim(),
      });
    } else actions.push(a as AssistantAction);
  }
  const tab =
    actions.filter((a) => a.type === "set_tab").at(-1)?.tab ?? context.tab;
  if (
    tab !== "compare" &&
    actions.some(
      (a) =>
        (a.type === "set_panel" || a.type === "set_playback") && a.side === "B",
    )
  )
    return undefined;
  if (
    !["explore", "compare"].includes(tab) &&
    actions.some((a) => a.type === "set_playback" && a.playing)
  )
    return undefined;
  for (const action of actions) {
    if (action.type !== "set_playback" || !action.playing) continue;
    const panel = panels.get(action.side);
    const variable =
      catalog.variables.find((entry) => entry.id === panel?.variable) ??
      catalog.variables.find(
        (entry) => entry.available !== false && entry.months.length,
      );
    if (
      !variable ||
      variable.months.filter(
        (month) =>
          (!panel ||
            (month.month >= panel.start && month.month <= panel.end)) &&
          month.validSamples > 0,
      ).length < 2
    )
      return undefined;
  }
  return actions;
}
