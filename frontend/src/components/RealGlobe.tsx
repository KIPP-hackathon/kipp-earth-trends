import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { Layers3, Minus, Plus, RotateCcw, Scan, X } from "lucide-react";
import { GlobeSurface } from "./GlobeSurface";
import { WindArrows } from "./WindArrows";
import { pairWindFrames, sampleWind, windComponents } from "../lib/wind";
import "./wind-arrows.css";
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
import type { MapLayer } from "../lib/layers";
import { displayScale, realMonth, realScale, realUnit } from "../lib/earthApi";
import { countryLabels, countryBorderGeometry } from "../lib/globeLabels";
import {
  clampGlobeZoom,
  MIN_GLOBE_ZOOM,
  MAX_GLOBE_ZOOM,
} from "../lib/globeZoom";
import "./globe-navigation.css";
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
  layers,
  windFrames = {},
  view,
  onView,
  onNavigate,
  region,
  outlineGeometry,
  colorRange,
  onColorRange,
  onSelectArea,
  onClearArea,
}: {
  frame?: EarthFrame;
  layers?: MapLayer[];
  windFrames?: Record<string, EarthFrame>;
  region?: EarthRegion;
  outlineGeometry?: GeoPermissibleObjects;
  colorRange?: EarthColorRange;
  onColorRange?: (value?: EarthColorRange) => void;
  onSelectArea?: (bbox: string) => void;
  onClearArea?: () => void;
  view: GlobeView;
  onView: (view: GlobeView) => void;
  onNavigate?: (view: GlobeView) => void;
}) {
  const [land, setLand] = useState<GeoPermissibleObjects | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [probe, setProbe] = useState<[number, number] | null>(null);
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewportPixels, setViewportPixels] = useState(440);
  const live = useRef({ view, onView });
  live.current = { view, onView };
  const touches = useRef(new Map<number, [number, number]>());
  const pinch = useRef<{ distance: number; view: GlobeView } | null>(null);
  const pinching = useRef(false);
  const zoomBy = (factor: number) =>
    (onNavigate ?? onView)({
      ...view,
      zoom: clampGlobeZoom(view.zoom * factor),
    });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() =>
      setViewportPixels(svg.getBoundingClientRect().width || 440),
    );
    observer.observe(svg);
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const current = live.current;
      const delta = Math.max(
        -120,
        Math.min(
          120,
          event.deltaY *
            (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 200 : 1),
        ),
      );
      clearDraft();
      setDrawing(false);
      setProbe(null);
      current.onView({
        ...current.view,
        zoom: clampGlobeZoom(current.view.zoom * Math.exp(-delta * 0.006)),
      });
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      svg.removeEventListener("wheel", wheel);
    };
  }, []);
  const labels = useMemo(
    () => countryLabels(view, viewportPixels),
    [view.longitude, view.latitude, view.zoom, viewportPixels],
  );
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
  const showCountryBorders = view.zoom >= 1.4;
  const paths = useMemo(() => {
    const path = geoPath(globeProjection(view)).digits(1);
    return {
      land: land ? (path(land) ?? "") : "",
      grid: path(geoGraticule10()) ?? "",
      countries: showCountryBorders
        ? (path(countryBorderGeometry()) ?? "")
        : "",
    };
  }, [view.longitude, view.latitude, land, showCountryBorders]);
  const outline = useMemo(() => {
    const boundary =
      outlineGeometry ?? (region ? regionBoundary(region.bbox) : null);
    return boundary
      ? (geoPath(globeProjection(view)).digits(1)(boundary) ?? "")
      : "";
  }, [view.longitude, view.latitude, region?.bbox, outlineGeometry]);
  const scale =
    layers === undefined && frame ? displayScale(frame, colorRange) : null;
  const effectiveLayers = layers?.filter(
    (layer) =>
      layer.visible &&
      Number.isFinite(layer.opacity) &&
      layer.opacity > 0 &&
      layer.frame,
  );
  const probeLayer = view.showLayer
    ? layers === undefined
      ? { frame, colorRange }
      : effectiveLayers?.length === 1
        ? effectiveLayers[0]
        : undefined
    : undefined;
  const probeFrame = probeLayer?.frame;
  const probeRange = probeLayer?.colorRange;
  const probeScale = probeFrame ? displayScale(probeFrame, probeRange) : null;
  const cellIndex =
    probeFrame && probe ? frameCellIndex(probeFrame.grid, probe) : -1;
  const sampled =
    probeFrame && cellIndex >= 0 && probeFrame.coverage[cellIndex] > 0
      ? probeFrame.values[cellIndex]
      : NaN;
  const hiddenSample =
    probeScale?.kind === "continuous" &&
    probeRange?.hideOutside &&
    Number.isFinite(sampled) &&
    (sampled < probeScale.domain[0] || sampled > probeScale.domain[1]);
  const windPair = probeFrame ? windComponents(probeFrame.variable) : undefined;
  const windField = windPair
    ? pairWindFrames(windFrames[windPair.eastward], windFrames[windPair.northward])
    : undefined;
  const probedWind = windField && windField.eastward.month === probeFrame?.month
    ? sampleWind(windField, cellIndex) : undefined;
  const windLevels = [...new Set((effectiveLayers ?? []).flatMap(layer => {
    const pair = windComponents(layer.id);
    return pair ? [pair.level] : [];
  }))];
  return (
    <div className="real-globe">
      <div className="real-globe-toolbar">
        <span className="real-globe-month">{frame ? realMonth(frame.month) : "Monthly field"}</span>
        <div className="globe-area-controls" role="group" aria-label="Globe data and area controls">
          <button
            type="button"
            aria-pressed={view.showLayer}
            onClick={() => onView({ ...view, showLayer: !view.showLayer })}
          >
            <Layers3 size={14} /> Data layer
          </button>
          {onSelectArea && (
            <>
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
            </>
          )}
        </div>
      </div>
      {onSelectArea && (drawing || areaNotice) && (
        <p className="globe-area-hint" role="status">
          {areaNotice || "Drag between two points on the globe. Release to analyze this area. Esc cancels."}
        </p>
      )}
      <div
        className={`real-globe-scene ${drawing ? "is-drawing" : ""}${view.zoom > 1.18 ? " is-zoomed" : ""}`}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 640 640"
          className="real-globe-svg"
          tabIndex={0}
          role="group"
          aria-label="Earth data globe. Drag or use arrow keys to rotate. Plus and minus zoom. Ctrl or Command with scroll, or touch pinch, zooms. Home resets the camera."
          onDoubleClick={(e) => {
            if (drawing || areaDrag.current || pinching.current) return;
            const point = geographicPointer(
              e.currentTarget,
              e.clientX,
              e.clientY,
              view,
            );
            if (point)
              (onNavigate ?? onView)({
                ...view,
                longitude: point[0],
                latitude: point[1],
                zoom: clampGlobeZoom(view.zoom * 1.6),
              });
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") {
              touches.current.set(e.pointerId, [e.clientX, e.clientY]);
              if (touches.current.size >= 2) {
                e.currentTarget.setPointerCapture(e.pointerId);
                const [first, second] = [...touches.current.values()];
                pinch.current = {
                  distance: Math.max(
                    1,
                    Math.hypot(second[0] - first[0], second[1] - first[1]),
                  ),
                  view,
                };
                pinching.current = true;
                drag.current = null;
                clearDraft();
                setDrawing(false);
                setProbe(null);
                onView(view);
                return;
              }
            }
            if (
              e.button !== 0 ||
              drag.current ||
              areaDrag.current ||
              pinching.current
            )
              return;
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
            if (touches.current.has(e.pointerId))
              touches.current.set(e.pointerId, [e.clientX, e.clientY]);
            if (pinching.current) {
              if (touches.current.size === 2 && pinch.current) {
                const [first, second] = [...touches.current.values()];
                const distance = Math.hypot(
                  second[0] - first[0],
                  second[1] - first[1],
                );
                onView({
                  ...pinch.current.view,
                  zoom: clampGlobeZoom(
                    (pinch.current.view.zoom * distance) /
                      pinch.current.distance,
                  ),
                });
              }
              return;
            }
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
                drawing || !probeFrame
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
            touches.current.delete(e.pointerId);
            if (pinching.current) {
              drag.current = null;
              clearDraft();
              if (!touches.current.size) {
                pinching.current = false;
                pinch.current = null;
              }
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
              return;
            }
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
          onPointerCancel={(e) => {
            touches.current.delete(e.pointerId);
            drag.current = null;
            clearDraft();
            if (!touches.current.size) {
              pinching.current = false;
              pinch.current = null;
            }
          }}
          onLostPointerCapture={(e) => {
            touches.current.delete(e.pointerId);
            drag.current = null;
            clearDraft();
            if (!touches.current.size) {
              pinching.current = false;
              pinch.current = null;
            }
          }}
          onPointerLeave={() => setProbe(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelDrawing();
              return;
            }
            if (areaDrag.current || pinching.current) return;
            if (["+", "=", "-", "_"].includes(e.key)) {
              e.preventDefault();
              zoomBy(e.key === "+" || e.key === "=" ? 1.35 : 1 / 1.35);
              return;
            }
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
              (onNavigate ?? onView)({
                ...initialGlobeView,
                showLayer: view.showLayer,
              });
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
          </g>
          <GlobeSurface
            viewportZoom={view.zoom}
            longitude={view.longitude}
            latitude={view.latitude}
            frame={frame && !windComponents(frame.variable) ? frame : undefined}
            layers={layers?.filter(layer => !windComponents(layer.id))}
            colorRange={colorRange}
            showField={view.showLayer}
            onUnavailable={() => setUnavailable(true)}
          />
          <g
            transform={`translate(320,320) scale(${view.zoom}) translate(-320,-320)`}
          >
            <g clipPath={`url(#${id})`} pointerEvents="none">
              <path
                d={paths.land}
                fill="none"
                stroke="#dbeaff"
                strokeWidth=".7"
                opacity=".55"
              />
              {showCountryBorders && (
                <path
                  d={paths.countries}
                  fill="none"
                  stroke="#eef5ff"
                  strokeWidth="1.1"
                  vectorEffect="non-scaling-stroke"
                  opacity=".6"
                />
              )}
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
                <g aria-label={`Series area: ${region.name}`}>
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
          {view.showLayer && layers && <WindArrows layers={layers} frames={windFrames}
            view={view} viewportPixels={viewportPixels} />}
          <g
            className="globe-country-labels"
            pointerEvents="none"
            aria-hidden="true"
          >
            {labels.map((label) => (
              <text
                key={label.id}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={label.fontSize}
                opacity={label.opacity}
              >
                {label.name}
              </text>
            ))}
          </g>
        </svg>
      </div>
      <div className="real-globe-actions">
        <div>
          <output
            className="globe-zoom-level"
            aria-live="off"
            aria-label="Globe zoom"
          >
            {view.zoom.toFixed(1)}×
          </output>
          <button
            aria-label="Zoom in"
            disabled={view.zoom >= MAX_GLOBE_ZOOM}
            onClick={() => zoomBy(1.35)}
          >
            <Plus size={17} />
          </button>
          <button
            aria-label="Zoom out"
            disabled={view.zoom <= MIN_GLOBE_ZOOM}
            onClick={() => zoomBy(1 / 1.35)}
          >
            <Minus size={17} />
          </button>
          <button
            aria-label="Reset camera"
            onClick={() =>
              (onNavigate ?? onView)({
                ...initialGlobeView,
                showLayer: view.showLayer,
              })
            }
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      {view.showLayer && windLevels.length > 0 && <p className="real-wind-note">
        <span aria-hidden="true">↗</span> Wind flow · {windLevels.join(" / ")} · arrows point toward flow.
        {" "}Monthly MERRA-2 reanalysis; fixed arrow length, color = selected component (m/s).
      </p>}
      {probe && probeFrame && view.showLayer && (
        <p className="real-grid-info">
          Display cell at {probe[1].toFixed(1)}°, {probe[0].toFixed(1)}°:{" "}
          <strong>
            {hiddenSample
              ? "Outside selected range (hidden)"
              : Number.isFinite(sampled)
                ? `${sampled.toLocaleString("en", { maximumFractionDigits: 2 })} ${realUnit(probeFrame.unit)}`
                : "no data"}
          </strong>
          {!hiddenSample && windPair && (probedWind ? <>
            {" · "}{probedWind.bearing === null ? "Calm monthly resultant; direction undefined" :
              `Flow toward ${Math.round(probedWind.bearing) % 360}° clockwise from north`}
            {" · "}monthly resultant {probedWind.resultant.toFixed(2)} m/s
            {" · "}U {probedWind.u.toFixed(2)}, V {probedWind.v.toFixed(2)} m/s
          </> : " · no paired wind direction for this cell")}
        </p>
      )}
      {unavailable && (
        <p role="alert">
          WebGL is unavailable. The image basemap and color fields could not be drawn;
          wind arrows and monthly series remain available when their data is loaded.
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
              ? "Discrete classes"
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
            <details className="compact-color-settings">
              <summary>Adjust color range</summary>
              <ColorScaleControls
                key={frame.variable}
                domain={realScale(frame).domain}
                unit={realUnit(frame.unit)}
                value={colorRange}
                onChange={onColorRange}
              />
            </details>
          )}
        </div>
      )}
    </div>
  );
}
