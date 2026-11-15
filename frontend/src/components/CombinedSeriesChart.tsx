import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChartInfo } from "./ChartInfo";
import { formatTrendValue, monthIndex } from "../lib/trendLab";
import type { ChartPoint } from "../lib/seriesChart";
import { trailingMean, yearTicks } from "../lib/seriesChart";

export type CombinedSeries = {
  name: string;
  unit: string;
  color: string;
  points: ChartPoint[];
  /** Month highlighted for this series (can differ per series with a lag). */
  selected: string;
};

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined ? "unavailable" : formatTrendValue(v);
const tickLabel = (v: number) =>
  v.toLocaleString("en", { maximumSignificantDigits: 3 });

/** Departure charts are symmetric around zero so both axes share one zero line. */
function extent(rows: ChartPoint[][], centered: boolean): [number, number] {
  const values = rows.flatMap((r) =>
    r.flatMap((p) => (p.value === null ? [] : [p.value])),
  );
  if (!values.length) return [0, 1];
  if (centered) {
    const m = Math.max(...values.map(Math.abs)) * 1.08 || 1;
    return [-m, m];
  }
  const lo = Math.min(...values),
    hi = Math.max(...values);
  const pad = (hi - lo) * 0.08 || 1;
  return [lo - pad, hi + pad];
}

/**
 * One time axis for one or two monthly series. Different units get their own
 * left/right value axes; identical units share a single axis.
 */
export function CombinedSeriesChart({
  series,
  start,
  end,
  zeroLine = false,
  info,
  onSelect,
}: {
  info?: ReactNode;
  series: CombinedSeries[];
  start: string;
  end: string;
  zeroLine?: boolean;
  onSelect: (seriesIndex: number, month: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [smooth, setSmooth] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(280, entries[0].contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const shared =
    series.length < 2 || series.every((s) => s.unit === series[0].unit);
  const smoothed = series.map((s) => trailingMean(s.points));
  const domains = shared
    ? series.map(() =>
        extent(
          series.map((s) => s.points),
          zeroLine,
        ),
      )
    : series.map((s) => extent([s.points], zeroLine));
  const hasValues = series.some((s) => s.points.some((p) => p.value !== null));

  const height = 260,
    left = 58,
    right = width - (shared ? 16 : 58),
    top = 14,
    bottom = 222;
  const t0 = monthIndex(start)!,
    t1 = monthIndex(end)!;
  const x = (m: string) =>
    left + ((monthIndex(m)! - t0) / Math.max(1, t1 - t0)) * (right - left);
  const y = (i: number, v: number) => {
    const [min, max] = domains[i];
    return bottom - ((v - min) / (max - min)) * (bottom - top);
  };
  const path = (i: number, rows: ChartPoint[]) => {
    let connected = false;
    return rows
      .map((p) => {
        if (p.value === null) {
          connected = false;
          return "";
        }
        const c = connected ? "L" : "M";
        connected = true;
        return `${c}${x(p.month).toFixed(1)},${y(i, p.value).toFixed(1)}`;
      })
      .join(" ");
  };
  const months = series[0]?.points.map((p) => p.month) ?? [];
  const nearest = (clientX: number, svg: SVGSVGElement) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * width;
    const index = Math.round(
      t0 + ((px - left) / (right - left)) * Math.max(1, t1 - t0),
    );
    const clamped = Math.min(t1, Math.max(t0, index));
    return (
      months.find((m) => monthIndex(m) === clamped) ??
      months.at(clamped < t0 ? 0 : -1) ??
      null
    );
  };
  const ticks = yearTicks(start, end, Math.max(3, Math.floor(width / 90)));
  const valueAt = (s: CombinedSeries, month: string) =>
    s.points.find((p) => p.month === month)?.value;

  return (
    <div className="investigation-chart" ref={ref}>
      <div className="combined-chart-legend">
        {series.map((s, i) => (
          <span key={s.name} style={{ color: s.color }}>
            <i style={{ background: s.color }} />
            {s.name}
            <small>
              {s.unit}
              {!shared && (i === 0 ? " · left axis" : " · right axis")}
            </small>
          </span>
        ))}
        {info && <ChartInfo label="What this chart shows">{info}</ChartInfo>}
        <button
          type="button"
          aria-pressed={smooth}
          onClick={() => setSmooth(!smooth)}
        >
          12-month mean
        </button>
      </div>
      {!hasValues ? (
        <p className="trend-notice">
          No values available for this representation. Check coverage and
          reference counts.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${series.map((s) => `${s.name} (${s.unit})`).join(" and ")}, ${start} to ${end}`}
          onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            const month = nearest(e.clientX, e.currentTarget);
            if (month) onSelect(0, month);
          }}
        >
          {ticks.map((m) => (
            <g key={m}>
              <line
                x1={x(m)}
                x2={x(m)}
                y1={top}
                y2={bottom}
                stroke="#a2bfe51a"
              />
              <text
                x={x(m)}
                y={bottom + 18}
                textAnchor="middle"
                fill="#b4c4da"
                fontSize="11"
              >
                {m.slice(0, 4)}
              </text>
            </g>
          ))}
          {domains.slice(0, shared ? 1 : 2).map(([min, max], i) =>
            (zeroLine ? [0, 0.25, 0.5, 0.75, 1] : [0, 1 / 3, 2 / 3, 1]).map(
              (f) => {
                const value = min + (max - min) * f;
                return (
                  <g key={`${i}-${f}`}>
                    {i === 0 && (
                      <line
                        x1={left}
                        x2={right}
                        y1={y(0, value)}
                        y2={y(0, value)}
                        stroke="#a2bfe52b"
                      />
                    )}
                    <text
                      x={i === 0 ? left - 7 : right + 7}
                      y={y(i, value) + 4}
                      textAnchor={i === 0 ? "end" : "start"}
                      fill={shared ? "#b4c4da" : series[i].color}
                      fontSize="10"
                    >
                      {tickLabel(value)}
                    </text>
                  </g>
                );
              },
            ),
          )}
          {zeroLine && (
            <line
              x1={left}
              x2={right}
              y1={y(0, 0)}
              y2={y(0, 0)}
              stroke="#e6edf7"
              strokeOpacity="0.45"
              strokeDasharray="4 4"
            />
          )}
          {series.map((s, i) => (
            <path
              key={`raw-${s.name}`}
              d={path(i, s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth={smooth ? 1 : 1.5}
              strokeOpacity={smooth ? 0.4 : 1}
            />
          ))}
          {smooth &&
            series.map((s, i) => (
              <path
                key={`smooth-${s.name}`}
                d={path(i, smoothed[i])}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
              />
            ))}
          {series.map((s, i) => {
            const v = valueAt(s, s.selected);
            return v === null || v === undefined ? null : (
              <g key={`sel-${s.name}`}>
                <line
                  x1={x(s.selected)}
                  x2={x(s.selected)}
                  y1={top}
                  y2={bottom}
                  stroke={s.color}
                  strokeDasharray="2 3"
                />
                <circle
                  cx={x(s.selected)}
                  cy={y(i, v)}
                  r="5"
                  fill={s.color}
                  stroke="#07111f"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
          {hover && (
            <g pointerEvents="none">
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={top}
                y2={bottom}
                stroke="#e6edf7"
                strokeOpacity="0.5"
              />
              {series.map((s, i) => {
                const v = valueAt(s, hover);
                return v === null || v === undefined ? null : (
                  <circle
                    key={`hover-${s.name}`}
                    cx={x(hover)}
                    cy={y(i, v)}
                    r="3.5"
                    fill={s.color}
                  />
                );
              })}
            </g>
          )}
          <rect
            x={left}
            y={top}
            width={Math.max(0, right - left)}
            height={bottom - top}
            fill="transparent"
            style={{ cursor: "crosshair" }}
          />
        </svg>
      )}
      <p className="trend-small combined-chart-readout" aria-live="polite">
        {series.map((s, i) => {
          const month = hover ?? s.selected;
          const mean = smoothed[i].find((p) => p.month === month)?.value;
          return (
            <span key={s.name}>
              <b style={{ color: s.color }}>{month}</b> {s.name}:{" "}
              {fmt(valueAt(s, month))} {s.unit}
              {smooth && mean !== null && mean !== undefined
                ? ` (12-mo mean ${fmt(mean)})`
                : ""}
            </span>
          );
        })}
      </p>
      <p className="trend-small">
        Thin line: monthly values. Thick line: trailing 12-month mean, shown
        only where all 12 months are valid; it smooths the seasonal cycle and is
        not a fitted trend.
        {!shared &&
          " Each indicator uses its own vertical scale; line crossings carry no meaning."}{" "}
        Click the chart to inspect a month.
      </p>
    </div>
  );
}
