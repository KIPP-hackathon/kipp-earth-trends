import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, FlaskConical, Play, RefreshCw } from "lucide-react";
import type {
  EarthCatalog,
  EarthConfig,
  EarthRegion,
  EarthSeries,
  EarthVariable,
} from "../lib/earthApi";
import { loadSeries, variableDataKey } from "../lib/earthApi";
import { loadCountries } from "../lib/countries";
import type { CountrySelection } from "../lib/countries";
import { useEarthResource } from "../lib/useEarthResource";
import { useGlobeCamera } from "../lib/useGlobeCamera";
import { initialGlobeView } from "../lib/comparison";
import { parseStudyBbox } from "../lib/assistant";
import {
  fitMonthlyTrend,
  formatTrendValue,
  monthFromIndex,
  trendUnit,
} from "../lib/trendLab";
import type { MonthlyTrend } from "../lib/trendLab";
import { RealGlobe } from "./RealGlobe";
import { SearchPicker } from "./ExplorationControls";
import { MonthPicker } from "./MonthPicker";
import { TrendChart } from "./TrendChart";
import "./trend-lab.css";

type Study = {
  variable: EarthVariable;
  region: EarthRegion;
  start: string;
  end: string;
  key: string;
};
const globalRegion: EarthRegion = {
  id: "trend-global",
  name: "Global",
  bbox: "-180,-90,180,90",
  longitude: 0,
  latitude: 0,
};
const numeric = (variable: EarthVariable) =>
  variable.render?.kind !== "categorical" &&
  variable.aggregation !== "weighted_mode";
const dataKind = (product: string) =>
  /MERRA/i.test(product)
    ? "Reanalysis: a model combined with assimilated observations."
    : /IMERG|MODIS|GRACE|NSIDC|AMSR/i.test(product)
      ? "Satellite-derived estimate or retrieval; not a direct ground measurement."
      : "Gridded source product; consult its documentation for the measurement or estimation method.";
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

function TrendResult({
  trend,
  data,
  study,
}: {
  trend: MonthlyTrend;
  data: EarthSeries;
  study: Study;
}) {
  const id = useId();
  const [anchor, setAnchor] = useState(trend.endMonth);
  const [duration, setDuration] = useState(12);
  const from = Math.max(trend.startMonth, Math.min(trend.endMonth, anchor));
  const to = from + duration;
  const change = trend.slope * duration;
  const unit = trendUnit(data.unit);
  const coverages = trend.points.flatMap((point) =>
    point.coverage === null ? [] : [point.coverage],
  );
  const minimumCoverage = coverages.length ? Math.min(...coverages) : null;
  return (
    <>
      <div className="trend-result-heading">
        <div>
          <span className="trend-kicker">02 / FIT THE TREND</span>
          <h3>{study.variable.name}</h3>
          <p>
            {study.region.name} · {monthLabel(study.start)} –{" "}
            {monthLabel(study.end)}
          </p>
        </div>
        <span className="trend-model-tag">Linear regression · OLS</span>
      </div>
      <div className="trend-metrics">
        <div>
          <span>Change per month</span>
          <strong>
            {formatTrendValue(trend.slope, true)} <small>{unit}</small>
          </strong>
        </div>
        <div>
          <span>Valid monthly values</span>
          <strong>
            {trend.n}
            <small> / {trend.n + trend.missingMonths} months</small>
          </strong>
        </div>
        <div>
          <span>Fit · R²</span>
          <strong>
            {trend.rSquared === null ? "Undefined" : trend.rSquared.toFixed(3)}
          </strong>
        </div>
      </div>
      <TrendChart trend={trend} from={from} to={to} unit={unit} />
      <section
        className="trend-projection"
        aria-labelledby={`${id}-projection`}
      >
        <div className="trend-section-title">
          <span className="trend-kicker">03 / EXPLORE THE LINE</span>
          <span className="trend-projection-tag">Trend projection</span>
        </div>
        <h3 id={`${id}-projection`}>
          How much changes over {duration} months?
        </h3>
        <div className="trend-endpoint-controls">
          <label htmlFor={`${id}-from`}>
            <span>Point A · {monthLabel(monthFromIndex(from))}</span>
            <input
              id={`${id}-from`}
              aria-label="Starting month on the trend line"
              aria-valuetext={monthLabel(monthFromIndex(from))}
              type="range"
              min={trend.startMonth}
              max={trend.endMonth}
              step={1}
              value={from}
              onChange={(event) => setAnchor(Number(event.target.value))}
            />
          </label>
          <label htmlFor={`${id}-duration`}>
            <span>Point B · {duration} months after A</span>
            <input
              id={`${id}-duration`}
              aria-label="Months between trend points"
              type="range"
              min={1}
              max={60}
              step={1}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </label>
        </div>
        <div
          className="trend-duration-presets"
          aria-label="Projection duration presets"
        >
          {[3, 6, 12, 24, 60].map((months) => (
            <button
              type="button"
              key={months}
              aria-pressed={duration === months}
              onClick={() => setDuration(months)}
            >
              {months} months
            </button>
          ))}
        </div>
        <div className="trend-change" role="status" aria-live="polite">
          <strong>
            {formatTrendValue(change, true)} <small>{unit}</small>
          </strong>
          <p>
            The fitted trend{" "}
            {change > 0 ? "increases" : change < 0 ? "decreases" : "changes"} by{" "}
            <b>
              {formatTrendValue(Math.abs(change))} {unit}
            </b>{" "}
            over <b>{duration} months</b>.
          </p>
        </div>
        <div className="trend-endpoint-values">
          <span>
            <b>A</b> {monthLabel(monthFromIndex(from))} ·{" "}
            {formatTrendValue(trend.predict(from))} {unit}
          </span>
          <ArrowRight size={15} aria-hidden="true" />
          <span>
            <b>B</b> {monthLabel(monthFromIndex(to))} ·{" "}
            {formatTrendValue(trend.predict(to))} {unit}
          </span>
        </div>
        {trend.interval && (
          <p className="trend-small">
            95% interval for this fitted change:{" "}
            {formatTrendValue(trend.interval[0] * duration, true)} to{" "}
            {formatTrendValue(trend.interval[1] * duration, true)} {unit},
            conditional on the OLS assumptions.
          </p>
        )}
        <p className="trend-small">
          Both points sit on the fitted line, not on individual measurements.{" "}
          {to > trend.endMonth
            ? "Point B extends beyond the observed data. "
            : ""}
          This is a linear extrapolation of the selected trend, not a forecast
          of future observations. Projected values are not constrained to
          physical bounds.
        </p>
      </section>
      <section
        className={`trend-significance ${trend.significant === true ? "is-significant" : ""}`}
        aria-label="Statistical significance"
      >
        <div>
          <span className="trend-kicker">
            STATISTICAL EVIDENCE · CONDITIONAL
          </span>
          <h3>
            {trend.significant === null
              ? "Significance unavailable"
              : trend.significant
                ? "Statistically significant under OLS assumptions"
                : "Not statistically significant under OLS assumptions"}
          </h3>
        </div>
        <p>
          {trend.interval ? (
            <>
              95% slope interval:{" "}
              <strong>
                {formatTrendValue(trend.interval[0], true)} to{" "}
                {formatTrendValue(trend.interval[1], true)} {unit} per month
              </strong>
              .{" "}
              {trend.significant
                ? "The interval excludes zero (two-sided α = 0.05)."
                : "The interval includes zero. This does not establish that there is no change."}
            </>
          ) : (
            "Residual variation is zero or numerically degenerate; the usual slope test is unavailable. The line is descriptive."
          )}
        </p>
        <p>
          Unadjusted monthly OLS assumes a linear relationship with independent,
          normally distributed, constant-variance residuals. Seasonality and
          autocorrelation are not corrected and can distort the slope and its
          significance. Short records do not establish long-term climate change.
          Significance does not establish importance or causality. Repeated
          selections are exploratory; no multiple-testing adjustment is applied.
        </p>
      </section>
      <details className="trend-provenance">
        <summary>Data, coverage & method</summary>
        <dl>
          <div>
            <dt>Data type</dt>
            <dd>{dataKind(data.product)}</dd>
          </div>
          <div>
            <dt>Product</dt>
            <dd>
              {data.product}
              {data.run ? ` · ${data.run}` : ""}
            </dd>
          </div>
          <div>
            <dt>Variable / unit</dt>
            <dd>
              {data.variable} / {unit}
            </dd>
          </div>
          <div>
            <dt>Region rectangle</dt>
            <dd>[{data.bbox.join(", ")}]</dd>
          </div>
          <div>
            <dt>Aggregation</dt>
            <dd>
              {data.aggregation === "sum"
                ? "Sum of valid source cells; no second area weighting."
                : "Spatial mean weighted by latitude and valid coverage."}
            </dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>
              {trend.missingMonths} missing or invalid months excluded; calendar
              gaps are preserved.{" "}
              {minimumCoverage === null
                ? "Area coverage unavailable."
                : `Minimum valid area coverage among fitted months: ${(minimumCoverage * 100).toFixed(1)}%.`}
            </dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>
              y = mean(y) + slope × (calendar month − mean(calendar month)).
              Two-sided 95% Student-t slope interval, {trend.n - 2} degrees of
              freedom. All valid monthly source values in the selected period;
              no deseasonalization.
            </dd>
          </div>
        </dl>
        <p>
          Country selections use a bounding rectangle, including cells outside
          the country boundary. NASA products include reanalyses and
          satellite-derived estimates; these are not interchangeable with direct
          observations.
        </p>
        <p>{data.method}</p>
        {data.quality?.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        {(data.source || data.sourceTable) && (
          <p>
            Data access: {data.source ?? "not specified"} · layer:{" "}
            {data.sourceLayer ?? "not specified"} · table:{" "}
            {data.sourceTable ?? "not specified"}
            {data.sourceUC ? ` · upstream: ${data.sourceUC}` : ""}.
          </p>
        )}
        <p>
          Method reference:{" "}
          <a
            href="https://online.stat.psu.edu/stat501/Lesson02"
            target="_blank"
            rel="noreferrer"
          >
            Penn State · Simple linear regression inference
          </a>
          .
        </p>
      </details>
    </>
  );
}

export function TrendLab({
  catalog,
  config,
  initialCountry,
  active,
}: {
  catalog: EarthCatalog;
  config: EarthConfig;
  initialCountry: CountrySelection;
  active: boolean;
}) {
  const id = useId();
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
  const [period, setPeriod] = useState({ start: "", end: "" });
  const [submitted, setSubmitted] = useState<Study>();
  const [completed, setCompleted] = useState<{
    key: string;
    data: EarthSeries;
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
  const months = useMemo(
    () =>
      variable
        ? [
            ...new Set(
              variable.months
                .filter((row) => row.validSamples > 0)
                .map((row) => row.month),
            ),
          ].sort()
        : [],
    [variable],
  );
  const start = period.start || months[0] || "";
  const end = period.end || months.at(-1) || "";
  const validPeriod =
    !!variable &&
    numeric(variable) &&
    months.includes(start) &&
    months.includes(end) &&
    start <= end;
  const key = variable
    ? JSON.stringify([variableDataKey(variable), region.bbox, start, end])
    : "";
  const dirty = submitted !== undefined && submitted.key !== key;
  const series = useEarthResource(
    active && submitted ? submitted.key : null,
    (signal) => loadSeries(submitted!.variable, submitted!.region.bbox, signal),
  );
  useEffect(() => {
    if (series.data && submitted)
      setCompleted({ key: submitted.key, data: series.data });
  }, [series.data, submitted]);
  const data =
    series.data ??
    (completed?.key === submitted?.key ? completed?.data : undefined);
  const trend = useMemo(
    () =>
      data && submitted
        ? fitMonthlyTrend(data.observations, submitted.start, submitted.end)
        : null,
    [data, submitted],
  );
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
          <p>Choose a place. Fit a line. Explore what its slope means.</p>
        </div>
        <span className="trend-model-tag">Real monthly data · Runtime fit</span>
      </header>
      <div className="trend-layout">
        <aside className="trend-setup" aria-label="Trend setup">
          <span className="trend-kicker">01 / SET UP YOUR INVESTIGATION</span>
          <SearchPicker
            id={`${id}-area`}
            label="Study region"
            value={region.id}
            options={regions.map((entry) => ({
              id: entry.id,
              name: entry.name,
              icon: countries.find((country) => country.region.id === entry.id)
                ?.flag,
            }))}
            onChange={(value) => {
              const next = regions.find((entry) => entry.id === value);
              if (next) selectRegion(next);
            }}
          />
          <div className="trend-map">
            <RealGlobe
              view={camera.view}
              onView={camera.setView}
              onNavigate={camera.flyTo}
              region={region}
              outlineGeometry={country?.geometry}
              onSelectArea={drawRegion}
              onClearArea={() => selectRegion(globalRegion)}
            />
          </div>
          <p className="trend-small">
            Rotate the globe, then use Draw area to select a rectangle. Country
            selections use their bounding extent.
          </p>
          <SearchPicker
            id={`${id}-indicator`}
            label="Indicator"
            value={variable?.id ?? ""}
            options={available.map((entry) => ({
              id: entry.id,
              name: numeric(entry)
                ? `${entry.name} (${trendUnit(entry.unit)})`
                : entry.name,
              detail: numeric(entry)
                ? entry.domain
                : `${entry.domain ? `${entry.domain} · ` : ""}Categorical classes · linear regression unavailable`,
              domain: entry.domain,
              disabled: !numeric(entry),
            }))}
            onChange={(value) => {
              setSelectedVariable(value);
              setPeriod({ start: "", end: "" });
            }}
          />
          {variable?.description && (
            <p className="trend-small">{variable.description}</p>
          )}
          <div className="trend-period-title">
            <span>Monthly period</span>
            <button
              type="button"
              onClick={() => setPeriod({ start: "", end: "" })}
            >
              Use all data
            </button>
          </div>
          <div className="trend-dates">
            <MonthPicker
              id={`${id}-start`}
              label="From"
              value={start}
              months={months}
              onChange={(value) =>
                setPeriod((previous) => ({ ...previous, start: value }))
              }
            />
            <MonthPicker
              id={`${id}-end`}
              label="To"
              value={end}
              months={months}
              onChange={(value) =>
                setPeriod((previous) => ({ ...previous, end: value }))
              }
            />
          </div>
          <p className="trend-small">
            {!period.start && !period.end
              ? "All available data selected. "
              : "Custom analysis period. "}
            At least three valid monthly values are required.
          </p>
          {!validPeriod && (
            <p role="alert" className="trend-notice">
              Choose a continuous indicator and a valid period with the start
              before the end.
            </p>
          )}
          <button
            className="trend-run"
            type="button"
            disabled={!validPeriod}
            onClick={() => {
              if (variable && validPeriod) {
                setSubmitted({
                  variable,
                  region: { ...region },
                  start,
                  end,
                  key,
                });
                if (submitted?.key === key) series.retry();
              }
            }}
          >
            <Play size={16} fill="currentColor" />{" "}
            {series.loading ? "Generate new trend" : "Generate trend"}
          </button>
          <div className="trend-model-note">
            <span>THE MODEL</span>
            <strong>Simple linear regression</strong>
            <p>
              Time → monthly value. One slope, fitted to the selected data. No
              training service or AI model required.
            </p>
          </div>
        </aside>
        <div className="trend-output" aria-busy={series.loading}>
          {dirty && (
            <p className="trend-notice">
              Setup changed. Generate a new trend to apply it. Any result below
              still refers to the labeled previous selection.
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
                Select an indicator and period, then generate a trend to see the
                monthly points, fitted line and statistical evidence.
              </p>
              <div>
                <span>Region + data</span>
                <ArrowRight size={16} />
                <span>Linear fit</span>
                <ArrowRight size={16} />
                <span>Change over time</span>
              </div>
            </div>
          )}
          {series.loading && (
            <div className="trend-empty" role="status">
              <RefreshCw size={26} />
              <h3>Loading regional monthly values…</h3>
              <p>
                The linear fit will run in your browser when the series is
                ready.
              </p>
            </div>
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
            submitted &&
            (trend ? (
              <TrendResult
                key={submitted.key}
                trend={trend}
                data={data}
                study={submitted}
              />
            ) : (
              <div className="trend-empty" role="status">
                <h3>Not enough valid data for a trend</h3>
                <p>
                  This selection needs at least three valid monthly values at
                  distinct dates. Try a wider period, another region or
                  indicator. Missing values are never replaced with zeros.
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
