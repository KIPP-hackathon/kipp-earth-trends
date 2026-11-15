import { geoDistance, geoOrthographic } from "d3-geo";
import type { MultiLineString } from "geojson";
import type { GlobeView } from "./comparison";

export function globeProjection(view: GlobeView) {
  return geoOrthographic()
    .rotate([-view.longitude, -view.latitude])
    .translate([320, 320])
    .scale(270)
    .precision(0.5);
}
export function visibleOnGlobe(view: GlobeView, point: [number, number]) {
  return geoDistance([view.longitude, view.latitude], point) < Math.PI / 2;
}
export function dragGlobe(view: GlobeView, dx: number, dy: number): GlobeView {
  const sensitivity = 0.35 / Math.max(0.8, view.zoom);
  const longitude = view.longitude - dx * sensitivity;
  return {
    ...view,
    longitude: ((((longitude + 180) % 360) + 360) % 360) - 180,
    latitude: Math.max(-85, Math.min(85, view.latitude + dy * sensitivity)),
  };
}

type Position = number[];
type Outlineable = {
  type: string;
  coordinates?: unknown;
  geometries?: Outlineable[];
  features?: { geometry: Outlineable }[];
  geometry?: Outlineable;
};

/**
 * Converts polygon rings to open lines for stroking. A stroked polygon is
 * closed by D3 along the visible horizon, which draws a bright arc at the
 * globe's limb while it rotates; lines are clipped without that closing edge.
 */
export function outlineLines<T>(geometry: T): MultiLineString {
  const lines: Position[][] = [];
  const visit = (node: Outlineable | undefined) => {
    if (!node) return;
    if (node.type === "FeatureCollection") node.features?.forEach((f) => visit(f.geometry));
    else if (node.type === "Feature") visit(node.geometry);
    else if (node.type === "GeometryCollection") node.geometries?.forEach(visit);
    else if (node.type === "Polygon") lines.push(...(node.coordinates as Position[][]));
    else if (node.type === "MultiPolygon")
      (node.coordinates as Position[][][]).forEach((polygon) => lines.push(...polygon));
  };
  visit(geometry as Outlineable);
  return { type: "MultiLineString", coordinates: lines };
}
