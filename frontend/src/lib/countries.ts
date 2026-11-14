import { geoBounds, geoCentroid, geoContains } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { EarthRegion } from "./earthApi";
import countryData from "./countries.geo.json";

export type CountrySelection = {
  region: EarthRegion;
  geometry: GeoPermissibleObjects;
  countryCode: string;
  name: string;
};

type CountryFeature = {
  id?: string;
  properties: { name: string };
  geometry: GeoPermissibleObjects;
};

// Natural Earth 4.1.0, via world-atlas@2.0.2, 1:110m (public domain).
// Source and simplification/privacy limitations: docs/country-location.md.
const countries: CountrySelection[] = (
  countryData.features as CountryFeature[]
).map(({ id, properties, geometry }) => {
  // The source omits ISO IDs for three disputed territories. These explicit
  // Natural Earth keys are stable identifiers, not assigned ISO country codes.
  const countryCode =
    id ?? `ne-${properties.name.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  const [[west, south], [east, north]] = geoBounds(geometry);
  const [longitude, latitude] = geoCentroid(geometry);
  return {
    countryCode,
    name: properties.name,
    geometry,
    region: {
      id: `custom-country-${countryCode}`,
      name: properties.name,
      // west > east deliberately represents a region crossing the dateline.
      // This is a bounding rectangle; it does not itself mask country borders.
      bbox: [west, south, east, north].join(","),
      longitude,
      latitude,
    },
  };
});

/** Immediate fallback; importing it never requests a browser location. */
export const brazilCountry = countries.find(
  (country) => country.countryCode === "076",
)!;

/** Bundled geometry: no external reverse geocoder or coordinate-bearing URL. */
export async function loadCountries(): Promise<CountrySelection[]> {
  return countries;
}

/** Resolve a point in memory. An ocean/coastline miss has no inferred country. */
export async function countryAt(
  longitude: number,
  latitude: number,
): Promise<CountrySelection | null> {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  )
    return null;
  return (
    countries.find((country) =>
      geoContains(country.geometry, [longitude, latitude]),
    ) ?? null
  );
}
