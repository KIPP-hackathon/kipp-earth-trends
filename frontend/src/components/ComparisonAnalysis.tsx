import { memo, useEffect, useMemo, useState } from "react";
import { loadComparison, variableDataKey } from "../lib/earthApi";
import type {
  ComparisonMode,
  EarthComparison,
  EarthRegion,
  EarthVariable,
} from "../lib/earthApi";
import { ComparisonChart, comparisonColor } from "./ComparisonChart";
import "./comparison-analysis.css";

export type ComparisonEntry = {
  variable: EarthVariable;
  data?: EarthComparison;
  error?: string;
};
function ComparisonAnalysisComponent({
  variables,
  region,
  start,
  end,
  month,
  onMonth,
  active,
  mode,
  onMode,
  eventWindow,
  countryOutline,
  available,
}: {
  variables: EarthVariable[];
  region: EarthRegion;
  start: string;
  end: string;
  month: string;
  onMonth: (month: string) => void;
  active: boolean;
  mode: ComparisonMode;
  onMode: (mode: ComparisonMode) => void;
  eventWindow?: [string, string];
  countryOutline: boolean;
  available: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([
    variables.map(variableDataKey),
    region.bbox,
    start,
    end,
    attempt,
  ]);
  const [result, setResult] = useState<{
    key: string;
    entries: Record<string, { data?: EarthComparison; error?: string }>;
  }>({ key: "", entries: {} });
  useEffect(() => {
    if (!active || !available) return;
    const controller = new AbortController();
    setResult({ key, entries: {} });
    for (const variable of variables) {
      void loadComparison(
        variable,
        start,
        end,
        region.bbox,
        controller.signal,
      ).then(
        (data) => {
          if (!controller.signal.aborted)
            setResult((previous) =>
              previous.key === key
                ? {
                    ...previous,
                    entries: { ...previous.entries, [variable.id]: { data } },
                  }
                : previous,
            );
        },
        (error) => {
          if (!controller.signal.aborted)
            setResult((previous) =>
              previous.key === key
                ? {
                    ...previous,
                    entries: {
                      ...previous.entries,
                      [variable.id]: {
                        error:
                          error instanceof Error
                            ? error.message
                            : "Could not load comparison.",
                      },
                    },
                  }
                : previous,
            );
        },
      );
    }
    return () => controller.abort();
    // Mode, camera, opacity and selected month never reload a study series.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, available]);
  const entries = useMemo<ComparisonEntry[]>(
    () =>
      variables.map((variable) => ({
        variable,
        ...(result.key === key ? result.entries[variable.id] : {}),
      })),
    [variables, result, key],
  );
  const hasArea = region.bbox !== "-180,-90,180,90";
  const [cursor, setCursor] = useState<string>();
  useEffect(() => setCursor(undefined), [month, start, end, region.bbox]);
  const completed = entries.filter((entry) => entry.data || entry.error).length;
  const domain = useMemo<[number, number]>(() => {
    if (mode === "minmax") return [0, 100];
    let max = 2;
    for (const entry of entries)
      for (const scope of hasArea
        ? (["global", "regional"] as const)
        : (["global"] as const))
        for (const row of entry.data?.[scope].observations ?? [])
          if (row.standardized !== null)
            max = Math.max(max, Math.abs(row.standardized));
    return [-max * 1.1, max * 1.1];
  }, [entries, mode, hasArea]);
  return (
    <div className="comparison-analysis">
      <div className="comparison-heading">
        <h2>Compare selected variables</h2>
        <div
          className="comparison-mode"
          role="group"
          aria-label="Chart comparison scale"
        >
          <button
            type="button"
            aria-pressed={mode === "standardized"}
            onClick={() => onMode("standardized")}
          >
            Historical deviation
          </button>
          <button
            type="button"
            aria-pressed={mode === "minmax"}
            onClick={() => onMode("minmax")}
          >
            Scale 0–100
          </button>
        </div>
      </div>
      <p className="comparison-explainer">
        {mode === "standardized"
          ? "Above or below the usual value for that calendar month · standard deviations from 2001–2020 · at least 10 reference years per month."
          : "Compare curve shapes · 0 = each series’ lowest value, 100 = its highest in the study period. A constant series is 50."}{" "}
        Each area has its own reference. Hover for original units. Map opacity
        does not affect these charts.
      </p>
      {!available && (
        <p role="status" className="comparison-notice">
          Comparison processing is being published. Charts will become available
          after the API update; reload this page.
        </p>
      )}
      {available && completed < entries.length && (
        <p role="status" className="comparison-notice">
          Loading variables · {completed}/{entries.length}. Remaining sources
          are queued.
        </p>
      )}
      {entries.some((entry) => entry.error) && (
        <div className="comparison-notice" role="alert">
          Some sources could not be loaded.{" "}
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry sources
          </button>
        </div>
      )}
      <div
        className="comparison-variable-key"
        aria-label="Selected variable colors"
      >
        {entries.map((entry) => (
          <span key={entry.variable.id} title={entry.variable.name}>
            <i style={{ background: comparisonColor(entry.variable.id) }} />
            {entry.variable.name}
            {entry.error ? " · error" : !entry.data ? " · loading" : ""}
          </span>
        ))}
      </div>
      <ComparisonChart
        title="Global"
        scope="global"
        entries={entries}
        mode={mode}
        domain={domain}
        start={start}
        end={end}
        month={cursor ?? month}
        onCursor={setCursor}
        onMonth={onMonth}
        eventWindow={eventWindow}
      />
      <ComparisonChart
        title={`Selected area · ${hasArea ? region.name : "no area selected"}`}
        scope="regional"
        entries={entries}
        mode={mode}
        domain={domain}
        start={start}
        end={end}
        month={cursor ?? month}
        onCursor={setCursor}
        onMonth={onMonth}
        eventWindow={eventWindow}
        noArea={!hasArea}
      />
      {countryOutline && (
        <p className="comparison-explainer">
          The country outline is a visual reference. Regional values use its
          rectangular extent, including cells outside the border.
        </p>
      )}
      <details className="comparison-method">
        <summary>How these comparisons are calculated</summary>
        <p>
          Historical deviation = (monthly value − reference mean for the same
          calendar month) / sample standard deviation. The fixed 2001–2020
          project reference is not a 30-year climate normal. Short or constant
          references are unavailable, never replaced with another baseline.
        </p>
        <p>
          Scale 0–100 = 100 × (value − minimum) / (maximum − minimum),
          separately for each variable and area in the selected study period.
          Changing the period changes this scale. Equal heights compare relative
          positions, not equal physical values. Neither mode establishes
          statistical significance, probabilities, causal effects or a long-term
          trend.
        </p>
        <p>
          Monthly gaps are preserved. Ice category maps use the valid-area
          fraction of ice (%) in these charts, not an average of class codes or
          ice extent in km². Other source aggregation and quality rules remain
          unchanged.
        </p>
        {entries
          .filter((entry) => entry.data)
          .map(({ variable, data }) => (
            <p key={variable.id}>
              {variable.name} · {data!.product} · {data!.unit} · {data!.method}{" "}
              · {data!.sourceUC}
            </p>
          ))}
      </details>
    </div>
  );
}
export const ComparisonAnalysis = memo(ComparisonAnalysisComponent);
