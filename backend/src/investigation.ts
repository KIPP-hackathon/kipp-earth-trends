import { ApiError } from "./core.ts";
import { fitRuntimeTrend, normalTwoSidedP } from "./runtime-trend.ts";

export type InvestigationRequest = {
  x: string;
  y?: string;
  bbox: string;
  start: string;
  end: string;
  baselineStart: string;
  baselineEnd: string;
  method: "relationships-v1";
};
export type Observation = {
  month: string;
  value: number | null;
  coverage: number | null;
  samples: number | null;
};
export type InvestigationSource = {
  variable: string;
  name: string;
  unit: string;
  product: string;
  source: string;
  sourceLayer: string;
  sourceTable: string;
  sourceUC: string;
  aggregation: string;
  method: string;
  observations: Observation[];
};
export const monthNumber = (month: string) =>
  Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
export const monthText = (index: number) =>
  `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const mean = (values: number[]) => sum(values) / values.length;
const dot = (a: number[], b: number[]) => sum(a.map((v, i) => v * b[i]));

export function validateInvestigation(request: InvestigationRequest) {
  if (
    request.method !== "relationships-v1" ||
    !/^[a-z0-9_]{1,60}$/.test(request.x) ||
    (request.y !== undefined &&
      (!/^[a-z0-9_]{1,60}$/.test(request.y) || request.x === request.y))
  )
    throw new ApiError(
      400,
      "INVALID_INVESTIGATION",
      "Select one or two distinct continuous indicators.",
    );
  const dates = [
    request.start,
    request.end,
    request.baselineStart,
    request.baselineEnd,
  ];
  if (
    dates.some(
      (d) =>
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(d) || d < "1900-01" || d > "2100-12",
    ) ||
    request.start > request.end ||
    request.baselineStart > request.baselineEnd ||
    Math.max(...dates.map(monthNumber)) - Math.min(...dates.map(monthNumber)) >=
      600
  )
    throw new ApiError(
      400,
      "INVALID_PERIOD",
      "Choose ordered study/reference periods spanning at most 600 calendar months together.",
    );
}

export function cleanObservations(rows: Observation[]): Observation[] {
  const seen = new Set<string>();
  return rows
    .map((row) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) || seen.has(row.month))
        throw new ApiError(
          502,
          "INVALID_SERIES",
          "The source returned invalid or duplicate monthly observations.",
        );
      seen.add(row.month);
      const valid =
        row.value !== null &&
        Number.isFinite(row.value) &&
        row.samples !== null &&
        row.samples > 0 &&
        (row.coverage === null ||
          (Number.isFinite(row.coverage) &&
            row.coverage > 0 &&
            row.coverage <= 1));
      return { ...row, value: valid ? row.value : null };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function anomalies(rows: Observation[], start: string, end: string) {
  const reference = Array.from({ length: 12 }, (_, month) => {
    const values = rows
      .filter(
        (r) =>
          r.month >= start &&
          r.month <= end &&
          monthNumber(r.month) % 12 === month &&
          r.value !== null,
      )
      .map((r) => r.value!);
    const average = values.length ? mean(values) : null;
    const sd =
      values.length > 1
        ? Math.sqrt(
            sum(values.map((v) => (v - average!) ** 2)) / (values.length - 1),
          )
        : null;
    return {
      month: month + 1,
      count: values.length,
      mean: average,
      standardDeviation: sd,
    };
  });
  return {
    reference,
    observations: rows.map((row) => {
      const ref = reference[monthNumber(row.month) % 12];
      const anomaly =
        row.value !== null && ref.count >= 10 ? row.value - ref.mean! : null;
      const standardized =
        anomaly !== null &&
        ref.standardDeviation !== null &&
        ref.standardDeviation > 0
          ? anomaly / ref.standardDeviation
          : null;
      return {
        ...row,
        anomaly,
        standardized,
        anomalyStatus:
          row.value === null
            ? "no_data"
            : ref.count < 10
              ? "insufficient_reference"
              : ref.standardDeviation === 0
                ? "constant_reference"
                : "available",
      };
    }),
  };
}

// Projection onto month indicators and elapsed calendar time (FWL).
function residuals(times: number[], values: number[]) {
  const groups = Array.from({ length: 12 }, () => ({
    t: [] as number[],
    v: [] as number[],
  }));
  times.forEach((t, i) => {
    groups[t % 12].t.push(t);
    groups[t % 12].v.push(values[i]);
  });
  const averages = groups.map((g) => ({ t: mean(g.t), v: mean(g.v) }));
  const tx = times.map((t) => t - averages[t % 12].t),
    vy = values.map((v, i) => v - averages[times[i] % 12].v);
  const slope = dot(tx, vy) / dot(tx, tx);
  return vy.map((v, i) => v - slope * tx[i]);
}
function correlation(a: number[], b: number[]) {
  if (a.length < 3) return null;
  const ac = a.map((v) => v - mean(a)),
    bc = b.map((v) => v - mean(b));
  const denominator = Math.sqrt(dot(ac, ac) * dot(bc, bc));
  return denominator > 1e-24
    ? Math.max(-1, Math.min(1, dot(ac, bc) / denominator))
    : null;
}
export type Relationship = {
  lag: number;
  n: number;
  rawR: number | null;
  adjustedR: number | null;
  beta: number | null;
  betaCi95: [number, number] | null;
  standardError: number | null;
  pValue: number | null;
  inferenceStatus: string;
  reason: string | null;
  pairs: {
    xMonth: string;
    yMonth: string;
    x: number;
    y: number;
    adjustedX: number | null;
    adjustedY: number | null;
  }[];
};
export function relationships(
  x: Observation[],
  y: Observation[],
): Relationship[] {
  const a = new Map(
    x
      .filter((r) => r.value !== null)
      .map((r) => [monthNumber(r.month), r.value!]),
  );
  const b = new Map(
    y
      .filter((r) => r.value !== null)
      .map((r) => [monthNumber(r.month), r.value!]),
  );
  const times = [...a.keys()]
    .filter((t) =>
      Array.from({ length: 7 }, (_, lag) => b.has(t + lag)).every(Boolean),
    )
    .sort((a, b) => a - b);
  return Array.from({ length: 7 }, (_, lag) => {
    const xs = times.map((t) => a.get(t)!),
      ys = times.map((t) => b.get(t + lag)!);
    const scaleX = Math.max(...xs) - Math.min(...xs),
      scaleY = Math.max(...ys) - Math.min(...ys);
    const ux = xs.map((v) => (v - xs[0]) / scaleX),
      uy = ys.map((v) => (v - ys[0]) / scaleY);
    const result: Relationship = {
      lag,
      n: times.length,
      rawR: scaleX > 0 && scaleY > 0 ? correlation(ux, uy) : null,
      adjustedR: null,
      beta: null,
      betaCi95: null,
      standardError: null,
      pValue: null,
      inferenceStatus: "insufficient_data",
      reason:
        "Need 24 common pairs and at least two of every calendar month for the seasonal relationship.",
      pairs: times.map((t, i) => ({
        xMonth: monthText(t),
        yMonth: monthText(t + lag),
        x: xs[i],
        y: ys[i],
        adjustedX: null,
        adjustedY: null,
      })),
    };
    if (
      times.length < 24 ||
      Array.from(
        { length: 12 },
        (_, m) => times.filter((t) => t % 12 === m).length < 2,
      ).some(Boolean)
    )
      return result;
    if (!(scaleX > 0 && scaleY > 0))
      return {
        ...result,
        inferenceStatus: "constant_data",
        reason: "A selected variable has no variation.",
      };
    const xr = residuals(times, ux),
      yr = residuals(times, uy),
      xx = dot(xr, xr),
      yy = dot(yr, yr);
    if (xx < 1e-20 || yy < 1e-20)
      return {
        ...result,
        inferenceStatus: "degenerate_variance",
        reason:
          "No independent variation remains after seasonal and time adjustment.",
      };
    const beta = dot(xr, yr) / xx;
    result.adjustedR = correlation(xr, yr);
    result.beta = (beta * scaleY) / scaleX;
    result.pairs.forEach((p, i) => {
      p.adjustedX = xr[i] * scaleX;
      p.adjustedY = yr[i] * scaleY;
    });
    if (times.length < 60)
      return {
        ...result,
        inferenceStatus: "short_record",
        reason:
          "Inference requires at least 60 consecutive common monthly pairs.",
      };
    if (times.at(-1)! - times[0] + 1 !== times.length)
      return {
        ...result,
        inferenceStatus: "gaps",
        reason:
          "Common monthly support has gaps. Correlation is descriptive; inference is unavailable.",
      };
    const errors = yr.map((v, i) => v - beta * xr[i]);
    if (dot(errors, errors) < 1e-20)
      return {
        ...result,
        inferenceStatus: "degenerate_variance",
        reason: "Residual variance is degenerate; inference is unavailable.",
      };
    // The beta row of (X'X)^-1 X' is residualized X / (residualized X'X).
    // Scores use full-model residuals, not residuals of a raw two-variable fit.
    const scores = xr.map((v, i) => v * errors[i]);
    let meat = dot(scores, scores);
    for (let k = 1; k <= 12; k++)
      meat +=
        2 * (1 - k / 13) * sum(scores.slice(k).map((s, i) => s * scores[i]));
    const variance = ((meat / (xx * xx)) * times.length) / (times.length - 14);
    if (!(variance > 0 && Number.isFinite(variance)))
      return {
        ...result,
        inferenceStatus: "degenerate_variance",
        reason: "Robust variance is unavailable.",
      };
    const se = (Math.sqrt(variance) * scaleY) / scaleX;
    return {
      ...result,
      standardError: se,
      betaCi95: [
        result.beta! - 1.959963984540054 * se,
        result.beta! + 1.959963984540054 * se,
      ] as [number, number],
      pValue: normalTwoSidedP(Math.abs(result.beta! / se)),
      inferenceStatus: "available",
      reason: null,
    };
  });
}
export function holm(tests: { id: string; pValue: number | null }[]) {
  let previous = 0;
  const ordered = tests
    .map((t) => ({ ...t, p: t.pValue ?? 1 }))
    .sort((a, b) => a.p - b.p);
  const adjusted = new Map(
    ordered.map((t, i) => {
      previous = Math.min(1, Math.max(previous, t.p * (tests.length - i)));
      return [t.id, t.pValue === null ? null : previous] as const;
    }),
  );
  return tests.map((t) => ({ ...t, adjustedP: adjusted.get(t.id) ?? null }));
}
export function buildInvestigation(
  request: InvestigationRequest,
  sources: InvestigationSource[],
) {
  validateInvestigation(request);
  if (
    sources.map((s) => s.variable).join(",") !==
    [request.x, request.y].filter(Boolean).join(",")
  )
    throw new ApiError(
      502,
      "INVALID_SERIES",
      "Source indicators do not match the investigation.",
    );
  const series = sources.map((source) => {
    const cleaned = cleanObservations(source.observations),
      all = anomalies(cleaned, request.baselineStart, request.baselineEnd);
    const byMonth = new Map(all.observations.map((r) => [r.month, r]));
    const observations = Array.from(
      { length: monthNumber(request.end) - monthNumber(request.start) + 1 },
      (_, i) => {
        const month = monthText(monthNumber(request.start) + i);
        return (
          byMonth.get(month) ?? {
            month,
            value: null,
            coverage: null,
            samples: 0,
            anomaly: null,
            standardized: null,
            anomalyStatus: "no_data",
          }
        );
      },
    );
    return {
      ...source,
      observations,
      reference: all.reference,
      referenceObservations: cleaned.filter(
        (r) =>
          r.month >= request.baselineStart && r.month <= request.baselineEnd,
      ),
      trend: fitRuntimeTrend(observations),
    };
  });
  const lags =
    series.length === 2
      ? relationships(series[0].observations, series[1].observations)
      : [];
  const family = holm([
    ...series.map((s) => ({
      id: `trend:${s.variable}`,
      pValue: s.trend.pValue,
    })),
    ...lags.map((r) => ({ id: `lag:${r.lag}`, pValue: r.pValue })),
  ]);
  return {
    version: 1 as const,
    method: "relationships-v1" as const,
    simulated: false as const,
    request: { ...request },
    generatedAt: new Date().toISOString(),
    series,
    lags,
    family,
    analysis: {
      lags: [0, 1, 2, 3, 4, 5, 6],
      referenceMinimumYears: 10,
      minimumFitMonths: 24,
      minimumInferenceMonths: 60,
      relationship:
        "Y(t+lag) ~ X(t) + time + 11 month indicators; HAC12 Bartlett, n/(n-14), normal Wald beta test",
      support:
        "Same complete-case predictor months for every lag; both dates within the selected period.",
      multipleTesting:
        "Holm over all applied trend and lag tests, including unavailable tests as p=1 internally.",
      limitations: [
        "Exploratory associations are not causality or forecast skill. Repeated choices of region, dates or variables are not corrected.",
        "Fixed seasonal effects, linear time and short-memory dependence are assumptions. Native source and baseline-estimation uncertainty are not propagated.",
        "The selected study reference is explicitly reported; the default 2003–2020 interval is not a standard 30-year climate normal. GRACE native anomalies are distinct from seasonal departures.",
      ],
    },
  };
}
export type Investigation = ReturnType<typeof buildInvestigation>;
