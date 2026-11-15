import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { PanelPreset } from "../lib/assistant";
import type { EarthRegion } from "../lib/earthApi";
import { loadCountries } from "../lib/countries";
import type { CountrySelection } from "../lib/countries";
import { variableAvailable } from "../lib/variableGroups";
import { StudyAreaPicker } from "./StudyAreaPicker";
import { MultiVariablePicker } from "./MultiVariablePicker";
import { RealGlobe } from "./RealGlobe";
import type { RealPanelProps } from "./RealDataView";

export function EmptyRealPanel({
  catalog,
  config,
  side,
  instanceId = side,
  overview = false,
  initialRegion,
  initialOutline,
  initializationKey,
  view,
  onView,
  onNavigate,
  onManualChange,
  onCustomRegion,
  onAreaChange,
  onStart,
  headerAction,
  onTourChoice,
  suggestedVariable,
  areaCommand,
  onAreaApplied,
  studyEvent,
  onStudyEvent,
}: RealPanelProps & { onStart: (preset: PanelPreset) => void }) {
  const id = useId();
  const [region, setRegion] = useState(initialRegion ?? config.regions[0]);
  const [countries, setCountries] = useState<CountrySelection[]>([]);
  const changedArea = useRef(false);
  const drawnSequence = useRef(0);
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
    if (initialRegion && !changedArea.current) setRegion(initialRegion);
  }, [initializationKey, initialRegion]);
  const applyArea = (next: EarthRegion, center = false) => {
    onTourChoice?.("area");
    changedArea.current = true;
    onManualChange();
    onAreaChange?.();
    onCustomRegion?.(next);
    setRegion(next);
    if (center)
      (onNavigate ?? onView)({
        ...view,
        longitude: next.longitude,
        latitude: next.latitude,
      });
  };
  useEffect(() => {
    if (!areaCommand) return;
    applyArea(areaCommand.region, true);
    onAreaApplied?.(areaCommand.nonce);
    // Do not reapply a consumed region command after manual changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaCommand]);
  const outline =
    countries.find((country) => country.region.id === region.id)?.geometry ??
    (region.id === initialRegion?.id ? initialOutline : undefined);
  const hasArea = region.bbox !== "-180,-90,180,90";
  const applyVariables = (ids: string[]) => {
    const variables = ids.flatMap((id) =>
      catalog.variables.filter((v) => v.id === id && variableAvailable(v)),
    );
    const months = [
      ...new Set(
        variables.flatMap((v) =>
          v.months.filter((m) => m.validSamples > 0).map((m) => m.month),
        ),
      ),
    ].sort();
    if (!variables.length || !months.length) return;
    onTourChoice?.("variables");
    onManualChange();
    onCustomRegion?.(region);
    onStart({
      variable: variables[0].id,
      layers: variables.map((v, index) => ({
        variable: v.id,
        visible: index === 0,
        opacity: index === 0 ? 1 : 0.65,
      })),
      region: region.id,
      start: months[0],
      end: months.at(-1)!,
      month: months[0],
      nonce: Date.now(),
    });
  };
  useEffect(() => {
    if (suggestedVariable) applyVariables([suggestedVariable.id]);
    // Apply only a new explicit request, preserving subsequent manual choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedVariable]);
  return (
    <article
      data-panel-id={instanceId}
      className={`real-panel compact-real-panel${overview ? " is-overview is-empty" : ""}`}
      aria-label={
        overview ? "Earth data exploration" : `Earth data panel ${side}`
      }
    >
      {!overview && (
        <div className="real-panel-heading">
          <div className="real-panel-title">
            <span className="real-panel-letter">{side}</span>
            <span>Choose variables to explore</span>
          </div>
          {headerAction}
        </div>
      )}
      <div className="compact-exploration-controls">
        <MultiVariablePicker
          id={`${id}-variables`}
          variables={catalog.variables}
          selected={[]}
          onApply={applyVariables}
        />
        <StudyAreaPicker id={`${id}-area`} current={region} countries={countries} regions={config.regions} catalog={catalog} currentEvent={studyEvent} onEvent={onStudyEvent} onChange={next => applyArea(next, true)} />
        <div className="exploration-picker exploration-period">
          <span className="exploration-control-label" id={`${id}-period-label`}>
            Study period
          </span>
          <button
            className="exploration-picker-trigger"
            type="button"
            disabled
            aria-labelledby={`${id}-period-label ${id}-period-value`}
          >
            <span id={`${id}-period-value`}>Choose variables first</span>
            <CalendarDays size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="real-globe-container">
        <RealGlobe
          view={view}
          onView={onView}
          onNavigate={onNavigate}
          dataAvailable={false}
          region={hasArea ? region : undefined}
          outlineGeometry={outline}
          onSelectArea={(bbox) => {
            const [west, south, east, north] = bbox.split(",").map(Number);
            const width = east >= west ? east - west : east + 360 - west;
            if (
              ![west, south, east, north].every(Number.isFinite) ||
              west < -180 ||
              west > 180 ||
              east < -180 ||
              east > 180 ||
              south < -90 ||
              north > 90 ||
              north <= south ||
              width <= 0 ||
              width > 360
            )
              return;
            applyArea({
              id: `custom-drawn-${instanceId}-${++drawnSequence.current}`,
              name: `Drawn area ${side} · ${drawnSequence.current}`,
              bbox,
              longitude: ((((west + width / 2 + 180) % 360) + 360) % 360) - 180,
              latitude: (south + north) / 2,
            });
          }}
          onClearArea={
            hasArea
              ? () =>
                  applyArea({
                    id: "custom-global",
                    name: "Global",
                    bbox: "-180,-90,180,90",
                    longitude: 0,
                    latitude: 0,
                  })
              : undefined
          }
        />
      </div>
      {!overview && <section
        className="real-series-comparison multivariable-analysis"
        aria-label="Selected variable charts"
      >
        <div className="comparison-chart comparison-empty">
          <p>
            Choose one or more variables, then Apply to see map layers and
            trends.
          </p>
        </div>
      </section>}
    </article>
  );
}
