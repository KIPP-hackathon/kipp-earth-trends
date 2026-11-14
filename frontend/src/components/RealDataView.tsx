import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import {
  loadSeries,
  realMonth,
  realUnit,
  variableDataKey,
} from "../lib/earthApi";
import type {
  EarthCatalog,
  EarthColorRange,
  EarthConfig,
  EarthRegion,
} from "../lib/earthApi";
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
import { MonthPicker } from "./MonthPicker";
import type {
  PanelPreset,
  PanelSnapshot,
  PlaybackCommand,
} from "../lib/assistant";

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
  colorRanges,
  onColorRange,
  onSnapshot,
  onManualChange,
  playbackCommand,
  onPlaybackApplied,
  instanceId = side,
  overview = false,
  initialRegion,
  onCustomRegion,
}: {
  instanceId?: string;
  overview?: boolean;
  initialRegion?: EarthRegion;
  onCustomRegion?: (region: EarthRegion) => void;
  catalog: EarthCatalog;
  config: EarthConfig;
  preset?: PanelPreset;
  playbackCommand?: PlaybackCommand;
  onPlaybackApplied: (side: "A" | "B", nonce: number) => void;
  onSnapshot: (snapshot: PanelSnapshot) => void;
  onManualChange: () => void;
  active?: boolean;
  colorRanges: Record<string, EarthColorRange>;
  onColorRange: (variable: string, value?: EarthColorRange) => void;
  side: "A" | "B";
  view: GlobeView;
  onView: (view: GlobeView) => void;
}) {
  const id = useId();
  const [selection, setSelection] = useState({
    variable: "temperature",
    month: "",
  });
  const [regionId, setRegionId] = useState(
    (initialRegion ?? config.regions[0]).id,
  );
  const [drawnRegion, setDrawnRegion] = useState<EarthRegion>();
  const drawnSequence = useRef(0);
  const [period, setPeriod] = useState({ start: "", end: "" });
  useEffect(() => {
    if (!preset) return;
    setPlaying(false);
    setSelection({ variable: preset.variable, month: preset.month });
    setRegionId(preset.region);
    if (config.regions.some((region) => region.id === preset.region))
      setDrawnRegion(undefined);
    setPeriod({ start: preset.start ?? "", end: preset.end ?? "" });
  }, [preset]);
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string>();
  useEffect(() => {
    if (playbackCommand) {
      setPlaybackError(undefined);
      setPlaying(active && playbackCommand.playing);
      onPlaybackApplied(side, playbackCommand.nonce);
    }
  }, [playbackCommand]);
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
        v.id === selection.variable &&
        v.available !== false &&
        v.months.some((entry) => entry.validSamples > 0),
    ) ??
    catalog.variables.find(
      (v) =>
        v.available !== false &&
        v.months.some((entry) => entry.validSamples > 0),
    )!;
  const allMonths = variable.months.filter((entry) => entry.validSamples > 0);
  const start = allMonths.some((m) => m.month === period.start)
    ? period.start
    : allMonths[0].month;
  const end =
    allMonths.some((m) => m.month === period.end) && period.end >= start
      ? period.end
      : allMonths.at(-1)!.month;
  const months = allMonths.filter((m) => m.month >= start && m.month <= end);
  const month = months.some((m) => m.month === selection.month)
    ? selection.month
    : side === "A"
      ? months.at(-1)!.month
      : months[0].month;
  const region =
    (drawnRegion?.id === regionId ? drawnRegion : undefined) ??
    config.regions.find((entry) => entry.id === regionId) ??
    initialRegion ??
    config.regions[0];
  const spatialBbox =
    region.bbox === "-180,-90,180,90" ? undefined : region.bbox;
  const seriesEnabled = active && (!overview || Boolean(spatialBbox));
  const regionOptions = drawnRegion
    ? [
        ...config.regions.filter((entry) => entry.id !== drawnRegion.id),
        drawnRegion,
      ]
    : config.regions;
  const selectArea = (bbox: string) => {
    const parts = bbox.split(",");
    if (parts.length !== 4 || parts.some((part) => !part.trim())) return;
    const [west, south, east, north] = parts.map(Number);
    const width = east >= west ? east - west : east + 360 - west;
    if (
      ![west, south, east, north].every(Number.isFinite) ||
      west < -180 ||
      west > 180 ||
      east < -180 ||
      east > 180 ||
      south < -90 ||
      north > 90 ||
      south >= north ||
      width <= 0 ||
      width > 360
    )
      return;
    const sequence = ++drawnSequence.current;
    const next: EarthRegion = {
      id: `custom-drawn-${instanceId}-${sequence}`,
      name: `Drawn area ${side} · ${sequence}`,
      bbox: [west, south, east, north].join(","),
      longitude: ((((west + width / 2 + 180) % 360) + 360) % 360) - 180,
      latitude: (south + north) / 2,
    };
    onManualChange();
    setPlaying(false);
    setPlaybackError(undefined);
    setDrawnRegion(next);
    setRegionId(next.id);
    onCustomRegion?.(next);
  };
  const clearArea = () => {
    onManualChange();
    setPlaying(false);
    setPlaybackError(undefined);
    setDrawnRegion(undefined);
    setRegionId((initialRegion ?? config.regions[0]).id);
  };
  const groups = [
    ...new Set(
      catalog.variables.map((entry) => entry.category ?? entry.product),
    ),
  ];
  const frame = useEarthFrame(
    { ...variable, months: allMonths },
    month,
    config.playback.lookAhead,
    spatialBbox,
    active,
  );
  const series = useEarthResource(
    seriesEnabled
      ? `${variableDataKey(variable)}/${region.bbox}/${months[0].month}/${months.at(-1)!.month}`
      : null,
    (signal) => loadSeries({ ...variable, months }, region.bbox, signal),
  );
  const snapshotKey = JSON.stringify({
    side,
    variable: variable.id,
    selectedMonth: month,
    displayedMonth: frame.data?.month ?? null,
    start,
    end,
    region,
    loading: active && (frame.loading || series.loading || buffering),
    playing: active && playing,
  });
  useEffect(() => {
    onSnapshot(JSON.parse(snapshotKey) as PanelSnapshot);
  }, [snapshotKey, onSnapshot]);
  const index = months.findIndex((m) => m.month === month);
  const selectMonth = (value: string) => {
    if (!months.some((entry) => entry.month === value)) return;
    onManualChange();
    setPlaying(false);
    setPlaybackError(undefined);
    setSelection({ variable: variable.id, month: value });
  };
  const playbackKey = frameKey(variable, month, spatialBbox);
  useEffect(() => {
    if (!playing || !active) {
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
      { ...variable, months },
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
        requestFrame(
          variable,
          next,
          controller.signal,
          "background",
          spatialBbox,
        ),
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
  }, [playing, active, playbackKey, frame.data, frame.error, start, end]);
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
              onManualChange();
              setPlaying(false);
              setPlaybackError(undefined);
              setPeriod({ start: "", end: "" });
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
                      disabled={
                        v.available === false ||
                        !v.months.some((entry) => entry.validSamples > 0)
                      }
                    >
                      {v.name}
                      {v.available === false ||
                      !v.months.some((entry) => entry.validSamples > 0)
                        ? " · sem meses disponíveis"
                        : ""}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <MonthPicker
          id={`${id}-month`}
          label="Selected month"
          value={month}
          months={months.map((entry) => entry.month)}
          onChange={selectMonth}
        />
      </div>
      <div
        className="real-period-controls"
        role="group"
        aria-label={`Study period for panel ${side}`}
      >
        <MonthPicker
          id={`${id}-start`}
          label="Period start"
          value={start}
          months={allMonths.map((entry) => entry.month)}
          onChange={(value) => {
            onManualChange();
            setPlaying(false);
            setPlaybackError(undefined);
            setPeriod({ start: value, end: value > end ? value : end });
          }}
        />
        <MonthPicker
          id={`${id}-end`}
          label="Period end"
          value={end}
          months={allMonths.map((entry) => entry.month)}
          onChange={(value) => {
            onManualChange();
            setPlaying(false);
            setPlaybackError(undefined);
            setPeriod({ start: value < start ? value : start, end: value });
          }}
        />
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
          region={spatialBbox ? region : undefined}
          onSelectArea={selectArea}
          onClearArea={spatialBbox ? clearArea : undefined}
          colorRange={colorRanges[variable.id]}
          onColorRange={(value) => onColorRange(variable.id, value)}
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
            onManualChange();
            setPlaybackError(undefined);
            setPlaying(true);
          }}
        />
      )}
      {frame.data && (
        <p className="real-grid-info">
          {frame.data.grid.width} × {frame.data.grid.height} células de exibição
          · {((frame.data.validCells / frame.data.totalCells) * 100).toFixed(1)}
          % com valor ·{" "}
          {spatialBbox ? "selected geographic area" : "global frame"}
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
            onManualChange();
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
      {!overview && (
        <label className="real-region-filter" htmlFor={`${id}-region`}>
          Região da série
          <select
            id={`${id}-region`}
            value={region.id}
            onChange={(event) => {
              const next = regionOptions.find(
                (entry) => entry.id === event.target.value,
              );
              if (!next) return;
              onManualChange();
              setPlaying(false);
              setPlaybackError(undefined);
              setRegionId(next.id);
              onView({
                ...view,
                longitude: next.longitude,
                latitude: next.latitude,
              });
            }}
          >
            {regionOptions.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {overview && !spatialBbox && (
        <p className="real-notice">
          Draw an area on the globe to filter the layer and analyze its monthly
          series.
        </p>
      )}
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
