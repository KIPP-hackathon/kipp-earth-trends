import { useEffect, useRef, useState } from "react";
import type { Investigation } from "../lib/earthApi";
import { formatTrendP } from "../lib/runtimeTrends";
import { formatTrendValue, monthIndex, trendUnit } from "../lib/trendLab";
import { TrendChart } from "./TrendChart";
import { downloadInvestigation, investigationCsv } from "../lib/investigation";

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined ? "Unavailable" : formatTrendValue(v);
const colors = ["#87dbe5", "#efbf80"];
type Point = { month: string; value: number | null };
function SeriesChart({
  title,
  unit,
  points,
  line = [],
  color,
  selected,
  onSelect,
  start,
  end,
}: {
  title: string;
  unit: string;
  points: Point[];
  line?: Point[];
  color: string;
  selected: string;
  onSelect: (month: string) => void;
  start: string;
  end: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(250, entries[0].contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const values = [...points, ...line].flatMap((p) =>
    p.value === null ? [] : [p.value],
  );
  const lo = values.length ? Math.min(...values) : 0,
    hi = values.length ? Math.max(...values) : 1;
  const pad = (hi - lo) * 0.08 || 1,
    min = lo - pad,
    max = hi + pad;
  const left = 58,
    right = width - 14,
    top = 15,
    bottom = 180;
  const t0 = monthIndex(start)!,
    t1 = monthIndex(end)!;
  const x = (m: string) =>
    left + ((monthIndex(m)! - t0) / Math.max(1, t1 - t0)) * (right - left);
  const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
  const path = (rows: Point[]) => {
    let connected = false;
    return rows
      .map((p) => {
        if (p.value === null) {
          connected = false;
          return "";
        }
        const c = connected ? "L" : "M";
        connected = true;
        return `${c}${x(p.month)},${y(p.value)}`;
      })
      .join(" ");
  };
  const chosen = points.find((p) => p.month === selected);
  return (
    <div className="investigation-chart" ref={ref}>
      <div className="investigation-chart-heading">
        <strong style={{ color }}>{title}</strong>
        <span>{unit}</span>
      </div>
      {!values.length ? (
        <p className="trend-notice">
          No values available for this representation. Check coverage and
          reference counts.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${width} 210`}
          role="img"
          aria-label={`${title}, ${unit}, ${start} to ${end}`}
        >
          {[0, 0.5, 1].map((f) => {
            const value = min + (max - min) * f;
            return (
              <g key={f}>
                <line
                  x1={left}
                  x2={right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="#a2bfe52b"
                />
                <text
                  x={left - 7}
                  y={y(value) + 4}
                  textAnchor="end"
                  fill="#b4c4da"
                  fontSize="10"
                >
                  {value.toLocaleString("en", { maximumSignificantDigits: 3 })}
                </text>
              </g>
            );
          })}
          <path d={path(points)} fill="none" stroke={color} strokeWidth="1.5" />
          {line.length > 0 && (
            <path
              d={path(line)}
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}
          {points.map((p) =>
            p.value === null ? null : (
              <circle
                key={p.month}
                cx={x(p.month)}
                cy={y(p.value)}
                r={p.month === selected ? 5 : 3}
                fill={color}
                fillOpacity={p.month === selected ? 1 : 0.2}
                onClick={() => onSelect(p.month)}
              >
                <title>
                  {p.month}: {fmt(p.value)} {unit}
                </title>
              </circle>
            ),
          )}
          {chosen?.value !== null && chosen?.value !== undefined && (
            <line
              x1={x(selected)}
              x2={x(selected)}
              y1={top}
              y2={bottom}
              stroke={color}
              strokeDasharray="2 3"
            />
          )}
          <text x={left} y={203} fill="#b4c4da" fontSize="11">
            {start}
          </text>
          <text x={right} y={203} textAnchor="end" fill="#b4c4da" fontSize="11">
            {end}
          </text>
        </svg>
      )}
      <p className="trend-small">
        {selected}: {fmt(chosen?.value)} {unit}
        {line.length > 0
          ? " · Dashed: season-adjusted linear time component."
          : ""}
      </p>
    </div>
  );
}

export function InvestigationResults({
  data,
  regionName,
  onGuide,
}: {
  data: Investigation;
  regionName: string;
  onGuide: () => void;
}) {
  const [view, setView] = useState<"Trend" | "Anomalies" | "Relationships">(
    "Trend",
  );
  const [representation, setRepresentation] = useState<
    "raw" | "anomaly" | "standardized"
  >("anomaly");
  const [lag, setLag] = useState(0),
    [adjusted, setAdjusted] = useState(true);
  const [selected, setSelected] = useState(data.request.end);
  const rel = data.lags[lag],
    pair = rel?.pairs.find((p) => p.xMonth === selected);
  const test = (id: string) => data.family.find((t) => t.id === id);
  const evidence = (id: string) => {
    const p = test(id)?.adjustedP;
    return p === null || p === undefined
      ? "Inference unavailable"
      : p < 0.05
        ? "Evidence of an association/change under this model"
        : "Insufficient evidence to reject zero under this model";
  };
  const points = (index: number): Point[] =>
    data.series[index].observations.map((p) => ({
      month: p.month,
      value:
        view === "Anomalies"
          ? representation === "raw"
            ? p.value
            : p[representation]
          : p.value,
    }));
  const choose = selected || data.request.end;
  return (
    <>
      <div className="trend-result-heading">
        <div>
          <span className="trend-kicker">02 / INVESTIGATE THE EVIDENCE</span>
          <h3>{regionName}</h3>
          <p>
            {data.request.start} – {data.request.end} · Rectangle{" "}
            {data.request.bbox}
          </p>
        </div>
      </div>
      <nav className="investigation-tabs" aria-label="Investigation view">
        {(["Trend", "Anomalies", "Relationships"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={view === tab}
            onClick={() => setView(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <div className="investigation-toolbar">
        <label>
          Inspect month
          <select
            aria-label="Inspect month"
            value={choose}
            onChange={(e) => setSelected(e.target.value)}
          >
            {data.series[0].observations.map((p) => (
              <option key={p.month}>{p.month}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() =>
            downloadInvestigation(
              "trend-lab-evidence.json",
              JSON.stringify({ ...data, regionName }, null, 2),
              "application/json",
            )
          }
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() =>
            downloadInvestigation(
              "trend-lab-evidence.csv",
              investigationCsv(data),
              "text/csv",
            )
          }
        >
          Export CSV
        </button>
      </div>
      {view === "Anomalies" && (
        <>
          <div className="investigation-toolbar">
            {(["raw", "anomaly", "standardized"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={representation === mode}
                onClick={() => setRepresentation(mode)}
              >
                {mode === "raw"
                  ? "Raw values"
                  : mode === "anomaly"
                    ? "Seasonal departures"
                    : "Standardized departures"}
              </button>
            ))}
          </div>
          <p className="trend-small">
            Study reference {data.request.baselineStart} –{" "}
            {data.request.baselineEnd}. At least 10 valid reference years per
            calendar month; standardized departures also require nonzero
            variance. This is not a standard 30-year climate normal.
          </p>
        </>
      )}
      {view === "Relationships" &&
        (!rel ? (
          <p className="trend-notice">
            Choose a second indicator and generate an investigation to explore
            relationships.
          </p>
        ) : (
          <>
            <h4>
              Does {data.series[0].name} precede {data.series[1].name}?
            </h4>
            <p className="trend-small">
              All lags use the same {rel.n} predictor months. Positive lag means
              X precedes Y. Calendar-month effects and linear trends are removed
              for adjusted correlations.
            </p>
            <div className="investigation-toolbar">
              <label>
                Lag (months)
                <select
                  aria-label="Lag (months)"
                  value={lag}
                  onChange={(e) => setLag(Number(e.target.value))}
                >
                  {data.lags.map((r) => (
                    <option key={r.lag} value={r.lag}>
                      {r.lag} months
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-pressed={adjusted}
                onClick={() => setAdjusted(!adjusted)}
              >
                {adjusted ? "Adjusted scatterplot" : "Raw scatterplot"}
              </button>
            </div>
            <div className="trend-metrics">
              <div>
                <span>Raw Pearson r</span>
                <strong>{fmt(rel.rawR)}</strong>
              </div>
              <div>
                <span>Adjusted Pearson r</span>
                <strong>{fmt(rel.adjustedR)}</strong>
              </div>
              <div>
                <span>Common pairs</span>
                <strong>{rel.n}</strong>
              </div>
            </div>
            <svg
              className="investigation-lag"
              viewBox="0 0 440 170"
              role="img"
              aria-label="Adjusted correlation by lag, zero to six months"
            >
              {[-1, 0, 1].map((v) => (
                <g key={v}>
                  <line
                    x1="40"
                    x2="420"
                    y1={75 - v * 55}
                    y2={75 - v * 55}
                    stroke="#a2bfe52b"
                  />
                  <text
                    x="28"
                    y={79 - v * 55}
                    textAnchor="end"
                    fill="#b4c4da"
                    fontSize="12"
                  >
                    {v}
                  </text>
                </g>
              ))}
              <path
                d={data.lags
                  .map((r, i) =>
                    r.adjustedR === null
                      ? ""
                      : `${i === 0 || data.lags[i - 1].adjustedR === null ? "M" : "L"}${45 + i * 60},${75 - r.adjustedR * 55}`,
                  )
                  .join(" ")}
                fill="none"
                stroke={colors[0]}
                strokeWidth="2"
              />
              {data.lags.map((r) => (
                <g key={r.lag}>
                  {r.adjustedR !== null && (
                    <circle
                      cx={45 + r.lag * 60}
                      cy={75 - r.adjustedR * 55}
                      r={lag === r.lag ? 7 : 4}
                      fill={colors[0]}
                      onClick={() => setLag(r.lag)}
                    >
                      <title>
                        Lag {r.lag}: r {fmt(r.adjustedR)}
                      </title>
                    </circle>
                  )}
                  <text
                    x={45 + r.lag * 60}
                    y="155"
                    textAnchor="middle"
                    fill="#b4c4da"
                    fontSize="12"
                  >
                    {r.lag}m
                  </text>
                </g>
              ))}
            </svg>
            <Scatter
              data={data}
              lag={lag}
              adjusted={adjusted}
              selected={selected}
              onSelect={setSelected}
            />
            <p className="trend-small">
              {pair
                ? `${pair.xMonth} X = ${fmt(pair.x)} ${trendUnit(data.series[0].unit)} → ${pair.yMonth} Y = ${fmt(pair.y)} ${trendUnit(data.series[1].unit)}`
                : "This selected month is outside the common lag support. Select a scatterplot point or another month."}
            </p>
            <div className="trend-notice">
              <strong>{evidence(`lag:${lag}`)}</strong>
              <p>
                {rel.reason ??
                  `Beta ${fmt(rel.beta)} ${trendUnit(data.series[1].unit)} per ${trendUnit(data.series[0].unit)}. Approximate 95% beta CI: ${rel.betaCi95?.map(fmt).join(" to ")}. Raw p: ${formatTrendP(rel.pValue)}; Holm p: ${formatTrendP(test(`lag:${lag}`)?.adjustedP)}.`}
              </p>
              Correlation is not causality or a forecast. Beta uncertainty is
              not a correlation interval.
            </div>
          </>
        ))}
      {data.series.map((s, index) => (
        <section key={s.variable} className="investigation-series">
          {view === "Trend" && (
            <>
              <h4>{s.name}</h4>
              <div className="trend-metrics">
                <div>
                  <span>Change per year</span>
                  <strong>
                    {fmt(s.trend.slopePerYear)}{" "}
                    <small>{trendUnit(s.unit)}/year</small>
                  </strong>
                </div>
                <div>
                  <span>Change per decade</span>
                  <strong>
                    {fmt(s.trend.slopePerDecade)}{" "}
                    <small>{trendUnit(s.unit)}/decade</small>
                  </strong>
                </div>
                <div>
                  <span>Valid months</span>
                  <strong>{s.trend.n}</strong>
                </div>
              </div>
              <p className="trend-small">
                {s.trend.reason ??
                  `95% slope CI: ${s.trend.slopeCi95PerYear?.map(fmt).join(" to ")} ${trendUnit(s.unit)}/year. Raw p: ${formatTrendP(s.trend.pValue)}; Holm p: ${formatTrendP(test(`trend:${s.variable}`)?.adjustedP)}.`}{" "}
                {evidence(`trend:${s.variable}`)}.
              </p>
            </>
          )}
          {view === "Trend" && <FittedChange series={s} />}
          {view !== "Trend" && (
            <SeriesChart
              title={s.name}
              unit={
                view === "Anomalies" && representation === "standardized"
                  ? "standard deviations"
                  : trendUnit(s.unit)
              }
              points={points(index)}
              line={[]}
              color={colors[index]}
              selected={
                view === "Relationships" && index === 1 && pair
                  ? pair.yMonth
                  : selected
              }
              onSelect={(month) =>
                setSelected(
                  view === "Relationships" && index === 1
                    ? (rel?.pairs.find((p) => p.yMonth === month)?.xMonth ??
                        month)
                    : month,
                )
              }
              start={data.request.start}
              end={data.request.end}
            />
          )}
          {view === "Anomalies" && (
            <details className="trend-provenance">
              <summary>Reference counts and monthly statistics</summary>
              <div className="investigation-table">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Years</th>
                      <th>Mean ({trendUnit(s.unit)})</th>
                      <th>Sample SD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.reference.map((r) => (
                      <tr key={r.month}>
                        <td>{r.month}</td>
                        <td>
                          {r.count}
                          {r.count < 10 ? " · insufficient" : ""}
                        </td>
                        <td>{fmt(r.mean)}</td>
                        <td>{fmt(r.standardDeviation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>
      ))}
      <button type="button" className="trend-guide-link" onClick={onGuide}>
        Read the statistical interpretation in Guide
      </button>
      <details className="trend-provenance">
        <summary>Data, coverage & methods</summary>
        {data.series.map((s) => (
          <div key={s.variable}>
            <h4>{s.name}</h4>
            <p>
              {s.product} · {s.unit} ·{" "}
              {/MERRA/i.test(s.product)
                ? "Reanalysis"
                : "Satellite-derived estimate/retrieval"}
            </p>
            <p>
              {s.sourceUC} · {s.method}
            </p>
            <p>
              {s.trend.n} valid study months;{" "}
              {s.observations.filter((r) => r.value === null).length}{" "}
              unavailable months. Minimum known coverage:{" "}
              {fmt(
                s.observations.reduce<number | null>(
                  (a, r) =>
                    r.coverage === null
                      ? a
                      : a === null
                        ? r.coverage
                        : Math.min(a, r.coverage),
                  null,
                ),
              )}
              .
            </p>
          </div>
        ))}
        <p>
          Trend: seasonal OLS, HAC12 Bartlett, n/(n−13).{" "}
          {data.analysis.relationship}. Trend and beta intervals are conditional
          parameter intervals, not prediction intervals.
        </p>
        <p>
          {data.analysis.support} {data.analysis.multipleTesting}
        </p>
        {data.analysis.limitations.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <p>
          GRACE native mass anomalies do not isolate groundwater. IMERG Final
          and Late remain separate. Country/biome names describe rectangular
          study boxes, not polygon masks.
        </p>
        <div className="investigation-table">
          <table>
            <thead>
              <tr>
                <th>Full test family</th>
                <th>Raw p</th>
                <th>Holm p</th>
              </tr>
            </thead>
            <tbody>
              {data.family.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{formatTrendP(t.pValue)}</td>
                  <td>{formatTrendP(t.adjustedP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Export CSV is long-form: each row identifies a source, observation,
          reference, trend, lag pair or family test and preserves its complete
          JSON payload. JSON includes the complete investigation.
        </p>
      </details>
    </>
  );
}

function Scatter({
  data,
  lag,
  adjusted,
  selected,
  onSelect,
}: {
  data: Investigation;
  lag: number;
  adjusted: boolean;
  selected: string;
  onSelect: (m: string) => void;
}) {
  const rows = data.lags[lag].pairs
    .map((p) => ({
      ...p,
      a: adjusted ? p.adjustedX : p.x,
      b: adjusted ? p.adjustedY : p.y,
    }))
    .filter((p) => p.a !== null && p.b !== null);
  if (!rows.length)
    return (
      <p className="trend-notice">
        No scatterplot available for this representation.
      </p>
    );
  const xs = rows.map((p) => p.a!),
    ys = rows.map((p) => p.b!);
  const xmin = Math.min(...xs),
    xmax = Math.max(...xs),
    ymin = Math.min(...ys),
    ymax = Math.max(...ys);
  const x = (v: number) => 55 + ((v - xmin) / (xmax - xmin || 1)) * 350,
    y = (v: number) => 210 - ((v - ymin) / (ymax - ymin || 1)) * 180;
  return (
    <figure className="investigation-scatter">
      <svg
        viewBox="0 0 450 260"
        role="img"
        aria-label={`${adjusted ? "Season and trend adjusted" : "Raw"} scatterplot; X ${data.series[0].name}, Y ${data.series[1].name}`}
      >
        <path d="M55 20V210H415" fill="none" stroke="#a2bfe54f" />
        {rows.map((p) => (
          <circle
            key={p.xMonth}
            cx={x(p.a!)}
            cy={y(p.b!)}
            r={selected === p.xMonth ? 6 : 3}
            fill={selected === p.xMonth ? colors[1] : colors[0]}
            opacity={selected === p.xMonth ? 1 : 0.6}
            onClick={() => onSelect(p.xMonth)}
          >
            <title>
              {p.xMonth} → {p.yMonth}: {fmt(p.a)}, {fmt(p.b)}
            </title>
          </circle>
        ))}
        <text x="55" y="230" fill="#b4c4da" fontSize="12">
          {xmin.toPrecision(3)}
        </text>
        <text x="410" y="230" textAnchor="end" fill="#b4c4da" fontSize="12">
          {xmax.toPrecision(3)}
        </text>
        <text x="48" y="210" textAnchor="end" fill="#b4c4da" fontSize="10">
          {ymin.toPrecision(3)}
        </text>
        <text x="48" y="32" textAnchor="end" fill="#b4c4da" fontSize="10">
          {ymax.toPrecision(3)}
        </text>
        <text x="235" y="253" textAnchor="middle" fill="#b4c4da" fontSize="12">
          X ({trendUnit(data.series[0].unit)})
        </text>
        <text
          x="15"
          y="120"
          transform="rotate(-90 15 120)"
          textAnchor="middle"
          fill="#b4c4da"
          fontSize="12"
        >
          Y ({trendUnit(data.series[1].unit)})
        </text>
      </svg>
      <figcaption className="trend-small">
        Select a point to inspect its two months on the charts. The Inspect
        month control provides the same selection by keyboard.
      </figcaption>
    </figure>
  );
}

function FittedChange({ series }: { series: Investigation["series"][number] }) {
  const t = series.trend;
  const [mode, setMode] = useState<"projection" | "historical">("projection");
  const [duration, setDuration] = useState(12);
  const [anchor, setAnchor] = useState<number | null>(null);
  if (
    t.slopePerYear === null ||
    !t.firstMonth ||
    !t.lastMonth ||
    !t.line.length
  )
    return null;
  const first = monthIndex(t.firstMonth)!,
    last = monthIndex(t.lastMonth)!;
  const max = mode === "historical" ? Math.min(60, last - first) : 60;
  const months = Math.min(duration, max),
    latest = mode === "historical" ? last - months : last;
  const from = Math.max(
    first,
    Math.min(latest, anchor ?? (mode === "historical" ? first : last)),
  );
  const date = (n: number) =>
    `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
  const value = (n: number) =>
    t.line[0].value +
    (t.slopePerYear! * (n - monthIndex(t.line[0].month)!)) / 12;
  const change = (t.slopePerYear * months) / 12;
  return (
    <section
      className="trend-projection"
      aria-label={`${series.name} fitted change`}
    >
      <h3>How much changes over {months} months?</h3>
      <div className="trend-duration-presets">
        {(["projection", "historical"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setAnchor(null);
            }}
          >
            {m === "projection" ? "Project ahead" : "Explore past change"}
          </button>
        ))}
      </div>
      <div className="trend-endpoint-controls">
        <label>
          Point A · {date(from)}
          <input
            aria-label={`${series.name}: starting month on the trend line`}
            type="range"
            min={first}
            max={latest}
            value={from}
            onChange={(e) => setAnchor(Number(e.target.value))}
          />
        </label>
        <label>
          Point B · {months} months after A
          <input
            aria-label={`${series.name}: months between trend points`}
            type="range"
            min={1}
            max={max}
            value={months}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="trend-duration-presets">
        {[3, 6, 12, 24, 60].map((n) => (
          <button
            key={n}
            type="button"
            disabled={n > max}
            aria-pressed={months === n}
            onClick={() => setDuration(n)}
          >
            {n} months
          </button>
        ))}
      </div>
      <div className="trend-change">
        <strong>
          {fmt(change)} <small>{trendUnit(series.unit)}</small>
        </strong>
        <p>
          {date(from)}: {fmt(value(from))} → {date(from + months)}:{" "}
          {fmt(value(from + months))}
        </p>
      </div>
      <p className="trend-small">
        {mode === "projection"
          ? "Linear extrapolation; not a forecast. Physical bounds are unconstrained."
          : "Historical change along the fitted time component, not individual monthly values."}{" "}
        Seasonal offsets are excluded.{" "}
        {t.slopeCi95PerYear
          ? `95% interval for fitted change: ${t.slopeCi95PerYear.map((v) => fmt((v * months) / 12)).join(" to ")} ${trendUnit(series.unit)}. This is not a prediction interval.`
          : "Uncertainty is unavailable for this selection."}
      </p>
      <TrendChart
        from={from}
        to={from + months}
        unit={trendUnit(series.unit)}
        trend={{
          points: series.observations.flatMap((p) =>
            p.value === null
              ? []
              : [
                  {
                    month: p.month,
                    x: monthIndex(p.month)!,
                    value: p.value,
                    coverage: null,
                  },
                ],
          ),
          slope: t.slopePerYear / 12,
          interval: t.slopeCi95PerYear
            ? [t.slopeCi95PerYear[0] / 12, t.slopeCi95PerYear[1] / 12]
            : null,
          significant: t.pValue === null ? null : t.pValue < 0.05,
          n: t.n,
          rSquared: null,
          startMonth: first,
          endMonth: last,
          missingMonths: last - first + 1 - t.n,
          predict: value,
          confidenceAt: () => null,
        }}
      />
    </section>
  );
}
