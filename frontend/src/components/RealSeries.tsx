import { useId } from "react";
import type { EarthSeries } from "../lib/earthApi";
import { aggregationLabel, realMonth, realUnit } from "../lib/earthApi";

const number = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export function RealSeries({
  data,
  month,
  onMonth,
}: {
  data: EarthSeries;
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
      <p className="real-notice">
        Sem valores válidos neste recorte. Escolha outra região.
      </p>
    );
  const categorical = data.aggregation === "weighted_mode";
  const categories = data.render?.categories ?? [
    { value: 0, label: "Oceano" },
    { value: 1, label: "Gelo" },
  ];
  const low = categorical
      ? Math.min(...categories.map((category) => category.value))
      : Math.min(...finite),
    high = categorical
      ? Math.max(...categories.map((category) => category.value))
      : Math.max(...finite),
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
    link.download = `kipp-real-${data.variable}.csv`;
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
    link.download = `kipp-real-${data.variable}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="real-series" aria-labelledby={id}>
      <div className="real-series-heading">
        <div>
          <h3 id={id}>Série mensal do recorte</h3>
          <small>
            {realUnit(data.unit)} · {aggregationLabel(data.aggregation)}
          </small>
        </div>
        <div className="real-export-actions">
          <button onClick={exportCsv}>Baixar CSV</button>
          <button onClick={exportJson}>Baixar JSON</button>
        </div>
      </div>
      <svg
        viewBox="0 0 620 210"
        role="group"
        aria-label={`Série real de ${realMonth(rows[0].month)} a ${realMonth(rows.at(-1)!.month)}. Selecione um ponto para mudar o mês.`}
      >
        {ticks.map(({ value, label }) => {
          return (
            <g key={value}>
              <line
                x1={chartLeft}
                x2="588"
                y1={y(value)}
                y2={y(value)}
                stroke="#293b53"
                strokeDasharray="3 5"
              />
              <text
                x={chartLeft - 8}
                y={y(value) + 4}
                textAnchor="end"
                fill="#a5b4c5"
                fontSize="10"
              >
                {label}
              </text>
            </g>
          );
        })}
        {!categorical && (
          <path d={path} fill="none" stroke="#80baff" strokeWidth="2" />
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
                fill={p.month === month ? "#ffffff" : "#80baff"}
              />
              <title>
                {realMonth(p.month)} · {formatObservation(p.value)}
              </title>
            </g>
          ),
        )}
        <text x={chartLeft} y="200" fill="#a5b4c5" fontSize="11">
          {realMonth(rows[0].month)}
        </text>
        <text x="588" y="200" textAnchor="end" fill="#a5b4c5" fontSize="11">
          {realMonth(rows.at(-1)!.month)}
        </text>
      </svg>
      <p className="real-observation">
        {month ? realMonth(month) : "Nenhum mês exibido"}:{" "}
        <strong>
          {!month
            ? "aguardando quadro"
            : active?.value != null
              ? formatObservation(active.value)
              : "sem dado"}
        </strong>
        {active?.coverage != null && (
          <span>
            {" "}
            · cobertura válida do recorte: {(active.coverage * 100).toFixed(1)}%
          </span>
        )}
      </p>
      <small>
        {categorical &&
          "Pontos representam classes mensais discretas; não há interpolação entre classes. "}
        Recorte retangular (bbox), sem máscara exata de bacia. Valores mensais
        observados; sem inferência de tendência ou previsão.
      </small>
      <details className="real-series-method">
        <summary>Método e proveniência da consulta</summary>
        <p>
          Produto: {data.product}
          {data.run ? ` · ${data.run}` : ""}
        </p>
        <p>
          Variável: {data.variable} · bbox [{data.bbox.join(", ")}]
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
