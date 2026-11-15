import {
  geoArea,
  geoBounds,
  geoCentroid,
  geoContains,
  geoDistance,
} from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GlobeView } from "./comparison";
import { globeProjection } from "./globeProjection";
import countryData from "./countries.geo.json";

export type CountryLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
  fontSize: number;
  opacity: number;
};

type CountryGeometry = Polygon | MultiPolygon;
type Rect = { left: number; right: number; top: number; bottom: number };

const features = (
  countryData as unknown as FeatureCollection<CountryGeometry, { name: string }>
).features;

// Reuse the bundled Natural Earth 1:110m geometry. This is cartographic context,
// not a scientific mask, a country selection, or additional source resolution.
export const countryBorders: GeoPermissibleObjects = {
  type: "GeometryCollection",
  geometries: features.map(({ geometry }) => geometry),
};

/** Stable geometry: callers can pass this directly to D3's geoPath. */
export function countryBorderGeometry(): GeoPermissibleObjects {
  return countryBorders;
}

function inBounds(
  point: [number, number],
  [[west, south], [east, north]]: [[number, number], [number, number]],
) {
  const [longitude, latitude] = point;
  return (
    latitude >= south &&
    latitude <= north &&
    (west <= east
      ? longitude >= west && longitude <= east
      : longitude >= west || longitude <= east)
  );
}

function landmassAnchor(polygon: Polygon): [number, number] {
  const centroid = geoCentroid(polygon);
  if (geoContains(polygon, centroid)) return centroid;

  // Concave countries can have centroids in the sea. A small, one-time search
  // keeps names on land without introducing per-frame geometry searches.
  const [[west, south], [east, north]] = geoBounds(polygon);
  const width = east >= west ? east - west : east + 360 - west;
  let best: [number, number] | undefined;
  let distance = Infinity;
  for (let y = 1; y < 12; y++) {
    for (let x = 1; x < 12; x++) {
      const longitude = ((west + (width * x) / 12 + 540) % 360) - 180;
      const point: [number, number] = [
        longitude,
        south + ((north - south) * y) / 12,
      ];
      const nextDistance = geoDistance(centroid, point);
      if (nextDistance < distance && geoContains(polygon, point)) {
        best = point;
        distance = nextDistance;
      }
    }
  }
  // Very narrow or tiny islands may evade the grid; a source vertex remains
  // preferable to a name anchored to the other side of a concave polygon.
  return best ?? (polygon.coordinates[0][0].slice(0, 2) as [number, number]);
}

// Country geometry and representative landmass are computed once, never on
// every pointer move. France therefore uses Europe rather than overseas land.
const countries = features.map(({ id, properties, geometry }) => {
  const polygons: Polygon[] =
    geometry.type === "Polygon"
      ? [geometry]
      : geometry.coordinates.map((coordinates) => ({
          type: "Polygon",
          coordinates,
        }));
  const mainland = polygons.reduce((largest, polygon) =>
    geoArea(polygon) > geoArea(largest) ? polygon : largest,
  );
  return {
    id: String(
      id ?? `ne-${properties.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    ),
    name: properties.name,
    geometry,
    bounds: geoBounds(geometry),
    anchor: landmassAnchor(mainland),
    area: geoArea(mainland),
  };
});

function overlaps(a: Rect, b: Rect) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

/**
 * Centered SVG text positions in the 640×640 viewport, after camera zoom.
 * Render outside the transformed globe group, with textAnchor="middle" and
 * dominantBaseline="central". viewportPixels keeps apparent font size stable.
 */
export function countryLabels(
  view: GlobeView,
  viewportPixels = 440,
): CountryLabel[] {
  if (
    !Number.isFinite(view.zoom) ||
    !Number.isFinite(view.longitude) ||
    !Number.isFinite(view.latitude) ||
    view.zoom <= 1.45
  )
    return [];

  const zoom = Math.min(8, view.zoom);
  const pixels =
    Number.isFinite(viewportPixels) && viewportPixels > 0
      ? viewportPixels
      : 440;
  const unitsPerPixel = 640 / pixels;
  const fontSize = 11.5 * unitsPerPixel;
  const padding = 4 * unitsPerPixel;
  const radius = 270 * zoom;
  const fade = Math.min(1, (zoom - 1.45) / 0.65);
  const projection = globeProjection(view);
  const center: [number, number] = [view.longitude, view.latitude];
  const minimumArea = 600 / Math.pow(zoom, 0.65);
  const candidates: (CountryLabel & { rect: Rect; priority: number })[] = [];

  for (const country of countries) {
    const anchor = country.anchor;
    let distance = geoDistance(center, anchor);
    const projected = projection(anchor);
    if (!projected) continue;
    let x = 320 + (projected[0] - 320) * zoom;
    let y = 320 + (projected[1] - 320) * zoom;
    const width = country.name.length * fontSize * 0.64 + padding * 2;
    const height = fontSize * 1.4 + padding * 2;
    const anchorInViewport =
      distance < Math.PI / 2 &&
      x - width / 2 >= padding &&
      x + width / 2 <= 640 - padding &&
      y - height / 2 >= padding &&
      y + height / 2 <= 640 - padding;

    // At close range Russia/Canada can cover the viewport while their normal
    // anchors are far outside it. Only a bbox-filtered containment check can
    // substitute the actual camera point; no ocean labels are invented.
    let containsCenter = false;
    if (inBounds(center, country.bounds)) {
      containsCenter = geoContains(country.geometry, center);
      if (!anchorInViewport && containsCenter && zoom >= 3) {
        distance = 0;
        x = 320;
        y = 320;
      }
    }
    if (distance >= Math.PI / 2) continue;

    const apparentArea =
      (country.area * radius * radius * Math.max(0, Math.cos(distance))) /
      (unitsPerPixel * unitsPerPixel);
    const sizeFade = Math.min(1, Math.max(0, apparentArea / minimumArea - 0.5));
    if (sizeFade <= 0 && !containsCenter) continue;

    const rect = {
      left: x - width / 2,
      right: x + width / 2,
      top: y - height / 2,
      bottom: y + height / 2,
    };
    if (
      rect.left < padding ||
      rect.right > 640 - padding ||
      rect.top < padding ||
      rect.bottom > 640 - padding
    )
      continue;
    // All four label-box corners must fit within the projected hemisphere.
    // This also rejects text that would straddle the horizon near the limb.
    if (
      [rect.left, rect.right].some((cornerX) =>
        [rect.top, rect.bottom].some(
          (cornerY) =>
            Math.hypot(cornerX - 320, cornerY - 320) > radius - padding,
        ),
      )
    )
      continue;

    candidates.push({
      id: country.id,
      name: country.name,
      x,
      y,
      fontSize,
      opacity: fade * (containsCenter ? 1 : sizeFade),
      rect,
      priority:
        (containsCenter ? 1e12 : 0) + apparentArea / (1 + distance * distance),
    });
  }

  candidates.sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );
  const accepted: typeof candidates = [];
  for (const candidate of candidates) {
    if (accepted.some(({ rect }) => overlaps(rect, candidate.rect))) continue;
    accepted.push(candidate);
    if (accepted.length >= 20) break;
  }
  return accepted.map(
    ({ rect: _rect, priority: _priority, ...label }) => label,
  );
}
