import { useId, useMemo, useState } from "react";
import type { Investigation } from "../lib/earthApi";
import { fitLayers } from "../lib/twoLayer";
import { formatTrendValue, monthFromIndex, trendUnit } from "../lib/trendLab";
import { ChartInfo } from "./ChartInfo";

const CYAN = "#84dbe8";
const CORAL = "#f2958a";
const TEXT = "#b4c4da";
const W = 760;
const H = 360;
const LEFT = 84;
const RIGHT = 20;
const TOP = 28;
const BOTTOM = 52;
const Z95 = 1.959963984540054;

const num = (v: number, signed = false) =>
  formatTrendValue(Number(v.toPrecision(3)), signed);
function monthLabel(index: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthFromIndex(index)}-01T00:00:00Z`));
}

/**
 * The Trend view's chart for Y, with the second layer drawn on top: the same
 * trend refitted with X in the model. Dots are real monthly values with the
 * calendar-month effect removed; both lines pivot at the same centre point, so
 * the difference in tilt is the part of the trend that moves with X.
 */
export function LayeredTrend({
  data,
  lag,
  onLag,
  heading = true,
}: {
  data: Investigation;
  lag: number;
  /** When given, shows a lag selector (used where the lag is not set elsewhere). */
  onLag?: (lag: number) => void;
  heading?: boolean;
}) {
  const id = useId();
  const [span, setSpan] = useState(60);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [showResidual, setShowResidual] = useState(false);
  const rel = data.lags[lag];
  const fit = useMemo(() => fitLayers(rel.pairs), [rel]);
  const xName = data.series[0].name;
  const yName = data.series[1].name;
  const unit = trendUnit(data.series[1].unit);
  const xUnit = trendUnit(data.series[0].unit);

  const lagSelect = onLag && (
    <label className="layered-lag">
      X leads Y by
      <select
        aria-label="Lag for the added layer"
        value={lag}
        onChange={(e) => onLag(Number(e.target.value))}
      >
        {data.lags.map((r) => (
          <option key={r.lag} value={r.lag}>
            {r.lag} months
          </option>
        ))}
      </select>
    </label>
  );
  const title = (
    <div className="investigation-heading-row">
      <h3>
        Add the {xName} layer: how does the trend in {yName} change?
      </h3>
      <ChartInfo label="How to read the layered trend">
        <p>
          Dots are monthly regional values of {yName} with the usual seasonal
          pattern removed. The cyan line is its fitted trend on its own.
        </p>
        <p>
          The coral line is the trend after {xName} is also in the model
          ({lag === 0 ? "same month" : `${lag} months earlier`}). Both lines
          pivot at the same centre, so the difference in tilt is the part of the
          trend that moves together with {xName}.
        </p>
        <p>
          This is statistical adjustment, not proof of cause. Shaded bands show
          the 95% uncertainty of each slope; they widen away from the centre.
        </p>
      </ChartInfo>
    </div>
  );
  if (!fit)
    return (
      <section className="layered-trend" aria-label="Layered trend">
        {heading && title}
        {lagSelect}
        <p className="trend-small">
          This view needs at least 24 common month pairs with two of every
          calendar month. Choose a longer period or a lag with more overlap.
        </p>
      </section>
    );

  const d = fit.display;
  const first = d.t[0];
  const last = d.t.at(-1)!;
  const maxSpan = Math.max(1, last - first);
  const months = Math.min(span, maxSpan);
  const from = Math.max(first, Math.min(last - months, anchor ?? first));
  const to = from + months;
  const level = (slope: number, m: number) =>
    d.center.mean + slope * ((m - d.center.t0) / 120 - d.center.tbar);
  const band = (slope: number, se: number | null, m: number): [number, number] | null =>
    se === null
      ? null
      : (() => {
          const v = level(slope, m);
          const w = Z95 * se * Math.abs((m - d.center.t0) / 120 - d.center.tbar);
          return [v - w, v + w];
        })();
  const steps = 60;
  const grid = Array.from(
    { length: steps + 1 },
    (_, i) => first + ((last - first) * i) / steps,
  );
  const bandA = grid.map((m) => band(fit.alone.slope, fit.alone.se, m));
  const bandB = grid.map((m) => band(fit.withX.slope, fit.withX.se, m));
  const showBands = bandA.every(Boolean) && bandB.every(Boolean);

  const values = [
    ...d.y,
    ...(showResidual ? d.yNoX : []),
    ...d.alone.map((p) => p[1]),
    ...d.withX.map((p) => p[1]),
    ...(showBands ? [...bandA, ...bandB].flatMap((b) => b ?? []) : []),
  ];
  const lo0 = Math.min(...values);
  const hi0 = Math.max(...values);
  const pad = (hi0 - lo0 || 1) * 0.1;
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const x = (m: number) => LEFT + ((m - first) / maxSpan) * (W - LEFT - RIGHT);
  const y = (v: number) => TOP + ((hi - v) / (hi - lo)) * (H - TOP - BOTTOM);
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const xTicks = [...new Set([0, 1, 2, 3, 4].map((i) => Math.round(first + (maxSpan * i) / 4)))];
  const polygon = (bands: ([number, number] | null)[]) =>
    [
      ...grid.map((m, i) => `${x(m)},${y(bands[i]![1])}`),
      ...grid.map((m, i) => `${x(m)},${y(bands[i]![0])}`).reverse(),
    ].join(" L ");

  const changeA = fit.alone.slope * (months / 120);
  const changeB = fit.withX.slope * (months / 120);
  const carried = changeA - changeB;
  const date = (m: number) => monthFromIndex(m);
  const marks = [
    { label: "A", m: from },
    { label: "B", m: to },
  ];

  return (
    <section className="layered-trend" aria-label="Layered trend">
      {heading && title}
      <div className="layered-controls">
        {lagSelect}
        <label className="layered-check">
          <input
            type="checkbox"
            checked={showResidual}
            onChange={(e) => setShowResidual(e.target.checked)}
          />
          Also show {yName} with {xName}&apos;s contribution removed
        </label>
      </div>
      <figure className="trend-chart">
        <div className="trend-chart-unit">
          Monthly value, seasonal effect removed ({unit})
        </div>
        <svg
          className="trend-chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: "block", height: "auto" }}
          role="img"
          aria-labelledby={`${id}-t ${id}-d`}
          focusable="false"
        >
          <title id={`${id}-t`}>
            Monthly values with the trend alone and the trend with a second variable held fixed
          </title>
          <desc id={`${id}-d`}>
            {`${fit.n} common months, ${date(first)} to ${date(last)}, in ${unit}. Trend alone ${num(fit.alone.slope, true)} per decade; with ${xName} held fixed ${num(fit.withX.slope, true)} per decade. Over ${months} months from ${date(from)} the lines imply ${num(changeA, true)} and ${num(changeB, true)} ${unit}.`}
          </desc>
          <g fill={TEXT} fontSize="12" fontFamily="inherit">
            {yTicks.map((v, i) => (
              <g key={i}>
                <line
                  x1={LEFT}
                  x2={W - RIGHT}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={TEXT}
                  strokeOpacity="0.13"
                />
                <text x={LEFT - 10} y={y(v) + 4} textAnchor="end">
                  {num(v)}
                </text>
              </g>
            ))}
            {xTicks.map((m, i) => (
              <g key={m}>
                <line
                  x1={x(m)}
                  x2={x(m)}
                  y1={H - BOTTOM}
                  y2={H - BOTTOM + 5}
                  stroke={TEXT}
                  strokeOpacity="0.5"
                />
                <text
                  x={x(m)}
                  y={H - BOTTOM + 22}
                  textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
                >
                  {monthLabel(m)}
                </text>
              </g>
            ))}
          </g>
          {showBands && (
            <>
              <path
                d={`M ${polygon(bandA)} Z`}
                fill={CYAN}
                fillOpacity="0.12"
                stroke="none"
              />
              <path
                d={`M ${polygon(bandB)} Z`}
                fill={CORAL}
                fillOpacity="0.12"
                stroke="none"
              />
            </>
          )}
          {d.t.map((m, i) => (
            <circle
              key={m}
              cx={x(m)}
              cy={y(d.y[i])}
              r="3.2"
              fill={CYAN}
              fillOpacity="0.62"
              stroke="#101c2b"
              strokeWidth="0.8"
            >
              <title>{`${date(m)}: ${num(d.y[i])} ${unit}`}</title>
            </circle>
          ))}
          {showResidual &&
            d.t.map((m, i) => (
              <circle
                key={`r${m}`}
                cx={x(m)}
                cy={y(d.yNoX[i])}
                r="2.8"
                fill="none"
                stroke={CORAL}
                strokeOpacity="0.7"
                strokeWidth="1.2"
              >
                <title>{`${date(m)}: ${num(d.yNoX[i])} ${unit} after removing ${xName}`}</title>
              </circle>
            ))}
          {marks.map(({ label, m }) => (
            <line
              key={label}
              x1={x(m)}
              x2={x(m)}
              y1={TOP}
              y2={H - BOTTOM}
              stroke={TEXT}
              strokeOpacity="0.45"
              strokeDasharray="3 5"
            />
          ))}
          <line
            x1={x(d.alone[0][0])}
            x2={x(d.alone[1][0])}
            y1={y(d.alone[0][1])}
            y2={y(d.alone[1][1])}
            stroke={CYAN}
            strokeWidth="2.8"
          />
          <line
            x1={x(d.withX[0][0])}
            x2={x(d.withX[1][0])}
            y1={y(d.withX[0][1])}
            y2={y(d.withX[1][1])}
            stroke={CORAL}
            strokeWidth="2.8"
          />
          {marks.flatMap(({ label, m }) =>
            [
              { color: CYAN, v: level(fit.alone.slope, m), n: "alone" },
              { color: CORAL, v: level(fit.withX.slope, m), n: `with ${xName}` },
            ].map((p) => (
              <circle
                key={`${label}${p.n}`}
                cx={x(m)}
                cy={y(p.v)}
                r="5.5"
                fill="#0b1727"
                stroke={p.color}
                strokeWidth="2.5"
              >
                <title>{`${label} · ${date(m)}: fitted ${num(p.v)} ${unit} (${p.n})`}</title>
              </circle>
            )),
          )}
          <g fontSize="13" fontWeight="700" fill={TEXT}>
            {marks.map(({ label, m }) => (
              <text key={label} x={x(m)} y={TOP - 8} textAnchor="middle">
                {label}
              </text>
            ))}
          </g>
        </svg>
        <ul className="trend-chart-legend" aria-label="Chart legend">
          <li>
            <svg width="24" height="12" aria-hidden="true">
              <circle cx="12" cy="6" r="3.2" fill={CYAN} />
            </svg>
            Monthly values
          </li>
          <li>
            <svg width="24" height="12" aria-hidden="true">
              <line x1="0" x2="24" y1="6" y2="6" stroke={CYAN} strokeWidth="2.8" />
            </svg>
            Layer 1 · trend alone
          </li>
          <li>
            <svg width="24" height="12" aria-hidden="true">
              <line x1="0" x2="24" y1="6" y2="6" stroke={CORAL} strokeWidth="2.8" />
            </svg>
            Layer 2 · with {xName} held fixed
          </li>
          {showBands && (
            <li>
              <svg width="24" height="12" aria-hidden="true">
                <rect x="0" y="2" width="24" height="8" fill={TEXT} fillOpacity="0.25" />
              </svg>
              95% slope uncertainty
            </li>
          )}
        </ul>
      </figure>
      <div className="trend-endpoint-controls">
        <label>
          Point A · {date(from)}
          <input
            aria-label="Starting month on the trend lines"
            type="range"
            min={first}
            max={last - months}
            value={from}
            onChange={(e) => setAnchor(Number(e.target.value))}
          />
        </label>
        <label>
          Point B · {months} months after A
          <input
            aria-label="Months between trend points"
            type="range"
            min={1}
            max={maxSpan}
            value={months}
            onChange={(e) => setSpan(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="trend-duration-presets">
        {[12, 24, 60, 120].map((n) => (
          <button
            key={n}
            type="button"
            disabled={n > maxSpan}
            aria-pressed={months === n}
            onClick={() => setSpan(n)}
          >
            {n} months
          </button>
        ))}
      </div>
      <div className="layered-change">
        <div>
          <span>Layer 1 · alone</span>
          <strong>
            {num(changeA, true)} <small>{unit}</small>
          </strong>
        </div>
        <div data-accent="coral">
          <span>Layer 2 · with {xName} held fixed</span>
          <strong>
            {num(changeB, true)} <small>{unit}</small>
          </strong>
        </div>
        <div>
          <span>Moves with {xName}</span>
          <strong>
            {num(carried, true)} <small>{unit}</small>
          </strong>
        </div>
      </div>
      <p className="trend-small">
        Fitted change from {date(from)} to {date(to)} along each line; seasonal
        offsets are excluded. Per decade: {num(fit.alone.slope, true)} alone vs{" "}
        {num(fit.withX.slope, true)} with {xName} held fixed ({unit}), beta{" "}
        {num(fit.beta, true)} {unit} per {xUnit}. Association, not cause.
        {!fit.inference &&
          " Bands need 60 consecutive common months and are not shown for this selection."}
      </p>
    </section>
  );
}
