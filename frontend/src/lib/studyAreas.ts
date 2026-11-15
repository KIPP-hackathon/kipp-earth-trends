import type { EarthEvent, EarthRegion, EarthVariable } from "./earthApi";
import type { CountrySelection } from "./countries";
import { catalogEcosystems } from "./ecosystems";

export type StudyAreaOption = {
  id: string;
  name: string;
  detail: string;
  region: EarthRegion;
  icon?: string;
  searchTerms?: string;
  group: "country" | "place" | "event";
  event?: EarthEvent;
  disabled?: boolean;
};
export function eventStudySelection(
  event: EarthEvent,
  variables: EarthVariable[],
) {
  const variable = variables.find(
    (variable) =>
      variable.id === event.variable && variable.available !== false,
  );
  const bounds = event.bbox
    .split(",")
    .map((part) => (part.trim() ? Number(part) : NaN));
  const [west, south, east, north] = bounds;
  const width = east >= west ? east - west : east + 360 - west;
  const monthly = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (
    !event.available ||
    !variable ||
    bounds.length !== 4 ||
    !bounds.every(Number.isFinite) ||
    west < -180 ||
    west > 180 ||
    east < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90 ||
    south >= north ||
    width <= 0 ||
    width > 360 ||
    !event.window.every((month) => monthly.test(month)) ||
    event.window[0] > event.window[1]
  )
    return null;
  const months = [
    ...new Set(
      variable.months
        .filter(
          (row) =>
            row.validSamples > 0 &&
            monthly.test(row.month) &&
            row.month >= event.window[0] &&
            row.month <= event.window[1],
        )
        .map((row) => row.month),
    ),
  ].sort();
  return months.length
    ? {
        variable: variable.id,
        month: months.at(-1)!,
        start: months[0],
        end: months.at(-1)!,
      }
    : null;
}
const globalArea: EarthRegion = {
  id: "custom-global",
  name: "Global",
  bbox: "-180,-90,180,90",
  longitude: -35,
  latitude: 10,
};
const aliases: Record<string, string> = {
  amazon: "Amazônia Amazonia floresta rainforest",
  sahara: "Saara deserto desert",
  ocean: "Atlântico Atlantico oceano ocean",
  polar: "Ártico Artico norte polar",
  antarctic: "Antártida Antartida sul polar",
  boreal: "Taiga floresta boreal Canadá Russia Escandinavia",
  coral: "Triângulo Triangulo Coral recifes reefs",
  himalaya: "Himalaia Himalaia Tibete Tibet planalto geleiras glaciers",
  pantanal: "Pantanal áreas úmidas wetland",
  congo: "Bacia do Congo floresta turfeiras peatland",
};
export function buildStudyAreas(
  countries: CountrySelection[],
  configured: EarthRegion[],
  current: EarthRegion,
  events: EarthEvent[] = [],
  variables: EarthVariable[] = [],
): StudyAreaOption[] {
  const options = new Map<string, StudyAreaOption>();
  options.set(globalArea.id, {
    id: globalArea.id,
    name: "Global",
    detail: "Whole Earth",
    region: globalArea,
    group: "place",
    searchTerms: "mundo mundo inteiro global world",
  });
  for (const ecosystem of catalogEcosystems)
    options.set(ecosystem.region.id, {
      id: ecosystem.region.id,
      name: ecosystem.name,
      detail: "Ecosystem · study rectangle",
      region: ecosystem.region,
      group: "place",
      searchTerms: `${aliases[ecosystem.id] ?? ""} ${ecosystem.coordinates} ecosystem ecossistema`,
    });
  for (const event of events) {
    const selection = eventStudySelection(event, variables);
    options.set(`event:${event.id}`, {
      id: `event:${event.id}`,
      name: event.title,
      group: "event",
      event,
      detail: `Event · ${event.window[0]} – ${event.window[1]} · ${event.location}${selection ? "" : ` · ${event.unavailableReason ?? "No matching catalog data"}`}`,
      region: {
        id: event.region,
        name: event.location,
        bbox: event.bbox,
        longitude: event.longitude,
        latitude: event.latitude,
      },
      disabled: !selection,
      searchTerms: `${event.category} ${event.location} evento historical ${event.description}`,
    });
  }
  for (const country of countries
    .filter((country) => country.selectable)
    .toSorted((a, b) => a.name.localeCompare(b.name, "en")))
    options.set(country.region.id, {
      id: country.region.id,
      name: country.name,
      detail: "Country · bounding rectangle",
      region: country.region,
      group: "country",
      icon: country.flag,
      searchTerms: country.searchTerms,
    });
  for (const region of [...configured, current]) {
    const known = options.get(region.id);
    options.set(
      region.id,
      known
        ? {
            ...known,
            region,
            ...(region.name !== known.region.name ? { name: region.name } : {}),
          }
        : {
            id: region.id,
            name: region.name,
            detail: "Custom area · rectangle",
            region,
            group: "place",
            searchTerms: "custom drawn area personalizada desenhada",
          },
    );
  }
  return [...options.values()];
}
