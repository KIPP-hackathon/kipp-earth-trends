import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import { loadSeries, realMonth, realUnit } from "../lib/earthApi";
import type { EarthCatalog, EarthConfig } from "../lib/earthApi";
import { useEarthResource } from "../lib/useEarthResource";
import { useEarthFrame } from "../lib/useEarthFrame";
import {
  followingMonths,
  frameKey,
  requestFrame,
} from "../lib/earthFrameCache";
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

export function RealPanel({
  catalog,
  side,
  view,
  onView,
  config,
  preset,
  active = true,
}: {
  catalog: EarthCatalog;
  config: EarthConfig;
  preset?: { variable: string; month: string; region: string };
  active?: boolean;
  side: "A" | "B";
  view: GlobeView;
  onView: (view: GlobeView) => void;
}) {
  const id = useId();
  const [selection, setSelection] = useState({
    variable: "temperature",
    month: "",
  });
  const [regionId, setRegionId] = useState(config.regions[0].id);
  useEffect(() => {
    if (!preset) return;
    setPlaying(false);
    setSelection({ variable: preset.variable, month: preset.month });
    setRegionId(preset.region);
  }, [preset]);
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string>();
  const playbackStarted = useRef(false);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const variable =
    catalog.variables.find(
      (v) =>
        v.id === selection.variable && v.available !== false && v.months.length,
    ) ??
    catalog.variables.find((v) => v.available !== false && v.months.length)!;
  const months = variable.months;
  const month = months.some((m) => m.month === selection.month)
    ? selection.month
    : side === "A"
      ? months.at(-1)!.month
      : months[0].month;
  const region =
    config.regions.find((entry) => entry.id === regionId) ?? config.regions[0];
  const groups = [
    ...new Set(
      catalog.variables.map((entry) => entry.category ?? entry.product),
    ),
  ];
  const frame = useEarthFrame(variable, month, config.playback.lookAhead);
  const series = useEarthResource(
    `${variable.id}/${region.bbox}/${months[0].month}/${months.at(-1)!.month}`,
    (signal) => loadSeries(variable, region.bbox, signal),
  );
  const index = months.findIndex((m) => m.month === month);
  const selectMonth = (value: string) => {
    setPlaying(false);
    setPlaybackError(undefined);
    setSelection({ variable: variable.id, month: value });
  };
  const playbackKey = frameKey(variable, month);
  useEffect(() => {
    if (!playing) {
      playbackStarted.current = false;
      setBuffering(false);
      return;
    }
    if (frame.error) {
      setPlaying(false);
      return;
    }
    if (!frame.data || frame.data.month !== month || months.length < 2) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const nextMonths = followingMonths(
      variable,
      month,
      Math.max(1, Math.min(3, config.playback.lookAhead)),
    );
    const started = playbackStarted.current;
    const deadline = Date.now() + config.playback.cadenceMs;
    setBuffering(true);
    // Fill two slots when play starts. Later steps need only the next frame;
    // the independent look-ahead keeps another two months ready behind it.
    const needed = started
      ? nextMonths.slice(0, 1)
      : nextMonths.slice(
          0,
          Math.max(1, Math.min(3, config.playback.initialBuffer)),
        );
    void Promise.all(
      needed.map((next) =>
        requestFrame(variable, next, controller.signal, "background"),
      ),
    )
      .then(() => {
        if (controller.signal.aborted) return;
        playbackStarted.current = true;
        setBuffering(false);
        timer = setTimeout(
          () => {
            if (!controller.signal.aborted)
              setSelection({ variable: variable.id, month: nextMonths[0] });
          },
          started
            ? Math.max(0, deadline - Date.now())
            : config.playback.cadenceMs,
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPlaybackError(
          error instanceof Error
            ? error.message
            : "Falha ao preparar a reprodução.",
        );
        setPlaying(false);
      });
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // Frame keys include the rendering policy; camera movement never resets playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, playbackKey, frame.data, frame.error]);
  return (
    <article className="real-panel" aria-label={`Painel real ${side}`}>
      <div className="real-panel-title">
        <span className="real-panel-letter">{side}</span>
        <span>DADOS REAIS · {variable.product}</span>
      </div>
      <div className="real-panel-filters">
        <label htmlFor={`${id}-variable`}>
          Variável
          <select
            id={`${id}-variable`}
            value={variable.id}
            onChange={(e) => {
              setPlaying(false);
              setPlaybackError(undefined);
              setSelection({ variable: e.target.value, month });
            }}
          >
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {catalog.variables
                  .filter(
                    (entry) => (entry.category ?? entry.product) === group,
                  )
                  .map((v) => (
                    <option
                      key={v.id}
                      value={v.id}
                      disabled={v.available === false || !v.months.length}
                    >
                      {v.name}
                      {v.available === false || !v.months.length
                        ? " · sem meses disponíveis"
                        : ""}
                    </option>
                  ))}
              </optgroup>
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
        <RealGlobe
          frame={frame.data}
          view={view}
          onView={onView}
          region={region}
        />
        {(frame.loading || buffering) && (
          <div
            className={`real-loading ${frame.data ? "has-frame" : ""}`}
            role="status"
          >
            {frame.loading
              ? `Consultando ${realMonth(month)}…`
              : "Preparando próximos meses…"}
            {frame.data &&
              frame.data.month !== month &&
              ` Exibindo ${realMonth(frame.data.month)}.`}
          </div>
        )}
      </div>
      {frame.error && <Failure message={frame.error} retry={frame.retry} />}
      {playbackError && (
        <Failure
          message={playbackError}
          retry={() => {
            setPlaybackError(undefined);
            setPlaying(true);
          }}
        />
      )}
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
          disabled={months.length < 2}
          onClick={() => {
            setPlaybackError(undefined);
            setPlaying((v) => !v);
          }}
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
          value={region.id}
          onChange={(e) => {
            const next = config.regions.find(
              (entry) => entry.id === e.target.value,
            )!;
            setRegionId(next.id);
            onView({
              ...view,
              longitude: next.longitude,
              latitude: next.latitude,
            });
          }}
        >
          {config.regions.map((r) => (
            <option value={r.id} key={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <details className="real-provenance">
        <summary>Fonte, qualidade & limites</summary>
        <p>{variable.description}</p>
        <p>
          Produto: {variable.product}
          {variable.run ? ` · ${variable.run}` : ""} · unidade:{" "}
          {realUnit(variable.unit)}
        </p>
        <p>
          Recorte: {region.name} · bbox [{region.bbox}]
        </p>
        {variable.quality?.rule && (
          <p>Critério de qualidade: {variable.quality.rule}</p>
        )}
        {variable.quality?.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </details>
      {series.loading && (
        <p role="status" className="real-notice">
          Consultando série regional…
        </p>
      )}
      {series.error && <Failure message={series.error} retry={series.retry} />}
      {series.data && (
        <RealSeries
          data={series.data}
          month={frame.data?.month ?? ""}
          onMonth={selectMonth}
        />
      )}
    </article>
  );
}
