import { describe, expect, it } from "vitest";
import { chartDomain } from "./chartDomain";
import type { EarthComparison } from "./earthApi";
const data = {
  regional: {
    observations: [{ value: 10, standardized: -1 }],
    trends: { raw: { line: [{ value: 15 }] } },
  },
  global: {
    observations: [
      { value: 100, standardized: 8 },
      { value: null, standardized: null },
    ],
    trends: { raw: { line: [{ value: 120 }] } },
  },
} as unknown as EarthComparison;
describe("shared chart domain", () => {
  it("includes both scopes and trend endpoints without clipping global values", () => {
    expect(chartDomain([data], "raw", ["global", "regional"])).toEqual([
      3.4000000000000004, 126.6,
    ]);
    expect(chartDomain([data], "raw", ["regional"])).toEqual([9.7, 15.3]);
  });
  it("uses both scopes for deviation, a fixed minmax scale and safe empty limits", () => {
    expect(chartDomain([data], "standardized", ["global", "regional"])).toEqual(
      [-8.8, 8.8],
    );
    expect(chartDomain([data], "minmax", ["global"])).toEqual([0, 100]);
    expect(chartDomain([], "raw", ["global"])).toEqual([0, 1]);
    const [low, high] = chartDomain(
      [
        {
          global: { observations: [{ value: 5 }, { value: Number.NaN }] },
        } as unknown as EarthComparison,
      ],
      "raw",
      ["global"],
    );
    expect(low).toBeLessThan(5);
    expect(high).toBeGreaterThan(5);
  });
});
