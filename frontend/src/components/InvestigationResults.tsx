import { useEffect, useState, type ReactNode } from "react";
import type { Investigation } from "../lib/earthApi";
import { formatTrendP } from "../lib/runtimeTrends";
import { formatTrendValue, monthIndex, trendUnit } from "../lib/trendLab";
import { TrendChart } from "./TrendChart";
import { CombinedSeriesChart } from "./CombinedSeriesChart";
import { ChartInfo } from "./ChartInfo";
import { TwoLayerRegression } from "./TwoLayerRegression";
import { LayeredTrend } from "./LayeredTrend";
import { Compass } from "lucide-react";
import { downloadInvestigation, investigationCsv } from "../lib/investigation";

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined ? "Unavailable" : formatTrendValue(v);
const colors = ["#87dbe5", "#efbf80"];
type Point = { month: string; value: number | null };

export function InvestigationResults({
  data,
  regionName,
  onGuide,
  initialView = "Anomalies",
  tourView,
  onTour,
}: {
  data: Investigation;
  regionName: string;
  onGuide: () => void;
  initialView?: "Trend" | "Anomalies" | "Relationships";
  /** View requested by the guided tour; switching tabs stays possible. */
  tourView?: "Trend" | "Anomalies" | "Relationships";
  /** Starts the guided tour at the results steps. */
  onTour?: () => void;
}) {
  const [view, setView] = useState<"Trend" | "Anomalies" | "Relationships">(
    initialView,
  );
  useEffect(() => {
    if (tourView) setView(tourView);
  }, [tourView]);
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
  const exportButtons = (
    <>
      <button
        type="button"
        className="investigation-export"
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
    </>
  );
  const inspectMonth = (
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
  );
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
        {onTour && (
          <button
            type="button"
            className="investigation-tour-start"
            onClick={onTour}
          >
            <Compass size={15} /> Tour the results
          </button>
        )}
      </div>
      <nav className="investigation-tabs" aria-label="Investigation view">
        {(["Anomalies", "Trend", "Relationships"] as const).map((tab) => (
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
      {!(view === "Relationships" && rel) && (
        <div className="investigation-toolbar">
          {inspectMonth}
          {exportButtons}
        </div>
      )}
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
            <div className="investigation-heading-row">
              <h4>
                Does {data.series[0].name} precede {data.series[1].name}?
              </h4>
              <ChartInfo label="How to read the relationship">
                <p>
                  Raw r compares the monthly values directly, so it is inflated
                  when both indicators simply share the same seasons.
                </p>
                <p>
                  Adjusted r first removes each indicator&apos;s seasonal cycle
                  and linear trend; it asks whether unusual months in X go with
                  unusual months in Y. Values near 0 mean little association,
                  near ±1 a strong one.
                </p>
                <p>
                  Raw and adjusted r for every lag, with the number of common
                  month pairs, are listed under Data, coverage &amp; methods.
                </p>
                <p>Association is not causation and not a forecast.</p>
              </ChartInfo>
            </div>
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
              {inspectMonth}
              <button
                type="button"
                aria-pressed={adjusted}
                onClick={() => setAdjusted(!adjusted)}
              >
                {adjusted ? "Adjusted scatterplot" : "Raw scatterplot"}
              </button>
              {exportButtons}
            </div>
            <section
              className="investigation-verdict"
              data-evidence={
                (test(`lag:${lag}`)?.adjustedP ?? 1) < 0.05 ? "yes" : "no"
              }
              aria-label={`Result at lag ${lag} months`}
            >
              <span className="trend-kicker">Result · lag {lag} months</span>
              <strong>{evidence(`lag:${lag}`)}</strong>
              <p>
                {rel.reason ??
                  `Beta ${fmt(rel.beta)} ${trendUnit(data.series[1].unit)} per ${trendUnit(data.series[0].unit)}. Approximate 95% beta CI: ${rel.betaCi95?.map(fmt).join(" to ")}. Raw p: ${formatTrendP(rel.pValue)}; Holm p: ${formatTrendP(test(`lag:${lag}`)?.adjustedP)}.`}
              </p>
              <small>
                Correlation is not causality or a forecast. Beta uncertainty is
                not a correlation interval.
              </small>
            </section>
            <div className="investigation-pair">
              <div className="investigation-panel">
                <div className="investigation-heading-row">
                  <h4>Adjusted correlation by lag</h4>
                  <ChartInfo label="How to read the lag chart">
                    <p>
                      Each point is the adjusted correlation between X in one
                      month and Y the given number of months later (0–6).
                    </p>
                    <p>
                      A peak away from 0 months suggests Y tends to respond to X
                      with a delay; a flat line near 0 means no lagged
                      association. Click a point to inspect that lag.
                    </p>
                  </ChartInfo>
                </div>
                <svg
                  className="investigation-lag"
                  viewBox="0 0 440 260"
                  role="img"
                  aria-label="Adjusted correlation by lag, zero to six months"
                >
                  {[-1, 0, 1].map((v) => (
                    <g key={v}>
                      <line
                        x1="40"
                        x2="420"
                        y1={120 - v * 95}
                        y2={120 - v * 95}
                        stroke="#a2bfe52b"
                      />
                      <text
                        x="28"
                        y={124 - v * 95}
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
                          : `${i === 0 || data.lags[i - 1].adjustedR === null ? "M" : "L"}${45 + i * 60},${120 - r.adjustedR * 95}`,
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
                          cy={120 - r.adjustedR * 95}
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
                        y="245"
                        textAnchor="middle"
                        fill="#b4c4da"
                        fontSize="12"
                      >
                        {r.lag}m
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="investigation-panel">
                <div className="investigation-heading-row">
                  <h4>
                    {adjusted ? "Adjusted" : "Raw"} scatterplot · lag {lag}{" "}
                    months
                  </h4>
                  <ChartInfo label="How to read the scatterplot">
                    <p>
                      Each dot pairs one month of X (horizontal) with Y {lag}{" "}
                      months later (vertical).
                    </p>
                    <p>
                      A cloud tilted upward means they rise together; tilted
                      downward means one rises as the other falls; a round cloud
                      means little relationship.{" "}
                      {adjusted
                        ? "Adjusted values have seasons and linear trends removed."
                        : "Raw values still include the seasonal cycle, which can create a misleading pattern."}
                    </p>
                  </ChartInfo>
                </div>
                <Scatter
                  data={data}
                  lag={lag}
                  adjusted={adjusted}
                  selected={selected}
                  onSelect={setSelected}
                />
              </div>
            </div>
            <TwoLayerRegression data={data} lag={lag} />
            <p className="trend-small">
              {pair
                ? `${pair.xMonth} X = ${fmt(pair.x)} ${trendUnit(data.series[0].unit)} → ${pair.yMonth} Y = ${fmt(pair.y)} ${trendUnit(data.series[1].unit)}`
                : "This selected month is outside the common lag support. Select a scatterplot point or another month."}
            </p>
          </>
        ))}
      {view !== "Trend" && (
        <CombinedSeriesChart
          start={data.request.start}
          end={data.request.end}
          zeroLine={view === "Anomalies" && representation !== "raw"}
          info={
            <>
              {view === "Relationships" ? (
                <p>
                  Both indicators over time. The highlighted months follow the
                  selected lag: the X month and the Y month {lag} months later.
                </p>
              ) : representation === "raw" ? (
                <p>
                  Monthly regional averages in physical units. The regular waves
                  are the seasonal cycle, which usually hides slower change.
                </p>
              ) : representation === "anomaly" ? (
                <p>
                  How far each month was from its usual value for that calendar
                  month (reference {data.request.baselineStart}–
                  {data.request.baselineEnd}). Above the dashed zero line means
                  higher than usual for that time of year; below means lower.
                </p>
              ) : (
                <p>
                  Departures divided by each calendar month&apos;s typical
                  variability. ±1 is an ordinary month; beyond ±2 is unusual.
                  Both indicators share this unit, so their sizes are
                  comparable.
                </p>
              )}
              <p>
                The thick line averages the last 12 months. A thick line that
                drifts steadily up or down suggests a long-term change; check
                the Trend view for its rate and evidence.
              </p>
              {data.series.length > 1 &&
                (view === "Relationships" ||
                  representation !== "standardized") && (
                  <p>
                    Each indicator has its own vertical scale (left and right).
                    Compare timing and shape, not where the lines cross.
                  </p>
                )}
            </>
          }
          series={data.series.map((s, index) => ({
            name: s.name,
            unit:
              view === "Anomalies" && representation === "standardized"
                ? "standard deviations"
                : trendUnit(s.unit),
            color: colors[index],
            points: points(index),
            selected:
              view === "Relationships" && index === 1 && pair
                ? pair.yMonth
                : choose,
          }))}
          onSelect={(_, month) => setSelected(month)}
        />
      )}
      {view !== "Relationships" &&
        data.series.map((s, index) => (
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
            {view === "Trend" && (
              <FittedChange series={s}>
                <CombinedSeriesChart
                  start={data.request.start}
                  end={data.request.end}
                  series={[
                    {
                      name: s.name,
                      unit: trendUnit(s.unit),
                      color: colors[index],
                      points: points(index),
                      selected: choose,
                    },
                  ]}
                  onSelect={(_, month) => setSelected(month)}
                />
              </FittedChange>
            )}
            {view === "Trend" && index === 1 && (
              <LayeredTrend data={data} lag={lag} onLag={setLag} />
            )}
            {view === "Anomalies" && (
              <details className="trend-provenance">
                <summary>
                  Reference counts and monthly statistics · {s.name}
                </summary>
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
      <details className="trend-provenance trend-data-methods">
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
        {data.lags.length > 0 && (
          <div className="investigation-table">
            <table>
              <thead>
                <tr>
                  <th>Lag (X precedes Y)</th>
                  <th>Raw Pearson r</th>
                  <th>Adjusted Pearson r</th>
                  <th>Common pairs</th>
                </tr>
              </thead>
              <tbody>
                {data.lags.map((r) => (
                  <tr
                    key={r.lag}
                    aria-current={r.lag === lag ? "true" : undefined}
                  >
                    <td>
                      {r.lag} months{r.lag === lag ? " · selected" : ""}
                    </td>
                    <td>{fmt(r.rawR)}</td>
                    <td>{fmt(r.adjustedR)}</td>
                    <td>{r.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  const x = (v: number) => 78 + ((v - xmin) / (xmax - xmin || 1)) * 330,
    y = (v: number) => 210 - ((v - ymin) / (ymax - ymin || 1)) * 180;
  return (
    <figure className="investigation-scatter">
      <svg
        viewBox="0 0 450 260"
        role="img"
        aria-label={`${adjusted ? "Season and trend adjusted" : "Raw"} scatterplot; X ${data.series[0].name}, Y ${data.series[1].name}`}
      >
        <path d="M78 20V210H415" fill="none" stroke="#a2bfe54f" />
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
        <text x="78" y="230" fill="#b4c4da" fontSize="12">
          {xmin.toPrecision(3)}
        </text>
        <text x="410" y="230" textAnchor="end" fill="#b4c4da" fontSize="12">
          {xmax.toPrecision(3)}
        </text>
        <text x="72" y="210" textAnchor="end" fill="#b4c4da" fontSize="10">
          {ymin.toPrecision(3)}
        </text>
        <text x="72" y="32" textAnchor="end" fill="#b4c4da" fontSize="10">
          {ymax.toPrecision(3)}
        </text>
        <text x="246" y="253" textAnchor="middle" fill="#b4c4da" fontSize="12">
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

function FittedChange({
  series,
  children,
}: {
  series: Investigation["series"][number];
  /** Shown instead when no fitted trend is available. */
  children: ReactNode;
}) {
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
    return children;
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
      <div className="investigation-heading-row">
        <h3>How much changes over {months} months?</h3>
        <ChartInfo label="How to read the trend chart">
          <p>
            Dots are monthly regional values. The solid line is the fitted
            long-term trend after accounting for the usual seasonal pattern; the
            shaded band is the 95% interval for that fitted line, not for
            individual months.
          </p>
          <p>
            Points A and B mark a span on the line; the number above is the
            change the trend implies over that span. The dashed extension is a
            straight-line projection, not a forecast.
          </p>
        </ChartInfo>
      </div>
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
