export type TrendPoint = { month: string; value: number | null };
export type RuntimeTrend = {
  method: "ols_calendar_month_hac12";
  status: "available" | "insufficient_data" | "constant_data" | "invalid_data";
  inferenceStatus:
    | "available"
    | "short_record"
    | "gaps"
    | "degenerate_variance"
    | "unavailable";
  n: number;
  firstMonth: string | null;
  lastMonth: string | null;
  missingMonths: number;
  modelParameters: 13;
  hacLags: 12;
  slopePerYear: number | null;
  slopePerDecade: number | null;
  standardErrorPerYear: number | null;
  slopeCi95PerYear: [number, number] | null;
  pValue: number | null;
  pValueFloor: number;
  line: { month: string; value: number }[];
  reason: string | null;
};
const monthIndex = (month: string) =>
  Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
// Two-sided normal Wald p = Q(1/2,z²/2), using a convergent gamma
// series/continued fraction. This avoids cancellation from 1-normalCDF(z).
export function normalTwoSidedP(z: number): number {
  if (Number.isNaN(z)) return NaN;
  const x = (z * z) / 2;
  if (x === 0) return 1;
  if (!Number.isFinite(x)) return 1e-300;
  const logFactor = -x + 0.5 * Math.log(x) - 0.5 * Math.log(Math.PI);
  let q: number;
  if (x < 1.5) {
    let term = 2,
      sum = term,
      a = 0.5;
    for (let i = 0; i < 300; i++) {
      term *= x / ++a;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    q = 1 - sum * Math.exp(logFactor);
  } else {
    let b = x + 0.5,
      c = 1e300,
      d = 1 / b,
      h = d;
    for (let i = 1; i <= 300; i++) {
      const an = -i * (i - 0.5);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-15) break;
    }
    q = Math.exp(logFactor) * h;
  }
  return Math.max(1e-300, Math.min(1, q));
}
export function fitRuntimeTrend(points: TrendPoint[]): RuntimeTrend {
  const rows = points
    .filter((row) => row.value !== null && Number.isFinite(row.value))
    .map((row) => ({
      month: row.month,
      index: monthIndex(row.month),
      value: row.value!,
    }))
    .sort((a, b) => a.index - b.index);
  const first = rows[0],
    last = rows.at(-1);
  const result: RuntimeTrend = {
    method: "ols_calendar_month_hac12",
    status: "insufficient_data",
    inferenceStatus: "unavailable",
    n: rows.length,
    firstMonth: first?.month ?? null,
    lastMonth: last?.month ?? null,
    missingMonths:
      first && last ? last.index - first.index + 1 - rows.length : 0,
    modelParameters: 13,
    hacLags: 12,
    slopePerYear: null,
    slopePerDecade: null,
    standardErrorPerYear: null,
    slopeCi95PerYear: null,
    pValue: null,
    pValueFloor: 1e-300,
    line: [],
    reason:
      "Need at least 24 valid monthly values and two values for every calendar month to separate trend from seasonality.",
  };
  if (
    rows.some((row) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)) ||
    new Set(rows.map((row) => row.index)).size !== rows.length
  ) {
    return {
      ...result,
      status: "invalid_data",
      reason: "Invalid or duplicate monthly observations.",
    };
  }
  const groups = Array.from({ length: 12 }, () => ({ n: 0, x: 0, y: 0 }));
  if (!first || !last) return result;
  for (const row of rows) groups[Number(row.month.slice(5)) - 1].n++;
  if (rows.length < 24 || groups.some((group) => group.n < 2)) return result;
  const low = Math.min(...rows.map((row) => row.value)),
    high = Math.max(...rows.map((row) => row.value));
  const scale = high - low;
  if (!Number.isFinite(scale))
    return {
      ...result,
      status: "invalid_data",
      reason: "Numerically invalid data range.",
    };
  if (scale === 0)
    return {
      ...result,
      status: "constant_data",
      reason:
        "No variation in the observed series; statistical inference is unavailable.",
    };
  let meanX = 0,
    meanY = 0;
  const values = rows.map((row, i) => {
    const x = (row.index - first.index) / 12,
      y = (row.value - low) / scale;
    const group = groups[Number(row.month.slice(5)) - 1];
    group.x += x / group.n;
    group.y += y / group.n;
    meanX += (x - meanX) / (i + 1);
    meanY += (y - meanY) / (i + 1);
    return { ...row, x, y };
  });
  let xx = 0,
    xy = 0;
  const demeaned = values.map((row) => {
    const group = groups[Number(row.month.slice(5)) - 1],
      x = row.x - group.x,
      y = row.y - group.y;
    xx += x * x;
    xy += x * y;
    return { ...row, dx: x, dy: y };
  });
  if (!(xx > 0) || !Number.isFinite(xx))
    return {
      ...result,
      status: "invalid_data",
      reason: "The seasonal trend design is singular.",
    };
  const slope = xy / xx;
  const predict = (index: number) =>
    low + scale * (meanY + slope * ((index - first.index) / 12 - meanX));
  Object.assign(result, {
    status: "available",
    slopePerYear: slope * scale,
    slopePerDecade: slope * scale * 10,
    line: [
      { month: first.month, value: predict(first.index) },
      { month: last.month, value: predict(last.index) },
    ],
    reason: null,
  });
  if (
    !Number.isFinite(result.slopePerYear) ||
    result.line.some((row) => !Number.isFinite(row.value))
  )
    return {
      ...result,
      status: "invalid_data",
      inferenceStatus: "unavailable",
      slopePerYear: null,
      slopePerDecade: null,
      line: [],
      reason: "Nonfinite fitted trend.",
    };
  if (rows.length < 60)
    return {
      ...result,
      inferenceStatus: "short_record",
      reason:
        "Descriptive fit only. Runtime p-values require at least 60 consecutive monthly observations (five years).",
    };
  if (result.missingMonths > 0)
    return {
      ...result,
      inferenceStatus: "gaps",
      reason:
        "Descriptive fit uses actual calendar dates. Internal gaps disable HAC inference; months are not imputed or compressed.",
    };
  let sse = 0,
    meat = 0;
  const scores = demeaned.map((row) => {
    const residual = row.dy - slope * row.dx;
    sse += residual * residual;
    const score = row.dx * residual;
    meat += score * score;
    return score;
  });
  if (sse <= rows.length * Number.EPSILON ** 2 * 4096)
    return {
      ...result,
      inferenceStatus: "degenerate_variance",
      reason:
        "Residual variation is numerically degenerate; no p-value is assigned.",
    };
  for (let lag = 1; lag <= 12; lag++) {
    let cross = 0;
    for (let i = lag; i < scores.length; i++)
      cross += scores[i] * scores[i - lag];
    meat += 2 * (1 - lag / 13) * cross;
  }
  const variance = ((meat / (xx * xx)) * rows.length) / (rows.length - 13);
  if (!(variance > 0) || !Number.isFinite(variance))
    return {
      ...result,
      inferenceStatus: "degenerate_variance",
      reason: "Robust slope variance is unavailable.",
    };
  const se = Math.sqrt(variance),
    p = normalTwoSidedP(slope / se),
    rawSE = se * scale;
  return {
    ...result,
    inferenceStatus: "available",
    standardErrorPerYear: rawSE,
    pValue: p,
    slopeCi95PerYear: [
      (slope - 1.959963984540054 * se) * scale,
      (slope + 1.959963984540054 * se) * scale,
    ],
  };
}
