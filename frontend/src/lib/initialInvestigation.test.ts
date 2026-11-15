import { describe, expect, it } from "vitest";
import { initialInvestigation } from "./initialInvestigation";
import type { EarthVariable, EarthRegion } from "./earthApi";
const region = {
  id: "brazil",
  name: "Brazil",
  bbox: "-74,-34,-34,6",
  longitude: -54,
  latitude: -14,
} satisfies EarthRegion;
const variable = (id: string, available = true): EarthVariable =>
  ({
    id,
    available,
    months: [
      { month: "2024-03", validSamples: 1, samples: 1 },
      { month: "2024-01", validSamples: 2, samples: 2 },
      { month: "2024-04", validSamples: 0, samples: 2 },
    ],
  }) as EarthVariable;
describe("initial investigation", () => {
  it("preselects real temperature and only its valid chronological coverage", () => {
    expect(
      initialInvestigation(
        [variable("other"), variable("temperature")],
        region,
      ),
    ).toMatchObject({
      variable: "temperature",
      region: "brazil",
      start: "2024-01",
      end: "2024-03",
      month: "2024-03",
      comparisonMode: "raw",
      layers: [{ variable: "temperature", visible: true, opacity: 1 }],
    });
  });
  it("falls back to an available source without inventing missing observations", () => {
    expect(
      initialInvestigation(
        [variable("temperature", false), variable("other")],
        region,
      )?.variable,
    ).toBe("other");
    expect(
      initialInvestigation(
        [{ ...variable("temperature"), months: [] }],
        region,
      ),
    ).toBeUndefined();
    expect(initialInvestigation([], region)).toBeUndefined();
  });
});
