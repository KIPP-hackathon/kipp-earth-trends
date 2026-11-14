import { geoDistance, geoOrthographic } from "d3-geo";
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
  const longitude = view.longitude - dx * 0.35;
  return {
    ...view,
    longitude: ((((longitude + 180) % 360) + 360) % 360) - 180,
    latitude: Math.max(-85, Math.min(85, view.latitude + dy * 0.35)),
  };
}
