import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { geoPath, geoGraticule10 } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { Compass, Layers3, Minus, Plus, LocateFixed, Move } from "lucide-react";
import { regions, variables, formatValue } from "../lib/analysis";
import {
  getSpatialFrame,
  getColorScale,
  formatMonth,
  spatialCells,
} from "../lib/playback";
import type { PlaybackState, PlaybackAction, MapMode } from "../lib/playback";
import { initialGlobeView } from "../lib/comparison";
import type { GlobeView } from "../lib/comparison";
import {
  dragGlobe,
  globeProjection,
  visibleOnGlobe,
} from "../lib/globeProjection";
import { PlaybackControls } from "./PlaybackControls";
import { GlobeSurface } from "./GlobeSurface";
import type { RegionId, Variable } from "../lib/analysis";

const originalProjection = globeProjection(initialGlobeView);
const geographicCells = Object.fromEntries(
  regions.map((r) => [
    r.id,
    spatialCells[r.id].map((cell) => {
      const ring = cell.points
        .split(" ")
        .map((point) =>
          originalProjection.invert!(
            point.split(",").map(Number) as [number, number],
          )!,
        );
      return { type: "Polygon" as const, coordinates: [[...ring, ring[0]]] };
    }),
  ]),
) as Record<string, { type: "Polygon"; coordinates: number[][][] }[]>;

type Props = {
  region: RegionId;
  variable: Variable;
  onRegion: (id: RegionId) => void;
  timeline: PlaybackState;
  onAction: (action: PlaybackAction) => void;
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  view?: GlobeView;
  onViewChange?: (view: GlobeView) => void;
};

export const Globe = memo(function Globe({
  region,
  variable,
  onRegion,
  timeline,
  onAction,
  mode,
  onModeChange,
  view: controlledView,
  onViewChange,
}: Props) {
  const [land, setLand] = useState<GeoPermissibleObjects | null>(null);
  useEffect(() => {
    let mounted = true;
    import("../lib/land.geo.json")
      .then((module) => {
        if (mounted) setLand(module.default as GeoPermissibleObjects);
      })
      .catch(() => {
        /* Textured globe remains available if boundaries cannot load. */
      });
    return () => {
      mounted = false;
    };
  }, []);
  const [localView, setLocalView] = useState(initialGlobeView);
  const view = controlledView ?? localView;
  const changeView = (next: GlobeView) =>
    onViewChange ? onViewChange(next) : setLocalView(next);
  const id = useId().replace(/:/g, "");
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    view: GlobeView;
  } | null>(null);
  const didDrag = useRef(false);
  const current = regions.find((r) => r.id === region)!;
  const color = variables[variable].color;
  const frames = useMemo(
    () =>
      regions.map((r) => getSpatialFrame(r.id, variable, timeline.frame, mode)),
    [variable, timeline.frame, mode],
  );
  const currentFrame = frames[regions.findIndex((r) => r.id === region)];
  const scale = getColorScale(variable, mode);
  const projection = useMemo(
    () => globeProjection(view),
    [view.longitude, view.latitude],
  );
  const paths = useMemo(() => {
    const path = geoPath(projection).digits(1);
    return {
      land: land ? (path(land) ?? "") : "",
      grid: path(geoGraticule10()) ?? "",
      cells: Object.fromEntries(
        regions.map((r) => [
          r.id,
          geographicCells[r.id].map((cell) => path(cell) ?? ""),
        ]),
      ) as Record<RegionId, string[]>,
    };
  }, [projection, land]);
  return (
    <section
      className="globe-panel living-globe"
      aria-label="Exploração geográfica"
      style={
        {
          "--frame-duration": `${Math.min(160, 350 / timeline.speed)}ms`,
        } as React.CSSProperties
      }
    >
      <div className="map-topline">
        <span>
          <i className="live-dot" /> PERSPECTIVA DA TERRA
        </span>
        <button
          className={`layer-button ${view.showLayer ? "selected" : ""}`}
          onClick={() => changeView({ ...view, showLayer: !view.showLayer })}
          aria-pressed={view.showLayer}
        >
          <Layers3 size={14} /> Campo simulado
        </button>
      </div>
      <div
        className="map-mode-switch"
        role="group"
        aria-label="Visualização do campo mensal"
      >
        <button
          onClick={() => onModeChange("absolute")}
          aria-pressed={mode === "absolute"}
        >
          Valores
        </button>
        <button
          onClick={() => onModeChange("anomaly")}
          aria-pressed={mode === "anomaly"}
        >
          Anomalias
        </button>
      </div>
      <div className="map-coordinate">
        {Math.abs(view.latitude).toFixed(0)}° {view.latitude < 0 ? "S" : "N"},{" "}
        {Math.abs(view.longitude).toFixed(0)}° {view.longitude < 0 ? "O" : "L"}
        <span>BASE VISUAL GLOBAL · DADOS EM 3 REGIÕES</span>
      </div>
      <div className="globe-stage">
        <svg
          className="globe-svg interactive-globe"
          viewBox="0 0 640 640"
          role="group"
          tabIndex={0}
          aria-label="Globo interativo. Arraste para girar ou use as setas do teclado. Home restaura a vista."
          onPointerDown={(e) => {
            if (e.button !== 0 || drag.current) return;
            drag.current = {
              pointerId: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              view,
            };
            didDrag.current = false;
          }}
          onPointerMove={(e) => {
            if (!drag.current || drag.current.pointerId !== e.pointerId) return;
            const dx = e.clientX - drag.current.x,
              dy = e.clientY - drag.current.y;
            if (!didDrag.current && Math.hypot(dx, dy) < 4) return;
            didDrag.current = true;
            if (!e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.setPointerCapture(e.pointerId);
            const factor = 640 / e.currentTarget.getBoundingClientRect().width;
            changeView(dragGlobe(drag.current.view, dx * factor, dy * factor));
          }}
          onPointerUp={(e) => {
            if (drag.current?.pointerId !== e.pointerId) return;
            drag.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={(e) => {
            if (drag.current?.pointerId === e.pointerId) drag.current = null;
          }}
          onLostPointerCapture={(e) => {
            if (drag.current?.pointerId === e.pointerId) drag.current = null;
          }}
          onPointerLeave={(e) => {
            if (
              drag.current?.pointerId === e.pointerId &&
              !e.currentTarget.hasPointerCapture(e.pointerId)
            )
              drag.current = null;
          }}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [-25, 0],
              ArrowRight: [25, 0],
              ArrowUp: [0, -25],
              ArrowDown: [0, 25],
            };
            if (moves[e.key]) {
              e.preventDefault();
              changeView(dragGlobe(view, ...moves[e.key]));
            }
            if (e.key === "Home") {
              e.preventDefault();
              changeView({ ...initialGlobeView, showLayer: view.showLayer });
            }
          }}
        >
          <defs>
            <radialGradient id={`${id}-atmosphere`}>
              <stop offset="88%" stopColor="#78afaf" stopOpacity="0" />
              <stop offset="97%" stopColor="#76b4ad" stopOpacity=".2" />
              <stop offset="100%" stopColor="#8dd5c5" stopOpacity="0" />
            </radialGradient>
            <filter id={`${id}-glow`}>
              <feGaussianBlur stdDeviation="5" />
            </filter>
            <clipPath id={`${id}-clip`}>
              <circle cx="320" cy="320" r="270" />
            </clipPath>
          </defs>
          <circle cx="320" cy="320" r="289" fill={`url(#${id}-atmosphere)`} />
          <g
            transform={`translate(320,320) scale(${view.zoom}) translate(-320,-320)`}
          >
            <circle cx="320" cy="320" r="270" fill="#102e30" />
            <path d={paths.land} fill="#365343" />
            <GlobeSurface longitude={view.longitude} latitude={view.latitude} />
            <g clipPath={`url(#${id}-clip)`}>
              <path
                d={paths.land}
                fill="none"
                stroke="#a9c3b7"
                strokeWidth=".65"
                opacity=".4"
              />
              <path
                d={paths.grid}
                fill="none"
                stroke="#a6c7bc"
                strokeWidth=".45"
                opacity=".15"
              />
              {view.showLayer &&
                frames.map((frame, ri) => (
                  <g
                    key={regions[ri].id}
                    opacity={region === regions[ri].id ? 0.92 : 0.28}
                    aria-hidden="true"
                  >
                    {frame.cells.map((cell, i) => (
                      <path
                        key={i}
                        className="climate-cell"
                        data-value={cell.value.toFixed(5)}
                        d={paths.cells[regions[ri].id][i]}
                        fill={cell.color}
                        stroke="#f4f2de"
                        strokeOpacity=".18"
                        strokeWidth=".35"
                      >
                        <title>
                          {regions[ri].short} · {formatMonth(timeline.frame)} ·{" "}
                          {formatValue(
                            cell.value,
                            variable,
                            mode === "anomaly",
                          )}{" "}
                          {variables[variable].unit} · simulado
                        </title>
                      </path>
                    ))}
                  </g>
                ))}
            </g>
            <circle
              cx="320"
              cy="320"
              r="270"
              fill="none"
              stroke="#c7e0ce"
              strokeOpacity=".2"
            />
            {regions
              .filter((r) => visibleOnGlobe(view, [...r.location]))
              .map((r) => {
                const [x, y] = projection([...r.location])!;
                const choose = () => {
                  if (!didDrag.current) {
                    onRegion(r.id);
                    changeView({
                      ...view,
                      longitude: r.location[0],
                      latitude: r.location[1],
                    });
                  }
                };
                return (
                  <g key={r.id} className="map-point" onClick={choose}>
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={`Investigar ${r.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRegion(r.id);
                          changeView({
                            ...view,
                            longitude: r.location[0],
                            latitude: r.location[1],
                          });
                        }
                      }}
                    >
                      <circle cx={x} cy={y} r="20" fill="transparent" />
                      {region === r.id && (
                        <>
                          <circle
                            cx={x}
                            cy={y}
                            r="16"
                            fill={color}
                            opacity=".25"
                            filter={`url(#${id}-glow)`}
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="13"
                            stroke={color}
                            fill="none"
                            strokeOpacity=".5"
                          />
                        </>
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={region === r.id ? 4.5 : 3}
                        fill={region === r.id ? "#fff8e9" : "#c5cdbf"}
                      />
                    </g>
                    <path
                      d={`M${x + 9},${y - 9} l18,-16 h82`}
                      stroke={region === r.id ? color : "#a8b3a1"}
                      strokeWidth=".7"
                      fill="none"
                      opacity=".7"
                    />
                    <text
                      x={x + 32}
                      y={y - 32}
                      fill={region === r.id ? "#f5f4e7" : "#abb9aa"}
                      fontSize="10"
                      fontWeight={region === r.id ? 700 : 500}
                    >
                      {r.short}
                    </text>
                  </g>
                );
              })}
          </g>
        </svg>
      </div>
      <div className="globe-drag-hint">
        <Move size={11} /> Arraste para girar · setas no teclado
      </div>
      <div className="map-frame-card">
        <span>
          <i
            className={
              timeline.playing ? "frame-live is-playing" : "frame-live"
            }
          />
          {formatMonth(timeline.frame)} · {current.short}
        </span>
        <output aria-label="Média regional simulada do mês">
          {formatValue(currentFrame.mean, variable, mode === "anomaly")}
          <small>{variables[variable].unit}</small>
        </output>
        <small>
          {mode === "anomaly"
            ? "Diferença para o mesmo mês · ref. 2001–2024"
            : "Valor mensal · média regional simulada"}
        </small>
      </div>
      <div className="map-tools">
        <span className="compass">
          <Compass size={19} />
          <small>N</small>
        </span>
        <div>
          <button
            aria-label="Aproximar globo"
            onClick={() =>
              changeView({ ...view, zoom: Math.min(view.zoom + 0.2, 1.8) })
            }
          >
            <Plus size={17} />
          </button>
          <button
            aria-label="Afastar globo"
            onClick={() =>
              changeView({ ...view, zoom: Math.max(view.zoom - 0.2, 0.8) })
            }
          >
            <Minus size={17} />
          </button>
          <button
            aria-label="Restaurar globo"
            onClick={() =>
              changeView({ ...initialGlobeView, showLayer: view.showLayer })
            }
          >
            <LocateFixed size={16} />
          </button>
        </div>
      </div>
      <div className="map-scale quantitative-scale">
        <span>
          {mode === "anomaly"
            ? "ANOMALIA"
            : variables[variable].short.toUpperCase()}
        </span>
        <i
          style={{
            background: `linear-gradient(90deg,${scale.colors.join(",")})`,
          }}
        />
        <div>
          <span>
            {formatValue(scale.domain[0], variable, mode === "anomaly")}
          </span>
          <span>
            {formatValue(scale.domain[1], variable, mode === "anomaly")}
          </span>
        </div>
        <small>{variables[variable].unit} · escala fixa</small>
      </div>
      <PlaybackControls state={timeline} onAction={onAction} />
    </section>
  );
});
