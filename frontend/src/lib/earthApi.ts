import { validFrameBounds } from "./globeSelection";
export const earthApi = "/api/earth";

export type EarthRender = {
  kind: "continuous" | "categorical";
  domain: [number, number];
  colors: string[];
  factor: number;
  categories?: { value: number; label: string }[];
};
export type EarthColorRange = {
  domain: [number, number];
  hideOutside: boolean;
};
export function validColorDomain(domain: [number, number]) {
  return (
    domain.every(Number.isFinite) &&
    domain[0] < domain[1] &&
    Number.isFinite(domain[1] - domain[0])
  );
}
export type EarthAggregation = "area_weighted_mean" | "sum" | "weighted_mode";
export type EarthQuality = { rule: string; notes: string[] };
export type EarthRegion = {
  id: string;
  name: string;
  bbox: string;
  longitude: number;
  latitude: number;
};
export type EarthConfig = {
  regions: EarthRegion[];
  playback: { cadenceMs: number; lookAhead: number; initialBuffer: number };
  comparison: { maxGlobes: number; synchronizedCamera: boolean };
  limitations: string[];
};
export type EarthEvent = {
  id: string;
  title: string;
  category: string;
  location: string;
  window: [string, string];
  region: string;
  variable: string;
  description: string;
  limitation: string;
  source: { name: string; url: string };
  bbox: string;
  longitude: number;
  latitude: number;
  available: boolean;
  months: string[];
  unavailableReason: string | null;
};
export type EarthEvents = {
  curated: true;
  detected: false;
  events: EarthEvent[];
  limitations?: string[];
};
export type EarthVariable = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  product: string;
  run?: string;
  category?: string;
  description?: string;
  render?: EarthRender;
  aggregation?: EarthAggregation;
  quality?: EarthQuality;
  available?: boolean;
  months: { month: string; samples: number; validSamples: number }[];
};
export type EarthCatalog = {
  simulated: false;
  variables: EarthVariable[];
  limitations?: string[];
};
export type EarthFrame = {
  variable: string;
  quantity: string;
  unit: string;
  product: string;
  run?: string;
  render?: EarthRender;
  month: string;
  simulated: false;
  validCells: number;
  totalCells: number;
  grid: {
    width: number;
    height: number;
    bounds: number[];
    orientation: string;
  };
  values: Float32Array;
  coverage: Float32Array;
};
export type EarthSeries = {
  variable: string;
  unit: string;
  product: string;
  run?: string;
  simulated: false;
  method: string;
  render?: EarthRender;
  aggregation?: EarthAggregation;
  quality?: EarthQuality;
  bbox: number[];
  observations: {
    month: string;
    value: number | null;
    coverage: number | null;
    samples: number;
  }[];
};

async function checked(url: string, signal: AbortSignal) {
  const budget = AbortSignal.any([signal, AbortSignal.timeout(58_000)]);
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${earthApi}${url}`, { signal: budget });
    if ([429, 503].includes(response.status) && attempt < 3) {
      const seconds = Number(response.headers.get("retry-after") ?? 1);
      const delay = Math.min(
        3000,
        Math.max(500, Number.isFinite(seconds) ? seconds * 1000 : 1000),
      );
      await response.body?.cancel();
      // Saturated slots finish quickly; keep the visible field while retrying.
      await new Promise<void>((resolve, reject) => {
        if (budget.aborted) return reject(budget.reason);
        const abort = () => {
          clearTimeout(timer);
          reject(budget.reason);
        };
        const timer = setTimeout(() => {
          budget.removeEventListener("abort", abort);
          resolve();
        }, delay);
        budget.addEventListener("abort", abort, { once: true });
      });
      continue;
    }
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(
        error?.error?.message ||
          `A fonte respondeu HTTP ${response.status}. Tente novamente.`,
      );
    }
    return response;
  }
}
export async function loadCatalog(signal: AbortSignal): Promise<EarthCatalog> {
  const data = await (await checked("/v1/catalog", signal)).json();
  if (
    data.simulated !== false ||
    !Array.isArray(data.variables) ||
    !data.variables.length
  )
    throw new Error("O catálogo não contém variáveis reais disponíveis.");
  data.variables = data.variables.filter((v: EarthVariable) =>
    Array.isArray(v.months),
  );
  if (
    !data.variables.some(
      (v: EarthVariable) => v.available !== false && v.months.length > 0,
    )
  )
    throw new Error(
      "Nenhum mês disponível no catálogo. Tente atualizar após a carga dos dados.",
    );
  return data;
}
export async function loadConfig(signal: AbortSignal): Promise<EarthConfig> {
  const data = await (await checked("/v1/config", signal)).json();
  if (
    !Array.isArray(data.regions) ||
    !data.regions.length ||
    !data.playback ||
    !data.comparison
  )
    throw new Error("A configuração de regiões não está disponível.");
  return data;
}
export async function loadEvents(signal: AbortSignal): Promise<EarthEvents> {
  const data = await (await checked("/v1/events", signal)).json();
  if (
    data.curated !== true ||
    data.detected !== false ||
    !Array.isArray(data.events)
  )
    throw new Error("O catálogo de eventos históricos não está disponível.");
  return data;
}
export async function loadFrame(
  variable: string,
  month: string,
  signal: AbortSignal,
  render?: EarthRender,
  bbox?: string,
): Promise<EarthFrame> {
  const factor =
    render && [1, 2, 4, 8, 16, 32].includes(render.factor) ? render.factor : 1;
  const response = await checked(
    `/v1/frames/${encodeURIComponent(variable)}/${month}?factor=${factor}&format=f32${bbox ? `&bbox=${encodeURIComponent(bbox)}` : ""}`,
    signal,
  );
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 8) throw new Error("Quadro incompleto.");
  const view = new DataView(bytes);
  if (view.getUint32(0, false) !== 0x4b495050)
    throw new Error("Formato de quadro inválido.");
  const headerSize = view.getUint32(4, true);
  if (headerSize > bytes.byteLength - 8)
    throw new Error("Cabeçalho incompleto.");
  const metadata = JSON.parse(
    new TextDecoder().decode(new Uint8Array(bytes, 8, headerSize)),
  );
  const offset = Math.ceil((8 + headerSize) / 4) * 4;
  const count = metadata.grid?.width * metadata.grid?.height;
  if (
    metadata.version !== 1 ||
    metadata.simulated !== false ||
    metadata.variable !== variable ||
    metadata.month !== month ||
    metadata.dtype !== "float32" ||
    metadata.byteOrder !== "little" ||
    metadata.layout !== "planar" ||
    JSON.stringify(metadata.components) !== '["value","valid_area_fraction"]' ||
    !Number.isInteger(metadata.grid?.width) ||
    !Number.isInteger(metadata.grid?.height) ||
    metadata.grid.width < 1 ||
    metadata.grid.height < 1 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 210_000 ||
    offset + count * 8 !== bytes.byteLength ||
    metadata.grid.orientation !== "north_to_south,west_to_east" ||
    !validFrameBounds(metadata.grid.bounds)
  )
    throw new Error("A grade recebida não é compatível com o globo.");
  const expectedBounds = bbox
    ? bbox.split(",").map(Number)
    : [-180, -90, 180, 90];
  if (expectedBounds[2] <= expectedBounds[0]) expectedBounds[2] += 360;
  if (
    !validFrameBounds(expectedBounds) ||
    expectedBounds.some(
      (value, index) => Math.abs(value - metadata.grid.bounds[index]) > 1e-6,
    )
  )
    throw new Error("O quadro recebido não corresponde ao recorte solicitado.");
  // Decode explicitly as little-endian, including on a big-endian client.
  const values = new Float32Array(count),
    coverage = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    values[i] = view.getFloat32(offset + i * 4, true);
    coverage[i] = view.getFloat32(offset + count * 4 + i * 4, true);
  }
  return { ...metadata, ...(render ? { render } : {}), values, coverage };
}
export async function loadSeries(
  variable: EarthVariable,
  bbox: string,
  signal: AbortSignal,
): Promise<EarthSeries> {
  const months = variable.months;
  const query = new URLSearchParams({
    bbox,
    start: months[0].month,
    end: months.at(-1)!.month,
  });
  const data = await (
    await checked(
      `/v1/series/${encodeURIComponent(variable.id)}?${query}`,
      signal,
    )
  ).json();
  if (
    data.simulated !== false ||
    data.variable !== variable.id ||
    !Array.isArray(data.observations)
  )
    throw new Error("Série incompatível com a seleção.");
  // Preserve absent calendar months as gaps rather than joining across missing data.
  const byMonth = new Map(
    data.observations.map((o: EarthSeries["observations"][number]) => [
      o.month,
      o,
    ]),
  );
  const calendar: string[] = [];
  const cursor = new Date(`${months[0].month}-01T00:00:00Z`);
  while (
    cursor.toISOString().slice(0, 7) <= months.at(-1)!.month &&
    calendar.length < 120
  ) {
    calendar.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  data.observations = calendar.map(
    (month) =>
      byMonth.get(month) || { month, value: null, coverage: null, samples: 0 },
  );
  return data;
}
export function aggregationLabel(aggregation?: EarthAggregation) {
  return aggregation === "sum"
    ? "soma das células válidas, sem segunda ponderação por área"
    : aggregation === "weighted_mode"
      ? "classe predominante ponderada por área"
      : "média espacial ponderada por latitude e cobertura válida";
}
export function realUnit(unit: string) {
  return unit === "degC" ? "°C" : unit === "mm/month" ? "mm/mês" : unit;
}
export function realMonth(month: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}
export function realScale(
  variable: string | EarthVariable | EarthFrame,
): EarthRender {
  const id =
    typeof variable === "string"
      ? variable
      : "id" in variable
        ? variable.id
        : variable.variable;
  const supplied = typeof variable === "string" ? undefined : variable.render;
  if (
    supplied &&
    ["continuous", "categorical"].includes(supplied.kind) &&
    supplied.domain?.length === 2 &&
    supplied.domain.every(Number.isFinite) &&
    supplied.domain[1] > supplied.domain[0] &&
    supplied.colors?.length >= 2 &&
    supplied.colors.every((color) => /^#[\da-f]{6}$/i.test(color))
  )
    return supplied;
  // Compatibility while catalogs from the previous four-variable API are deployed.
  return id === "rainfall" || id === "rainfall_late"
    ? {
        kind: "continuous",
        factor: 1,
        domain: [0, 600],
        colors: ["#e2f5df", "#75c8bd", "#3289b7", "#324b94"],
      }
    : id === "temperature" || id === "surface_temperature"
      ? {
          kind: "continuous",
          factor: 1,
          domain: [-60, 60],
          colors: ["#425cb1", "#84d4da", "#f2e8b6", "#ee9469", "#ae3c4e"],
        }
      : {
          kind: "continuous",
          factor: 1,
          domain: [0, 1],
          colors: ["#e2e6df", "#526b67"],
        };
}
export function displayScale(
  frame: EarthFrame,
  range?: EarthColorRange,
): EarthRender {
  const scale = realScale(frame);
  return scale.kind === "continuous" && range && validColorDomain(range.domain)
    ? { ...scale, domain: range.domain }
    : scale;
}
export function colorFrame(
  frame: EarthFrame,
  range?: EarthColorRange,
): Uint8Array {
  const scale = displayScale(frame, range);
  const palette = scale.colors.map((s) =>
    [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)),
  );
  const pixels = new Uint8Array(frame.values.length * 4);
  const hideOutside =
    scale.kind === "continuous" &&
    range?.hideOutside &&
    validColorDomain(range.domain);
  for (let i = 0; i < frame.values.length; i++) {
    const value = frame.values[i];
    if (!Number.isFinite(value) || frame.coverage[i] <= 0) continue;
    if (hideOutside && (value < scale.domain[0] || value > scale.domain[1]))
      continue;
    const t =
      Math.max(
        0,
        Math.min(
          1,
          (value - scale.domain[0]) / (scale.domain[1] - scale.domain[0]),
        ),
      ) *
      (palette.length - 1);
    if (scale.kind === "categorical") {
      const color = palette[Math.round(t)];
      pixels.set([...color, 220], i * 4);
      continue;
    }
    const a = Math.min(palette.length - 2, Math.floor(t)),
      f = t - a;
    for (let c = 0; c < 3; c++)
      pixels[i * 4 + c] = Math.round(
        palette[a][c] * (1 - f) + palette[a + 1][c] * f,
      );
    pixels[i * 4 + 3] = 220;
  }
  return pixels;
}
