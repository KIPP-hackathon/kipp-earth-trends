import type { GlobeView } from "./comparison";
import { globeProjection } from "./globeProjection";

export const normalizeLongitude = (value: number) =>
  ((((value + 180) % 360) + 360) % 360) - 180;

export function selectionBounds(
  first: [number, number],
  last: [number, number],
): string | null {
  if (![...first, ...last].every(Number.isFinite)) return null;
  const delta = normalizeLongitude(last[0] - first[0]);
  const [west, east] =
    delta >= 0
      ? [normalizeLongitude(first[0]), normalizeLongitude(last[0])]
      : [normalizeLongitude(last[0]), normalizeLongitude(first[0])];
  const south = Math.min(first[1], last[1]);
  const north = Math.max(first[1], last[1]);
  if (
    Math.abs(delta) < 0.02 ||
    north - south < 0.02 ||
    south < -90 ||
    north > 90
  )
    return null;
  return [west, south, east, north]
    .map((value) => Number(value.toFixed(5)))
    .join(",");
}

// Convert through the SVG's actual screen transform, then undo its zoom group.
// Inversion beyond the visible orthographic disk is undefined and is never used.
export function geographicPointer(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  view: GlobeView,
): [number, number] | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(clientX, clientY).matrixTransform(
    matrix.inverse(),
  );
  const x = (point.x - 320) / view.zoom + 320;
  const y = (point.y - 320) / view.zoom + 320;
  if (Math.hypot(x - 320, y - 320) >= 269.5) return null;
  const geographic = globeProjection(view).invert?.([x, y]);
  return geographic?.every(Number.isFinite) ? geographic : null;
}

export function validFrameBounds(value: unknown): value is number[] {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every((v) => typeof v === "number" && Number.isFinite(v))
  )
    return false;
  const [west, south, east, north] = value;
  return (
    west >= -180 &&
    west <= 180 &&
    south >= -90 &&
    north <= 90 &&
    north > south &&
    east > west &&
    east - west <= 360 + 1e-8
  );
}

export function frameCellIndex(
  grid: { bounds: number[]; width: number; height: number },
  point: [number, number],
): number {
  if (!validFrameBounds(grid.bounds)) return -1;
  const [west, south, east, north] = grid.bounds;
  const offset = (((point[0] - west) % 360) + 360) % 360;
  if (offset > east - west + 1e-8 || point[1] < south || point[1] > north)
    return -1;
  const x = Math.min(
    grid.width - 1,
    Math.floor((offset / (east - west)) * grid.width),
  );
  const y = Math.min(
    grid.height - 1,
    Math.floor(((north - point[1]) / (north - south)) * grid.height),
  );
  return y * grid.width + x;
}
