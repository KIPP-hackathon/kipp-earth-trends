import { describe, expect, it } from "vitest";
import type { EarthVariable } from "./earthApi";
import {
  catalogKind,
  buildCatalogIndex,
  filterCatalog,
  planCatalogInvestigation,
} from "./variableCatalog";

const variable = (
  id: string,
  months = ["2020-01", "2020-02", "2020-03"],
  patch: Partial<EarthVariable> = {},
): EarthVariable => ({
  id,
  name: id,
  quantity: id,
  unit: "mm",
  product: "GPM IMERG Final + Late V07",
  available: true,
  months: months.map((month) => ({ month, samples: 10, validSamples: 10 })),
  ...patch,
});

describe("catalog investigation handoff", () => {
  it("uses only shared valid months, deduplicates selection and does not mutate source months", () => {
    const a = variable("rainfall", ["2020-03", "2020-01", "2020-02"]);
    const b = variable("temperature", ["2020-02", "2020-03", "2020-04"]);
    b.months[1].validSamples = 0;
    const result = planCatalogInvestigation(
      [a, b],
      ["rainfall", "temperature", "rainfall"],
    );
    expect(result).toMatchObject({
      variables: ["rainfall", "temperature"],
      start: "2020-02",
      end: "2020-02",
      commonMonths: 1,
    });
    expect(a.months[0].month).toBe("2020-03");
  });

  it("rejects a selection rather than silently dropping unavailable or unknown variables", () => {
    const entries = [
      variable("rainfall"),
      variable("temperature", [], { available: false }),
    ];
    expect(
      planCatalogInvestigation(entries, ["rainfall", "temperature"]),
    ).toBeNull();
    expect(
      planCatalogInvestigation(entries, ["rainfall", "invented"]),
    ).toBeNull();
    expect(planCatalogInvestigation(entries, [])).toBeNull();
  });

  it("does not invent overlap or accept malformed month labels", () => {
    expect(
      planCatalogInvestigation(
        [
          variable("rainfall", ["2020-01"]),
          variable("temperature", ["2020-02"]),
        ],
        ["rainfall", "temperature"],
      ),
    ).toBeNull();
    expect(
      planCatalogInvestigation(
        [variable("rainfall", ["2020-13", "2020-1"])],
        ["rainfall"],
      ),
    ).toBeNull();
  });

  it("does not hand off more than six distinct layers", () => {
    const entries = Array.from({ length: 7 }, (_, index) =>
      variable(`field-${index}`),
    );
    expect(
      planCatalogInvestigation(
        entries,
        entries.map((entry) => entry.id),
      ),
    ).toBeNull();
  });
});

describe("educational catalog discovery", () => {
  const entries = [
    variable("rainfall"),
    variable("temperature"),
    variable("sea_ice_concentration"),
    variable("merra2_var_ps", [], {
      name: "Pressure variance",
      available: false,
    }),
  ];
  it("finds a variable through didactic Portuguese aliases and English descriptions", () => {
    const index = buildCatalogIndex(entries);
    expect(
      filterCatalog(index, { query: "chuva" }).map((x) => x.variable.id),
    ).toEqual(["rainfall"]);
    expect(
      filterCatalog(index, { query: "PRECIPITATION" }).map(
        (x) => x.variable.id,
      ),
    ).toEqual(["rainfall"]);
  });
  it("only assigns reviewed ecosystem relationships and keeps unprofiled inventory discoverable", () => {
    const index = buildCatalogIndex(entries);
    expect(
      filterCatalog(index, { ecosystem: "amazon" }).map((x) => x.variable.id),
    ).toEqual(["rainfall", "temperature"]);
    expect(
      filterCatalog(index, { query: "variance", full: true }).map(
        (x) => x.variable.id,
      ),
    ).toEqual(["merra2_var_ps"]);
    expect(filterCatalog(index, { query: "variance" })).toEqual([]);
  });
  it("filters unavailable entries using actual valid months, not the presence of metadata", () => {
    const index = buildCatalogIndex([
      variable("rainfall", ["2020-01"], {
        months: [{ month: "2020-01", samples: 1, validSamples: 0 }],
      }),
    ]);
    expect(filterCatalog(index, { availableOnly: true })).toEqual([]);
  });
  it.each(["boreal", "coral", "himalaya", "pantanal", "congo"] as const)(
    "finds available climate context for %s without assigning sea ice to it",
    (ecosystem) => {
      expect(
        filterCatalog(buildCatalogIndex(entries), { ecosystem }).map(
          (entry) => entry.variable.id,
        ),
      ).toEqual(["rainfall", "temperature"]);
    },
  );
  it("offers Antarctic temperature and sea ice without implying polar IMERG coverage", () => {
    expect(
      filterCatalog(buildCatalogIndex(entries), { ecosystem: "antarctic" }).map(
        (entry) => entry.variable.id,
      ),
    ).toEqual(["temperature", "sea_ice_concentration"]);
  });
  it("does not create a missing measurement when selecting a new ecosystem", () => {
    const index = buildCatalogIndex([variable("unreviewed")]);
    expect(filterCatalog(index, { ecosystem: "congo", full: true })).toEqual(
      [],
    );
    expect(filterCatalog(index, { ecosystem: "coral", full: true })).toEqual(
      [],
    );
  });
  it("distinguishes simulator diagnostics, reanalysis and satellite estimates", () => {
    expect(
      catalogKind(
        variable("cosp", [], {
          product: "MERRA-2 M2TMNXCSP 5.12.4 · COSP simulator diagnostic",
        }),
      ),
    ).toBe("Simulator diagnostic");
    expect(
      catalogKind(
        variable("temperature", [], { product: "MERRA-2 M2TMNXSLV 5.12.4" }),
      ),
    ).toBe("Reanalysis");
    expect(catalogKind(variable("rainfall"))).toBe("Satellite estimate");
    expect(
      catalogKind(variable("unknown", [], { product: "Unreviewed source" })),
    ).toBe("Check source method");
  });
});
