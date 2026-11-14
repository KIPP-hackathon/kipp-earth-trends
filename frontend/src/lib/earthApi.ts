export const earthApi = (
  import.meta.env.VITE_EARTH_API_URL ||
  "https://kipp-earth-api-583662795760.us-east4.run.app"
).replace(/\/$/, "");

export type EarthVariable = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  product: string;
  run?: string;
  months: { month: string; samples: number; validSamples: number }[];
};
export type EarthCatalog = { simulated: false; variables: EarthVariable[] };
export type EarthFrame = {
  variable: string;
  quantity: string;
  unit: string;
  product: string;
  run?: string;
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
  bbox: number[];
  observations: {
    month: string;
    value: number | null;
    coverage: number | null;
    samples: number;
  }[];
};

async function checked(url: string, signal: AbortSignal) {
  const response = await fetch(`${earthApi}${url}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(58_000)]),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error?.message ||
        `A fonte respondeu HTTP ${response.status}. Tente novamente.`,
    );
  }
  return response;
}
export async function loadCatalog(signal: AbortSignal): Promise<EarthCatalog> {
  const data = await (await checked("/v1/catalog", signal)).json();
  if (
    data.simulated !== false ||
    !Array.isArray(data.variables) ||
    !data.variables.length
  )
    throw new Error("O catálogo não contém variáveis reais disponíveis.");
  data.variables = data.variables.filter(
    (v: EarthVariable) => Array.isArray(v.months) && v.months.length > 0,
  );
  if (!data.variables.length)
    throw new Error(
      "Nenhum mês disponível no catálogo. Tente atualizar após a carga dos dados.",
    );
  return data;
}
export async function loadFrame(
  variable: string,
  month: string,
  signal: AbortSignal,
): Promise<EarthFrame> {
  const response = await checked(
    `/v1/frames/${encodeURIComponent(variable)}/${month}?factor=1&format=f32`,
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
    JSON.stringify(metadata.grid.bounds) !== "[-180,-90,180,90]"
  )
    throw new Error("A grade recebida não é compatível com o globo.");
  // Decode explicitly as little-endian, including on a big-endian client.
  const values = new Float32Array(count),
    coverage = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    values[i] = view.getFloat32(offset + i * 4, true);
    coverage[i] = view.getFloat32(offset + count * 4 + i * 4, true);
  }
  return { ...metadata, values, coverage };
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
export const realRegions = [
  {
    id: "saofrancisco",
    name: "São Francisco · recorte",
    bbox: "-47,-21,-38,-8",
    longitude: -43,
    latitude: -14,
  },
  {
    id: "amazonia",
    name: "Amazônia central · recorte",
    bbox: "-66,-9,-58,-1",
    longitude: -62,
    latitude: -5,
  },
  {
    id: "pantanal",
    name: "Pantanal · recorte",
    bbox: "-59,-22,-54,-15",
    longitude: -56,
    latitude: -18,
  },
] as const;
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
export function realScale(variable: string) {
  return variable.startsWith("rainfall")
    ? {
        domain: [0, 600] as const,
        colors: ["#e2f5df", "#75c8bd", "#3289b7", "#324b94"],
      }
    : {
        domain: [-60, 60] as const,
        colors: ["#425cb1", "#84d4da", "#f2e8b6", "#ee9469", "#ae3c4e"],
      };
}
export function colorFrame(frame: EarthFrame): Uint8Array {
  const scale = realScale(frame.variable);
  const palette = scale.colors.map((s) =>
    [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)),
  );
  const pixels = new Uint8Array(frame.values.length * 4);
  for (let i = 0; i < frame.values.length; i++) {
    const value = frame.values[i];
    if (!Number.isFinite(value) || frame.coverage[i] <= 0) continue;
    const t =
      Math.max(
        0,
        Math.min(
          1,
          (value - scale.domain[0]) / (scale.domain[1] - scale.domain[0]),
        ),
      ) *
      (palette.length - 1);
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
