import { useEffect, useId, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import {
  loadCatalog,
  loadFrame,
  loadSeries,
  realMonth,
  realRegions,
  realUnit,
} from "../lib/earthApi";
import type { EarthCatalog } from "../lib/earthApi";
import { useEarthResource } from "../lib/useEarthResource";
import { initialGlobeView } from "../lib/comparison";
import type { GlobeView } from "../lib/comparison";
import { RealGlobe } from "./RealGlobe";
import { RealSeries } from "./RealSeries";

function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="real-error" role="alert">
      <p>{message}</p>
      <button onClick={retry}>
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  );
}

function RealPanel({
  catalog,
  side,
  view,
  onView,
}: {
  catalog: EarthCatalog;
  side: "A" | "B";
  view: GlobeView;
  onView: (view: GlobeView) => void;
}) {
  const id = useId();
  const [selection, setSelection] = useState({
    variable: "temperature",
    month: "",
  });
  const [regionIndex, setRegionIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const variable =
    catalog.variables.find((v) => v.id === selection.variable) ??
    catalog.variables[0];
  const months = variable.months;
  const month = months.some((m) => m.month === selection.month)
    ? selection.month
    : side === "A"
      ? months.at(-1)!.month
      : months[0].month;
  const region = realRegions[regionIndex];
  const frame = useEarthResource(`${variable.id}/${month}`, (signal) =>
    loadFrame(variable.id, month, signal),
  );
  const series = useEarthResource(
    `${variable.id}/${region.bbox}/${months[0].month}/${months.at(-1)!.month}`,
    (signal) => loadSeries(variable, region.bbox, signal),
  );
  const index = months.findIndex((m) => m.month === month);
  const selectMonth = (value: string) => {
    setPlaying(false);
    setSelection({ variable: variable.id, month: value });
  };
  useEffect(() => {
    if (!playing || !frame.data) return;
    const timer = setTimeout(
      () =>
        setSelection({
          variable: variable.id,
          month: months[(index + 1) % months.length].month,
        }),
      1500,
    );
    return () => clearTimeout(timer);
  }, [playing, frame.data, index, variable.id, months]);
  return (
    <article className="real-panel" aria-label={`Painel real ${side}`}>
      <div className="real-panel-title">
        <span className="real-panel-letter">{side}</span>
        <span>DADOS REAIS · {variable.run ?? "MERRA-2"}</span>
      </div>
      <div className="real-panel-filters">
        <label htmlFor={`${id}-variable`}>
          Variável
          <select
            id={`${id}-variable`}
            value={variable.id}
            onChange={(e) => {
              setPlaying(false);
              setSelection({ variable: e.target.value, month });
            }}
          >
            {catalog.variables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-month`}>
          Mês disponível
          <select
            id={`${id}-month`}
            value={month}
            onChange={(e) => selectMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m.month} value={m.month}>
                {realMonth(m.month)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="real-source">
        {variable.product}
        {variable.run ? ` · ${variable.run}` : ""} · {realUnit(variable.unit)} ·{" "}
        {months.length} meses disponíveis
      </p>
      <div className="real-globe-container" aria-busy={frame.loading}>
        <RealGlobe frame={frame.data} view={view} onView={onView} />
        {frame.loading && (
          <div className="real-loading" role="status">
            Consultando campo real de {realMonth(month)}…
          </div>
        )}
      </div>
      {frame.error && <Failure message={frame.error} retry={frame.retry} />}
      {frame.data && (
        <p className="real-grid-info">
          {frame.data.grid.width} × {frame.data.grid.height} células de exibição
          · {((frame.data.validCells / frame.data.totalCells) * 100).toFixed(1)}
          % com valor · quadro global
        </p>
      )}
      <div
        className="real-time-controls"
        role="group"
        aria-label={`Navegar pelos meses do painel ${side}`}
      >
        <button
          aria-label={`Mês anterior do painel ${side}`}
          disabled={index === 0}
          onClick={() => selectMonth(months[index - 1].month)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label={`${playing ? "Pausar" : "Reproduzir"} meses do painel ${side}`}
          aria-pressed={playing}
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input
          aria-label={`Linha do tempo do painel ${side}`}
          type="range"
          min="0"
          max={months.length - 1}
          value={index}
          onChange={(e) => selectMonth(months[Number(e.target.value)].month)}
        />
        <button
          aria-label={`Próximo mês do painel ${side}`}
          disabled={index === months.length - 1}
          onClick={() => selectMonth(months[index + 1].month)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <label className="real-region-filter" htmlFor={`${id}-region`}>
        Região da série
        <select
          id={`${id}-region`}
          value={regionIndex}
          onChange={(e) => {
            const next = Number(e.target.value);
            setRegionIndex(next);
            onView({
              ...view,
              longitude: realRegions[next].longitude,
              latitude: realRegions[next].latitude,
            });
          }}
        >
          {realRegions.map((r, i) => (
            <option value={i} key={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      {series.loading && (
        <p role="status" className="real-notice">
          Consultando série regional…
        </p>
      )}
      {series.error && <Failure message={series.error} retry={series.retry} />}
      {series.data && (
        <RealSeries data={series.data} month={month} onMonth={selectMonth} />
      )}
    </article>
  );
}

export function RealDataView() {
  const catalog = useEarthResource("catalog", loadCatalog);
  const [compare, setCompare] = useState(false);
  const [view, setView] = useState(initialGlobeView);
  return (
    <section
      className="real-workspace"
      id="panel-real"
      role="tabpanel"
      aria-labelledby="tab-real"
    >
      <div className="real-intro">
        <div>
          <span className="eyebrow">
            <Database size={14} /> DATABRICKS · DADOS OBSERVADOS
          </span>
          <h1>
            A Terra, <em>pelos dados.</em>
          </h1>
          <p>
            Explore os campos mensais reais. Escolha um mês, gire o planeta e
            acompanhe um recorte ao longo do tempo.
          </p>
        </div>
        <div className="real-intro-actions">
          <label>
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />{" "}
            Comparar dois globos
          </label>
          <button onClick={catalog.retry}>
            <RefreshCw size={14} /> Atualizar catálogo
          </button>
        </div>
      </div>
      <div className="real-disclosure">
        <i /> Dados reais derivados de produtos NASA · comparação visual, sem
        previsão ou atribuição causal. As outras abas contêm a demonstração com
        dados simulados.
      </div>
      {compare && (
        <p className="real-comparison-note">
          Câmeras sincronizadas; filtros e meses independentes. A mesma variável
          usa a mesma escala nos dois lados. Ar a 10 m, superfície e produtos
          Final/Late permanecem identificados.
        </p>
      )}
      {catalog.loading && (
        <p className="real-notice" role="status">
          Conectando ao catálogo de dados reais…
        </p>
      )}
      {catalog.error && (
        <Failure message={catalog.error} retry={catalog.retry} />
      )}
      {catalog.data && (
        <div className={`real-panels ${compare ? "is-comparing" : ""}`}>
          <RealPanel
            catalog={catalog.data}
            side="A"
            view={view}
            onView={setView}
          />
          {compare && (
            <RealPanel
              catalog={catalog.data}
              side="B"
              view={view}
              onView={setView}
            />
          )}
        </div>
      )}
      <p className="real-method-note">
        Globo: grade agregada para visualização, média ponderada por latitude e
        cobertura. Série: amostras da grade de origem em bbox. A disponibilidade
        segue o catálogo; novas variáveis entram após configuração e validação
        na API.
      </p>
    </section>
  );
}
