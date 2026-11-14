import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { Layers3, Minus, Plus, RotateCcw, Scan, X } from "lucide-react";
import { GlobeSurface } from "./GlobeSurface";
import { SpaceBackdrop } from "./SpaceBackdrop";
import "./space-scene.css";
import {
  frameCellIndex,
  geographicPointer,
  selectionBounds,
} from "../lib/globeSelection";
import { dragGlobe, globeProjection } from "../lib/globeProjection";
import type { GlobeView } from "../lib/comparison";
import { initialGlobeView } from "../lib/comparison";
import type { EarthColorRange, EarthFrame, EarthRegion } from "../lib/earthApi";
import { displayScale, realMonth, realScale, realUnit } from "../lib/earthApi";
import { ColorScaleControls } from "./ColorScaleControls";

function regionBoundary(bbox: string): GeoPermissibleObjects | null {
  const bounds = bbox.split(",").map(Number);
  if (bounds.length !== 4 || !bounds.every(Number.isFinite)) return null;
  const [west, south, east, north] = bounds;
  const width = east >= west ? east - west : east + 360 - west;
  const longitude = (value: number) =>
    ((((value + 180) % 360) + 360) % 360) - 180;
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const steps = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))),
    );
    return Array.from({ length: steps + 1 }, (_, index) => {
      const fraction = index / steps;
      return [longitude(x1 + (x2 - x1) * fraction), y1 + (y2 - y1) * fraction];
    });
  };
  const right = west + width;
  const coordinates = [
    edge(west, south, right, south),
    edge(west, north, right, north),
  ];
  // A full-longitude polar recorte has no artificial meridian seam.
  if (width < 360)
    coordinates.push(
      edge(west, south, west, north),
      edge(right, south, right, north),
    );
  return { type: "MultiLineString", coordinates };
}

export function RealGlobe({
  frame,
  view,
  onView,
  region,
  colorRange,
  onColorRange,
  onSelectArea,
  onClearArea,
}: {
  frame?: EarthFrame;
  region?: EarthRegion;
  colorRange?: EarthColorRange;
  onColorRange?: (value?: EarthColorRange) => void;
  onSelectArea?: (bbox: string) => void;
  onClearArea?: () => void;
  view: GlobeView;
  onView: (view: GlobeView) => void;
}) {
  const [land, setLand] = useState<GeoPermissibleObjects | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [probe, setProbe] = useState<[number, number] | null>(null);
  const id = useId();
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [areaNotice, setAreaNotice] = useState("");
  const areaDrag = useRef<{
    pointerId: number;
    first: [number, number];
    view: GlobeView;
  } | null>(null);
  const clearDraft = () => {
    areaDrag.current = null;
    setDraft(null);
  };
  const cancelDrawing = () => {
    clearDraft();
    setDrawing(false);
  };
  const draftOutline = useMemo(() => {
    const boundary = draft ? regionBoundary(draft) : null;
    return boundary
      ? (geoPath(globeProjection(view)).digits(1)(boundary) ?? "")
      : "";
  }, [draft, view.longitude, view.latitude]);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    view: GlobeView;
  } | null>(null);
  useEffect(() => {
    let mounted = true;
    import("../lib/land.geo.json")
      .then((data) => {
        if (mounted) setLand(data.default as GeoPermissibleObjects);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const paths = useMemo(() => {
    const path = geoPath(globeProjection(view)).digits(1);
    return {
      land: land ? (path(land) ?? "") : "",
      grid: path(geoGraticule10()) ?? "",
    };
  }, [view.longitude, view.latitude, land]);
  const outline = useMemo(() => {
    const boundary = region ? regionBoundary(region.bbox) : null;
    return boundary
      ? (geoPath(globeProjection(view)).digits(1)(boundary) ?? "")
      : "";
  }, [view.longitude, view.latitude, region?.bbox]);
  const scale = frame ? displayScale(frame, colorRange) : null;
  const cellIndex = frame && probe ? frameCellIndex(frame.grid, probe) : -1;
  const sampled =
    frame && cellIndex >= 0 && frame.coverage[cellIndex] > 0
      ? frame.values[cellIndex]
      : NaN;
  const hiddenSample =
    scale?.kind === "continuous" &&
    colorRange?.hideOutside &&
    Number.isFinite(sampled) &&
    (sampled < scale.domain[0] || sampled > scale.domain[1]);
  return (
    <div className="real-globe">
      <div className="real-globe-toolbar">
        <span>{frame ? realMonth(frame.month) : "Campo mensal"}</span>
        <button
          aria-pressed={view.showLayer}
          onClick={() => onView({ ...view, showLayer: !view.showLayer })}
        >
          <Layers3 size={14} /> Camada real
        </button>
      </div>
      {onSelectArea && (
        <div className="globe-area-controls">
          <button
            type="button"
            aria-pressed={drawing}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelDrawing();
              }
            }}
            onClick={() => {
              clearDraft();
              setDrawing(!drawing);
              setAreaNotice("");
            }}
          >
            <Scan size={15} />
            {drawing ? "Cancel drawing" : "Draw area"}
          </button>
          {region && onClearArea && (
            <button
              type="button"
              onClick={() => {
                cancelDrawing();
                setAreaNotice("");
                onClearArea();
              }}
            >
              <X size={14} />
              Clear area
            </button>
          )}
        </div>
      )}
      {onSelectArea && (
        <p className="globe-area-hint" role="status">
          {areaNotice ||
            (drawing
              ? "Drag between two points on the globe. Release to filter this panel. Esc cancels."
              : region
                ? `Selected coordinates: ${region.bbox}`
                : "Draw an area to filter the layer and analyze its monthly observations.")}
        </p>
      )}
      <div className={`real-globe-scene ${drawing ? "is-drawing" : ""}`}>
        <SpaceBackdrop />
        <svg
          viewBox="0 0 640 640"
          className="real-globe-svg"
          tabIndex={0}
          role="group"
          aria-label="Globo de dados reais. Arraste para girar. Use as setas ou Home."
          onPointerDown={(e) => {
            if (e.button !== 0 || drag.current || areaDrag.current) return;
            if (drawing) {
              const first = geographicPointer(
                e.currentTarget,
                e.clientX,
                e.clientY,
                view,
              );
              if (!first) {
                setAreaNotice("Start inside the visible planet.");
                return;
              }
              onView(view);
              setProbe(null);
              setAreaNotice("");
              areaDrag.current = { pointerId: e.pointerId, first, view };
              e.currentTarget.setPointerCapture(e.pointerId);
              return;
            }
            // Taking the pointer cancels a programmatic flight at the displayed camera.
            onView(view);
            drag.current = {
              pointerId: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              view,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const selection = areaDrag.current;
            if (selection) {
              if (selection.pointerId !== e.pointerId) return;
              const point = geographicPointer(
                e.currentTarget,
                e.clientX,
                e.clientY,
                selection.view,
              );
              setDraft(point ? selectionBounds(selection.first, point) : null);
              return;
            }
            const start = drag.current;
            if (!start) {
              setProbe(
                drawing
                  ? null
                  : geographicPointer(
                      e.currentTarget,
                      e.clientX,
                      e.clientY,
                      view,
                    ),
              );
              return;
            }
            if (start.pointerId !== e.pointerId) return;
            setProbe(null);
            const factor = 640 / e.currentTarget.getBoundingClientRect().width;
            onView(
              dragGlobe(
                start.view,
                (e.clientX - start.x) * factor,
                (e.clientY - start.y) * factor,
              ),
            );
          }}
          onPointerUp={(e) => {
            const selection = areaDrag.current;
            if (selection && selection.pointerId === e.pointerId) {
              const last = geographicPointer(
                e.currentTarget,
                e.clientX,
                e.clientY,
                selection.view,
              );
              const bbox = last ? selectionBounds(selection.first, last) : null;
              clearDraft();
              if (bbox) {
                setDrawing(false);
                setAreaNotice("");
                onSelectArea?.(bbox);
              } else
                setAreaNotice(
                  "Release inside the planet with a rectangle wider and taller than 0.02°.",
                );
            }
            drag.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
            clearDraft();
          }}
          onLostPointerCapture={() => {
            drag.current = null;
            clearDraft();
          }}
          onPointerLeave={() => setProbe(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelDrawing();
              return;
            }
            if (areaDrag.current) return;
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [-25, 0],
              ArrowRight: [25, 0],
              ArrowUp: [0, -25],
              ArrowDown: [0, 25],
            };
            if (moves[e.key]) {
              e.preventDefault();
              onView(dragGlobe(view, ...moves[e.key]));
            }
            if (e.key === "Home") {
              e.preventDefault();
              onView({ ...initialGlobeView, showLayer: view.showLayer });
            }
          }}
        >
          <defs>
            <clipPath id={id}>
              <circle cx="320" cy="320" r="270" />
            </clipPath>
          </defs>
          <g
            transform={`translate(320,320) scale(${view.zoom}) translate(-320,-320)`}
          >
            <circle cx="320" cy="320" r="278" fill="#548fdf" opacity=".16" />
            <circle cx="320" cy="320" r="270" fill="#0b1830" />
            <path d={paths.land} fill="#566b80" />
            <GlobeSurface
              longitude={view.longitude}
              latitude={view.latitude}
              frame={frame}
              colorRange={colorRange}
              showField={view.showLayer}
              onUnavailable={() => setUnavailable(true)}
            />
            <g clipPath={`url(#${id})`} pointerEvents="none">
              <path
                d={paths.land}
                fill="none"
                stroke="#dbeaff"
                strokeWidth=".7"
                opacity=".55"
              />
              <path
                d={paths.grid}
                fill="none"
                stroke="#ffffff"
                strokeWidth=".5"
                opacity=".18"
              />
              {draftOutline && (
                <path d={draftOutline} className="globe-draft-outline" />
              )}
              {region && (
                <g aria-label={`Recorte da série: ${region.name}`}>
                  <path
                    d={outline}
                    fill="none"
                    stroke="#12201a"
                    strokeWidth="3.2"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={outline}
                    fill="none"
                    stroke="#f3dea0"
                    strokeWidth="1.4"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )}
            </g>
          </g>
        </svg>
      </div>
      {region && (
        <p className="real-region-outline-note">
          Contorno: recorte da série; não área do evento · {region.name}
        </p>
      )}
      <div className="real-globe-actions">
        <small>Arraste para girar · setas no teclado</small>
        <div>
          <button
            aria-label="Aproximar globo real"
            onClick={() =>
              onView({ ...view, zoom: Math.min(1.8, view.zoom + 0.2) })
            }
          >
            <Plus size={17} />
          </button>
          <button
            aria-label="Afastar globo real"
            onClick={() =>
              onView({ ...view, zoom: Math.max(0.8, view.zoom - 0.2) })
            }
          >
            <Minus size={17} />
          </button>
          <button
            aria-label="Restaurar globo real"
            onClick={() =>
              onView({ ...initialGlobeView, showLayer: view.showLayer })
            }
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      {probe && frame && view.showLayer && (
        <p className="real-grid-info">
          Célula de exibição em {probe[1].toFixed(1)}°, {probe[0].toFixed(1)}°:{" "}
          <strong>
            {hiddenSample
              ? "Outside selected range (hidden)"
              : Number.isFinite(sampled)
                ? `${sampled.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${realUnit(frame.unit)}`
                : "sem dado"}
          </strong>
        </p>
      )}
      {unavailable && (
        <p role="alert">
          WebGL indisponível neste navegador. A camada de dados não pôde ser
          desenhada; a série permanece disponível.
        </p>
      )}
      {scale && frame && (
        <div className="real-legend">
          <div>
            <span>
              {scale.domain[0]} {realUnit(frame.unit)}
            </span>
            <span>
              {scale.domain[1]} {realUnit(frame.unit)}
            </span>
          </div>
          <i
            style={{
              background: `linear-gradient(90deg,${
                scale.kind === "categorical"
                  ? scale.colors
                      .map(
                        (color, index) =>
                          `${color} ${(index * 100) / scale.colors.length}%, ${color} ${((index + 1) * 100) / scale.colors.length}%`,
                      )
                      .join(",")
                  : scale.colors.join(",")
              })`,
            }}
          />
          <small>
            {scale.kind === "categorical"
              ? "Classes discretas"
              : colorRange
                ? colorRange.hideOutside
                  ? "Custom range · outside values hidden"
                  : "Custom scale · colors saturate at limits"
                : "Default scale · colors saturate at limits"}{" "}
            ·{" "}
            {colorRange?.hideOutside && scale.kind === "continuous"
              ? "transparent = no data or outside range"
              : "transparent = no data"}
          </small>
          {scale.categories && (
            <div className="real-category-labels">
              {scale.categories.map((category) => (
                <span key={category.value}>
                  {category.value}: {category.label}
                </span>
              ))}
            </div>
          )}
          {scale.kind === "continuous" && onColorRange && (
            <ColorScaleControls
              key={frame.variable}
              domain={realScale(frame).domain}
              unit={realUnit(frame.unit)}
              value={colorRange}
              onChange={onColorRange}
            />
          )}
        </div>
      )}
    </div>
  );
}
