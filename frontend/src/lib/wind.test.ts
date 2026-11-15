import { describe, expect, it } from "vitest";
import type { EarthFrame, EarthVariable } from "./earthApi";
import { initialGlobeView } from "./comparison";
import { globeProjection } from "./globeProjection";
import {
  pairWindFrames,
  projectedWindDirection,
  sampleWind,
  traceWind,
  windComponents,
  windFrameVariables,
} from "./wind";

function frame(variable: string, value: number): EarthFrame {
  return {
    variable,
    quantity: variable,
    unit: "m/s",
    product: "MERRA-2 M2TMNXSLV 5.12.4",
    month: "2026-09",
    simulated: false,
    validCells: 1,
    totalCells: 1,
    grid: {
      width: 1,
      height: 1,
      bounds: [-180, -90, 180, 90],
      orientation: "north_to_south,west_to_east",
    },
    values: new Float32Array([value]),
    coverage: new Float32Array([1]),
  };
}
function variable(id: string, month = "2026-09"): EarthVariable {
  return {
    id,
    name: id,
    quantity: id,
    unit: "m/s",
    product: "MERRA-2",
    months: [{ month, samples: 1, validSamples: 1 }],
  };
}

describe("paired monthly wind", () => {
  it("loads only the matching-level companion and deduplicates selected U/V", () => {
    const u = variable("merra2_u10m"),
      v = variable("merra2_v10m"),
      other = variable("merra2_v50m");
    expect(
      windFrameVariables([u], [u, v, other], "2026-09").map(
        (entry) => entry.id,
      ),
    ).toEqual([u.id, v.id]);
    expect(windFrameVariables([u, v], [u, v, other], "2026-09")).toEqual([
      u,
      v,
    ]);
    expect(
      windFrameVariables([u], [u, { ...v, available: false }], "2026-09"),
    ).toEqual([u]);
    expect(
      windFrameVariables([u], [u, variable(v.id, "2026-08")], "2026-09"),
    ).toEqual([u]);
    expect(windComponents("wind_speed")).toBeUndefined();
    expect(windComponents("merra2_qv10m")).toBeUndefined();
    expect(windComponents("merra2_v850")?.level).toBe("850 hPa");
  });

  it("rejects mixing levels, months, grids, products, runs and units", () => {
    const u = frame("merra2_u10m", 3),
      v = frame("merra2_v10m", 4);
    expect(pairWindFrames(u, v)).toBeDefined();
    expect(pairWindFrames(u)).toBeUndefined();
    for (const change of [
      { variable: "merra2_v50m" },
      { month: "2026-08" },
      { product: "other" },
      { run: "other" },
      { unit: "km/h" },
      { simulated: true },
      { grid: { ...v.grid, bounds: [-170, -90, 180, 90] } },
      { grid: { ...v.grid, width: 2 } },
      { values: new Float32Array(0) },
    ])
      expect(
        pairWindFrames(u, { ...v, ...change } as EarthFrame),
      ).toBeUndefined();
    expect(pairWindFrames(v, u)).toBeUndefined();
  });

  it.each([
    [1, 0, 90],
    [0, 1, 0],
    [-1, 0, 270],
    [0, -1, 180],
    [1, 1, 45],
  ])(
    "reports flow toward the correct bearing for U=%s V=%s",
    (u, v, bearing) => {
      expect(
        sampleWind(
          pairWindFrames(frame("merra2_u10m", u), frame("merra2_v10m", v))!,
          0,
        )?.bearing,
      ).toBeCloseTo(bearing);
    },
  );

  it("preserves missing data and gives calm wind no invented direction", () => {
    const u = frame("merra2_u10m", 3),
      v = frame("merra2_v10m", 4);
    expect(sampleWind(pairWindFrames(u, v)!, 0)?.resultant).toBe(5);
    v.coverage[0] = 0;
    expect(sampleWind(pairWindFrames(u, v)!, 0)).toBeUndefined();
    v.coverage[0] = 1;
    v.values[0] = NaN;
    expect(sampleWind(pairWindFrames(u, v)!, 0)).toBeUndefined();
    expect(
      sampleWind(
        pairWindFrames(frame("merra2_u10m", 0), frame("merra2_v10m", 0))!,
        0,
      ),
    ).toMatchObject({ resultant: 0, bearing: null });
  });

  it("projects geographic tangents correctly at tilted cameras, zooms and the dateline", () => {
    // Independent finite differences of d3's projection check east/north orientation.
    for (const [longitude, latitude, zoom, point] of [
      [0, 0, 1, [0, 0]],
      [30, 45, 2, [50, 30]],
      [179, -35, 8, [-179, -30]],
      [-120, 75, 0.8, [-150, 65]],
    ] as [number, number, number, [number, number]][]) {
      const view = { ...initialGlobeView, longitude, latitude, zoom };
      const projection = globeProjection(view).scale(270 * zoom);
      for (const [u, v] of [
        [1, 0],
        [0, 1],
        [-3, 4],
        [2, -1],
      ]) {
        const delta = 1e-5;
        const start = projection(point)!;
        const end = projection([
          point[0] + (delta * u) / Math.cos((point[1] * Math.PI) / 180),
          point[1] + delta * v,
        ])!;
        const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
        const actual = projectedWindDirection(point, u, v, view)!;
        expect(actual[0]).toBeCloseTo((end[0] - start[0]) / length, 5);
        expect(actual[1]).toBeCloseTo((end[1] - start[1]) / length, 5);
      }
    }
  });

  it("does not project wind from the back, limb, calm or invalid vectors", () => {
    const view = { ...initialGlobeView, longitude: 0, latitude: 0 };
    expect(projectedWindDirection([180, 0], 1, 1, view)).toBeUndefined();
    expect(projectedWindDirection([89, 0], 1, 1, view)).toBeUndefined();
    expect(projectedWindDirection([0, 0], 0, 0, view)).toBeUndefined();
    expect(projectedWindDirection([0, 0], NaN, 1, view)).toBeUndefined();
  });
});


describe("surface wind trails", () => {
  it("crosses the dateline continuously and follows east/north directions", () => {
    const east = pairWindFrames(frame("merra2_u10m", 1), frame("merra2_v10m", 0))!;
    const points = traceWind(east, [179, 0], 8, 0.5);
    expect(points).toHaveLength(9);
    expect(points.at(-1)![0]).toBeCloseTo(-177);
    expect(points.every(p => Math.abs(p[1]) < 1e-8)).toBe(true);
    const north = pairWindFrames(frame("merra2_u10m", 0), frame("merra2_v10m", 1))!;
    expect(traceWind(north, [20, 40], 8, 0.5).at(-1)).toEqual([20, expect.closeTo(44, 6)]);
  });

  it("ends before missing cells and emits no calm flow", () => {
    const u = frame("merra2_u10m", 1), v = frame("merra2_v10m", 0);
    for (const f of [u, v]) {
      f.grid = { ...f.grid, width: 2 };
      f.values = new Float32Array(f === u ? [1, 1] : [0, 0]);
      f.coverage = new Float32Array([1, 0]);
    }
    expect(traceWind(pairWindFrames(u, v)!, [-1, 0], 10, 0.5)).toHaveLength(2);
    expect(traceWind(pairWindFrames(frame("merra2_u10m", 0), frame("merra2_v10m", 0))!, [0, 0])).toEqual([]);
  });
});
