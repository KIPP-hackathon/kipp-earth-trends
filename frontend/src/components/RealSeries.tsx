import { useId } from "react";
import type { EarthSeries } from "../lib/earthApi";
import { aggregationLabel, realMonth, realUnit } from "../lib/earthApi";

const number = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export function RealSeries({
  data,
  month,
  onMonth,
  title = "Regional monthly series",
  context = "regional",
  domain,
  eventWindow,
}: {
  data: EarthSeries;
  title?: string;
  context?: "regional" | "country-extent" | "global";
  domain?: [number, number];
  eventWindow?: [string, string];
  month: string;
  onMonth: (month: string) => void;
}) {
  const id = useId();
  const rows = data.observations;
  const finite = rows.flatMap((p) =>
    p.value !== null && Number.isFinite(p.value) ? [p.value] : [],
  );
  if (!rows.length || !finite.length)
    return (
      <section className="real-series" aria-labelledby={id}>
        <h3 id={id}>{title}</h3>
        <p className="real-notice">
          No valid observations for this area and period.
        </p>
      </section>
    );
  const categorical = data.aggregation === "weighted_mode";
  const categories = data.render?.categories ?? [
    { value: 0, label: "Oceano" },
    { value: 1, label: "Gelo" },
  ];
  const low = categorical
      ? Math.min(...categories.map((category) => category.value))
      : (domain?.[0] ?? Math.min(...finite)),
    high = categorical
      ? Math.max(...categories.map((category) => category.value))
      : (domain?.[1] ?? Math.max(...finite)),
    pad = Math.max(0.1, (high - low) * 0.15);
  const chartLeft = categorical ? 125 : 48;
  const y = (value: number) =>
    170 - ((value - low + pad) / (high - low + 2 * pad)) * 140;
  const x = (i: number) =>
    chartLeft + (i / Math.max(1, rows.length - 1)) * (588 - chartLeft);
  const formatObservation = (value: number) =>
    categorical
      ? `${number(value)} · ${categories.find((category) => category.value === value)?.label ?? "classe"}`
      : `${number(value)} ${realUnit(data.unit)}`;
  const ticks = categorical
    ? categories.map((category) => ({
        value: category.value,
        label: `${category.value} · ${category.label}`,
      }))
    : [0, 0.5, 1].map((fraction) => {
        const value = low - pad + fraction * (high - low + 2 * pad);
        return { value, label: number(value) };
      });
  let path = "",
    connected = false;
  rows.forEach((row, i) => {
    if (row.value === null || !Number.isFinite(row.value)) {
      connected = false;
      return;
    }
    path += `${connected ? "L" : "M"}${x(i)},${y(row.value)} `;
    connected = true;
  });
  const active = rows.find((p) => p.month === month);
  const eventIndices = eventWindow
    ? rows.flatMap((row, index) =>
        row.month >= eventWindow[0] && row.month <= eventWindow[1]
          ? [index]
          : [],
      )
    : [];
  const halfStep = (588 - chartLeft) / Math.max(1, rows.length - 1) / 2;
  const eventLeft = eventIndices.length
    ? Math.max(chartLeft, x(eventIndices[0]) - halfStep)
    : 0;
  const eventRight = eventIndices.length
    ? Math.min(588, x(eventIndices.at(-1)!) + halfStep)
    : 0;
  const exportCsv = () => {
    const csv = [
      "month,value,unit,coverage,bbox,product,run,aggregation,method,simulated",
      ...rows.map((p) =>
        [
          p.month,
          p.value ?? "",
          data.unit,
          p.coverage ?? "",
          data.bbox.join(","),
          data.product,
          data.run ?? "",
          data.aggregation ?? "area_weighted_mean",
          data.method,
          "false",
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `kipp-real-${data.variable}-${context}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportJson = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `kipp-real-${data.variable}-${context}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="real-series" aria-labelledby={id}>
      <div className="real-series-heading">
        <div>
          <h3 id={id}>{title}</h3>
          <small>
            {realUnit(data.unit)} · {aggregationLabel(data.aggregation)}
          </small>
        </div>
        <div className="real-export-actions">
          <button onClick={exportCsv}>CSV</button>
          <button onClick={exportJson}>JSON</button>
        </div>
      </div>
      {eventWindow && (
        <p className="series-event-window">
          {eventIndices.length
            ? `Shaded: event window · ${realMonth(eventWindow[0])} – ${realMonth(eventWindow[1])}`
            : "Event dates are outside the selected series period."}
        </p>
      )}
      <svg
        viewBox="0 0 620 210"
        role="group"
        aria-label={`${title}: ${realMonth(rows[0].month)} to ${realMonth(rows.at(-1)!.month)}. Select a point to change the month.`}
      >
        {eventIndices.length > 0 && (
          <rect
            x={eventLeft}
            y="24"
            width={Math.max(2, eventRight - eventLeft)}
            height="150"
            fill="#e3b253"
            opacity=".19"
            aria-hidden="true"
          />
        )}
        {ticks.map(({ value, label }) => {
          return (
            <g key={value}>
              <line
                x1={chartLeft}
                x2="588"
                y1={y(value)}
                y2={y(value)}
                stroke="#d5dfec"
                strokeDasharray="3 5"
              />
              <text
                x={chartLeft - 8}
                y={y(value) + 4}
                textAnchor="end"
                fill="#52647a"
                fontSize="10"
              >
                {label}
              </text>
            </g>
          );
        })}
        {!categorical && (
          <path d={path} fill="none" stroke="#0b3d91" strokeWidth="2" />
        )}
        {rows.map((p, i) =>
          p.value === null || !Number.isFinite(p.value) ? null : (
            <g
              key={p.month}
              role="button"
              tabIndex={0}
              aria-label={`${realMonth(p.month)}: ${formatObservation(p.value)}`}
              onClick={() => onMonth(p.month)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onMonth(p.month);
                }
              }}
            >
              <circle cx={x(i)} cy={y(p.value)} r="8" fill="transparent" />
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={p.month === month ? 5 : categorical ? 4 : 2.5}
                fill={p.month === month ? "#d52b1e" : "#0b3d91"}
              />
              <title>
                {realMonth(p.month)} · {formatObservation(p.value)}
              </title>
            </g>
          ),
        )}
        <text x={chartLeft} y="200" fill="#52647a" fontSize="11">
          {realMonth(rows[0].month)}
        </text>
        <text x="588" y="200" textAnchor="end" fill="#52647a" fontSize="11">
          {realMonth(rows.at(-1)!.month)}
        </text>
      </svg>
      <p className="real-observation">
        {month ? realMonth(month) : "No displayed month"}:{" "}
        <strong>
          {!month
            ? "waiting for frame"
            : active?.value != null
              ? formatObservation(active.value)
              : "no data"}
        </strong>
        {active?.coverage != null && (
          <span>
            {" "}
            · valid area coverage: {(active.coverage * 100).toFixed(1)}%
          </span>
        )}
      </p>
      <small>
        {categorical &&
          "Points represent discrete monthly classes; classes are not interpolated. "}
        {context === "global"
          ? "Global grid aggregate (180°W–180°E, 90°S–90°N), using available valid cells. "
          : context === "country-extent"
            ? "Country extent (rectangular bbox), including cells outside the country boundary; no exact country mask. "
            : "Rectangular area (bbox); no exact basin or country mask. "}
        Monthly source values; no trend inference or forecast. Missing values
        remain gaps.
      </small>
      <details className="real-series-method">
        <summary>Method and query provenance</summary>
        <p>
          Product: {data.product}
          {data.run ? ` · ${data.run}` : ""}
        </p>
        <p>
          Variable: {data.variable} · bbox [{data.bbox.join(", ")}]
        </p>
        <p>{aggregationLabel(data.aggregation)}</p>
        <p>{data.method}</p>
        {data.quality?.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </details>
    </section>
  );
}
