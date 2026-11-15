import { memo, useEffect, useMemo, useState } from "react";
import { loadComparisons, variableDataKey } from "../lib/earthApi";
import type {
  ComparisonMode,
  EarthComparison,
  EarthRegion,
  EarthVariable,
} from "../lib/earthApi";
import { ComparisonChart } from "./ComparisonChart";
import { LoadingStatus } from "./Loading";
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
    // One request for all selected variables; failures stay per variable.
    void loadComparisons(
      variables,
      start,
      end,
      region.bbox,
      controller.signal,
      runtimeTrends,
    ).then(
      (entries) => {
        if (!controller.signal.aborted)
          setResult((previous) =>
            previous.key === key ? { key, entries } : previous,
          );
      },
      (error) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Could not load comparison.";
        setResult((previous) =>
          previous.key === key
            ? {
                key,
                entries: Object.fromEntries(
                  variables.map((variable) => [variable.id, { error: message }]),
                ),
              }
            : previous,
        );
      },
    );
    return () => controller.abort();
    // Mode, camera, opacity and selected month never reload a study series.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, available, hasArea]);
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
  const adjustedP = useMemo(
    () => adjustTrendFamily(entries, mode, hasArea ? ["global", "regional"] : ["global"]),
    [entries, mode, hasArea],
  );
  const familySize = entries.length * (hasArea ? 2 : 1);
  const domain = useMemo<[number, number]>(() => {
    if (mode === "minmax") return [0, 100];
    if (mode === "raw") {
      const values = visibleEntries
        .flatMap((entry) => ["global", "regional"].flatMap(scope => {
          const data = entry.data?.[scope as "global" | "regional"];
          return [...(data?.observations ?? []).map(row => row.value), ...(data?.trends?.raw.line ?? []).map(row => row.value)];
        }))
        .filter(
          (value): value is number => value !== null && Number.isFinite(value),
        );
      if (!values.length) return [0, 1];
      let min = values[0],
        max = values[0];
      for (const value of values) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      const padding =
        max > min ? (max - min) * 0.06 : Math.max(Math.abs(min) * 0.05, 1e-6);
      return [min - padding, max + padding];
    }
    let max = 2;
    for (const entry of visibleEntries)
      for (const scope of ["global", "regional"] as const)
        for (const row of [
          ...(entry.data?.[scope].observations ?? []).map(row => row.standardized),
          ...(entry.data?.[scope].trends?.standardized.line ?? []).map(row => row.value),
        ]) if (row !== null && Number.isFinite(row)) max = Math.max(max, Math.abs(row));
    return [-max * 1.1, max * 1.1];
  }, [visibleEntries, mode]);
  return (
    <div className="comparison-analysis">
      {[...new Set(variables.map(v=>v.processingNote).filter(Boolean))].map(note=>(
        <p className="comparison-notice" key={note}>{note}</p>
      ))}
      {!available && (
        <p role="status" className="comparison-notice">
          Comparison processing is being published. Charts will become available
          after the API update; reload this page.
        </p>
      )}
      {available && active && completed < entries.length && (
        <LoadingStatus className="comparison-notice">
          Loading {entries.length} {entries.length === 1 ? "variable" : "variables"} for {region.name}…
        </LoadingStatus>
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
      <div className="comparison-charts">
      <ComparisonChart
        title="Global"
        scope="global"
        entries={entries}
        hiddenVariables={hiddenVariables}
        onToggleVariable={toggleVariable}
        onMode={onMode}
        mode={mode}
        domain={domain}
        start={start}
        end={end}
        month={cursor ?? month}
        onCursor={setCursor}
        onMonth={onMonth}
        eventWindow={eventWindow}
        noArea={false}
        adjustedP={adjustedP}
        familySize={familySize}
        loading={available && active && completed < entries.length}
      />
      <ComparisonChart
        title={hasArea ? region.name : "Region"}
        scope="regional"
        entries={entries}
        hiddenVariables={hiddenVariables}
        onToggleVariable={toggleVariable}
        onMode={onMode}
        mode={mode}
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
        loading={available && active && completed < entries.length}
      />
      </div>
    </div>
  );
}
export const ComparisonAnalysis = memo(ComparisonAnalysisComponent);
