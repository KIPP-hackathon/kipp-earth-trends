import { useId, useMemo } from "react";
import type { EarthFrame } from "../lib/earthApi";
import { colorFrame } from "../lib/earthApi";
import type { GlobeView } from "../lib/comparison";
import type { MapLayer } from "../lib/layers";
import { globeProjection } from "../lib/globeProjection";
import { frameCellIndex } from "../lib/globeSelection";
import {
  pairWindFrames,
  projectedWindDirection,
  sampleWind,
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
  const arrows = useMemo(() => {
    const projection = globeProjection(view).scale(270 * view.zoom);
    const grid = field.eastward.grid;
    const [west, south, east, north] = grid.bounds;
    // Bounded screen sampling; glyphs stay attached to existing display cells.
    const spacing = Math.max(22, Math.min(42, (640 * 23) / viewportPixels));
    const seen = new Set<number>();
    const occupied = new Set<string>();
    const result: { path: string; color: string }[] = [];
    for (let y = spacing / 2; y < 640; y += spacing) {
      for (let x = spacing / 2; x < 640; x += spacing) {
        if (Math.hypot(x - 320, y - 320) >= 270 * view.zoom) continue;
        const sample = projection.invert?.([x, y]);
        if (!sample) continue;
        const index = frameCellIndex(grid, sample);
        if (index < 0 || seen.has(index)) continue;
        seen.add(index);
        if (!pixels[index * 4 + 3]) continue;
        const wind = sampleWind(field, index);
        if (!wind || wind.bearing === null) continue;
        const point: [number, number] = [
          west + (((index % grid.width) + 0.5) * (east - west)) / grid.width,
          north -
            ((Math.floor(index / grid.width) + 0.5) * (north - south)) /
              grid.height,
        ];
        const direction = projectedWindDirection(point, wind.u, wind.v, view);
        const position = projection(point);
        if (
          !position ||
          !direction ||
          position.some((value) => value < 5 || value > 635)
        )
          continue;
        const slot = `${Math.floor(position[0] / spacing)}:${Math.floor(position[1] / spacing)}`;
        if (occupied.has(slot)) continue;
        occupied.add(slot);
        const [dx, dy] = direction;
        const half = spacing * 0.29;
        const tail = [position[0] - dx * half, position[1] - dy * half];
        const tip = [position[0] + dx * half, position[1] + dy * half];
        const head = half * 0.65,
          wing = head * 0.65;
        const fmt = (p: number[]) =>
          p.map((value) => value.toFixed(1)).join(",");
        result.push({
          path: `M${fmt(tail)}L${fmt(tip)}M${fmt([tip[0] - dx * head - dy * wing, tip[1] - dy * head + dx * wing])}L${fmt(tip)}L${fmt([tip[0] - dx * head + dy * wing, tip[1] - dy * head - dx * wing])}`,
          color: `rgb(${pixels[index * 4]},${pixels[index * 4 + 1]},${pixels[index * 4 + 2]})`,
        });
      }
    }
    return result;
  }, [
    field.eastward,
    field.northward,
    pixels,
    view.longitude,
    view.latitude,
    view.zoom,
    viewportPixels,
  ]);
  return (
    <g
      className="wind-arrow-field"
      data-variable={layer.id}
      data-month={field.eastward.month}
      aria-label={`Monthly wind flow at ${windComponents(layer.id)!.level}`}
      opacity={Math.min(1, layer.opacity)}
    >
      <title>
        Arrows point toward the monthly mean flow. Color shows the selected
        signed component in m/s. Arrow length is fixed.
      </title>
      {arrows.map((arrow, index) => (
        <g key={index}>
          <path
            d={arrow.path}
            fill="none"
            stroke="#03101e"
            strokeWidth={4.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={arrow.path}
            fill="none"
            stroke={arrow.color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
