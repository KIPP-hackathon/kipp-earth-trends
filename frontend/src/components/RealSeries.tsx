import { useId } from "react";
import type { EarthSeries } from "../lib/earthApi";
import { realMonth, realUnit } from "../lib/earthApi";

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
  const low = Math.min(...finite),
    high = Math.max(...finite),
    pad = Math.max(0.1, (high - low) * 0.15);
  const y = (value: number) =>
    170 - ((value - low + pad) / (high - low + 2 * pad)) * 140;
  const x = (i: number) => 48 + (i / Math.max(1, rows.length - 1)) * 540;
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
      "month,value,unit,coverage,bbox,product,run,simulated",
      ...rows.map((p) =>
        [
          p.month,
          p.value ?? "",
          data.unit,
          p.coverage ?? "",
          `"${data.bbox.join(",")}"`,
          data.product,
          data.run ?? "",
          "false",
        ].join(","),
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
  return (
    <section className="real-series" aria-labelledby={id}>
      <div className="real-series-heading">
        <div>
          <h3 id={id}>Série mensal do recorte</h3>
          <small>{realUnit(data.unit)} · média espacial ponderada</small>
        </div>
        <button onClick={exportCsv}>Baixar CSV</button>
      </div>
      <svg
        viewBox="0 0 620 210"
        role="group"
        aria-label={`Série real de ${realMonth(rows[0].month)} a ${realMonth(rows.at(-1)!.month)}. Selecione um ponto para mudar o mês.`}
      >
        {[0, 0.5, 1].map((f) => {
          const value = low - pad + f * (high - low + 2 * pad);
          return (
            <g key={f}>
              <line
                x1="48"
                x2="588"
                y1={y(value)}
                y2={y(value)}
                stroke="#465345"
                strokeDasharray="3 5"
              />
              <text
                x="40"
                y={y(value) + 4}
                textAnchor="end"
                fill="#9eaf9b"
                fontSize="10"
              >
                {number(value)}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#c7dfa7" strokeWidth="2" />
        {rows.map((p, i) =>
          p.value === null || !Number.isFinite(p.value) ? null : (
            <g
              key={p.month}
              role="button"
              tabIndex={0}
              aria-label={`${realMonth(p.month)}: ${number(p.value)} ${realUnit(data.unit)}`}
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
                r={p.month === month ? 5 : 2.5}
                fill={p.month === month ? "#fff2c5" : "#c7dfa7"}
              />
              <title>
                {realMonth(p.month)} · {number(p.value)} {realUnit(data.unit)}
              </title>
            </g>
          ),
        )}
        <text x="48" y="200" fill="#9eaf9b" fontSize="11">
          {realMonth(rows[0].month)}
        </text>
        <text x="588" y="200" textAnchor="end" fill="#9eaf9b" fontSize="11">
          {realMonth(rows.at(-1)!.month)}
        </text>
      </svg>
      <p className="real-observation">
        {realMonth(month)}:{" "}
        <strong>
          {active?.value != null
            ? `${number(active.value)} ${realUnit(data.unit)}`
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
        Recorte retangular (bbox), sem máscara exata de bacia. Valores mensais
        observados; sem inferência de tendência ou previsão.
      </small>
    </section>
  );
}
