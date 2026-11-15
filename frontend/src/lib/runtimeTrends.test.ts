import { describe, expect, it } from "vitest";
import type { EarthComparison } from "./earthApi";
import { adjustTrendFamily } from "./runtimeTrends";

describe("global and regional comparison family", () => {
  it("adjusts both scopes together and retains unavailable tests in the denominator", () => {
    const data = (globalP: number, regionalP: number | null) => ({
      global: { trends: { raw: { inferenceStatus: "available", pValue: globalP } } },
      regional: { trends: { raw: { inferenceStatus: "available", pValue: regionalP } } },
    }) as unknown as EarthComparison;
    const adjusted = adjustTrendFamily([
      { variable: { id: "temperature" }, data: data(0.01, 0.04) },
      { variable: { id: "pressure" }, data: data(0.02, null) },
    ], "raw", ["global", "regional"]);
    // Four selected tests: Holm multipliers are 4, 3, 2 for the three valid p-values.
    expect(adjusted["global:temperature"]).toBeCloseTo(0.04);
    expect(adjusted["global:pressure"]).toBeCloseTo(0.06);
    expect(adjusted["regional:temperature"]).toBeCloseTo(0.08);
    expect(adjusted).not.toHaveProperty("regional:pressure");
  });
});
