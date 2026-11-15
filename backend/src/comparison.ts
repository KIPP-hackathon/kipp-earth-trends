import { fitRuntimeTrend } from "./runtime-trend.ts";
// Source values and comparison transformations are retained alongside inference.
export const comparisonReference = {
  start: "2001-01",
  end: "2020-12",
  minimumYearsPerMonth: 10,
  method:
    "calendar-month sample mean and sample standard deviation within each spatial scope",
} as const;
export type MonthlyValue = {
  month: string;
  value: number | null;
  coverage: number | null;
  samples: number | null;
};
export function comparisonCalendar(start: string, end: string): string[] {
  const index = (month: string) =>
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
  return Array.from(
    { length: Math.max(0, index(end) - index(start) + 1) },
    (_, i) => {
      const n = index(start) + i;
      return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
    },
  );
}
export function transformComparison(
  rows: MonthlyValue[],
  start: string,
  end: string,
) {
  const usable = (row: MonthlyValue) =>
    row.value !== null &&
    Number.isFinite(row.value) &&
    row.coverage !== null &&
    row.coverage > 0 &&
    (row.samples ?? 0) > 0;
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const reference = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const values = rows
      .filter(
        (row) =>
          row.month >= comparisonReference.start &&
          row.month <= comparisonReference.end &&
          row.month.slice(5) === month &&
          usable(row),
      )
      .map((row) => row.value!);
    let mean = 0,
      m2 = 0;
    values.forEach((value, index) => {
      const delta = value - mean;
      mean += delta / (index + 1);
      m2 += delta * (value - mean);
    });
    const standardDeviation =
      values.length > 1
        ? Math.sqrt(Math.max(0, m2 / (values.length - 1)))
        : null;
    return {
      month: i + 1,
      count: values.length,
      mean: values.length ? mean : null,
      standardDeviation,
    };
  });
  const displayed = comparisonCalendar(start, end).map(
    (month) =>
      byMonth.get(month) ?? { month, value: null, coverage: null, samples: 0 },
  );
  const finite = displayed.filter(usable).map((row) => row.value!);
  const min = finite.length ? Math.min(...finite) : null,
    max = finite.length ? Math.max(...finite) : null;
  const constant =
    min !== null &&
    max !== null &&
    max - min <=
      Math.max(Math.abs(min), Math.abs(max), Number.MIN_VALUE) * 1e-12;
  const observations = displayed.map((row) => {
    const stats = reference[Number(row.month.slice(5)) - 1];
    const status = !usable(row)
      ? "no_data"
      : stats.count < comparisonReference.minimumYearsPerMonth
        ? "insufficient_reference"
        : stats.standardDeviation === null ||
            stats.standardDeviation <=
              Math.max(Math.abs(stats.mean!), Number.MIN_VALUE) * 1e-12
          ? "constant_reference"
          : "available";
    const standardized =
      status === "available"
        ? (row.value! - stats.mean!) / stats.standardDeviation!
        : null;
    return {
      ...row,
      value: usable(row) ? row.value : null,
      standardized: Number.isFinite(standardized) ? standardized : null,
      standardizedStatus: status,
      minmax:
        usable(row) && min !== null && max !== null
          ? constant
            ? 50
            : Math.max(
                0,
                Math.min(100, (100 * (row.value! - min)) / (max - min)),
              )
          : null,
    };
  });
  return {
    reference,
    range: { min, max, constant },
    observations,
    trends: {
      raw: fitRuntimeTrend(
        observations.map((row) => ({ month: row.month, value: row.value })),
      ),
      standardized: fitRuntimeTrend(
        observations.map((row) => ({
          month: row.month,
          value: row.standardized,
        })),
      ),
      minmax: fitRuntimeTrend(
        observations.map((row) => ({ month: row.month, value: row.minmax })),
      ),
    },
  };
}
