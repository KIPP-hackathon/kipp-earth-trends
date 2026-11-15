import { Info } from "lucide-react";
import { memo, useId, useMemo, useState } from "react";
import type { ComparisonMode } from "../lib/earthApi";
import { realUnit } from "../lib/earthApi";
import type { ComparisonEntry } from "./ComparisonAnalysis";
import { TrendResults } from "./TrendResults";
import { comparisonColor, comparisonTrendColor } from "../lib/comparisonColors";
const plot = { left: 52, right: 632, top: 12, bottom: 184 };
const plotWidth = plot.right - plot.left;
const plotHeight = plot.bottom - plot.top;

function calendar(start: string, end: string) {
  const index = (value: string) =>
    Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1;
  return Array.from(
    { length: Math.max(0, Math.min(2400, index(end) - index(start) + 1)) },
    (_, offset) => {
      const value = index(start) + offset;
      return `${Math.floor(value / 12)}-${String((value % 12) + 1).padStart(2, "0")}`;
    },
  );
}
const number = (value: number) =>
  Math.abs(value) > 0 && (Math.abs(value) < 0.01 || Math.abs(value) >= 1e6)
    ? value.toExponential(2)
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
function ComparisonChartComponent({
  title,
  scope,
  entries,
  mode,
  onMode,
  hiddenVariables,
  onToggleVariable,
  domain,
  start,
  end,
  month,
  onCursor,
  onMonth,
  eventWindow,
  noArea = false,
  adjustedP,
  familySize,
  loading,
}: {
  title: string;
  scope: "global" | "regional";
  entries: ComparisonEntry[];
  mode: ComparisonMode;
  onMode: (mode: ComparisonMode) => void;
  hiddenVariables: Set<string>;
  onToggleVariable: (id: string) => void;
  domain: [number, number];
  start: string;
  end: string;
  month: string;
  onCursor: (month?: string) => void;
  onMonth: (month: string) => void;
  eventWindow?: [string, string];
  noArea?: boolean;
  adjustedP: Record<string, number>;
  familySize: number;
  loading: boolean;
}) {
  const id = useId();
  const [preview, setPreview] = useState(false);
  const [trendsOnly, setTrendsOnly] = useState(false);
  const valueKey = mode === "raw" ? "value" : mode;
  const nativeUnit = realUnit(
    entries[0]?.data?.unit ?? entries[0]?.variable.unit ?? "",
  );
  const modeLabel =
    mode === "raw"
      ? `Original values · ${nativeUnit}`
      : mode === "standardized"
        ? "Historical deviation"
        : "Scale 0–100";
  const plotEntries = useMemo(
    () => entries.filter((entry) => !hiddenVariables.has(entry.variable.id)),
    [entries, hiddenVariables],
  );
  const months = useMemo(() => calendar(start, end), [start, end]);
  const chart = useMemo(() => {
    const x = (index: number) =>
      plot.left + (index / Math.max(1, months.length - 1)) * plotWidth;
    const y = (value: number) =>
      plot.bottom -
      ((value - domain[0]) / (domain[1] - domain[0])) * plotHeight;
    const series = plotEntries.map((entry) => {
      const data = entry.data?.[scope];
      let path = "",
        connected = false;
      const byMonth = new Map(
        data?.observations.map((row) => [row.month, row]) ?? [],
      );
      const points: { x: number; y: number }[] = [];
      months.forEach((month, index) => {
        const value = byMonth.get(month)?.[valueKey];
        if (value === null || value === undefined || !Number.isFinite(value)) {
          connected = false;
          return;
        }
        path += `${connected ? "L" : "M"}${x(index).toFixed(2)},${y(value).toFixed(2)} `;
        const neighbor = (offset: number) => {
          const n = byMonth.get(months[index + offset])?.[valueKey];
          return n !== null && n !== undefined && Number.isFinite(n);
        };
        if (!neighbor(-1) && !neighbor(1))
          points.push({ x: x(index), y: y(value) });
        connected = true;
      });
      return { entry, path, byMonth, points };
    });
    return { x, y, series };
  }, [plotEntries, months, scope, valueKey, domain]);
  const activeIndex = months.indexOf(month);
  const activeMonth = activeIndex >= 0 ? month : months.at(-1)!;
  const index = activeIndex >= 0 ? activeIndex : Math.max(0, months.length - 1);
  const hasValues = !noArea && chart.series.some((series) => series.path);
  const hasTrends =
    !noArea &&
    plotEntries.some(({ data }) => {
      const trend = data?.[scope].trends?.[mode];
      return trend?.status === "available" && trend.line.length === 2;
    });
  const hasPlot = hasValues && (!trendsOnly || hasTrends);
  const eventIndices = eventWindow
    ? months.flatMap((value, index) =>
        value >= eventWindow[0] && value <= eventWindow[1] ? [index] : [],
      )
    : [];
  return (
    <section className="comparison-chart" aria-labelledby={`${id}-title`}>
      <div className="comparison-chart-heading">
        <div>
          <div className="comparison-chart-title">
            <h3 id={`${id}-title`}>{title}</h3>{" "}
            <details className="comparison-info">
              <summary
                aria-label="About the chart scale"
                title="About the chart scale"
              >
                <Info size={16} aria-hidden="true" />
              </summary>
              <p className="comparison-explainer">
                {mode === "raw"
                  ? `Monthly ${scope} values in ${nativeUnit}, before chart normalization. Source aggregation and quality rules still apply.`
                  : mode === "standardized"
                    ? "Above or below the usual value for that calendar month · standard deviations from 2001–2020 · at least 10 reference years per month."
                    : "Compare curve shapes · 0 = each series’ lowest value, 100 = its highest in the study period. A constant series is 50."}{" "}
                {mode !== "raw" && "Each scope has its own reference. "}
                Hover for original units. Map opacity does not affect this
                chart. {scope === "regional" && "Regional values use the bounding rectangle; the country outline is a visual reference."}
              </p>
            </details>
          </div>
          <p>
            {mode === "raw"
              ? `Original values · ${nativeUnit}`
              : mode === "standardized"
                ? "Deviation · standard deviations (σ)"
                : "Relative position · 0–100"}
          </p>
        </div>
        <div
          className="comparison-chart-controls"
          role="group"
          aria-label="Chart display controls"
        >
          <button
            type="button"
            disabled={entries.length !== 1}
            aria-pressed={mode === "raw"}
            title={
              entries.length === 1
                ? "Show values in the variable’s own unit"
                : "Default is available with one selected variable"
            }
            onClick={() => {
              onMode("raw");
              setTrendsOnly(false);
            }}
          >
            Default
          </button>
          <button
            type="button"
            aria-pressed={mode === "standardized"}
            onClick={() => onMode("standardized")}
          >
            Historical deviation
          </button>
          <button
            type="button"
            aria-pressed={mode === "minmax"}
            onClick={() => onMode("minmax")}
          >
            Scale 0–100
          </button>
          <button
            type="button"
            aria-pressed={trendsOnly}
            title="Hide the observed series and keep only season-adjusted trends"
            onClick={() => setTrendsOnly((value) => !value)}
          >
            Trends only
          </button>
        </div>
      </div>
      {noArea ? (
        <p className="comparison-empty">
          Choose a country, place or event, or draw an area on the globe to see its variables and
          trends.
        </p>
      ) : (
        <>
          <svg
            className="comparison-plot"
            viewBox="0 0 640 210"
            preserveAspectRatio="none"
            role="group"
            tabIndex={0}
            aria-label={`${title}, ${monthLabel(start)} to ${monthLabel(end)}. Left/right arrows inspect months; Enter selects that month on the globe.`}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                onCursor(
                  months[
                    Math.max(
                      0,
                      Math.min(
                        months.length - 1,
                        index + (event.key === "ArrowLeft" ? -1 : 1),
                      ),
                    )
                  ],
                );
              } else if (event.key === "Enter") onMonth(activeMonth);
            }}
            onPointerLeave={() => {
              setPreview(false);
              onCursor(undefined);
            }}
            onFocus={() => setPreview(true)}
            onBlur={() => {
              setPreview(false);
              onCursor(undefined);
            }}
            onPointerMove={(event) => {
              const inverse = event.currentTarget.getScreenCTM()?.inverse();
              if (!inverse) return;
              const point = new DOMPoint(
                event.clientX,
                event.clientY,
              ).matrixTransform(inverse);
              if (
                point.x < plot.left ||
                point.x > plot.right ||
                point.y < plot.top ||
                point.y > plot.bottom
              )
                return;
              setPreview(true);
              onCursor(
                months[
                  Math.max(
                    0,
                    Math.min(
                      months.length - 1,
                      Math.round(
                        ((point.x - plot.left) / plotWidth) *
                          (months.length - 1),
                      ),
                    ),
                  )
                ],
              );
            }}
            onClick={() => onMonth(activeMonth)}
          >
            <defs>
              <clipPath id={`${id}-plot`}>
                <rect
                  x={plot.left}
                  y={plot.top - 2}
                  width={plotWidth}
                  height={plotHeight + 4}
                />
              </clipPath>
            </defs>
            <title>{`${title} · ${modeLabel}`}</title>
            {eventIndices.length > 0 && (
              <rect
                x={chart.x(eventIndices[0])}
                y={plot.top}
                width={Math.max(
                  2,
                  chart.x(eventIndices.at(-1)!) - chart.x(eventIndices[0]),
                )}
                height={plotHeight}
                fill="#e3b253"
                opacity=".13"
              />
            )}
            {[
              domain[0],
              mode === "raw"
                ? (domain[0] + domain[1]) / 2
                : mode === "minmax"
                  ? 50
                  : 0,
              domain[1],
            ]
              .filter((value, index, all) => all.indexOf(value) === index)
              .map((value) => (
                <g key={value}>
                  <line
                    x1={plot.left}
                    x2={plot.right}
                    y1={chart.y(value)}
                    y2={chart.y(value)}
                    stroke="#c2d7f0"
                    opacity={value === 0 ? 0.32 : 0.12}
                    strokeDasharray={value === 0 ? undefined : "3 5"}
                  />
                  <text
                    x={plot.left - 7}
                    y={chart.y(value) + 3}
                    textAnchor="end"
                  >
                    {number(value)}
                  </text>
                </g>
              ))}
            {!trendsOnly &&
              hasValues &&
              chart.series.map(({ entry, path }) =>
                path ? (
                  <path
                    key={entry.variable.id}
                    d={path}
                    fill="none"
                    stroke={comparisonColor(entry.variable.id)}
                    strokeWidth="1.7"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null,
              )}
            {!trendsOnly &&
              hasValues &&
              chart.series.flatMap(({ entry, points }) =>
                points.map((point, index) => (
                  <circle
                    key={`${entry.variable.id}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="2.5"
                    fill={comparisonColor(entry.variable.id)}
                  />
                )),
              )}
            {hasTrends && (
              <g
                clipPath={`url(#${id}-plot)`}
                aria-label="Season-adjusted trend lines"
              >
                {plotEntries.map(({ variable, data }) => {
                  const trend = data?.[scope].trends?.[mode];
                  if (trend?.status !== "available" || trend.line.length !== 2)
                    return null;
                  const [first, last] = trend.line,
                    a = months.indexOf(first.month),
                    b = months.indexOf(last.month);
                  if (a < 0 || b < 0) return null;
                  return (
                    <path
                      key={variable.id}
                      className="runtime-trend-line"
                      d={`M${chart.x(a)},${chart.y(first.value)} L${chart.x(b)},${chart.y(last.value)}`}
                      stroke={comparisonTrendColor(variable.id)}
                      strokeWidth="2"
                      strokeDasharray="5 4"
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    >
                      <title>{`${variable.name} · season-adjusted trend · ${trend.n} months`}</title>
                    </path>
                  );
                })}
              </g>
            )}
            {hasPlot && (
              <line
                x1={chart.x(index)}
                x2={chart.x(index)}
                y1={plot.top}
                y2={plot.bottom}
                stroke="#e8f2ff"
                opacity=".45"
                strokeDasharray="3 3"
              />
            )}
            <text x={plot.left} y="205">
              {monthLabel(start)}
            </text>
            <text x={plot.right} y="205" textAnchor="end">
              {monthLabel(end)}
            </text>
            {!hasPlot && (
              <text
                x={(plot.left + plot.right) / 2}
                y="100"
                textAnchor="middle"
              >
                {plotEntries.length === 0
                  ? "Use the checkboxes below to show variables in the chart"
                  : plotEntries.some((entry) => entry.data)
                    ? trendsOnly
                      ? "No trend lines for this mode"
                      : "No comparable values for this mode"
                    : loading ? "Loading selected variables…" : "No values available for the selected variables"}
              </text>
            )}
          </svg>
          {preview && hasPlot && (
            <div className="comparison-hover" role="tooltip">
              <strong>{monthLabel(activeMonth)}</strong>
              {chart.series.slice(0, 8).map(({ entry, byMonth }) => {
                const row = byMonth.get(activeMonth);
                return (
                  <div key={entry.variable.id}>
                    <span>
                      <i
                        style={{
                          background: comparisonColor(entry.variable.id),
                        }}
                      />
                      {entry.variable.name}
                    </span>
                    <span>
                      {row?.value !== null && row?.value !== undefined
                        ? `${number(row.value)} ${realUnit(entry.data!.unit)}`
                        : "No data"}
                      {mode !== "raw" &&
                        (row?.[mode] !== null && row?.[mode] !== undefined
                          ? ` · ${number(row[mode])}${mode === "standardized" ? " σ" : " /100"}`
                          : " · unavailable")}
                    </span>
                  </div>
                );
              })}
              {plotEntries.length > 8 && (
                <small>
                  Hover variable names below for details on all{" "}
                  {plotEntries.length} variables.
                </small>
              )}
            </div>
          )}
          <TrendResults
            entries={entries}
            month={activeMonth}
            monthCount={months.length}
            hiddenVariables={hiddenVariables}
            onToggleVariable={onToggleVariable}
            mode={mode}
            scope={scope}
            adjustedP={adjustedP}
            familySize={familySize}
            loading={loading}
          />
        </>
      )}
    </section>
  );
}
export const ComparisonChart = memo(ComparisonChartComponent);
