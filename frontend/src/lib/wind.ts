import { frameCellIndex, normalizeLongitude } from "./globeSelection";
import type { EarthFrame, EarthVariable } from "./earthApi";
import type { GlobeView } from "./comparison";

/** Only reviewed U/V pairs at the same physical level may form a wind vector. */
export function windComponents(id: string) {
  const match = /^merra2_[uv](2m|10m|50m|250|500|850)$/.exec(id);
  if (!match) return undefined;
  const level = match[1];
  return {
    eastward: `merra2_u${level}`,
    northward: `merra2_v${level}`,
    level: level.endsWith("m") ? `${level.slice(0, -1)} m` : `${level} hPa`,
  };
}

/** Dependencies use the existing bounded frame queue/cache, never chart selection. */
export function windFrameVariables(
  selected: EarthVariable[],
  catalog: EarthVariable[],
  month?: string,
) {
  const result = new Map(selected.map((variable) => [variable.id, variable]));
  for (const variable of selected) {
    const pair = windComponents(variable.id);
    if (!pair) continue;
    for (const id of [pair.eastward, pair.northward]) {
      const component = catalog.find(
        (entry) => entry.id === id && entry.available !== false,
      );
      if (
        component &&
        (!month ||
          component.months.some(
            (entry) => entry.month === month && entry.validSamples > 0,
          ))
      )
        result.set(id, component);
    }
  }
  return [...result.values()];
}

export type WindField = { eastward: EarthFrame; northward: EarthFrame };

export function pairWindFrames(
  eastward?: EarthFrame,
  northward?: EarthFrame,
): WindField | undefined {
  if (!eastward || !northward) return undefined;
  const pair = windComponents(eastward.variable);
  const grid = eastward.grid;
  const count = grid.width * grid.height;
  if (
    !pair ||
    eastward.variable !== pair.eastward ||
    northward.variable !== pair.northward ||
    eastward.simulated !== false ||
    northward.simulated !== false ||
    eastward.month !== northward.month ||
    eastward.product !== northward.product ||
    eastward.run !== northward.run ||
    eastward.unit !== "m/s" ||
    northward.unit !== "m/s" ||
    grid.width !== northward.grid.width ||
    grid.height !== northward.grid.height ||
    grid.orientation !== "north_to_south,west_to_east" ||
    grid.orientation !== northward.grid.orientation ||
    grid.bounds.length !== 4 ||
    grid.bounds.some(
      (value, index) => value !== northward.grid.bounds[index],
    ) ||
    [eastward, northward].some(
      (frame) =>
        frame.values.length !== count || frame.coverage.length !== count,
    )
  )
    return undefined;
  return { eastward, northward };
}

export function sampleWind(field: WindField, index: number) {
  const { eastward, northward } = field;
  const u = eastward.values[index],
    v = northward.values[index];
  if (
    !(eastward.coverage[index] > 0) ||
    !(northward.coverage[index] > 0) ||
    !Number.isFinite(u) ||
    !Number.isFinite(v)
  )
    return undefined;
  const resultant = Math.hypot(u, v);
  // Clockwise from north, toward the flow (meteorological "from" is opposite).
  const bearing =
    resultant < 1e-6 ? null : ((Math.atan2(u, v) * 180) / Math.PI + 360) % 360;
  return { u, v, resultant, bearing };
}

/** Project the geographic east/north tangent, including camera tilt and the limb. */
export function projectedWindDirection(
  point: [number, number],
  u: number,
  v: number,
  view: GlobeView,
): [number, number] | undefined {
  const radians = Math.PI / 180;
  const phi = point[1] * radians;
  const lambda = (point[0] - view.longitude) * radians;
  const beta = view.latitude * radians;
  const depth =
    Math.sin(phi) * Math.sin(beta) +
    Math.cos(phi) * Math.cos(beta) * Math.cos(lambda);
  if (depth <= 0.08 || Math.hypot(u, v) < 1e-6) return undefined;
  const x = u * Math.cos(lambda) - v * Math.sin(phi) * Math.sin(lambda);
  const y =
    -u * Math.sin(beta) * Math.sin(lambda) -
    v *
      (Math.cos(beta) * Math.cos(phi) +
        Math.sin(beta) * Math.sin(phi) * Math.cos(lambda));
  const length = Math.hypot(x, y);
  return Number.isFinite(length) && length > 1e-8
    ? [x / length, y / length]
    : undefined;
}

/** Short streamlets through the monthly field, using spherical destinations.
 * Fixed angular steps are visual spacing, never time or physical trajectories.
 * Stop at missing/calm cells instead of inventing flow across gaps.
 */
export function traceWind(
  field: WindField,
  start: [number, number],
  steps = 24,
  stepDegrees = 0.38,
): [number, number][] {
  const points: [number, number][] = [];
  const rad = Math.PI / 180;
  const distance = stepDegrees * rad;
  let point = start;
  for (let step = 0; step <= steps; step++) {
    const index = frameCellIndex(field.eastward.grid, point);
    const wind = index < 0 ? undefined : sampleWind(field, index);
    if (!wind || wind.bearing === null) break;
    points.push(point);
    const latitude = point[1] * rad;
    const bearing = wind.bearing * rad;
    const nextLatitude = Math.asin(Math.max(-1, Math.min(1,
      Math.sin(latitude) * Math.cos(distance) +
      Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing),
    )));
    const longitudeDelta = Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude),
      Math.cos(distance) - Math.sin(latitude) * Math.sin(nextLatitude),
    );
    point = [normalizeLongitude(point[0] + longitudeDelta / rad), nextLatitude / rad];
  }
  return points;
}
