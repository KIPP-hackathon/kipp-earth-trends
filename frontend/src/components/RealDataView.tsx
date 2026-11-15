import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { GeoPermissibleObjects } from "d3-geo";
import "./global-comparison.css";
import "./compact-exploration.css";
import { loadCountries } from "../lib/countries";
import { LoadingStatus } from "./Loading";
import type { CountrySelection } from "../lib/countries";
import { PeriodPicker, SearchPicker } from "./ExplorationControls";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import {
  realMonth,
  variableDataKey,
} from "../lib/earthApi";
import type {
  EarthCatalog,
  EarthColorRange,
  EarthConfig,
  EarthRegion,
  ComparisonMode,
} from "../lib/earthApi";

import {
  bufferWindow,
  requestFrame,
  upcomingMonths,
} from "../lib/earthFrameCache";
import type { GlobeView } from "../lib/comparison";
import { RealGlobe } from "./RealGlobe";
import { MultiVariablePicker } from "./MultiVariablePicker";
import { useComparePlayback } from "./ComparePlayback";
import { EmptyRealPanel } from "./EmptyRealPanel";
import { ExploreTour } from "./ExploreTour";
import { variableAvailable } from "../lib/variableGroups";
import type { SuggestedVariableRequest, ExploreChoice } from "./ExploreTour";
import { LayerCard } from "./LayerCard";
import { ComparisonAnalysis } from "./ComparisonAnalysis";
import type { LayerSetting, MapLayer } from "../lib/layers";
import { combinedImergLayers } from "../lib/layers";
import { useLayerFrames } from "../lib/useLayerFrames";
import { pairWindFrames, windComponents, windFrameVariables } from "../lib/wind";
import "./multivariable-layers.css";
import { DomainIcon } from "../lib/domains";
import { groupVariables } from "../lib/variableGroups";
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

const initialComparisonMode = (preset: PanelPreset, overview: boolean): ComparisonMode =>
  (preset.layers?.length ?? 1) > 1
    ? preset.comparisonMode === "minmax" ? "minmax" : "standardized"
    : preset.comparisonMode ?? (overview ? "raw" : "standardized");

function SelectedRealPanel({
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
  onManualChange: onOriginalManualChange,
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
  onNavigate,
  headerAction,
  onTourChoice,
  suggestedVariable,
}: {
  suggestedVariable?: SuggestedVariableRequest;
  onTourChoice?: (choice: ExploreChoice) => void;
  headerAction?: ReactNode;
  instanceId?: string;
  overview?: boolean;
  initialRegion?: EarthRegion;
  initialOutline?: GeoPermissibleObjects;
  initializationKey?: string;
  onCustomRegion?: (region: EarthRegion) => void;
  onAreaChange?: () => void;
  eventWindow?: [string, string];
  onNavigate?: (view: GlobeView) => void;
  catalog: EarthCatalog;
  config: EarthConfig;
  preset: PanelPreset;
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
  const jointPlayback = useComparePlayback();
  const jointPlaying = jointPlayback?.playing ?? false;
  const reportJointPanel = jointPlayback?.report;
  const onManualChange = () => {
    if (jointPlaying) jointPlayback?.stop();
    onOriginalManualChange();
  };
  const [comparisonMode,setComparisonMode]=useState<ComparisonMode>(initialComparisonMode(preset, overview));
  const [selection, setSelection] = useState({
    variable: preset.variable,
    month: preset.month,
  });
  const [regionId, setRegionId] = useState(
    preset.region,
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
  const [layerSettings, setLayerSettings] = useState<LayerSetting[]>(() => preset.layers ?? [
    {variable:preset.variable, visible:true, opacity:1},
  ]);
  const [period, setPeriod] = useState({ start: preset.start ?? "", end: preset.end ?? "" });
  useEffect(() => {
    if (!preset) return;
    jointPlayback?.stop();
    setPlaying(false);
    setSelection({ variable: preset.variable, month: preset.month });
    setLayerSettings(preset.layers ?? [{variable:preset.variable,visible:true,opacity:1}]);
    setComparisonMode(initialComparisonMode(preset, overview));
    setRegionId(preset.region);
    if (config.regions.some((region) => region.id === preset.region))
      setDrawnRegion(undefined);
    setPeriod({ start: preset.start ?? "", end: preset.end ?? "" });
  }, [preset]);
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);
  const [playing, setPlaying] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filterVariable, setFilterVariable] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState<{ready:number;total:number}>();
  const [playbackError, setPlaybackError] = useState<string>();
  useEffect(() => {
    if (playbackCommand) {
      jointPlayback?.stop();
      setPlaybackError(undefined);
      setPlaying(active && playbackCommand.playing);
      onPlaybackApplied(side, playbackCommand.nonce);
    }
  }, [playbackCommand]);
  // Layer set whose look-ahead buffer is already filled; a change re-primes it.
  const playbackStarted = useRef<string | undefined>(undefined);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const availableVariables = useMemo(() => catalog.variables.filter(v => v.available !== false &&
    v.months.some(entry => entry.validSamples > 0)),[catalog.variables]);
  const effectiveSettings = useMemo(() => {
    const settings = combinedImergLayers(layerSettings).filter(setting => availableVariables.some(v => v.id === setting.variable));
    return settings.length ? settings : [{variable:availableVariables[0].id,visible:true,opacity:1}];
  },[layerSettings,availableVariables]);
  const selectedIds = JSON.stringify(effectiveSettings.map(setting => setting.variable));
  const selectedVariables = useMemo(() => (JSON.parse(selectedIds) as string[])
    .map(id => availableVariables.find(v => v.id === id)!),[selectedIds,availableVariables]);
  const variable = selectedVariables.find(v => v.id === selection.variable) ?? selectedVariables[0];
  const filterGroups = groupVariables(selectedVariables);
  const configuredVariable = selectedVariables.find(v => v.id === filterVariable) ?? selectedVariables[0];
  const configuredGroup = filterGroups.find(group => group.variables.some(v => v.id === configuredVariable.id))!;
  const allMonths = useMemo(() => [...new Map(selectedVariables.flatMap(v => v.months.filter(entry => entry.validSamples > 0))
    .map(entry => [entry.month, entry])).values()].sort((a,b) => a.month.localeCompare(b.month)),[selectedVariables]);
  const start = allMonths.some((m) => m.month === period.start)
    ? period.start
    : allMonths[0].month;
  const end =
    allMonths.some((m) => m.month === period.end) && period.end >= start
      ? period.end
      : allMonths.at(-1)!.month;
  const months = useMemo(() => allMonths.filter(m => m.month >= start && m.month <= end),[allMonths,start,end]);
  const month = months.some((m) => m.month === selection.month)
    ? selection.month
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
    onTourChoice?.("area");
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
  const countryOptions = countries
    .filter((entry) => entry.selectable)
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .map((entry) => ({
      id: entry.region.id,
      name: entry.name,
      icon: entry.flag,
      searchTerms: entry.searchTerms,
    }));
  const frameVariables = windFrameVariables(selectedVariables.filter(v =>
    v.months.some(entry => entry.month === month && entry.validSamples > 0) &&
    (v.id === variable.id || (view.showLayer && effectiveSettings.some(setting => setting.variable === v.id && setting.visible && setting.opacity > 0)))), availableVariables, month);
  const selectedFrameVariables = windFrameVariables(selectedVariables, availableVariables);
  const layerFrames = useLayerFrames(frameVariables, month, active, selectedFrameVariables);
  const renderedFrames = useMemo(() => Object.fromEntries(
    Object.entries(layerFrames.frames).map(([id, source]) => {
      const definition = availableVariables.find((entry) => entry.id === id);
      return [id, definition?.render ? { ...source, render: definition.render } : source];
    }),
  ), [layerFrames.frames, availableVariables]);
  const primaryFrame = renderedFrames[variable.id];
  const displayedFrame = primaryFrame ?? Object.values(renderedFrames)[0];
  const frame = {data:displayedFrame,loading:layerFrames.loading,
    error:Object.values(layerFrames.errors)[0],retry:layerFrames.retry};
  const mapLayers: MapLayer[] = effectiveSettings.map(setting => ({
    id: setting.variable, visible:setting.visible, opacity:setting.opacity,
    frame:renderedFrames[setting.variable],colorRange:colorRanges[setting.variable],
  }));
  const changeLayer = (next:LayerSetting) => {
    onManualChange();
    setPlaybackError(undefined);
    setLayerSettings(effectiveSettings.map(setting => setting.variable === next.variable ? next : setting));
    if (next.visible && !view.showLayer) onView({...view,showLayer:true});
  };
  const applyVariables = (ids:string[]) => {
    onTourChoice?.("variables");
    onManualChange();
    setPlaying(false);
    setPlaybackError(undefined);
    if (overview && ids.length === 1 && (selectedVariables.length !== 1 || selectedVariables[0].id !== ids[0]))
      setComparisonMode("raw");
    else if (ids.length > 1 && comparisonMode === "raw") setComparisonMode("standardized");
    const preservesSelection = ids.some(id=>effectiveSettings.some(setting=>setting.variable===id));
    setLayerSettings(ids.map((id,index) => effectiveSettings.find(setting => setting.variable === id) ??
      {variable:id,visible:!preservesSelection && index === 0,opacity:!preservesSelection && index === 0 ? 1 : 0.65}));
    setSelection({month,variable:ids.includes(variable.id) ? variable.id : ids[0]});
  };
  useEffect(() => {
    if (!suggestedVariable || !availableVariables.some(v => v.id === suggestedVariable.id)) return;
    if (effectiveSettings.some(setting => setting.variable === suggestedVariable.id)) {
      onTourChoice?.("variables");
    } else {
      applyVariables([...effectiveSettings.map(setting => setting.variable), suggestedVariable.id]);
    }
    // A request is applied once; later manual changes must stay manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedVariable]);
  const snapshotKey = JSON.stringify({
    side,
    variable: variable.id,
    selectedMonth: month,
    displayedMonth: layerFrames.frames[variable.id]?.month ?? null,
    layers: effectiveSettings,
    layerMonths: Object.fromEntries(effectiveSettings.map(setting => [setting.variable,
      setting.visible && view.showLayer ? layerFrames.frames[setting.variable]?.month ?? null : null])),
    comparisonMode,
    start,
    end,
    region,
    loading:
      active &&
      (frame.loading || buffering),
    playing: active && (playing || jointPlaying),
  });
  useEffect(() => {
    onSnapshot(JSON.parse(snapshotKey) as PanelSnapshot);
  }, [snapshotKey, onSnapshot]);
  const index = months.findIndex((m) => m.month === month);
  const selectMonth = useCallback((value: string) => {
    if (!months.some((entry) => entry.month === value)) return;
    onManualChange();
    setPlaying(false);
    setPlaybackError(undefined);
    setSelection({ variable: variable.id, month: value });
  },[months,variable.id,onManualChange]);
  const layerKey = JSON.stringify([view.showLayer,
    effectiveSettings.map(setting=>[setting.variable,setting.visible && setting.opacity>0]),
    selectedFrameVariables.map(v => variableDataKey(v)),start,end]);
  const playbackKey = JSON.stringify([month,layerKey]);
  const jointPanelKey = JSON.stringify([layerKey,months.map(entry=>entry.month),month,frame.loading,frame.error,playing]);
  useEffect(() => {
    if (!reportJointPanel) return;
    reportJointPanel(side,{
      months:months.map(entry=>entry.month),month,loading:frame.loading,error:frame.error,
      playing,studyKey:layerKey,
      pause:()=>{setPlaying(false);setPlaybackError(undefined);},
      setSpeed:setPlaybackSpeed,
      prepare:(target,signal)=>Promise.all(windFrameVariables(selectedVariables.filter(v =>
        v.months.some(row=>row.month===target && row.validSamples>0) &&
        (v.id===variable.id || (view.showLayer && effectiveSettings.some(setting=>setting.variable===v.id && setting.visible && setting.opacity>0)))),availableVariables,target)
        .map(v=>requestFrame(v,target,signal,"foreground"))),
      commit:target=>setSelection({variable:variable.id,month:target}),
    });
    // Registration updates only when calendar, sources or playback state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[reportJointPanel,side,jointPanelKey]);
  useEffect(()=>()=>reportJointPanel?.(side,undefined),[reportJointPanel,side]);

  // Look-ahead requests outlive a single month step so a frame that is already
  // downloading is not cancelled and restarted each time playback advances.
  const prefetch = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    if (!playing || !active || jointPlaying) return;
    const controller = new AbortController();
    prefetch.current = controller;
    return () => {
      controller.abort();
      if (prefetch.current === controller) prefetch.current = undefined;
    };
  },[playing,active,layerKey,jointPlaying]);
  useEffect(() => {
    if (!playing || !active || jointPlaying) {
      playbackStarted.current = undefined;
      setBuffering(false);
      setBufferProgress(undefined);
      return;
    }
    if (frame.error) { setPlaying(false); return; }
    if (frame.loading || layerFrames.displayedMonth !== month || months.length < 2) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ids = months.map(entry => entry.month);
    const next = ids[(index + 1) % ids.length];
    const neededFor = (target: string) => windFrameVariables(selectedVariables.filter(v =>
      v.months.some(row => row.month === target && row.validSamples > 0) &&
      (v.id === variable.id || (view.showLayer && effectiveSettings.some(s => s.variable === v.id && s.visible && s.opacity > 0)))), availableVariables, target);
    const layers = Math.max(1, neededFor(next).length);
    const loadMonth = (target: string, signal: AbortSignal, priority: "foreground" | "background") =>
      Promise.all(neededFor(target).map(v => requestFrame(v,target,signal,priority)));
    const deadline = Date.now() + config.playback.cadenceMs / playbackSpeed;
    const fail = (error: unknown) => {
      if (controller.signal.aborted) return;
      setPlaybackError(error instanceof Error ? error.message : "Could not prepare playback.");
      setPlaying(false);
    };
    const advance = () => {
      if (controller.signal.aborted) return;
      playbackStarted.current = layerKey;
      setBuffering(false);
      setBufferProgress(undefined);
      // Keep topping up the window behind the next month without blocking on it.
      const ahead = bufferWindow(Math.max(config.playback.lookAhead, config.playback.initialBuffer), layers);
      const persistent = prefetch.current?.signal;
      if (persistent) for (const target of upcomingMonths(ids,index,ahead).slice(1))
        void loadMonth(target,persistent,"background").catch(() => {});
      timer = setTimeout(() => {
        if (!controller.signal.aborted) setSelection({variable:variable.id,month:next});
      },Math.max(0,deadline-Date.now()));
    };
    setBuffering(true);
    if (playbackStarted.current !== layerKey) {
      // Fill the buffer before the first step so the globe never stalls mid-animation.
      const primed = upcomingMonths(ids,index,bufferWindow(config.playback.initialBuffer,layers));
      let ready = 0;
      setBufferProgress({ready,total:primed.length});
      void Promise.all(primed.map(target => loadMonth(target,controller.signal,"foreground").then(() => {
        if (!controller.signal.aborted) setBufferProgress({ready:++ready,total:primed.length});
      }))).then(advance).catch(fail);
    } else {
      // The next step blocks playback, so it outranks the rest of the look-ahead window.
      void loadMonth(next,controller.signal,"foreground").then(advance).catch(fail);
    }
    return () => {controller.abort();clearTimeout(timer);};
    // Batch commits preserve a coherent displayed month while the next layers load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,active,jointPlaying,playbackKey,frame.loading,frame.error,layerFrames.displayedMonth,start,end,playbackSpeed,config.playback.cadenceMs]);
  return (
    <article
      data-panel-id={instanceId}
      className={`real-panel compact-real-panel${overview ? " is-overview" : ""}${filtersOpen ? "" : " filters-collapsed"}`}
      aria-label={
        overview ? "Earth data exploration" : `Earth data panel ${side}`
      }
    >
      {!overview && (
        <div className="real-panel-heading">
          <div className="real-panel-title">
            <span className="real-panel-letter">{side}</span>
            <span>REAL DATA · {variable.product}</span>
          </div>
          {headerAction}
        </div>
      )}
      <div className="compact-exploration-controls">
        <MultiVariablePicker
          id={`${id}-variables`}
          variables={catalog.variables}
          selected={effectiveSettings.map(setting => setting.variable)}
          onApply={applyVariables}
          summary={[
            region.name,
            `${months.length} available months`,
            ((period.start && period.start !== start) || (period.end && period.end !== end))
              ? `Study period adjusted to available coverage: ${start} – ${end}. Choose a new period to revise.`
              : undefined,
          ].filter(Boolean).join(" · ")}
        />
        <SearchPicker
          id={`${id}-country`}
          label="Country"
          value={region.id}
          placeholder="Choose a country"
          options={countryOptions}
          onChange={(value) => {
            const next = countries.find((entry) =>
              entry.selectable && entry.region.id === value)?.region;
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
            onTourChoice?.("period");
            setSelection({ variable: variable.id, month: value.start });
          }}
        />
      </div>
      <div className="exploration-map-column">
      <div className="real-globe-container" aria-busy={frame.loading || buffering}>
        <RealGlobe
          frame={frame.data}
          layers={mapLayers}
          windFrames={layerFrames.frames}
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
          <LoadingStatus
            className={`real-loading ${frame.data ? "has-frame" : ""}`}
          >
            {frame.loading ? `Loading ${realMonth(month)}…` : bufferProgress
              ? `Buffering playback · ${bufferProgress.ready}/${bufferProgress.total} months ready…`
              : "Loading…"}
            {frame.data &&
              frame.data.month !== month &&
              ` Showing ${realMonth(frame.data.month)}.`}
          </LoadingStatus>
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
          aria-label={`${playing || jointPlaying ? "Pause" : "Play"} months for panel ${side}`}
          aria-pressed={playing || jointPlaying}
          disabled={months.length < 2}
          onClick={() => {
            onManualChange();
            if (jointPlaying) return;
            setPlaybackError(undefined);
            if (!playing && index === months.length - 1)
              setSelection({ variable: variable.id, month: months[0].month });
            setPlaying((v) => !v);
          }}
        >
          {playing || jointPlaying ? <Pause size={16} /> : <Play size={16} />}
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
        <label className="real-playback-speed">
          <span>Speed</span>
          <select aria-label={`Playback speed for panel ${side}`} value={playbackSpeed}
            onChange={(event) => { onManualChange(); setPlaybackSpeed(Number(event.target.value)); }}>
            {[0.5, 1, 2, 4].map(speed => <option key={speed} value={speed}>{speed}×</option>)}
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
      </div>
      {overview && !spatialBbox && (
        <p className="real-notice">
          Draw an area on the globe to compare its monthly series with the
          global series. The global map remains visible.
        </p>
      )}
      <details className="comparison-map-controls" open={filtersOpen}
        onToggle={event => setFiltersOpen(event.currentTarget.open)}>
      <summary title={filtersOpen ? "Collapse map filters" : "Expand map filters"}>
        <span className="filter-summary-expanded">Map filters · {selectedVariables.length}</span>
        <span className="filter-summary-collapsed">Filters</span>
      </summary>
      <div className="layer-deck-content">
      <div className="layer-deck-heading">
        <div><h2>Variables & map layers</h2><p className="real-series-comparison-note">
          Map layers keep their physical units and scales. Opacity blends colors, not measurements.
          Later color fields appear on top; wind trails overlay them. For paired U/V at the same level,
          the last visible component styles one shared flow field.
        </p></div>
        <div className="layer-deck-actions">
          <button type="button" onClick={() => {
            onManualChange();
            setLayerSettings(effectiveSettings.map(setting => ({...setting,visible:true})));
            if (!view.showLayer) onView({...view,showLayer:true});
          }}>Show all</button>
          <button type="button" onClick={() => {
            onManualChange();
            setLayerSettings(effectiveSettings.map(setting => ({...setting,visible:false})));
          }}>Hide all</button>
        </div>
      </div>
      {selectedVariables.length > 1 && <div className="layer-cascade">
        <label>Configure variable
          <div className="layer-variable-select">
            <div className="layer-variable-selection" aria-hidden="true">
              <DomainIcon domain={configuredGroup.key} size={13} />
              <span>{configuredGroup.label} · {configuredVariable.name}</span>
              <ChevronDown size={14} />
            </div>
            <select aria-label="Configure variable" value={configuredVariable.id}
              title={`${configuredGroup.label} · ${configuredVariable.name}`}
              onChange={event => setFilterVariable(event.target.value)}>
              {filterGroups.map(group => <optgroup key={group.key} label={group.label}>
                {group.variables.map(variable => <option key={variable.id} value={variable.id}>{variable.name}</option>)}
              </optgroup>)}
            </select>
          </div>
        </label>
      </div>}
      <div className="layer-stack" role="region" aria-label="Scrollable map layer controls" tabIndex={0}>
        {selectedVariables.filter(entry => entry.id === configuredVariable.id).map(entry => {
          const setting = effectiveSettings.find(layer => layer.variable === entry.id)!;
          const hasMonth = entry.months.some(row => row.month === month && row.validSamples > 0);
          const pair = windComponents(entry.id);
          const windReady = pair && pairWindFrames(layerFrames.frames[pair.eastward], layerFrames.frames[pair.northward]);
          const windStyle = pair && mapLayers.findLast(layer => windComponents(layer.id)?.level === pair.level &&
            layer.visible && layer.opacity > 0);
          const windStatus = pair && setting.visible && hasMonth && !layerFrames.loading && !windReady
            ? `Wind trails unavailable: both U and V at ${pair.level} with matching month, grid and product are required.`
            : windStyle && windStyle.id !== entry.id
              ? `Same-level trails use ${selectedVariables.find(variable => variable.id === windStyle.id)?.name} styling (last visible component).`
              : undefined;
          return <LayerCard key={entry.id} variable={entry} setting={setting}
            colorRange={colorRanges[entry.id]} onChange={changeLayer}
            mapEnabled={view.showLayer}
            soloActive={setting.visible && view.showLayer && effectiveSettings.filter(layer => layer.visible).length === 1}
            onSolo={() => {
              onManualChange();
              if (!view.showLayer) onView({...view,showLayer:true});
              setLayerSettings(effectiveSettings.map(layer => ({...layer,visible:layer.variable === entry.id})));
              if (!view.showLayer) onView({...view,showLayer:true});
            }}
            processingRun={entry.months.find(row=>row.month===(layerFrames.displayedMonth ?? month))?.processingRun}
            onColorRange={value => onColorRange(entry.id,value)}
            loading={!(playing || jointPlaying) && setting.visible && hasMonth && layerFrames.loading}
            error={layerFrames.errors[entry.id] ?? (pair &&
              (layerFrames.errors[pair.eastward] ?? layerFrames.errors[pair.northward]))}
            status={!(playing || jointPlaying) && layerFrames.loading && layerFrames.displayedMonth ? `Preparing ${realMonth(month)}; map still shows ${realMonth(layerFrames.displayedMonth)}.` :
              !hasMonth ? `No observations for ${realMonth(month)}. This layer is not drawn.` : windStatus}/>
        })}
      </div>
      </div>
      </details>
      <section className="real-series-comparison multivariable-analysis" aria-label="Selected variable charts">
        <ComparisonAnalysis variables={selectedVariables} region={region} start={start} end={end}
          month={month} onMonth={selectMonth} active={active} mode={comparisonMode}
          onMode={mode=> {onManualChange();setComparisonMode(mode);}}
          eventWindow={eventWindow} countryOutline={!!countryOutline} available={catalog.capabilities?.comparisonCharts===true}
          runtimeTrends={catalog.capabilities?.runtimeTrends===true}/>

      </section>

    </article>
  );
}

export type RealPanelProps = Omit<Parameters<typeof SelectedRealPanel>[0], "preset"> & { preset?: PanelPreset };

/** Do not mount data readers until variables are explicitly applied or restored. */
export function RealPanel(props: RealPanelProps) {
  const [initialPreset, setInitialPreset] = useState<PanelPreset>();
  const preset = props.preset ?? initialPreset;
  const [suggestedVariable, setSuggestedVariable] = useState<SuggestedVariableRequest>();
  const suggestion = props.catalog.variables.find(variable => variable.id === "temperature" && variableAvailable(variable));
  const renderPanel = (onTourChoice?: (choice: ExploreChoice) => void) => preset
    ? <SelectedRealPanel {...props} preset={preset} onTourChoice={onTourChoice} suggestedVariable={suggestedVariable} />
    : <EmptyRealPanel {...props} onTourChoice={onTourChoice} suggestedVariable={suggestedVariable} onStart={(next) => {
        setInitialPreset(next);
        requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(
          `[data-panel-id="${CSS.escape(props.instanceId ?? props.side)}"] .multi-variable-trigger`,
        )?.focus({preventScroll:true}));
      }} />;
  return props.overview
    ? <ExploreTour ready={!!preset} active={props.active !== false}
        suggestion={suggestion} onSuggestion={id => setSuggestedVariable(previous => ({id, nonce: (previous?.nonce ?? 0) + 1}))}>{renderPanel}</ExploreTour>
    : renderPanel();
}
