import { describe, expect, it } from "vitest";
import type { EarthVariable } from "./earthApi";
import { groupVariables, toggleVariableGroup } from "./variableGroups";

const variable = (id: string, theme: string, domain = "atmosphere"): EarthVariable => ({
  id, name:id, theme, domain, quantity:id, unit:"1", product:"reviewed source",
  months:[{month:"2024-01",samples:1,validSamples:1}], available:true,
});

describe("thematic variable groups", () => {
  it("separates atmospheric themes while preserving scientific domains", () => {
    const items=[variable("temperature","temperature"),variable("wind","wind"),variable("aerosol","aerosol")];
    expect(groupVariables(items).map(g=>g.label)).toEqual(["Temperature","Wind","Aerosols"]);
    expect(items.every(v=>v.domain==="atmosphere")).toBe(true);
  });
  it("combines ozone with chemistry and exposes water/ice themes", () => {
    const groups=groupVariables([variable("ozone","ozone"),variable("CO","chemistry"),variable("rain","precipitation","hydrosphere"),variable("ice","sea_ice","cryosphere")]);
    expect(groups.map(g=>[g.label,g.variables.length])).toEqual([["Atmospheric chemistry",2],["Precipitation",1],["Sea ice",1]]);
  });
  it("never selects a hidden flag even when source data exist", () => {
    const active=variable("active","wind"),hidden={...variable("hidden","wind"),coverageFlag:false};
    expect(toggleVariableGroup([], [active,hidden])).toEqual(["active"]);
  });
});
