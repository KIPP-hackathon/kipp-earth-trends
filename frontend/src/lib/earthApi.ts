import { validFrameBounds } from "./globeSelection";
import { earthReadCache } from "./earthReadCache";
import { queuedSeries } from "./seriesQueue";
import type {RuntimeTrend} from "./runtimeTrends";
import type { Investigation, InvestigationRequest } from '../../../backend/src/investigation.ts';
export type { Investigation, InvestigationRequest } from '../../../backend/src/investigation.ts';

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
  suggestedVariables?: {
    id: string;
    reason: string;
    months: string[];
    available: boolean;
  }[];
  coverageNote?: string;
};
export type EarthEvents = {
  curated: true;
  detected: false;
  events: EarthEvent[];
  limitations?: string[];
};
export type EarthVariable = {
  sourceLayer?: string;
  sourceTable?: string | null;
  colorRangeSource?: "indicator_coverage_p5_p95" | "configured_default";
  coverageFlag?: boolean | null;
  sourceRevision?: string;
  id: string;
  name: string;
  quantity: string;
  unit: string;
  product: string;
  run?: string;
  category?: string;
  domain?: string;
  theme?: string;
  processingNote?: string;
  subTheme?: string;
  description?: string;
  render?: EarthRender;
  aggregation?: EarthAggregation;
  quality?: EarthQuality;
  available?: boolean;
  months: { month: string; samples: number; validSamples: number; processingRun?: string }[];
};
export type EarthCatalog = {
  capabilities?: {layeredAssistant?: boolean;comparisonCharts?:boolean;runtimeTrends?:boolean;investigations?:boolean};
  revision?: string;
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
  processingRun?: string;
  processingNote?: string;
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
  source?: string;
  sourceLayer?: string;
  sourceTable?: string | null;
  sourceUC?: string | null;
  start?: string;
  end?: string;
  variable: string;
  unit: string;
  product: string;
  run?: string;
  processingNote?: string;
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
    processingRun?: string;
  }[];
};

export type ComparisonMode = "raw" | "standardized" | "minmax";
export type ComparisonObservation = EarthSeries["observations"][number] & {
  standardized:number|null;minmax:number|null;
  standardizedStatus:"available"|"no_data"|"insufficient_reference"|"constant_reference";
};
export type ComparisonScope = {
  trends?:{raw:RuntimeTrend;standardized:RuntimeTrend;minmax:RuntimeTrend};
  reference:{month:number;count:number;mean:number|null;standardDeviation:number|null}[];
  range:{min:number|null;max:number|null;constant:boolean};
  observations:ComparisonObservation[];
};
export type EarthComparison = {
  variable:string;name:string;unit:string;sourceUnit:string;product:string;run?:string;processingNote?:string;
  simulated:false;start:string;end:string;bbox:number[];method:string;aggregation:string;
  source:string;sourceLayer:string;sourceTable:string;sourceUC:string;
  quality?:EarthQuality;limitations:string[];
  reference:{start:string;end:string;minimumYearsPerMonth:number;method:string};
  global:ComparisonScope;regional:ComparisonScope;
};
function validComparison(data: EarthComparison, variable: string, start: string, end: string) {
  return data?.simulated === false && data.variable === variable && data.start === start && data.end === end &&
    Array.isArray(data.global?.observations) && Array.isArray(data.regional?.observations);
}
export function loadComparison(variable:EarthVariable,start:string,end:string,bbox:string,signal:AbortSignal,includeTrends=false):Promise<EarthComparison> {
  const key=JSON.stringify(["comparison:v2",variableDataKey(variable),start,end,bbox,includeTrends]);
  return earthReadCache.read(key,signal,60_000,async(requestSignal)=> {
    const query=new URLSearchParams({start,end,bbox});
    if(includeTrends)query.set("analysis","trend-v1");
    const data:EarthComparison=await queuedSeries(requestSignal,async()=>
      (await checked(`/v1/comparison/${encodeURIComponent(variable.id)}?${query}`,requestSignal)).json());
    if (!validComparison(data,variable.id,start,end))
      throw new Error("Comparison data does not match this selection.");
    return data;
  });
}
export type ComparisonBatchEntry = { data?: EarthComparison; error?: string };
// Keep in step with the API's per-request limit and the proxy's response cap.
export const comparisonBatchSize = 6;
/**
 * Loads every selected variable's study series in one request per six variables
 * instead of one request each. A failed variable is reported on its own entry; an
 * API that predates the batch route is served by the single-variable route.
 */
export async function loadComparisons(variables:EarthVariable[],start:string,end:string,bbox:string,signal:AbortSignal,includeTrends=false):Promise<Record<string,ComparisonBatchEntry>> {
  const entries:Record<string,ComparisonBatchEntry>={};
  const fallback=async(group:EarthVariable[])=> {
    await Promise.all(group.map(async variable=> {
      try { entries[variable.id]={data:await loadComparison(variable,start,end,bbox,signal,includeTrends)}; }
      catch (error) {
        if (signal.aborted) throw error;
        entries[variable.id]={error:error instanceof Error?error.message:"Could not load comparison."};
      }
    }));
  };
  const groups:EarthVariable[][]=[];
  for (let i=0;i<variables.length;i+=comparisonBatchSize) groups.push(variables.slice(i,i+comparisonBatchSize));
  await Promise.all(groups.map(async group=> {
    const key=JSON.stringify(["comparisons:v1",group.map(variableDataKey),start,end,bbox,includeTrends]);
    try {
      const batch=await earthReadCache.read(key,signal,60_000,async requestSignal=> {
        const query=new URLSearchParams({variables:group.map(v=>v.id).join(","),start,end,bbox});
        if(includeTrends)query.set("analysis","trend-v1");
        const body:{version?:number;results?:Record<string,EarthComparison>;errors?:Record<string,{message?:string}>}=
          await queuedSeries(requestSignal,async()=>(await checked(`/v1/comparisons?${query}`,requestSignal)).json());
        if (body?.version!==1 || typeof body.results!=="object" || typeof body.errors!=="object")
          throw new Error("Comparison data does not match this selection.");
        const out:Record<string,ComparisonBatchEntry>={};
        for (const variable of group) {
          const data=body.results?.[variable.id];
          if (data && validComparison(data,variable.id,start,end)) out[variable.id]={data};
          else out[variable.id]={error:body.errors?.[variable.id]?.message ?? "Comparison data does not match this selection."};
        }
        return out;
      },value=>Object.values(value).every(entry=>!entry.error));
      Object.assign(entries,batch);
    } catch (error) {
      if (signal.aborted) throw error;
      // 404: the API has not been updated with the batch route yet.
      if ((error as {status?:number})?.status===404) return fallback(group);
      const message=error instanceof Error?error.message:"Could not load comparison.";
      for (const variable of group) entries[variable.id]={error:message};
    }
  }));
  return entries;
}
export function loadInvestigation(request: InvestigationRequest, variables: EarthVariable[], signal: AbortSignal): Promise<Investigation> {
  const key=JSON.stringify(['investigation-v1',request,variables.map(variableDataKey)]);
  return earthReadCache.read(key,signal,60_000,async budget=>{
    const query=new URLSearchParams(Object.entries(request).filter(([,v])=>v!==undefined) as [string,string][]);
    const data:Investigation=await queuedSeries(budget,async()=>(await checked(`/v1/investigation?${query}`,budget)).json());
    if(data.version!==1 || data.method!=='relationships-v1' || data.simulated!==false ||
      Object.entries(request).some(([k,v])=>data.request?.[k as keyof InvestigationRequest]!==v) ||
      !Array.isArray(data.series) || data.series.map(s=>s.variable).join(',')!==[request.x,request.y].filter(Boolean).join(',') ||
      data.series.some(s=>!Array.isArray(s.observations)||s.observations.length>600||!Array.isArray(s.reference)||s.reference.length!==12) ||
      !Array.isArray(data.family) || !Array.isArray(data.lags) || data.lags.length!==(request.y?7:0))
      throw new Error('Investigation data does not match this selection.');
    return data;
  });
}
export type EarthTrendRecord = {
  region_id: string;
  region_name: string;
  region_type: string;
  source_table: string;
  variable: string;
  unit: string;
  aggregation: string;
  period_start: string;
  period_end: string;
  method: string;
  trend_direction: string;
  source_dataset: string;
  data_type: string;
  notes: string;
  computed_at: string;
  lat_min: number | null;
  lat_max: number | null;
  lon_min: number | null;
  lon_max: number | null;
  n_obs: number | null;
  statistic: number | null;
  z_score: number | null;
  tau: number | null;
  slope_per_month: number | null;
  slope_per_decade: number | null;
  slope_ci_low_per_decade: number | null;
  slope_ci_high_per_decade: number | null;
  p_value: number | null;
  alpha: number | null;
  is_significant: boolean | null;
};
export type EarthTrendEvidence = {
  status: "exact" | "unsupported" | "unavailable";
  precomputed: true;
  simulated: false;
  selection: { variable: string; bbox: number[]; start: string; end: string };
  referenceTable: string;
  referenceFetchedAt?: string;
  referenceRowCount?: number;
  referenceTruncated: boolean;
  resultsTruncated: boolean;
  contextsTruncated: boolean;
  reason: string | null;
  results: EarthTrendRecord[];
  warnings: string[];
  supportedContexts: {
    variable: string;
    storedVariable: string;
    regionId: string;
    regionName: string;
    bbox: (number | null)[];
    start: string;
    end: string;
    n_obs: number | null;
    unit: string;
  }[];
};

function retryDelay(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, delay);
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function checked(url: string, signal: AbortSignal) {
  const budget = AbortSignal.any([signal, AbortSignal.timeout(58_000)]);
  for (let attempt = 0; ; attempt++) {
    budget.throwIfAborted();
    let response: Response;
    try {
      response = await fetch(`${earthApi}${url}`, { signal: budget });
    } catch (error) {
      budget.throwIfAborted();
      if (!(error instanceof TypeError)) throw error;
      // Browser network failures reject fetch without an HTTP response.
      // Only these read-only requests are repeated, within one shared deadline.
      if (attempt >= 3)
        throw new Error(
          "Could not connect to the data source. Check your connection and try again.",
        );
      await retryDelay(500 * 2 ** attempt, budget);
      continue;
    }
    if ([429, 503].includes(response.status) && attempt < 3) {
      const seconds = Number(response.headers.get("retry-after") ?? 1);
      const delay = Math.min(
        3000,
        Math.max(500, Number.isFinite(seconds) ? seconds * 1000 : 1000),
      );
      await response.body?.cancel();
      // Saturated slots finish quickly; keep the visible field while retrying.
      await retryDelay(delay, budget);
      continue;
    }
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw Object.assign(new Error(
        error?.error?.message ||
          `The source returned HTTP ${response.status}. Try again.`,
      ), {status: response.status, code: error?.error?.code});
    }
    return response;
  }
}
export function loadCatalog(signal: AbortSignal): Promise<EarthCatalog> {
  return earthReadCache.read("catalog", signal, 60_000, readCatalog);
}
async function readCatalog(signal: AbortSignal): Promise<EarthCatalog> {
  const data = await (await checked("/v1/catalog", signal)).json();
  if (
    data.simulated !== false ||
    !Array.isArray(data.variables) ||
    !data.variables.length
  )
    throw new Error("The catalog has no available real-data variables.");
  data.variables = data.variables.filter((v: EarthVariable) =>
    Array.isArray(v.months),
  );
  if (
    !data.variables.some(
      (v: EarthVariable) => v.available !== false && v.months.length > 0,
    )
  )
    throw new Error(
      "No months are available in the catalog. Refresh after data has loaded.",
    );
  if (typeof data.revision === "string")
    data.variables = data.variables.map((variable: EarthVariable) => ({
      ...variable,
      sourceRevision: data.revision,
    }));
  return data;
}
export function loadConfig(signal: AbortSignal): Promise<EarthConfig> {
  return earthReadCache.read("config", signal, 300_000, readConfig);
}
async function readConfig(signal: AbortSignal): Promise<EarthConfig> {
  const data = await (await checked("/v1/config", signal)).json();
  if (
    !Array.isArray(data.regions) ||
    !data.regions.length ||
    !data.playback ||
    !data.comparison
  )
    throw new Error("Region configuration is unavailable.");
  return data;
}
export function loadEvents(signal: AbortSignal): Promise<EarthEvents> {
  return earthReadCache.read("events", signal, 60_000, readEvents);
}
async function readEvents(signal: AbortSignal): Promise<EarthEvents> {
  const data = await (await checked("/v1/events", signal)).json();
  if (
    data.curated !== true ||
    data.detected !== false ||
    !Array.isArray(data.events)
  )
    throw new Error("The historical event catalog is unavailable.");
  return data;
}
export function loadTrendEvidence(
  variable: string,
  bbox: string,
  start: string,
  end: string,
  signal: AbortSignal,
): Promise<EarthTrendEvidence> {
  const key = JSON.stringify(["trends", variable, bbox, start, end]);
  return earthReadCache.read(key, signal, 60_000, async (requestSignal) => {
    const query = new URLSearchParams({ variable, bbox, start, end });
    const data: EarthTrendEvidence = await (
      await checked(`/v1/trends?${query}`, requestSignal)
    ).json();
    const bounds = bbox.split(",").map(Number);
    if (
      data.precomputed !== true ||
      data.simulated !== false ||
      !["exact", "unsupported", "unavailable"].includes(data.status) ||
      data.selection?.variable !== variable ||
      data.selection.start !== start ||
      data.selection.end !== end ||
      !Array.isArray(data.selection.bbox) ||
      data.selection.bbox.length !== 4 ||
      bounds.length !== 4 ||
      bounds.some(
        (value, index) =>
          !Number.isFinite(value) || data.selection.bbox[index] !== value,
      ) ||
      !Array.isArray(data.results) ||
      data.results.length > 12 ||
      !Array.isArray(data.supportedContexts) ||
      data.supportedContexts.length > 100 ||
      !Array.isArray(data.warnings) ||
      data.warnings.some((warning) => typeof warning !== "string") ||
      typeof data.referenceTruncated !== "boolean" ||
      typeof data.resultsTruncated !== "boolean" ||
      typeof data.contextsTruncated !== "boolean" ||
      (data.status === "exact"
        ? !data.results.length
        : data.results.length > 0) ||
      data.results.some(
        (row) =>
          variable !== "surface_temperature" ||
          row.variable !== "surface_skin_temperature" ||
          row.lon_min !== bounds[0] ||
          row.lat_min !== bounds[1] ||
          row.lon_max !== bounds[2] ||
          row.lat_max !== bounds[3] ||
          row.period_start?.slice(0, 7) !== start ||
          row.period_end?.slice(0, 7) !== end ||
          typeof row.method !== "string" ||
          typeof row.notes !== "string" ||
          typeof row.aggregation !== "string" ||
          [
            row.n_obs,
            row.slope_per_month,
            row.slope_per_decade,
            row.slope_ci_low_per_decade,
            row.slope_ci_high_per_decade,
            row.p_value,
            row.alpha,
          ].some((value) => value !== null && !Number.isFinite(value)) ||
          (row.is_significant !== null &&
            typeof row.is_significant !== "boolean"),
      )
    )
      throw new Error("Stored trend evidence does not match this selection.");
    return data;
  });
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
    throw new Error("Invalid frame format.");
  const headerSize = view.getUint32(4, true);
  if (headerSize > bytes.byteLength - 8)
    throw new Error("Incomplete header.");
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
    throw new Error("The received grid is incompatible with the globe.");
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
    throw new Error("The received frame does not match the requested area.");
  // Decode explicitly as little-endian, including on a big-endian client.
  const values = new Float32Array(count),
    coverage = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    values[i] = view.getFloat32(offset + i * 4, true);
    coverage[i] = view.getFloat32(offset + count * 4 + i * 4, true);
  }
  return { ...metadata, ...(render ? { render } : {}), values, coverage };
}
export function variableDataKey(variable: EarthVariable) {
  return JSON.stringify([
    variable.id,
    variable.sourceRevision,
    variable.product,
    variable.run,
    variable.quantity,
    variable.unit,
    variable.aggregation,
    variable.quality,
    variable.render,
  ]);
}
export function loadSeries(
  variable: EarthVariable,
  bbox: string,
  signal: AbortSignal,
): Promise<EarthSeries> {
  const key = JSON.stringify([
    "series",
    variableDataKey(variable),
    bbox,
    variable.months[0].month,
    variable.months.at(-1)!.month,
  ]);
  return earthReadCache.read(key, signal, 60_000, (requestSignal) =>
    readSeries(variable, bbox, requestSignal),
  );
}
async function readSeries(
  variable: EarthVariable,
  bbox: string,
  signal: AbortSignal,
): Promise<EarthSeries> {
  const months = variable.months;
  const calendar: string[] = [];
  const cursor = new Date(`${months[0].month}-01T00:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= months.at(-1)!.month && calendar.length < 2400) {
    calendar.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  let first: EarthSeries | undefined;
  const byMonth = new Map<string, EarthSeries["observations"][number]>();
  // The private API accepts at most 120 months per request. Larger trusted
  // histories are fetched in bounded chunks without truncating the chart.
  for (let index = 0; index < calendar.length; index += 120) {
    const chunk = calendar.slice(index, index + 120);
    if (!months.some(row => row.month >= chunk[0] && row.month <= chunk.at(-1)! && row.validSamples > 0)) continue;
    const query = new URLSearchParams({ bbox, start: chunk[0], end: chunk.at(-1)! });
    let data: EarthSeries;
    try {
      data = await queuedSeries(signal, async () =>
        (await checked(`/v1/series/${encodeURIComponent(variable.id)}?${query}`, signal)).json());
    } catch (error) {
      if ((error as {status?:number;code?:string})?.status === 404 &&
          (error as {code?:string}).code === "NO_DATA") continue;
      throw error;
    }
    if (data.simulated !== false || data.variable !== variable.id || !Array.isArray(data.observations))
      throw new Error("The series does not match the selection.");
    first ??= data;
    for (const observation of data.observations) {
      if (observation.month >= chunk[0] && observation.month <= chunk.at(-1)!)
        byMonth.set(observation.month, observation);
    }
  }
  if (!first) throw new Error("No available months in this study period.");
  return { ...first, start:calendar[0], end:calendar.at(-1)!,
    observations: calendar.map(month => byMonth.get(month) ??
      { month, value: null, coverage: null, samples: 0 }) };

}
export function aggregationLabel(aggregation?: EarthAggregation) {
  return aggregation === "sum"
    ? "sum of valid cells, without a second area weighting"
    : aggregation === "weighted_mode"
      ? "area-weighted predominant class"
      : "spatial mean weighted by latitude and valid coverage";
}
export function realUnit(unit: string) {
  return unit === "degC" ? "°C" : unit === "mm/month" ? "mm/month" : unit;
}
export function realMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", {
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
