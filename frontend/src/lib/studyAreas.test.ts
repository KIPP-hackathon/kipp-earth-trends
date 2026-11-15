import { describe, expect, it } from "vitest";
import type { EarthEvent, EarthRegion, EarthVariable } from "./earthApi";
import type { CountrySelection } from "./countries";
import { buildStudyAreas, eventStudySelection } from "./studyAreas";

const brazil: CountrySelection = {
  countryCode: "076",
  name: "Brazil",
  selectable: true,
  flag: "/flags/br.svg",
  searchTerms: "Brasil BR",
  geometry: { type: "Polygon", coordinates: [] },
  region: {
    id: "custom-country-076",
    name: "Brazil",
    bbox: "-74,-34,-34,6",
    longitude: -54,
    latitude: -14,
  },
};
const drawn: EarthRegion = {
  id: "custom-drawn-1",
  name: "My river window",
  bbox: "10,-2,20,3",
  longitude: 15,
  latitude: 0.5,
};
const temperature: EarthVariable = {
  id: "temperature",
  name: "Air temperature",
  quantity: "temperature",
  unit: "degC",
  product: "MERRA-2",
  available: true,
  months: ["2024-01", "2024-03", "2024-06"].map((month) => ({
    month,
    samples: 1,
    validSamples: 1,
  })),
};
const event: EarthEvent = {
  id: "elnino-2024",
  title: "El Niño 2023–2024",
  category: "El Niño",
  location: "Equatorial Pacific",
  window: ["2024-01", "2024-05"],
  region: "pacifico",
  variable: "temperature",
  description: "Historical episode",
  limitation:
    "Air temperature is not sea-surface temperature or an ENSO diagnosis.",
  source: { name: "NASA", url: "https://science.nasa.gov/" },
  bbox: "-170,-5,-120,5",
  longitude: -145,
  latitude: 0,
  available: true,
  months: ["2024-01", "2024-03"],
  unavailableReason: null,
};

describe("unified study areas", () => {
  it("includes ecosystems alongside selectable countries without substituting country geometry", () => {
    const areas = buildStudyAreas([brazil], [], brazil.region);
    expect(
      areas.find((area) => area.id === "custom-catalog-congo"),
    ).toMatchObject({
      name: "Congo Basin",
      region: { bbox: "9,-6,30,5" },
      detail: "Ecosystem · study rectangle",
    });
    expect(areas.find((area) => area.id === brazil.region.id)).toMatchObject({
      name: "Brazil",
      icon: "/flags/br.svg",
      group: "country",
      region: { bbox: "-74,-34,-34,6" },
    });
  });
  it("keeps the exact current drawn region visible and selectable", () => {
    const option = buildStudyAreas([], [], drawn).find(
      (area) => area.id === drawn.id,
    );
    expect(option).toMatchObject({
      name: "My river window",
      region: { bbox: "10,-2,20,3" },
      detail: "Custom area · rectangle",
    });
  });
  it("deduplicates configured ecosystem IDs and preserves the active geometry", () => {
    const current = {
      ...drawn,
      id: "custom-catalog-congo",
      name: "Edited Congo window",
    };
    const areas = buildStudyAreas([], [current], current);
    expect(areas.filter((area) => area.id === current.id)).toHaveLength(1);
    expect(areas.find((area) => area.id === current.id)?.region.bbox).toBe(
      "10,-2,20,3",
    );
  });
  it("does not expose disabled countries as new choices or mutate country input", () => {
    const disabled = {
      ...brazil,
      name: "Excluded territory",
      selectable: false,
      region: { ...brazil.region, id: "excluded" },
    };
    const countries = [brazil, disabled];
    expect(
      buildStudyAreas(countries, [], drawn).some(
        (area) => area.id === "excluded",
      ),
    ).toBe(false);
    expect(countries.map((country) => country.name)).toEqual([
      "Brazil",
      "Excluded territory",
    ]);
  });
  it("offers a global reset and all ten ecosystems without requiring selected variables", () => {
    const areas = buildStudyAreas([], [], drawn);
    expect(
      areas.filter((area) => area.detail === "Ecosystem · study rectangle"),
    ).toHaveLength(10);
    expect(areas.find((area) => area.id === "custom-global")?.region.bbox).toBe(
      "-180,-90,180,90",
    );
  });
  it("keeps El Niño in Events while its geographical window remains a place", () => {
    const areas = buildStudyAreas(
      [],
      [{ ...drawn, id: "pacifico", name: "Equatorial Pacific" }],
      drawn,
      [event],
      [temperature],
    );
    expect(
      areas.find((option) => option.id === "event:elnino-2024"),
    ).toMatchObject({
      group: "event",
      event: { title: "El Niño 2023–2024" },
      region: { name: "Equatorial Pacific" },
    });
    expect(areas.find((option) => option.id === "pacifico")?.group).toBe(
      "place",
    );
    expect(
      areas
        .filter((option) => option.group === "place")
        .some((option) => option.name.includes("El Niño")),
    ).toBe(false);
  });
  it("disables events without actual catalog overlap instead of substituting another period", () => {
    const noOverlap = {
      ...event,
      window: ["2010-01", "2010-05"] as [string, string],
    };
    expect(
      buildStudyAreas([], [], drawn, [noOverlap], [temperature]).find(
        (option) => option.event,
      )?.disabled,
    ).toBe(true);
    expect(eventStudySelection(noOverlap, [temperature])).toBeNull();
  });
  it("builds the exact valid historical window without including later months or filling gaps", () => {
    expect(eventStudySelection(event, [temperature])).toMatchObject({
      variable: "temperature",
      start: "2024-01",
      end: "2024-03",
      month: "2024-03",
    });
  });
  it("rejects unavailable events, missing variables and invalid study rectangles", () => {
    expect(
      eventStudySelection({ ...event, available: false }, [temperature]),
    ).toBeNull();
    expect(eventStudySelection(event, [])).toBeNull();
    expect(
      eventStudySelection({ ...event, bbox: "-190,20,20,-5" }, [temperature]),
    ).toBeNull();
  });
});
