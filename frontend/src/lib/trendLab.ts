import type { EarthSeries } from "./earthApi";

export type TrendPoint = {
  month: string;
  x: number;
  value: number;
  coverage: number | null;
};

export type MonthlyTrend = {
  points: TrendPoint[];
  slope: number;
  interval: [number, number] | null;
  significant: boolean | null;
  n: number;
  rSquared: number | null;
  startMonth: number;
  endMonth: number;
  missingMonths: number;
  predict: (x: number) => number;
  confidenceAt: (x: number) => [number, number] | null;
};

/** Absolute calendar-month coordinate; no Date parsing or timezone conversion. */
export function monthIndex(month: string): number | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
}

export function monthFromIndex(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0 || index > 119999) return "";
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function trendUnit(unit: string): string {
  if (unit === "degC") return "°C";
  if (unit === "mm/mês") return "mm/month";
  return unit;
}

export function formatTrendValue(value: number, signed = false): string {
  if (!Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 5,
    notation:
      magnitude > 0 && (magnitude < 0.001 || magnitude >= 1e7)
        ? "scientific"
        : "standard",
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value === 0 ? 0 : value);
}

// Lanczos log-gamma (g=7), used only with positive arguments >= 1/2.
function logGamma(z: number): number {
  const coefficients = [
    0.9999999999998099, 676.5203681218851, -1259.1392167224028,
    771.3234287776531, -176.6150291621406, 12.507343278686905,
    -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  const shifted = z - 1;
  let sum = coefficients[0];
  for (let i = 1; i < coefficients.length; i++)
    sum += coefficients[i] / (shifted + i);
  const t = shifted + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(t) -
    t +
    Math.log(sum)
  );
}

/** Modified Lentz continued fraction; NaN means convergence was not established. */
function betaFraction(a: number, b: number, x: number): number {
  const minimum = 1e-300;
  const safe = (v: number) => (Math.abs(v) < minimum ? minimum : v);
  let c = 1;
  let d = 1 / safe(1 - ((a + b) * x) / (a + 1));
  let result = d;
  for (let m = 1; m <= 400; m++) {
    const twice = 2 * m;
    let term = (m * (b - m) * x) / ((a - 1 + twice) * (a + twice));
    d = 1 / safe(1 + term * d);
    c = safe(1 + term / c);
    result *= d * c;
    term = (-(a + m) * (a + b + m) * x) / ((a + twice) * (a + 1 + twice));
    d = 1 / safe(1 + term * d);
    c = safe(1 + term / c);
    const change = d * c;
    result *= change;
    if (Math.abs(change - 1) <= 1e-14) return result;
  }
  return Number.NaN;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (factor * betaFraction(a, b, x)) / a
    : 1 - (factor * betaFraction(b, a, 1 - x)) / b;
}

/** Two-sided 95% Student-t critical value with the actual n-2 degrees of freedom. */
function studentCritical(df: number): number | null {
  const tail = (t: number) =>
    regularizedBeta(df / (df + t * t), df / 2, 0.5) / 2;
  let low = 0;
  let high = 1;
  while (tail(high) > 0.025 && high < 128) high *= 2;
  for (let i = 0; i < 80; i++) {
    const middle = (low + high) / 2;
    const probability = tail(middle);
    if (!Number.isFinite(probability)) return null;
    if (probability > 0.025) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/**
 * Unweighted OLS of raw monthly regional observations. Explicitly absent
 * coverage/samples are excluded; null coverage is unknown, not zero.
 * Duplicate monthly rows retain the first valid observation, never extra weight.
 * Confidence intervals concern the fitted mean, not future individual values.
 */
export function fitMonthlyTrend(
  observations: EarthSeries["observations"],
  start: string,
  end: string,
): MonthlyTrend | null {
  const first = monthIndex(start);
  const last = monthIndex(end);
  if (first === null || last === null || first > last) return null;
  const months = new Map<number, TrendPoint>();
  for (const observation of observations) {
    const x = monthIndex(observation.month);
    if (
      x === null ||
      x < first ||
      x > last ||
      months.has(x) ||
      observation.value === null ||
      !Number.isFinite(observation.value) ||
      !Number.isFinite(observation.samples) ||
      observation.samples <= 0 ||
      (observation.coverage !== null &&
        (!Number.isFinite(observation.coverage) || observation.coverage <= 0))
    )
      continue;
    months.set(x, {
      month: observation.month,
      x,
      value: observation.value,
      coverage: observation.coverage,
    });
  }
  const points = [...months.values()].sort((a, b) => a.x - b.x);
  const n = points.length;
  if (n < 3) return null;

  // Center before scaling the response. This preserves small source-unit trends
  // and avoids underflow when summing squared values with very small units.
  const originY = points[0].value;
  const scaleY = points.reduce(
    (maximum, point) => Math.max(maximum, Math.abs(point.value - originY)),
    0,
  );
  if (!Number.isFinite(scaleY)) return null;
  const normalized = points.map((point) =>
    scaleY === 0 ? 0 : (point.value - originY) / scaleY,
  );
  // Subtract a calendar origin before averaging: subtracting a fractional
  // absolute month mean from large indices would create artificial residuals.
  const originX = points[0].x;
  const relativeX = points.map((point) => point.x - originX);
  const meanX = relativeX.reduce((sum, x) => sum + x, 0) / n;
  const centeredX = relativeX.map((x) => x - meanX);
  const meanY = normalized.reduce((sum, value) => sum + value, 0) / n;
  const ssX = centeredX.reduce((sum, x) => sum + x ** 2, 0);
  const cross = centeredX.reduce(
    (sum, x, i) => sum + x * (normalized[i] - meanY),
    0,
  );
  const normalizedSlope = cross / ssX;
  const slope = normalizedSlope * scaleY;
  const total = normalized.reduce(
    (sum, value) => sum + (value - meanY) ** 2,
    0,
  );
  let residual = centeredX.reduce(
    (sum, x, i) => sum + (normalized[i] - meanY - normalizedSlope * x) ** 2,
    0,
  );
  // Only arithmetic roundoff relative to variation counts as a perfect line;
  // this is not an absolute cutoff on small residuals or small source units.
  if (residual <= 64 * Number.EPSILON ** 2 * total) residual = 0;
  const variance = residual / (n - 2);
  const critical = variance > 0 ? studentCritical(n - 2) : null;
  const margin =
    critical === null ? null : critical * Math.sqrt(variance / ssX) * scaleY;
  const interval: [number, number] | null =
    margin === null ? null : [slope - margin, slope + margin];
  const predict = (x: number) =>
    originY + scaleY * (meanY + normalizedSlope * (x - originX - meanX));
  const confidenceAt = (x: number): [number, number] | null => {
    if (critical === null || !Number.isFinite(x)) return null;
    const uncertainty =
      critical *
      Math.sqrt(variance * (1 / n + (x - originX - meanX) ** 2 / ssX)) *
      scaleY;
    const mean = predict(x);
    return Number.isFinite(mean) && Number.isFinite(uncertainty)
      ? [mean - uncertainty, mean + uncertainty]
      : null;
  };
  return {
    points,
    slope,
    interval,
    significant: interval === null ? null : interval[0] > 0 || interval[1] < 0,
    n,
    rSquared:
      total === 0 ? null : Math.max(0, Math.min(1, 1 - residual / total)),
    startMonth: points[0].x,
    endMonth: points[n - 1].x,
    missingMonths: last - first + 1 - n,
    predict,
    confidenceAt,
  };
}
