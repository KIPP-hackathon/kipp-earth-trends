import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Compass, FlaskConical, MapPin, Play } from "lucide-react";
import type {
  EarthCatalog,
  EarthConfig,
  EarthRegion,
  EarthVariable,
  Investigation,
  InvestigationRequest,
} from "../lib/earthApi";
import { loadInvestigation, variableDataKey } from "../lib/earthApi";
import { loadCountries } from "../lib/countries";
import type { CountrySelection } from "../lib/countries";
import { useEarthResource } from "../lib/useEarthResource";
import { useGlobeCamera } from "../lib/useGlobeCamera";
import { initialGlobeView } from "../lib/comparison";
import type { TrendContext, TrendSelection } from "../lib/assistant";
import { validTrendSelection } from "../lib/assistant";
import { parseStudyBbox } from "../lib/assistant";
import { monthIndex } from "../lib/trendLab";
import { MultiVariablePicker } from "./MultiVariablePicker";
import { RealGlobe } from "./RealGlobe";
import { SearchPicker } from "./ExplorationControls";
import { MonthPicker } from "./MonthPicker";
import { InvestigationResults } from "./InvestigationResults";
import { GuidedTour } from "./GuidedTour";
import { LoadingIcon, LoadingState } from "./Loading";
import { trendLabTourSteps } from "./trendLabTour";
import "./trend-lab.css";

type Study = {
  variable: EarthVariable;
  second?: EarthVariable;
  region: EarthRegion;
  request: InvestigationRequest;
  key: string;
};
const globalRegion: EarthRegion = {
  id: "trend-global",
  name: "Global",
  bbox: "-180,-90,180,90",
  longitude: 0,
  latitude: 0,
};
const numeric = (v: EarthVariable) =>
  v.render?.kind !== "categorical" && v.aggregation !== "weighted_mode";
export function TrendLab({
  catalog,
  config,
  initialCountry,
  active,
  onGuide,
  assistantCommand,
  onAssistantContext,
  onManualChange,
}: {
  catalog: EarthCatalog;
  config: EarthConfig;
  initialCountry: CountrySelection;
  active: boolean;
  onGuide: () => void;
  assistantCommand?: { selection: TrendSelection; name: string; nonce: number };
  onAssistantContext?: (context: TrendContext) => void;
  onManualChange?: () => void;
}) {
  const id = useId();
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const camera = useGlobeCamera({
    ...initialGlobeView,
    longitude: initialCountry.region.longitude,
    latitude: initialCountry.region.latitude,
  });
  const [countries, setCountries] = useState<CountrySelection[]>([
    initialCountry,
  ]);
  const [region, setRegion] = useState<EarthRegion>(initialCountry.region);
  const [selectedVariable, setSelectedVariable] = useState("temperature");
  const [secondId, setSecondId] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [period, setPeriod] = useState({ start: "", end: "" });
  const [submitted, setSubmitted] = useState<Study>();
  const [completed, setCompleted] = useState<{
    key: string;
    data: Investigation;
  }>();
  const available = useMemo(
    () =>
      catalog.variables.filter(
        (variable) =>
          variable.available !== false &&
          variable.months.some((row) => row.validSamples > 0),
      ),
    [catalog.variables],
  );
  const variable =
    available.find((entry) => entry.id === selectedVariable) ??
    available.find(numeric);
  const second = available.find((v) => v.id === secondId);
  const months = useMemo(() => {
    if (!variable) return [];
    const a = variable.months
      .filter((r) => r.validSamples > 0)
      .map((r) => r.month);
    const b = second?.months
      .filter((r) => r.validSamples > 0)
      .map((r) => r.month);
    return [...new Set(b ? a.filter((m) => b.includes(m)) : a)].sort();
  }, [variable, second]);
  const start = period.start || months[0] || "",
    end = period.end || months.at(-1) || "";
  const request: InvestigationRequest = {
    x: variable?.id ?? "",
    ...(second ? { y: second.id } : {}),
    bbox: region.bbox,
    start,
    end,
    baselineStart: start,
    baselineEnd: end,
    method: "relationships-v1",
  };
  const span = [start, end].map(monthIndex);
  const spanMonths =
    span[0] !== null && span[1] !== null && span[1] >= span[0]
      ? span[1] - span[0] + 1
      : 0;
  const validPeriod =
    !!variable &&
    numeric(variable) &&
    (!second || numeric(second)) &&
    (!secondId || !!second) &&
    second?.id !== variable.id &&
    months.includes(start) &&
    months.includes(end) &&
    start <= end &&
    span.every((n) => n !== null) &&
    Math.max(...(span as number[])) - Math.min(...(span as number[])) < 600;
  const supported = catalog.capabilities?.investigations === true;
  const key = JSON.stringify([
    request,
    variable && variableDataKey(variable),
    second && variableDataKey(second),
  ]);
  const dirty = submitted !== undefined && submitted.key !== key;
  const series = useEarthResource(
    active && submitted ? submitted.key : null,
    (signal) =>
      loadInvestigation(
        submitted!.request,
        [
          submitted!.variable,
          ...(submitted!.second ? [submitted!.second] : []),
        ],
        signal,
      ),
  );
  useEffect(() => {
    if (series.data && submitted)
      setCompleted({ key: submitted.key, data: series.data });
  }, [series.data, submitted]);
  const data =
    series.data ??
    (completed?.key === submitted?.key ? completed?.data : undefined);
  useEffect(() => {
    let mounted = true;
    void loadCountries()
      .then((entries) => {
        if (mounted) setCountries(entries);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const selectionOf = (r: InvestigationRequest): TrendSelection => ({
    x: r.x,
    ...(r.y ? { y: r.y } : {}),
    bbox: r.bbox,
    start: r.start,
    end: r.end,
  });
  const contextKey = JSON.stringify({
    ...(validPeriod ? { selection: selectionOf(request) } : {}),
    ...(submitted ? { applied: selectionOf(submitted.request) } : {}),
    loading: series.loading,
    ...(data ? { generatedAt: data.generatedAt } : {}),
  });
  useEffect(() => {
    onAssistantContext?.(JSON.parse(contextKey));
  }, [contextKey, onAssistantContext]);
  useEffect(() => {
    onManualChange?.();
  }, [selectedVariable, secondId, region.bbox, start, end, onManualChange]);
  const handledCommand = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!assistantCommand || handledCommand.current === assistantCommand.nonce)
      return;
    handledCommand.current = assistantCommand.nonce;
    if (
      !supported ||
      !validTrendSelection(assistantCommand.selection, catalog)
    ) {
      setSavedMessage(
        "The assistant selection is no longer available. Please choose another investigation.",
      );
      return;
    }
    const s = assistantCommand.selection;
    const bounds = parseStudyBbox(s.bbox)!;
    const [west, south, east, north] = bounds;
    const width = east >= west ? east - west : east + 360 - west;
    const nextRegion: EarthRegion = {
      id: "trend-assistant",
      name: assistantCommand.name,
      bbox: s.bbox,
      longitude: ((west + width / 2 + 540) % 360) - 180,
      latitude: (south + north) / 2,
    };
    const x = available.find((v) => v.id === s.x)!;
    const y = available.find((v) => v.id === s.y);
    const nextRequest: InvestigationRequest = {
      x: s.x,
      ...(s.y ? {y:s.y} : {}),
      bbox: s.bbox,
      start: s.start,
      end: s.end,
      baselineStart: s.start,
      baselineEnd: s.end,
      method: "relationships-v1",
    };
    const nextKey = JSON.stringify([
      nextRequest,
      variableDataKey(x),
      y && variableDataKey(y),
    ]);
    setSelectedVariable(s.x);
    setSecondId(s.y ?? "");
    setRegion(nextRegion);
    setPeriod({ start: s.start, end: s.end });
    setSubmitted({
      variable: x,
      second: y,
      region: nextRegion,
      request: nextRequest,
      key: nextKey,
    });
    if (submitted?.key === nextKey) series.retry();
    camera.flyTo({
      ...camera.view,
      longitude: nextRegion.longitude,
      latitude: nextRegion.latitude,
    });
    setSavedMessage(
      "Assistant selection applied. Generating the investigation…",
    );
  }, [assistantCommand, supported, catalog]);
  const regions = [
    ...new Map(
      [
        globalRegion,
        ...config.regions,
        ...countries
          .filter((entry) => entry.selectable)
          .map((entry) => entry.region),
        region,
      ].map((entry) => [entry.id, entry]),
    ).values(),
  ];
  const country = countries.find((entry) => entry.region.id === region.id);
  const selectRegion = (next: EarthRegion) => {
    setRegion(next);
    camera.flyTo({
      ...camera.view,
      longitude: next.longitude,
      latitude: next.latitude,
    });
  };
  const drawRegion = (bbox: string) => {
    mark("area");
    const bounds = parseStudyBbox(bbox);
    if (!bounds) return;
    const [west, south, east, north] = bounds;
    const width = east >= west ? east - west : east + 360 - west;
    setRegion({
      id: "trend-drawn",
      name: "Drawn area",
      bbox: bounds.join(","),
      longitude: ((((west + width / 2 + 180) % 360) + 360) % 360) - 180,
      latitude: (south + north) / 2,
    });
  };
  const preset = (x: string, y: string) => {
    if (
      !available.some((v) => v.id === x) ||
      !available.some((v) => v.id === y)
    ) {
      setSavedMessage("A preset indicator is not available in this catalog.");
      return false;
    }
    setSelectedVariable(x);
    setSecondId(y);
    setPeriod({ start: "", end: "" });
    selectRegion({
      id: "trend-pantanal",
      name: "Pantanal box",
      bbox: "-60,-22,-54,-16",
      longitude: -57,
      latitude: -19,
    });
    setSavedMessage("Preset loaded. Generate to apply it.");
    return true;
  };
  const submit = () => {
    if (!variable || !validPeriod || !supported) return;
    onManualChange?.();
    setSubmitted({
      variable,
      region: { ...region },
      second,
      request: { ...request },
      key,
    });
    if (submitted?.key === key) series.retry();
  };
  // Which setup steps the person has actively chosen during the tour.
  const [chosen, setChosen] = useState({
    area: false,
    indicators: false,
    period: false,
  });
  const mark = (step: keyof typeof chosen) =>
    setChosen((c) => (c[step] ? c : { ...c, [step]: true }));
  const [tourStep, setTourStep] = useState<number | null>(null);
  const hasResults = !!data && !!submitted;
  const tourSteps = trendLabTourSteps({
    hasResults,
    hasSecond: (data?.series.length ?? 0) > 1,
    loading: series.loading,
    chosen,
    current: {
      area: region.name,
      indicators: variable
        ? `${variable.name}${second ? ` vs ${second.name}` : ""}`
        : "",
      period: !period.start && !period.end ? "all months" : `${start} – ${end}`,
    },
    onKeep: mark,
  });
  // After the tour, stay in Trend Lab: swallow stray clicks for a moment
  // (the footer logo would open Explore) and return to the top of the lab.
  const [afterTour, setAfterTour] = useState(false);
  const endTour = () => {
    setTourStep(null);
    setAfterTour(true);
    window.setTimeout(() => setAfterTour(false), 450);
    document
      .querySelector(".trend-lab")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const startTour = (step = 0) => {
    if (step === 0)
      setChosen({ area: false, indicators: false, period: false });
    setTourStep(step);
  };
  const runStep = tourSteps.findIndex((s) => s.id === "run");
  const resultsStep = tourSteps.findIndex((s) => s.id === "tabs");
  // Move on to the results automatically once they arrive during the tour.
  useEffect(() => {
    if (tourStep === runStep && hasResults && !series.loading)
      setTourStep(resultsStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResults, series.loading]);
  return (
    <div className="trend-lab">
      <header className="trend-header">
        <div>
          <span className="trend-kicker">
            <FlaskConical size={14} /> EARTH SYSTEM PLAYGROUND
          </span>
          <h2>
            Trend Lab<span>.</span>
          </h2>
          <p>
            Choose a place. Discover trends, unusual months, and relationships.
          </p>
        </div>
        <button
          type="button"
          className="investigation-tour-start"
          aria-expanded={tourStep !== null}
          onClick={() => (tourStep === null ? startTour() : endTour())}
        >
          <Compass size={15} />{" "}
          {tourStep === null ? "Take the guided tour" : "End tour"}
        </button>
      </header>
      <div className="trend-layout">
        <section className="trend-setup" aria-label="Trend setup">
          <div className="trend-setup-steps">
            <div className="trend-setup-step">
              <header className="trend-step-head">
                <span className="trend-step-num">1</span>
                <div>
                  <h3>Area</h3>
                  <p>Where to investigate</p>
                </div>
              </header>
              <SearchPicker
                id={`${id}-area`}
                label="Study region"
                value={region.id}
                options={regions.map((entry) => ({
                  id: entry.id,
                  name: entry.name,
                  icon: countries.find(
                    (country) => country.region.id === entry.id,
                  )?.flag,
                }))}
                onChange={(value) => {
                  const next = regions.find((entry) => entry.id === value);
                  if (next) {
                    selectRegion(next);
                    mark("area");
                  }
                }}
              />
              <p className="trend-small">
                Study rectangle <code>{region.bbox}</code> (W, S, E, N).
                Countries use their bounding box, not the border.
              </p>
              <details className="trend-area-details">
                <summary>
                  <MapPin size={13} /> Draw or inspect on the globe
                </summary>
                <div className="trend-map">
                  <RealGlobe
                    view={camera.view}
                    onView={camera.setView}
                    onNavigate={camera.flyTo}
                    region={region}
                    outlineGeometry={country?.geometry}
                    onSelectArea={drawRegion}
                    onClearArea={() => {
                      selectRegion(globalRegion);
                      mark("area");
                    }}
                  />
                </div>
                <p className="trend-small">
                  Rotate the globe, then use Draw area to select a rectangle.
                  Country selections use their bounding extent.
                </p>
              </details>
            </div>
            <div className="trend-setup-step">
              <header className="trend-step-head">
                <span className="trend-step-num">2</span>
                <div>
                  <h3>Indicators</h3>
                  <p>What to measure — add Y to compare</p>
                </div>
              </header>
              <MultiVariablePicker
                id={`${id}-indicator`}
                label="Indicator X"
                single
                variables={available.filter(numeric)}
                selected={variable ? [variable.id] : []}
                onApply={([value]) => {
                  mark("indicators");
                  setSelectedVariable(value);
                  if (value === secondId) setSecondId("");
                  setPeriod({ start: "", end: "" });
                }}
              />
              <MultiVariablePicker
                id={`${id}-second`}
                label="Indicator Y (optional)"
                single
                optional
                variables={available.filter(
                  (v) => numeric(v) && v.id !== variable?.id,
                )}
                selected={secondId ? [secondId] : []}
                onApply={([value]) => {
                  mark("indicators");
                  setSecondId(value ?? "");
                  setPeriod({ start: "", end: "" });
                }}
              />
              <div className="trend-examples" aria-label="Example studies">
                <span>Try an example</span>
                <button
                  type="button"
                  onClick={() => {
                    if (preset("temperature", "merra2_flx_prectotcorr"))
                      mark("indicators");
                  }}
                >
                  Pantanal · heat & precipitation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (preset("merra2_flx_prectotcorr", "merra2_qv2m"))
                      mark("indicators");
                  }}
                >
                  Pantanal · precipitation & humidity
                </button>
              </div>
            </div>
            <div className="trend-setup-step">
              <header className="trend-step-head">
                <span className="trend-step-num">3</span>
                <div>
                  <h3>Period</h3>
                  <p>Which months to analyse</p>
                </div>
                <button
                  type="button"
                  className="trend-step-action"
                  disabled={!period.start && !period.end}
                  onClick={() => {
                    setPeriod({ start: "", end: "" });
                    mark("period");
                  }}
                >
                  Use all data
                </button>
              </header>
              <div className="trend-dates">
                <MonthPicker
                  id={`${id}-start`}
                  label="From"
                  value={start}
                  months={months}
                  onChange={(value) => {
                    setPeriod((previous) => ({ ...previous, start: value }));
                    mark("period");
                  }}
                />
                <MonthPicker
                  id={`${id}-end`}
                  label="To"
                  value={end}
                  months={months}
                  onChange={(value) => {
                    setPeriod((previous) => ({ ...previous, end: value }));
                    mark("period");
                  }}
                />
              </div>
              <p className="trend-small">
                <strong>
                  {!period.start && !period.end
                    ? "All available data"
                    : "Custom period"}
                  {spanMonths ? ` · ${spanMonths} months` : ""}
                </strong>
                <br />
                Seasonal fits need 24 values with two of every calendar month;
                significance tests need 60 consecutive months.
              </p>
            </div>
          </div>
          <footer className="trend-setup-run">
            <div className="trend-setup-summary">
              <span className="trend-kicker">Your study</span>
              <p>
                <strong>{region.name}</strong>
                {variable && (
                  <>
                    {" · "}
                    {variable.name}
                    {second ? ` vs ${second.name}` : ""}
                  </>
                )}
                {start && end ? ` · ${start} – ${end}` : ""}
              </p>
              {savedMessage && (
                <p className="trend-small" role="status">
                  {savedMessage}
                </p>
              )}
              {!supported && (
                <p className="trend-notice">
                  This API version does not support investigations yet. Refresh
                  the catalog after the backend update.
                </p>
              )}
              {!validPeriod && (
                <p role="alert" className="trend-notice">
                  Choose a continuous indicator and a valid period with the
                  start before the end; study and reference together must span
                  at most 600 months.
                </p>
              )}
            </div>
            <div className="trend-setup-actions">
              <div className="trend-methodology" data-open={methodologyOpen}>
                <button
                  type="button"
                  aria-expanded={methodologyOpen}
                  aria-controls={`${id}-methodology`}
                  onClick={() => setMethodologyOpen(!methodologyOpen)}
                >
                  ⓘ Methodology
                </button>
                <div
                  id={`${id}-methodology`}
                  className="trend-methodology-content"
                >
                  <strong>Seasonal trends & relationships</strong>
                  <p>
                    Calendar-month effects and linear time, with
                    autocorrelation-aware uncertainty when coverage supports it.
                    Associations are not causes or forecasts.
                  </p>
                  <button type="button" onClick={onGuide}>
                    Read more in Guide
                  </button>
                </div>
              </div>
              <button
                className="trend-run"
                type="button"
                disabled={
                  !validPeriod || !supported || (series.loading && !dirty)
                }
                data-loading={(series.loading && !dirty) || undefined}
                onClick={submit}
              >
                {series.loading ? (
                  <LoadingIcon />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}{" "}
                {series.loading
                  ? dirty
                    ? "Generate new investigation"
                    : "Generating investigation…"
                  : "Generate investigation"}
              </button>
            </div>
          </footer>
        </section>
        <div className="trend-output" aria-busy={series.loading}>
          {dirty && (
            <p className="trend-notice">
              Setup changed. Generate a new investigation to apply it. Any
              result below still refers to the labeled previous selection.
            </p>
          )}
          {!submitted && (
            <div className="trend-empty">
              <FlaskConical size={34} strokeWidth={1} />
              <span className="trend-kicker">
                YOUR INVESTIGATION STARTS HERE
              </span>
              <h3>What is changing in this region?</h3>
              <p>
                Select one or two indicators and a period to explore seasonal
                trends, anomalies, and relationships with statistical evidence.
              </p>
              <button
                type="button"
                className="investigation-tour-start"
                onClick={() => startTour()}
              >
                <Compass size={15} /> New here? Take the guided tour
              </button>
              <div>
                <span>Region + data</span>
                <ArrowRight size={16} />
                <span>Seasonal analysis</span>
                <ArrowRight size={16} />
                <span>Change over time</span>
              </div>
            </div>
          )}
          {series.loading && (
            <LoadingState
              title="Loading regional monthly values…"
              detail="Preparing trends, anomalies and relationships from the same regional series. Missing months remain missing."
            />
          )}
          {series.error && (
            <div className="trend-empty" role="alert">
              <h3>Could not load this regional series</h3>
              <p>{series.error}</p>
              <button
                type="button"
                className="trend-run"
                onClick={series.retry}
              >
                Retry data
              </button>
            </div>
          )}
          {(!series.loading || !active) &&
            !series.error &&
            data &&
            submitted && (
              <InvestigationResults
                key={submitted.key}
                data={data}
                regionName={submitted.region.name}
                onGuide={onGuide}
                tourView={
                  tourStep === null ? undefined : tourSteps[tourStep]?.view
                }
                onTour={() => startTour(resultsStep)}
              />
            )}
        </div>
      </div>
      {tourStep !== null && (
        <GuidedTour
          steps={tourSteps}
          step={tourStep}
          onStep={setTourStep}
          onClose={endTour}
        />
      )}
      {afterTour && <div className="guided-tour-shield" aria-hidden="true" />}
    </div>
  );
}
