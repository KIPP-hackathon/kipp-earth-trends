import type { ComparisonMode, EarthComparison } from "./earthApi";
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
export const trendKey = (scope: "global" | "regional", id: string) =>
  `${scope}:${id}`;
export type TrendFamilyTest = {
  bbox: string;
  regionName: string;
  requestedStart: string;
  requestedEnd: string;
  referenceStart?: string;
  referenceEnd?: string;
  rangeMin?: number | null;
  rangeMax?: number | null;
  variable: string;
  name: string;
  scope: "global" | "regional";
  unit: string;
  trend?: RuntimeTrend;
  originalTrend?: RuntimeTrend;
  adjustedP: number | null;
  product?: string;
  source?: string;
  error?: string;
};
export function adjustTrendFamily(
  entries: { variable: { id: string }; data?: EarthComparison }[],
  mode: ComparisonMode,
  includeRegional: boolean,
) {
  const scopes = includeRegional
    ? (["global", "regional"] as const)
    : (["global"] as const);
  const familySize = entries.length * scopes.length;
  const tests = entries
    .flatMap((entry) =>
      scopes.flatMap((scope) => {
        const trend = entry.data?.[scope].trends?.[mode],
          p = trend?.pValue;
        return trend?.inferenceStatus === "available" &&
          p !== null &&
          p !== undefined &&
          Number.isFinite(p) &&
          p >= 0 &&
          p <= 1
          ? [{ key: trendKey(scope, entry.variable.id), p }]
          : [];
      }),
    )
    .sort((a, b) => a.p - b.p || a.key.localeCompare(b.key));
  // Unavailable tests remain in familySize as conservative p=1; hiding a
  // curve does not change this family or cherry-pick a smaller denominator.
  let previous = 0;
  return Object.fromEntries(
    tests.map((test, index) => {
      const adjusted = Math.min(
        1,
        Math.max(previous, test.p * (familySize - index)),
      );
      previous = adjusted;
      return [test.key, adjusted];
    }),
  );
}
export const formatTrendP = (p: number | null | undefined) =>
  p === null || p === undefined
    ? "—"
    : p <= 1e-300
      ? "≤1e-300"
      : p < 0.0001
        ? p.toExponential(2)
        : p.toFixed(4);
export const formatTrendRate = (value: number) =>
  Math.abs(value) > 0 && Math.abs(value) < 0.001
    ? value.toExponential(2)
    : value.toLocaleString("en-US", { maximumFractionDigits: 4 });
