import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { Layers3, Minus, Plus, RotateCcw } from "lucide-react";
import { GlobeSurface } from "./GlobeSurface";
import { dragGlobe, globeProjection } from "../lib/globeProjection";
import type { GlobeView } from "../lib/comparison";
import { initialGlobeView } from "../lib/comparison";
import type { EarthFrame } from "../lib/earthApi";
import { realMonth, realScale, realUnit } from "../lib/earthApi";

export function RealGlobe({
  frame,
  view,
  onView,
}: {
  frame?: EarthFrame;
  view: GlobeView;
  onView: (view: GlobeView) => void;
}) {
  const [land, setLand] = useState<GeoPermissibleObjects | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [probe, setProbe] = useState<[number, number] | null>(null);
  const id = useId();
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
  const scale = frame ? realScale(frame.variable) : null;
  const cellIndex =
    frame && probe
      ? Math.min(
          frame.grid.height - 1,
          Math.max(0, Math.floor(((90 - probe[1]) / 180) * frame.grid.height)),
        ) *
          frame.grid.width +
        Math.min(
          frame.grid.width - 1,
          Math.max(0, Math.floor(((probe[0] + 180) / 360) * frame.grid.width)),
        )
      : -1;
  const sampled =
    frame && cellIndex >= 0 && frame.coverage[cellIndex] > 0
      ? frame.values[cellIndex]
      : NaN;
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
      <svg
        viewBox="0 0 640 640"
        className="real-globe-svg"
        tabIndex={0}
        role="group"
        aria-label="Globo de dados reais. Arraste para girar. Use as setas ou Home."
        onPointerDown={(e) => {
          if (e.button !== 0 || drag.current) return;
          drag.current = {
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            view,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x =
              (((e.clientX - rect.left) / rect.width) * 640 - 320) / view.zoom +
              320;
            const y =
              (((e.clientY - rect.top) / rect.height) * 640 - 320) / view.zoom +
              320;
            if (Math.hypot(x - 320, y - 320) > 270) {
              setProbe(null);
              return;
            }
            const point = globeProjection(view).invert?.([x, y]);
            setProbe(point && point.every(Number.isFinite) ? point : null);
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
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onPointerLeave={() => setProbe(null)}
        onKeyDown={(e) => {
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
          <circle cx="320" cy="320" r="278" fill="#517e6c" opacity=".16" />
          <circle cx="320" cy="320" r="270" fill="#132c30" />
          <path d={paths.land} fill="#425e45" />
          <GlobeSurface
            longitude={view.longitude}
            latitude={view.latitude}
            frame={frame}
            showField={view.showLayer}
            onUnavailable={() => setUnavailable(true)}
          />
          <g clipPath={`url(#${id})`} pointerEvents="none">
            <path
              d={paths.land}
              fill="none"
              stroke="#d7e6d6"
              strokeWidth=".7"
              opacity=".55"
            />
            <path
              d={paths.grid}
              fill="none"
              stroke="#e9eee0"
              strokeWidth=".5"
              opacity=".18"
            />
          </g>
        </g>
      </svg>
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
            {Number.isFinite(sampled)
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
              background: `linear-gradient(90deg,${scale.colors.join(",")})`,
            }}
          />
          <small>
            Escala fixa · cores saturam nos limites · transparente = sem dado
          </small>
        </div>
      )}
    </div>
  );
}
