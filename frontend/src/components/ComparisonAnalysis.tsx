import { memo, useEffect, useMemo, useState } from "react";
import { loadComparison, variableDataKey } from "../lib/earthApi";
import type {
  ComparisonMode,
  EarthComparison,
  EarthRegion,
  EarthVariable,
} from "../lib/earthApi";
import { ComparisonChart } from "./ComparisonChart";
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
    if (!active || !available || !hasArea) return;
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
    () => adjustTrendFamily(entries, mode, ["regional"]),
    [entries, mode],
  );
  const familySize = entries.length;
  const domain = useMemo<[number, number]>(() => {
    if (mode === "minmax") return [0, 100];
    let max = 2;
    for (const entry of visibleEntries)
      for (const row of [
        ...(entry.data?.regional.observations ?? []).map((row) => ({
          standardized: row.standardized,
        })),
        ...(entry.data?.regional.trends?.standardized.line ?? []).map(
          (row) => ({ standardized: row.value }),
        ),
      ])
        if (row.standardized !== null)
          max = Math.max(max, Math.abs(row.standardized));
    return [-max * 1.1, max * 1.1];
  }, [visibleEntries, mode]);
  if (!hasArea)
    return (
      <section className="comparison-analysis">
        <h2>Selected area</h2>
        <p className="comparison-empty">
          Choose a country or draw an area on the globe to see its variables and
          trends.
        </p>
      </section>
    );
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
        title={`Selected area · ${hasArea ? region.name : "no area selected"}`}
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
        loading={completed < entries.length}
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
          positions, not equal physical values. Normalization alone establishes
          neither significance nor causality. Dashed lines use a separate
          seasonal regression; its approximate p-values and limitations are
          described below.
        </p>
        <p>
          Dashed lines are the straight trend component of OLS with 12
          calendar-month effects, centered at the observed mean. They exclude
          repeating seasonal offsets and span only observed dates. P-values test
          zero time slope using approximate two-sided normal Wald inference with
          Newey–West HAC, 12 monthly lags, Bartlett weights and n/(n−13)
          correction. At least 60 consecutive valid months and nondegenerate
          residual variation are required for p-values; shorter eligible fits
          are descriptive. Missing months are never interpolated. These are KIPP
          v1 guardrails, not universal thresholds. Fixed seasonality, a suitable
          linear model and short-memory dependence remain assumptions.
        </p>
        <p>
          Holm adjustment covers all applied variables for the selected area in
          the active mode, including visually hidden curves. Evidence uses
          adjusted p &lt;0.05. No significance does not establish no change;
          neither p-value proves importance, causation or a future outcome.
          Standardized monthly scaling can change a fit and its p-value. All
          numerical results refer to the active representation, not blended map
          colors.
        </p>
        <p>
          Historical normalization parameters are treated as fixed; their
          estimation uncertainty is not propagated into these approximate
          p-values.
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
