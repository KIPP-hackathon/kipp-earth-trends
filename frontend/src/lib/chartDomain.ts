import type { ComparisonMode, EarthComparison } from "./earthApi";

/** Common value axis, including every visible scope and fitted endpoint. */
export function chartDomain(
  data: (EarthComparison | undefined)[],
  mode: ComparisonMode,
  scopes: readonly ("global" | "regional")[],
): [number, number] {
  if (mode === "minmax") return [0, 100];
  const values = data
    .flatMap((entry) =>
      scopes.flatMap((scope) => [
        ...(entry?.[scope]?.observations ?? []).map((row) =>
          mode === "raw" ? row.value : row.standardized,
        ),
        ...(entry?.[scope]?.trends?.[mode]?.line ?? []).map((row) => row.value),
      ]),
    )
    .filter(
      (value): value is number =>
        value !== null && value !== undefined && Number.isFinite(value),
    );
  if (mode === "standardized") {
    let max = 2;
    for (const value of values) max = Math.max(max, Math.abs(value));
    return [-max * 1.1, max * 1.1];
  }
  if (!values.length) return [0, 1];
  let min = values[0],
    max = values[0];
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const padding =
    max > min ? (max - min) * 0.06 : Math.max(Math.abs(min) * 0.05, 1e-6);
  return [min - padding, max + padding];
}
