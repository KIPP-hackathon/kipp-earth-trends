import { memo, useEffect, useMemo, useState } from "react";
import { loadComparison, variableDataKey } from "../lib/earthApi";
import type {
  ComparisonMode,
  EarthComparison,
  EarthRegion,
  EarthVariable,
} from "../lib/earthApi";
import { ComparisonChart } from "./ComparisonChart";
import { chartDomain } from "../lib/chartDomain";
import { adjustTrendFamily } from "../lib/runtimeTrends";
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
  runtimeTrends,
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
  runtimeTrends: boolean;
}) {
  const hasArea = region.bbox !== "-180,-90,180,90";
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([
    variables.map(variableDataKey),
    region.bbox,
    start,
    end,
    attempt,
    runtimeTrends,
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
        runtimeTrends,
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
  const [hiddenVariables, setHiddenVariables] = useState<Set<string>>(
    new Set(),
  );
  const visibleEntries = useMemo(
    () => entries.filter((entry) => !hiddenVariables.has(entry.variable.id)),
    [entries, hiddenVariables],
  );
  const toggleVariable = (id: string) =>
    setHiddenVariables((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [cursor, setCursor] = useState<string>();
  useEffect(() => setCursor(undefined), [month, start, end, region.bbox]);
  const completed = entries.filter((entry) => entry.data || entry.error).length;
  const [trendsOnly, setTrendsOnly] = useState(false);
  const scopes = useMemo<readonly ("global" | "regional")[]>(
    () => (hasArea ? ["global", "regional"] : ["global"]),
    [hasArea],
  );
  const adjustedP = useMemo(
    () => adjustTrendFamily(entries, mode, scopes),
    [entries, mode, scopes],
  );
  const familySize = entries.length * scopes.length;
  const domain = useMemo(
    () =>
      chartDomain(
        visibleEntries.map((entry) => entry.data),
        mode,
        scopes,
      ),
    [visibleEntries, mode, scopes],
  );
  const changeMode = (next: ComparisonMode) => {
    onMode(next);
    if (next === "raw") setTrendsOnly(false);
  };
  return (
    <div className="comparison-analysis">
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
      <ComparisonChart
        title="Global"
        scope="global"
        entries={entries}
        hiddenVariables={hiddenVariables}
        onToggleVariable={toggleVariable}
        onMode={changeMode}
        mode={mode}
        trendsOnly={trendsOnly}
        onTrendsOnly={setTrendsOnly}
        domain={domain}
        start={start}
        end={end}
        month={cursor ?? month}
        onCursor={setCursor}
        onMonth={onMonth}
        noArea={false}
        adjustedP={adjustedP}
        familySize={familySize}
        loading={completed < entries.length}
      />
      <ComparisonChart
        title={`Selected area · ${hasArea ? region.name : "no area selected"}`}
        scope="regional"
        entries={entries}
        hiddenVariables={hiddenVariables}
        onToggleVariable={toggleVariable}
        onMode={changeMode}
        mode={mode}
        trendsOnly={trendsOnly}
        onTrendsOnly={setTrendsOnly}
        domain={domain}
        start={start}
        end={end}
        month={cursor ?? month}
        onCursor={setCursor}
        onMonth={onMonth}
        eventWindow={eventWindow}
        noArea={!hasArea}
        adjustedP={adjustedP}
        familySize={familySize}
        loading={completed < entries.length}
      />
      {countryOutline && (
        <p className="comparison-explainer">
          The country outline is a visual reference. Regional values use its
          rectangular extent, including cells outside the border.
        </p>
      )}
    </div>
  );
}
export const ComparisonAnalysis = memo(ComparisonAnalysisComponent);
