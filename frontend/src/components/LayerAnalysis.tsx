import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { EarthRegion, EarthSeries, EarthVariable } from "../lib/earthApi";
import { loadSeries, realScale, variableDataKey } from "../lib/earthApi";
import { useEarthResource } from "../lib/useEarthResource";
import { RealSeries } from "./RealSeries";
import { LoadingState, LoadingStatus } from "./Loading";
import "./multivariable-layers.css";

const globalBbox = "-180,-90,180,90";
function calendarMonths(start: string, end: string) {
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!valid.test(start) || !valid.test(end)) return [];
  const index = (month: string) =>
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
  const first = index(start),
    last = index(end);
  if (last < first || last - first >= 2400) return [];
  return Array.from(
    { length: last - first + 1 },
    (_, offset) =>
      `${Math.floor((first + offset) / 12)}-${String(((first + offset) % 12) + 1).padStart(2, "0")}`,
  );
}
function includeCalendar(data: EarthSeries, months: string[]): EarthSeries {
  const byMonth = new Map(data.observations.map((row) => [row.month, row]));
  return {
    ...data,
    start: months[0],
    end: months.at(-1),
    observations: months.map(
      (month) =>
        byMonth.get(month) ?? {
          month,
          value: null,
          coverage: null,
          samples: 0,
        },
    ),
  };
}
type DisplayedAnalysis = {
  source: string;
  period: string;
  regionName: string;
  hasArea: boolean;
  countryOutline: boolean;
  regional?: EarthSeries;
  global?: EarthSeries;
  domain?: [number, number];
};
function LayerAnalysisComponent({
  variable,
  region,
  start,
  end,
  month,
  onMonth,
  active,
  eventWindow,
  countryOutline = false,
}: {
  variable: EarthVariable;
  region: EarthRegion;
  start: string;
  end: string;
  month: string;
  onMonth: (month: string) => void;
  active: boolean;
  eventWindow?: [string, string];
  countryOutline?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const nearViewport = useRef(false);
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const [reservedHeight, setReservedHeight] = useState(
    region.bbox === globalBbox ? 340 : 620,
  );
  useEffect(() => {
    if (!active) {
      nearViewport.current = false;
      setInView(false);
      return;
    }
    const element = host.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      nearViewport.current = true;
      setInView(true);
      return;
    }
    let disposed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (disposed) return;
        const entry = entries.find((candidate) => candidate.target === element);
        if (!entry) return;
        if (!entry.isIntersecting) {
          const height = Math.ceil(element.getBoundingClientRect().height);
          if (height > 0)
            setReservedHeight((previous) =>
              Math.abs(previous - height) > 1 ? height : previous,
            );
        }
        nearViewport.current = entry.isIntersecting;
        setInView(
          entry.isIntersecting || element.contains(document.activeElement),
        );
      },
      {
        root: element.closest(".layer-stack"),
        rootMargin: "350px 0px",
        threshold: 0,
      },
    );
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [active]);
  const calendar = useMemo(() => calendarMonths(start, end), [start, end]);
  const months =
    variable.available === false
      ? []
      : variable.months
          .filter(
            (entry) =>
              entry.validSamples > 0 &&
              entry.month >= start &&
              entry.month <= end,
          )
          .sort((a, b) => a.month.localeCompare(b.month));
  const source = variableDataKey(variable);
  const period = `${start}/${end}`;
  const canRead = active && inView && calendar.length > 0 && months.length > 0;
  const hasArea = region.bbox !== globalBbox;
  const regional = useEarthResource(
    canRead && hasArea ? `${source}/${region.bbox}/${period}` : null,
    async (signal) =>
      includeCalendar(
        await loadSeries({ ...variable, months }, region.bbox, signal),
        calendar,
      ),
  );
  const global = useEarthResource(
    canRead ? `${source}/${globalBbox}/${period}` : null,
    async (signal) =>
      includeCalendar(
        await loadSeries({ ...variable, months }, globalBbox, signal),
        calendar,
      ),
  );
  const loading = regional.loading || global.loading;
  const domain = useMemo<[number, number] | undefined>(() => {
    if (realScale(variable).kind === "categorical") return undefined;
    const values = [regional.data, global.data].flatMap(
      (data) =>
        data?.observations.flatMap((row) =>
          row.value !== null && Number.isFinite(row.value) ? [row.value] : [],
        ) ?? [],
    );
    return values.length
      ? [Math.min(...values), Math.max(...values)]
      : undefined;
  }, [regional.data, global.data, source]);
  const current: DisplayedAnalysis = {
    source,
    period,
    regionName: region.name,
    hasArea,
    countryOutline,
    regional: regional.data,
    global: global.data,
    domain,
  };
  const previous = useRef<DisplayedAnalysis | undefined>(undefined);
  useEffect(() => {
    if (!loading && (current.regional || current.global))
      previous.current = current;
  }, [
    loading,
    regional.data,
    global.data,
    source,
    period,
    region.name,
    hasArea,
    countryOutline,
    domain,
  ]);
  const retained =
    loading &&
    previous.current?.source === source &&
    previous.current.period === period
      ? previous.current
      : undefined;
  const displayed = retained ?? current;
  useEffect(() => {
    if (!active || !inView || !host.current) return;
    const element = host.current;
    const measure = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height > 0)
        setReservedHeight((previous) =>
          Math.abs(previous - height) > 1 ? height : previous,
        );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, inView, loading, regional.data, global.data]);
  if (!active) return null;
  if (!inView)
    return (
      <div
        ref={host}
        className="layer-analysis-placeholder"
        style={{ height: reservedHeight }}
      >
        <p>Charts load when this card approaches the visible list.</p>
      </div>
    );
  if (!calendar.length)
    return (
      <div ref={host}>
        <p className="layer-series-empty">
          Select an ordered study period with available monthly data.
        </p>
      </div>
    );
  if (!months.length)
    return (
      <div ref={host}>
        <p className="layer-series-empty">
          No catalog observations for {variable.name} in {start}–{end}. Another
          month or year has not been substituted.
        </p>
      </div>
    );
  return (
    <div
      ref={host}
      onBlurCapture={(event) => {
        if (
          !nearViewport.current &&
          !event.currentTarget.contains(event.relatedTarget as Node | null)
        )
          setInView(false);
      }}
      className="layer-series-comparison"
      style={loading ? { minHeight: reservedHeight } : undefined}
      aria-label={`${variable.name}: regional and global monthly series`}
    >
      <p className="layer-series-note">
        Same variable and period ·{" "}
        {realScale(variable).kind === "categorical"
          ? "discrete monthly classes"
          : "shared vertical chart scale"}
        . Map opacity does not change these observations.
      </p>
      <p className="layer-series-note">
        Catalog coverage: {months.length} of {calendar.length} study months.
        Missing observations remain gaps.
      </p>
      {loading && (
        retained ? (
          <LoadingStatus className="layer-series-loading">
            Loading {region.name} and global series… Showing previously loaded data for {retained.regionName}, {start}–{end}, until this selection is ready.
          </LoadingStatus>
        ) : (
          <LoadingState
            title={`Loading ${region.name} and global series…`}
            detail="Preparing monthly values for the selected area and period."
          />
        )
      )}
      {regional.error && (
        <div className="layer-series-error" role="alert">
          <p>
            {region.name}: {regional.error}
          </p>
          <button type="button" onClick={regional.retry}>
            Retry regional series
          </button>
        </div>
      )}
      {global.error && (
        <div className="layer-series-error" role="alert">
          <p>Global: {global.error}</p>
          <button type="button" onClick={global.retry}>
            Retry global series
          </button>
        </div>
      )}
      {displayed.hasArea && displayed.regional && (
        <RealSeries
          data={displayed.regional}
          title={displayed.regionName}
          context={displayed.countryOutline ? "country-extent" : "regional"}
          domain={displayed.domain}
          month={month}
          onMonth={onMonth}
          eventWindow={eventWindow}
        />
      )}
      {displayed.global && (
        <RealSeries
          data={displayed.global}
          title="Global"
          context="global"
          domain={displayed.domain}
          month={month}
          onMonth={onMonth}
          eventWindow={eventWindow}
        />
      )}
    </div>
  );
}

// Camera, opacity and palette changes never recompute the scientific charts.
export const LayerAnalysis = memo(LayerAnalysisComponent);
