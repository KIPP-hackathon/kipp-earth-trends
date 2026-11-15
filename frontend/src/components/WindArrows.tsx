import { useId, useMemo } from "react";
import type { EarthFrame } from "../lib/earthApi";
import { colorFrame } from "../lib/earthApi";
import type { GlobeView } from "../lib/comparison";
import type { MapLayer } from "../lib/layers";
import { globeProjection } from "../lib/globeProjection";
import { frameCellIndex } from "../lib/globeSelection";
import {
  pairWindFrames,
  traceWind,
  windComponents,
} from "../lib/wind";
import type { WindField } from "../lib/wind";

function WindArrowField({
  layer,
  field,
  view,
  viewportPixels,
}: {
  layer: MapLayer;
  field: WindField;
  view: GlobeView;
  viewportPixels: number;
}) {
  const pixels = useMemo(
    () => colorFrame(layer.frame!, layer.colorRange),
    [layer.frame, layer.colorRange],
  );
  const trails = useMemo(() => {
    const projection = globeProjection(view).scale(270 * view.zoom);
    // Geographic seeds stay anchored while rotating. Equal-area distribution
    // avoids the dense bands a latitude/longitude lattice creates at the poles.
    const count = Math.round(Math.max(600, Math.min(16000, viewportPixels * 2.4 * view.zoom ** 1.5)));
    const result: { path: string; color: string; depth: number; seed: number }[] = [];
    const radians = Math.PI / 180;
    for (let seed = 0; seed < count; seed++) {
      const point: [number, number] = [
        ((seed * 137.50776405) % 360) - 180,
        Math.asin(1 - 2 * (seed + 0.5) / count) / radians,
      ];
      const index = frameCellIndex(field.eastward.grid, point);
      if (index < 0 || !pixels[index * 4 + 3]) continue;
      const depth = (p: [number, number]) =>
        Math.sin(p[1] * radians) * Math.sin(view.latitude * radians) +
        Math.cos(p[1] * radians) * Math.cos(view.latitude * radians) *
        Math.cos((p[0] - view.longitude) * radians);
      const z = depth(point);
      if (z < 0.04) continue;
      const position = projection(point)!;
      if (position.some(value => value < -60 || value > 700)) continue;
      const points = traceWind(field, point, 24, 0.38 / Math.sqrt(view.zoom));
      const visible: number[][] = [];
      for (const p of points) {
        const cell = frameCellIndex(field.eastward.grid, p);
        if (depth(p) <= 0.025 || cell < 0 || !pixels[cell * 4 + 3]) break;
        visible.push(projection(p)!);
      }
      if (visible.length < 3) continue;
      result.push({
        path: visible.map((p, i) => `${i ? "L" : "M"}${p.map(v => v.toFixed(2)).join(",")}`).join(""),
        color: `rgb(${pixels[index * 4]},${pixels[index * 4 + 1]},${pixels[index * 4 + 2]})`,
        depth: Math.min(1, z * 3),
        seed,
      });
    }
    return result;
  }, [field.eastward, field.northward, pixels, view.longitude, view.latitude, view.zoom, viewportPixels]);
  return (
    <g
      className="wind-arrow-field"
      data-variable={layer.id}
      data-month={field.eastward.month}
      aria-label={`Monthly wind flow at ${windComponents(layer.id)!.level}`}
      opacity={Math.min(1, layer.opacity)}
    >
      <title>
        Trails follow the paired monthly mean wind field on the globe.
        Motion indicates direction only, not speed or particle trajectories.
        Color shows the selected signed component in m/s.
      </title>
      {trails.map(trail => (
        <g key={trail.seed} opacity={trail.depth} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={trail.path} stroke="#061724" strokeWidth={2.8} opacity={0.4} />
          <path d={trail.path} stroke={trail.color} strokeWidth={1} opacity={0.32} />
          <path className="wind-flow-pulse" d={trail.path} pathLength={100}
            stroke={trail.color} strokeWidth={1.6} strokeDasharray="22 78"
            style={{ animationDelay: `${-(trail.seed % 41) / 10}s` }} />
          <path className="wind-flow-tip" d={trail.path} pathLength={100}
            stroke="#e2f7ff" strokeWidth={1} strokeDasharray="2 98"
            style={{ animationDelay: `${-(trail.seed % 41) / 10}s` }} />
        </g>
      ))}
    </g>
  );
}

export function WindArrows({
  layers,
  frames,
  view,
  viewportPixels,
}: {
  layers: MapLayer[];
  frames: Record<string, EarthFrame>;
  view: GlobeView;
  viewportPixels: number;
}) {
  const id = useId();
  // A same-level U/V selection represents one vector field. Last visible layer styles it.
  const selected = new Map<string, MapLayer>();
  for (const layer of layers) {
    const pair = windComponents(layer.id);
    if (
      pair &&
      layer.visible &&
      Number.isFinite(layer.opacity) &&
      layer.opacity > 0
    )
      selected.set(pair.level, layer);
  }
  return (
    <g
      className="globe-wind-arrows"
      pointerEvents="none"
      clipPath={`url(#${id})`}
    >
      <defs>
        <clipPath id={id}>
          <circle cx={320} cy={320} r={270 * view.zoom} />
        </clipPath>
      </defs>
      {[...selected.values()].map((layer) => {
        const pair = windComponents(layer.id)!;
        const field = pairWindFrames(
          frames[pair.eastward],
          frames[pair.northward],
        );
        return field && layer.frame?.month === field.eastward.month ? (
          <WindArrowField
            key={pair.level}
            layer={layer}
            field={field}
            view={view}
            viewportPixels={viewportPixels}
          />
        ) : null;
      })}
    </g>
  );
}
