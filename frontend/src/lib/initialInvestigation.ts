import type { EarthRegion, EarthVariable } from "./earthApi";
import type { PanelPreset } from "./assistant";
import { variableAvailable } from "./variableGroups";

/** A real, available starting study; no synthetic months or values. */
export function initialInvestigation(
  variables: EarthVariable[],
  region: EarthRegion,
): PanelPreset | undefined {
  const available = variables.filter(variableAvailable);
  const variable =
    available.find((entry) => entry.id === "temperature") ?? available[0];
  if (!variable) return undefined;
  const months = variable.months
    .filter((entry) => entry.validSamples > 0)
    .map((entry) => entry.month)
    .sort();
  return {
    variable: variable.id,
    region: region.id,
    month: months.at(-1)!,
    start: months[0],
    end: months.at(-1)!,
    comparisonMode: "raw",
    layers: [{ variable: variable.id, visible: true, opacity: 1 }],
    nonce: 0,
  };
}
