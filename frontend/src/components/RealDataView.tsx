import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { GeoPermissibleObjects } from "d3-geo";
import "./global-comparison.css";
import "./compact-exploration.css";
import { loadCountries } from "../lib/countries";
import type { CountrySelection } from "../lib/countries";
import { PeriodPicker, SearchPicker } from "./ExplorationControls";
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
        <RefreshCw size={14} /> Retry
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
  initialOutline,
  initializationKey,
  onCustomRegion,
  onAreaChange,
  eventWindow,
  analysisContent,
  onNavigate,
}: {
  instanceId?: string;
  overview?: boolean;
  initialRegion?: EarthRegion;
  initialOutline?: GeoPermissibleObjects;
  initializationKey?: string;
  onCustomRegion?: (region: EarthRegion) => void;
  onAreaChange?: () => void;
  eventWindow?: [string, string];
  analysisContent?: ReactNode;
  onNavigate?: (view: GlobeView) => void;
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
  const [countries, setCountries] = useState<CountrySelection[]>([]);
  useEffect(() => {
    let mounted = true;
    void loadCountries().then((entries) => {
      if (mounted) setCountries(entries);
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (initializationKey && initialRegion && !drawnRegion)
      setRegionId(initialRegion.id);
    // A bootstrap update never overwrites a rectangle selected by the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializationKey]);
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
  const globalBbox = "-180,-90,180,90";
  const selectedCountry = countries.find(
    (entry) => entry.region.id === region.id,
  );
  const countryOutline =
    selectedCountry?.geometry ??
    (region.id === initialRegion?.id ? initialOutline : undefined);
  const applyArea = (next: EarthRegion, center = false) => {
    onManualChange();
    onAreaChange?.();
    setPlaying(false);
    setPlaybackError(undefined);
    setDrawnRegion(next);
    setRegionId(next.id);
    onCustomRegion?.(next);
    if (center)
      (onNavigate ?? onView)({
        ...view,
        longitude: next.longitude,
        latitude: next.latitude,
      });
  };
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
    applyArea(next);
  };
  const clearArea = () =>
    applyArea({
      id: "custom-global",
      name: "Global",
      bbox: globalBbox,
      longitude: 0,
      latitude: 0,
    });
  const countryIds = new Set(countries.map((entry) => entry.region.id));
  const areaOptions = [
    { id: "custom-global", name: "Global", detail: "All available grid cells" },
    ...countries.map((entry) => ({
      id: entry.region.id,
      name: entry.name,
      detail: "Country extent · bbox-based series",
    })),
    ...config.regions
      .filter((entry) => entry.bbox !== globalBbox && !countryIds.has(entry.id))
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        detail: "Configured study region",
      })),
    ...(!countryIds.has(region.id) &&
    region.bbox !== globalBbox &&
    !config.regions.some((entry) => entry.id === region.id)
      ? [{ id: region.id, name: region.name, detail: "Selected study area" }]
      : []),
  ];
  const variableOptions = catalog.variables.map((entry) => {
    const available =
      entry.available !== false &&
      entry.months.some((month) => month.validSamples > 0);
    return {
      id: entry.id,
      name: entry.name,
      detail: `${entry.product} · ${realUnit(entry.unit)}${available ? "" : " · no available months"}`,
      disabled: !available,
      suggested:
        available &&
        /temperature|precipitation|vegetation|ndvi|evi|soil moisture|sea.?ice|snow cover/i.test(
          `${entry.id} ${entry.name}`,
        ),
    };
  });
  const frame = useEarthFrame(
    { ...variable, months: allMonths },
    month,
    config.playback.lookAhead,
    undefined,
    active,
  );
  const globalSeries = useEarthResource(
    active
      ? `${variableDataKey(variable)}/${globalBbox}/${start}/${end}`
      : null,
    (signal) => loadSeries({ ...variable, months }, globalBbox, signal),
  );
  const regionalSeries = useEarthResource(
    active && spatialBbox
      ? `${variableDataKey(variable)}/${region.bbox}/${start}/${end}`
      : null,
    (signal) => loadSeries({ ...variable, months }, region.bbox, signal),
  );
  const series = spatialBbox ? regionalSeries : globalSeries;
  const previousDomain = useRef<
    { key: string; domain: [number, number] } | undefined
  >(undefined);
  const domainKey = `${variableDataKey(variable)}/${start}/${end}`;
  const sharedDomain = useMemo<[number, number] | undefined>(() => {
    if (variable.render?.kind === "categorical") return undefined;
    if (
      (series.loading || globalSeries.loading) &&
      previousDomain.current?.key === domainKey
    )
      return previousDomain.current.domain;
    const values = [series.data, globalSeries.data].flatMap(
      (data) =>
        data?.observations.flatMap((row) =>
          row.value !== null && Number.isFinite(row.value) ? [row.value] : [],
        ) ?? [],
    );
    if (!values.length) return undefined;
    const domain: [number, number] = [Math.min(...values), Math.max(...values)];
    return domain;
  }, [
    series.data,
    globalSeries.data,
    series.loading,
    globalSeries.loading,
    domainKey,
    variable.render?.kind,
  ]);
  useEffect(() => {
    if (sharedDomain && !series.loading && !globalSeries.loading)
      previousDomain.current = { key: domainKey, domain: sharedDomain };
  }, [sharedDomain, series.loading, globalSeries.loading, domainKey]);
  const snapshotKey = JSON.stringify({
    side,
    variable: variable.id,
    selectedMonth: month,
    displayedMonth: frame.data?.month ?? null,
    start,
    end,
    region,
    loading:
      active &&
      (frame.loading || series.loading || globalSeries.loading || buffering),
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
  const playbackKey = frameKey(variable, month);
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
          undefined,
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
            : "Could not prepare playback.",
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
    <article
      className={`real-panel compact-real-panel${overview ? " is-overview" : ""}`}
      aria-label={
        overview ? "Earth data exploration" : `Earth data panel ${side}`
      }
    >
      {!overview && (
        <div className="real-panel-title">
          <span className="real-panel-letter">{side}</span>
          <span>REAL DATA · {variable.product}</span>
        </div>
      )}
      <div className="compact-exploration-controls">
        <SearchPicker
          id={`${id}-variable`}
          label="Variable"
          value={variable.id}
          options={variableOptions}
          curated
          onChange={(value) => {
            onManualChange();
            setPlaying(false);
            setPlaybackError(undefined);
            setSelection({ variable: value, month });
          }}
        />
        <SearchPicker
          id={`${id}-country`}
          label="Country or area"
          value={spatialBbox ? region.id : "custom-global"}
          options={areaOptions}
          onChange={(value) => {
            if (value === "custom-global") {
              clearArea();
              return;
            }
            const next =
              countries.find((entry) => entry.region.id === value)?.region ??
              config.regions.find((entry) => entry.id === value);
            if (next) applyArea(next, true);
          }}
        />
        <PeriodPicker
          id={`${id}-period`}
          start={start}
          end={end}
          months={allMonths.map((entry) => entry.month)}
          onChange={(value) => {
            onManualChange();
            setPlaying(false);
            setPlaybackError(undefined);
            setPeriod(value);
          }}
        />
      </div>
      <p className="real-source">
        {variable.product}
        {variable.run ? ` · ${variable.run}` : ""} · {realUnit(variable.unit)} ·{" "}
        {months.length} available months
        {((period.start && period.start !== start) ||
          (period.end && period.end !== end)) && (
          <span className="compact-period-coverage-note" role="status">
            Study period adjusted to available coverage: {start} – {end}. Choose
            a new period to revise.
          </span>
        )}
      </p>
      {analysisContent}
      <div className="real-globe-container" aria-busy={frame.loading}>
        <RealGlobe
          frame={frame.data}
          view={view}
          onView={onView}
          onNavigate={onNavigate}
          region={spatialBbox ? region : undefined}
          outlineGeometry={countryOutline}
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
              ? `Loading ${realMonth(month)}…`
              : "Preparing next months…"}
            {frame.data &&
              frame.data.month !== month &&
              ` Showing ${realMonth(frame.data.month)}.`}
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
      <div
        className="real-time-controls"
        role="group"
        aria-label={`Monthly playback for panel ${side}`}
      >
        <button
          aria-label={`Previous month for panel ${side}`}
          disabled={index === 0}
          onClick={() => selectMonth(months[index - 1].month)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label={`${playing ? "Pause" : "Play"} months for panel ${side}`}
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
          aria-label={`Timeline for panel ${side}`}
          type="range"
          min="0"
          max={months.length - 1}
          value={index}
          onChange={(e) => selectMonth(months[Number(e.target.value)].month)}
        />
        <button
          aria-label={`Next month for panel ${side}`}
          disabled={index === months.length - 1}
          onClick={() => selectMonth(months[index + 1].month)}
        >
          <ChevronRight size={18} />
        </button>
        <MonthPicker
          id={`${id}-month`}
          label="Selected month"
          value={month}
          months={months.map((entry) => entry.month)}
          onChange={selectMonth}
        />
      </div>
      {overview && !spatialBbox && (
        <p className="real-notice">
          Draw an area on the globe to compare its monthly series with the
          global series. The global map remains visible.
        </p>
      )}
      <details className="real-provenance">
        <summary>Source, quality & coordinates</summary>
        <p>{variable.description}</p>
        {frame.data && (
          <p>
            {frame.data.grid.width} × {frame.data.grid.height} display cells ·{" "}
            {((frame.data.validCells / frame.data.totalCells) * 100).toFixed(1)}
            % with values · global frame
          </p>
        )}
        <p>
          Product: {variable.product}
          {variable.run ? ` · ${variable.run}` : ""} · unit:{" "}
          {realUnit(variable.unit)}
        </p>
        <p>
          Series area: {region.name} · bbox [{region.bbox}]
        </p>
        <p>
          The map always displays the global field. Area selection affects the
          regional series only.
        </p>
        {countryOutline && (
          <p>
            The country outline is a visual reference; series values use its
            rectangular extent, including cells outside the border.
          </p>
        )}
        {variable.quality?.rule && <p>Quality rule: {variable.quality.rule}</p>}
        {variable.quality?.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </details>
      <div
        className="real-series-comparison"
        aria-label="Regional and global monthly series"
      >
        <p className="real-series-comparison-note">
          Same variable and study period · continuous charts share the same
          vertical scale. Area selection changes the regional series only.
        </p>
        {series.loading && (
          <p role="status" className="real-notice">
            Loading {region.name} monthly series…
          </p>
        )}
        {series.error && (
          <Failure message={series.error} retry={series.retry} />
        )}
        {series.data && spatialBbox && (
          <RealSeries
            data={series.data}
            title={region.name}
            context={countryOutline ? "country-extent" : "regional"}
            domain={sharedDomain}
            month={frame.data?.month ?? ""}
            onMonth={selectMonth}
            eventWindow={eventWindow}
          />
        )}
        {globalSeries.loading && spatialBbox && (
          <p role="status" className="real-notice">
            Loading global monthly series…
          </p>
        )}
        {globalSeries.error && spatialBbox && (
          <Failure message={globalSeries.error} retry={globalSeries.retry} />
        )}
        {globalSeries.data && (
          <RealSeries
            data={globalSeries.data}
            title="Global"
            context="global"
            domain={sharedDomain}
            month={frame.data?.month ?? ""}
            onMonth={selectMonth}
            eventWindow={eventWindow}
          />
        )}
      </div>
    </article>
  );
}
