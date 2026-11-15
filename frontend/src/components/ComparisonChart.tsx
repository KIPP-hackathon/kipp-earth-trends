import { memo, useId, useMemo, useState } from "react";
import type { ComparisonMode } from "../lib/earthApi";
import { realUnit } from "../lib/earthApi";
import type { ComparisonEntry } from "./ComparisonAnalysis";
import { TrendResults } from "./TrendResults";
import {
  comparisonColor,
  comparisonTrendColor,
} from "../lib/comparisonColors";
import type { TrendFamilyTest } from "../lib/runtimeTrends";
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
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
function download(content: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function ComparisonChartComponent({
  title,
  scope,
  entries,
  mode,
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
  familyTests,
}: {
  title: string;
  scope: "global" | "regional";
  entries: ComparisonEntry[];
  mode: ComparisonMode;
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
  familyTests: TrendFamilyTest[];
}) {
  const id = useId();
  const [preview, setPreview] = useState(false);
  const months = useMemo(() => calendar(start, end), [start, end]);
  const chart = useMemo(() => {
    const x = (index: number) =>
      48 + (index / Math.max(1, months.length - 1)) * 530;
    const y = (value: number) =>
      150 - ((value - domain[0]) / (domain[1] - domain[0])) * 122;
    const series = entries.map((entry) => {
      const data = entry.data?.[scope];
      let path = "",
        connected = false;
      const byMonth = new Map(
        data?.observations.map((row) => [row.month, row]) ?? [],
      );
      const points: { x: number; y: number }[] = [];
      months.forEach((month, index) => {
        const value = byMonth.get(month)?.[mode];
        if (value === null || value === undefined || !Number.isFinite(value)) {
          connected = false;
          return;
        }
        path += `${connected ? "L" : "M"}${x(index).toFixed(2)},${y(value).toFixed(2)} `;
        const neighbor = (offset: number) => {
          const n = byMonth.get(months[index + offset])?.[mode];
          return n !== null && n !== undefined && Number.isFinite(n);
        };
        if (!neighbor(-1) && !neighbor(1))
          points.push({ x: x(index), y: y(value) });
        connected = true;
      });
      return { entry, path, byMonth, points };
    });
    return { x, y, series };
  }, [entries, months, scope, mode, domain]);
  const activeIndex = months.indexOf(month);
  const activeMonth = activeIndex >= 0 ? month : months.at(-1)!;
  const index = activeIndex >= 0 ? activeIndex : Math.max(0, months.length - 1);
  const hasValues = !noArea && chart.series.some((series) => series.path);
  const exportRows = () =>
    entries.flatMap((entry) =>
      entry.data ? [{ ...entry.data, [scope]: entry.data[scope] }] : [],
    );
  const csv = () => {
    const header = [
      "variable",
      "month",
      "original_value",
      "original_unit",
      "comparison_mode",
      "comparison_value",
      "coverage",
      "samples",
      "reference_start",
      "reference_end",
      "reference_month_count",
      "reference_mean",
      "reference_sample_std",
      "period_min",
      "period_max",
      "bbox",
      "source",
      "product",
      "aggregation",
      "method",
      "status",
      "simulated",
      "trend_method",
      "trend_n",
      "trend_first_month",
      "trend_last_month",
      "trend_slope_per_year",
      "trend_standard_error_per_year",
      "trend_p",
      "trend_p_holm",
      "trend_family_size",
      "trend_inference_status",
      "trend_reason",
      "trend_ci95_low_per_year",
      "trend_ci95_high_per_year",
    ];
    const rows = entries.flatMap(({ variable, data }) =>
      data
        ? data[scope].observations.map((row) => {
            const reference =
              data[scope].reference[Number(row.month.slice(5)) - 1];
            const trend = data[scope].trends?.[mode];
            return [
              variable.id,
              row.month,
              row.value,
              data.unit,
              mode,
              row[mode],
              row.coverage,
              row.samples,
              data.reference.start,
              data.reference.end,
              reference.count,
              reference.mean,
              reference.standardDeviation,
              data[scope].range.min,
              data[scope].range.max,
              scope === "global" ? "-180,-90,180,90" : data.bbox.join(","),
              data.sourceUC,
              data.product,
              data.aggregation,
              data.method,
              mode === "standardized"
                ? row.standardizedStatus
                : row.value === null
                  ? "no_data"
                  : data[scope].range.constant
                    ? "constant_series"
                    : "available",
              false,
              trend?.method,
              trend?.n,
              trend?.firstMonth,
              trend?.lastMonth,
              trend?.slopePerYear,
              trend?.standardErrorPerYear,
              trend?.pValue,
              adjustedP[`${scope}:${variable.id}`],
              familySize,
              trend?.inferenceStatus,
              trend?.reason,
              trend?.slopeCi95PerYear?.[0],
              trend?.slopeCi95PerYear?.[1],
            ];
          })
        : [],
    );
    download(
      [header, ...rows]
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\n"),
      "text/csv;charset=utf-8",
      `kipp-${scope}-${mode}-${start}-${end}.csv`,
    );
  };
  const eventIndices = eventWindow
    ? months.flatMap((value, index) =>
        value >= eventWindow[0] && value <= eventWindow[1] ? [index] : [],
      )
    : [];
  return (
    <section className="comparison-chart" aria-labelledby={`${id}-title`}>
      <div className="comparison-chart-heading">
        <div>
          <h3 id={`${id}-title`}>{title}</h3>
          <p>
            {mode === "standardized"
              ? "Deviation · standard deviations (σ)"
              : "Relative position · 0–100"}
          </p>
        </div>
        <div className="real-export-actions">
          <button
            type="button"
            disabled={noArea || !entries.some((entry) => entry.data)}
            onClick={csv}
          >
            CSV
          </button>
          <button
            type="button"
            disabled={noArea || !entries.some((entry) => entry.data)}
            onClick={() =>
              download(
                JSON.stringify(
                  {
                    mode,
                    inference: {
                      method: "OLS calendar-month effects + HAC12",
                      adjustment: "Holm",
                      familySize,
                      familyTests,
                      familyScope:
                        "All applied variables in available global/regional charts in this mode, including hidden curves; unavailable p-values conservatively treated as1",
                      adjustedP,
                      loading,
                      alpha: 0.05,
                    },
                    scope,
                    start,
                    end,
                    simulated: false,
                    variables: exportRows(),
                  },
                  null,
                  2,
                ),
                "application/json",
                `kipp-${scope}-${mode}.json`,
              )
            }
          >
            JSON
          </button>
        </div>
      </div>
      {noArea ? (
        <p className="comparison-empty">
          Choose a country or draw an area on the globe. The global chart
          remains available.
        </p>
      ) : (
        <>
          <svg
            viewBox="0 0 610 180"
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
                point.x < 48 ||
                point.x > 578 ||
                point.y < 20 ||
                point.y > 155
              )
                return;
              setPreview(true);
              onCursor(
                months[
                  Math.max(
                    0,
                    Math.min(
                      months.length - 1,
                      Math.round(((point.x - 48) / 530) * (months.length - 1)),
                    ),
                  )
                ],
              );
            }}
            onClick={() => onMonth(activeMonth)}
          >
            <defs>
              <clipPath id={`${id}-plot`}>
                <rect x="48" y="22" width="530" height="134" />
              </clipPath>
            </defs>
            <title>
              {title} ·{" "}
              {mode === "standardized" ? "Historical deviation" : "Scale 0–100"}
            </title>
            {eventIndices.length > 0 && (
              <rect
                x={chart.x(eventIndices[0])}
                y="22"
                width={Math.max(
                  2,
                  chart.x(eventIndices.at(-1)!) - chart.x(eventIndices[0]),
                )}
                height="133"
                fill="#e3b253"
                opacity=".13"
              />
            )}
            {[domain[0], mode === "minmax" ? 50 : 0, domain[1]]
              .filter((value, index, all) => all.indexOf(value) === index)
              .map((value) => (
                <g key={value}>
                  <line
                    x1="48"
                    x2="578"
                    y1={chart.y(value)}
                    y2={chart.y(value)}
                    stroke="#c2d7f0"
                    opacity={value === 0 ? 0.32 : 0.12}
                    strokeDasharray={value === 0 ? undefined : "3 5"}
                  />
                  <text x="40" y={chart.y(value) + 3} textAnchor="end">
                    {number(value)}
                  </text>
                </g>
              ))}
            {hasValues &&
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
            {hasValues &&
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
            {hasValues && (
              <g
                clipPath={`url(#${id}-plot)`}
                aria-label="Season-adjusted trend lines"
              >
                {entries.map(({ variable, data }) => {
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
                      <title>
                        {variable.name} · season-adjusted trend · {trend.n}
                        months
                      </title>
                    </path>
                  );
                })}
              </g>
            )}
            {hasValues && (
              <line
                x1={chart.x(index)}
                x2={chart.x(index)}
                y1="23"
                y2="153"
                stroke="#e8f2ff"
                opacity=".45"
                strokeDasharray="3 3"
              />
            )}
            <text x="48" y="174">
              {monthLabel(start)}
            </text>
            <text x="578" y="174" textAnchor="end">
              {monthLabel(end)}
            </text>
            {!hasValues && (
              <text x="313" y="94" textAnchor="middle">
                {entries.length === 0
                  ? "Select a variable above to show it in the charts"
                  : entries.some((entry) => entry.data)
                    ? "No comparable values for this mode"
                    : "Loading selected variables…"}
              </text>
            )}
          </svg>
          {preview && hasValues && (
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
                      {row?.[mode] !== null && row?.[mode] !== undefined
                        ? ` · ${number(row[mode])}${mode === "standardized" ? " σ" : " /100"}`
                        : " · unavailable"}
                    </span>
                  </div>
                );
              })}
              {entries.length > 8 && (
                <small>
                  Open original values below for all {entries.length} variables.
                </small>
              )}
            </div>
          )}
          <TrendResults
            entries={entries}
            mode={mode}
            scope={scope}
            adjustedP={adjustedP}
            familySize={familySize}
            loading={loading}
            familyTests={familyTests}
          />
          <details className="comparison-values">
            <summary>
              {monthLabel(activeMonth)} · original values & coverage
            </summary>
            <div className="comparison-table-scroll">
              <table>
                <caption>
                  {title} · {monthLabel(activeMonth)}
                </caption>
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Original</th>
                    <th>{mode === "standardized" ? "Deviation" : "0–100"}</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.series.map(({ entry, byMonth }) => {
                    const row = byMonth.get(activeMonth);
                    const value = row?.[mode];
                    return (
                      <tr key={entry.variable.id}>
                        <th>
                          <i
                            style={{
                              background: comparisonColor(entry.variable.id),
                            }}
                          />
                          {entry.variable.name}
                        </th>
                        <td>
                          {row?.value !== null && row?.value !== undefined
                            ? `${number(row.value)} ${realUnit(entry.data!.unit)}`
                            : "—"}
                        </td>
                        <td>
                          {value !== null && value !== undefined
                            ? `${number(value)}${mode === "standardized" ? " σ" : ""}`
                            : entry.error
                              ? "Source error"
                              : !entry.data
                                ? "Loading"
                                : row?.standardizedStatus ===
                                      "insufficient_reference" &&
                                    mode === "standardized"
                                  ? "Short reference"
                                  : row?.standardizedStatus ===
                                        "constant_reference" &&
                                      mode === "standardized"
                                    ? "Constant reference"
                                    : "No data"}
                        </td>
                        <td>
                          {row?.coverage !== null && row?.coverage !== undefined
                            ? `${number(row.coverage * 100)}%`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
          <ul className="comparison-status-list">
            {entries.map(({ variable, data, error }) => {
              if (error)
                return (
                  <li key={variable.id}>
                    {variable.name}: {error}
                  </li>
                );
              if (!data) return null;
              const source = data[scope];
              const insufficient = source.observations.filter(
                (row) => row.standardizedStatus === "insufficient_reference",
              ).length;
              const constant = source.observations.filter(
                (row) => row.standardizedStatus === "constant_reference",
              ).length;
              const valid = source.observations.filter(
                (row) => row[mode] !== null,
              ).length;
              if (mode === "standardized" && (insufficient || constant))
                return (
                  <li key={variable.id}>
                    {variable.name}: {valid}/{months.length} comparable months;{" "}
                    {insufficient
                      ? `${insufficient} need at least 10 reference years for that calendar month`
                      : ""}
                    {insufficient && constant ? "; " : ""}
                    {constant
                      ? `${constant} have zero reference variation`
                      : ""}
                    . Try Scale 0–100 to inspect available values.
                  </li>
                );
              if (mode === "minmax" && source.range.constant)
                return (
                  <li key={variable.id}>
                    {variable.name}: no variation in this period; plotted at 50.
                  </li>
                );
              if (valid < months.length)
                return (
                  <li key={variable.id}>
                    {variable.name}: {valid}/{months.length} months with values.
                    Gaps remain empty.
                  </li>
                );
              return null;
            })}
          </ul>
        </>
      )}
    </section>
  );
}
export const ComparisonChart = memo(ComparisonChartComponent);
