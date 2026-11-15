import type { HistoricalEvent } from "./config.ts";
import type { CatalogVariable } from "./data.ts";
import { variables } from "./registry.ts";

type Candidate = { id: string; reason: string };
// Reviewed runtime IDs only. Relevance is curated context, never attribution.
const candidates: Record<string, Candidate[]> = {
  Wildfires: [
    {
      id: "rainfall",
      reason:
        "Monthly rainfall provides moisture context around the fire period; it does not detect fire or establish its cause.",
    },
    {
      id: "temperature",
      reason:
        "Monthly air temperature at 10 m provides thermal context; it is not a fire-temperature or burned-area measurement.",
    },
    {
      id: "merra2_qv2m",
      reason:
        "Monthly specific humidity at 2 m provides atmospheric moisture context; it is not relative humidity or a fire-risk diagnosis.",
    },
    {
      id: "ndvi",
      reason:
        "Monthly NDVI describes vegetation greenness where valid pixels exist; changes alone do not identify burned area or fire damage.",
    },
    {
      id: "evi",
      reason:
        "Monthly EVI offers a distinct vegetation-greenness context; it does not measure the fire footprint or attribute vegetation changes.",
    },
  ],
  Hurricanes: [
    {
      id: "rainfall",
      reason:
        "Monthly rainfall provides broad precipitation context; it cannot resolve storm rainfall peaks or attribute totals to this cyclone.",
    },
    {
      id: "merra2_u10m",
      reason:
        "Monthly eastward wind at 10 m describes one signed wind component; it is not peak wind speed, storm intensity or a track.",
    },
    {
      id: "merra2_v10m",
      reason:
        "Monthly northward wind at 10 m describes the other signed wind component; monthly means cannot diagnose a hurricane.",
    },
    {
      id: "merra2_ps",
      reason:
        "Monthly surface pressure provides atmospheric context; it cannot resolve the cyclone's minimum pressure or daily evolution.",
    },
  ],
  "El Niño": [
    {
      id: "temperature",
      reason:
        "Monthly air temperature at 10 m provides atmospheric context; it is not sea-surface temperature, an ONI index or an ENSO diagnosis.",
    },
    {
      id: "rainfall",
      reason:
        "Monthly rainfall offers hydrological context during the historical ENSO window; overlap alone does not attribute changes to El Niño.",
    },
  ],
  Tsunamis: [],
};
const registered = new Set(variables.map((variable) => variable.id));
export const eventCoverageNote =
  "Availability means valid months in the global catalog overlap the historical window. Regional coverage is checked when the regional series is requested. Study rectangles are not exact affected areas; monthly data do not resolve daily peaks or establish causality.";

export function eventSuggestions(
  event: HistoricalEvent,
  catalog: CatalogVariable[],
) {
  const suggestedVariables = (candidates[event.category] ?? [])
    .filter((candidate) => registered.has(candidate.id))
    .map((candidate) => {
      const variable = catalog.find((entry) => entry.id === candidate.id);
      const months =
        variable?.available === false
          ? []
          : (variable?.months ?? [])
              .filter(
                (entry) =>
                  entry.month >= event.window[0] &&
                  entry.month <= event.window[1] &&
                  (entry.validSamples ?? 0) > 0,
              )
              .map((entry) => entry.month)
              .sort();
      return { ...candidate, months, available: months.length > 0 };
    });
  const primary =
    suggestedVariables.find(
      (candidate) => candidate.id === event.variable && candidate.available,
    ) ?? suggestedVariables.find((candidate) => candidate.available);
  return {
    variable: primary?.id ?? event.variable,
    suggestedVariables,
    available: Boolean(primary),
    months: primary?.months ?? [],
    coverageNote: eventCoverageNote,
    unavailableReason: primary
      ? null
      : event.category === "Tsunamis"
        ? "No sea-level or seismic data layer. Monthly rainfall and temperature do not represent tsunami waves."
        : "No valid catalog months for the relevant variables overlap the historical event window.",
  };
}
