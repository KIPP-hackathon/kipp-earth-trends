import type { EarthVariable } from "./earthApi";

const domains = [
  "temperature", "wind", "humidity", "pressure", "cloud", "flux",
  "aerosol", "chemistry", "precipitation", "sea_ice", "variance",
  "atmosphere",
  "hydrosphere",
  "cryosphere",
  "biosphere",
  "geosphere",
];
const labels: Record<string, string> = {
  temperature: "Temperature", wind: "Wind", humidity: "Humidity",
  pressure: "Pressure & height", cloud: "Clouds", flux: "Surface fluxes",
  aerosol: "Aerosols", chemistry: "Atmospheric chemistry",
  precipitation: "Precipitation", sea_ice: "Sea ice", variance: "Variances · advanced",
  atmosphere: "Atmosphere",
  hydrosphere: "Hydrosphere",
  cryosphere: "Cryosphere",
  biosphere: "Biosphere",
  geosphere: "Geosphere",
  other: "Other",
};
export const variableAvailable = (variable: EarthVariable) =>
  variable.coverageFlag !== false && variable.available !== false &&
  variable.months.some((month) => month.validSamples > 0);

export function groupVariables(variables: EarthVariable[]) {
  const groups = new Map<string, EarthVariable[]>();
  for (const variable of variables) {
    const theme = variable.theme?.trim().toLowerCase();
    const key = (theme === "ozone" ? "chemistry" : theme) || variable.domain?.trim().toLowerCase() || "other";
    const group = groups.get(key) ?? [];
    group.push(variable);
    groups.set(key, group);
  }
  const rank = (key: string) =>
    domains.includes(key)
      ? domains.indexOf(key)
      : key === "other"
        ? domains.length + 1
        : domains.length;
  return [...groups]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([key, variables]) => ({ key, label: labels[key] ?? key, variables }));
}

/** Operates on the entire group, independently of the search and collapsed state. */
export function toggleVariableGroup(
  selected: string[],
  variables: EarthVariable[],
) {
  const eligible = [
    ...new Set(
      variables.filter(variableAvailable).map((variable) => variable.id),
    ),
  ];
  if (!eligible.length) return selected;
  const current = new Set(selected);
  return eligible.every((id) => current.has(id))
    ? selected.filter((id) => !eligible.includes(id))
    : [...selected, ...eligible.filter((id) => !current.has(id))];
}
