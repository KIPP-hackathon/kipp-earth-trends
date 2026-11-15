import { memo } from "react";
import type { ComparisonMode } from "../lib/earthApi";
import { formatTrendP, formatTrendRate, trendKey } from "../lib/runtimeTrends";
import type { ComparisonEntry } from "./ComparisonAnalysis";
import { comparisonColor } from "../lib/comparisonColors";
import { realUnit } from "../lib/earthApi";
import { VariableExplanation } from "./VariableExplanation";

function TrendResultsComponent({
  entries,
  mode,
  scope,
  adjustedP,
  familySize,
  loading,
  hiddenVariables,
  onToggleVariable,
  month,
  monthCount,
}: {
  entries: ComparisonEntry[];
  mode: ComparisonMode;
  scope: "global" | "regional";
  adjustedP: Record<string, number>;
  familySize: number;
  loading: boolean;
  hiddenVariables: Set<string>;
  onToggleVariable: (id: string) => void;
  month: string;
  monthCount: number;
}) {
  const nativeUnit = realUnit(
    entries[0]?.data?.unit ?? entries[0]?.variable.unit ?? "",
  );
  const unit =
    mode === "raw"
      ? nativeUnit === "%"
        ? "percentage points/year"
        : `${nativeUnit}/year`
      : mode === "standardized"
        ? "σ/year"
        : "points/year";
  const valueKey = mode === "raw" ? "value" : mode;
  return (
    <div className="runtime-trend-results">
      <p className="runtime-trend-caption">
        <span className="runtime-trend-key" />
        season-adjusted trend · {unit}
      </p>
      <div className="runtime-trend-table-scroll">
        <table>
          <caption>
            Trend and significance ·{" "}
            {mode === "raw"
              ? `original values · ${nativeUnit}`
              : mode === "standardized"
                ? "historical deviation"
                : "scale 0–100"}{" "}
            · {familySize} tests across the displayed scopes
          </caption>
          <thead>
            <tr>
              <th scope="col">Plot</th>
              <th scope="col">Variable</th>
              <th>Rate/year</th>
              <th>p</th>
              <th>p (Holm)</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ variable, data, error }) => {
              const trend = data?.[scope].trends?.[mode],
                adjusted = adjustedP[trendKey(scope, variable.id)];
              const source = data?.[scope];
              const quality = data?.quality ?? variable.quality;
              const row = source?.observations.find(
                (row) => row.month === month,
              );
              const valid = source?.observations.filter(
                (row) => row[valueKey] !== null,
              ).length;
              const insufficient =
                source?.observations.filter(
                  (row) => row.standardizedStatus === "insufficient_reference",
                ).length ?? 0;
              const constant =
                source?.observations.filter(
                  (row) => row.standardizedStatus === "constant_reference",
                ).length ?? 0;
              const reason =
                trend?.reason ??
                (data && !trend
                  ? "Trend processing is unavailable in this response; refresh the catalog after the API update."
                  : null);
              return (
                <tr
                  key={variable.id}
                  className={
                    hiddenVariables.has(variable.id)
                      ? "is-chart-hidden"
                      : undefined
                  }
                >
                  <td className="runtime-trend-visibility">
                    <input
                      type="checkbox"
                      checked={!hiddenVariables.has(variable.id)}
                      aria-label={`Show ${variable.name} in chart`}
                      onChange={() => onToggleVariable(variable.id)}
                    />
                  </td>
                  <th scope="row">
                    <i style={{ background: comparisonColor(variable.id) }} />
                    <VariableExplanation name={variable.name}>
                      {variable.description && <p>{variable.description}</p>}
                      <p>
                        {data?.product ?? variable.product} ·{" "}
                        {realUnit(data?.unit ?? variable.unit)}
                      </p>
                      {trend && (
                        <p>
                          {trend.n} fitted months · {trend.firstMonth ?? "—"}–
                          {trend.lastMonth ?? "—"}
                        </p>
                      )}
                      <p>
                        {month}:{" "}
                        {row?.value !== null && row?.value !== undefined
                          ? `${row.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${realUnit(data?.unit ?? variable.unit)}`
                          : "No data"}
                        {row?.coverage !== null && row?.coverage !== undefined
                          ? ` · ${(row.coverage * 100).toFixed(1)}% coverage`
                          : ""}
                      </p>
                      {valid !== undefined && (
                        <p>
                          {valid}/{monthCount} comparable months. Gaps remain
                          empty.
                        </p>
                      )}
                      {mode === "standardized" && insufficient > 0 && (
                        <p>
                          {insufficient} months need at least 10 reference years
                          for the same calendar month. Try Scale 0–100 to
                          inspect available values.
                        </p>
                      )}
                      {mode === "standardized" && constant > 0 && (
                        <p>{constant} months have zero reference variation.</p>
                      )}
                      {mode === "minmax" && source?.range.constant && (
                        <p>No variation in this period; plotted at 50.</p>
                      )}
                      {error && <p>{error}</p>}
                      {reason && <p>{reason}</p>}
                      {trend && (
                        <p>
                          Seasonal OLS trend; approximate two-sided Wald p with
                          Newey–West HAC12. Holm covers all {familySize} applied
                          variables, including hidden curves. Significance is
                          not causation.
                        </p>
                      )}
                      {data && (
                        <p>
                          {data.method} · {data.sourceUC}
                        </p>
                      )}
                      {quality?.rule && <p>Quality rule: {quality.rule}</p>}
                      {quality?.notes.map((note, index) => (
                        <p key={index}>{note}</p>
                      ))}
                    </VariableExplanation>
                  </th>
                  <td>
                    {trend?.slopePerYear !== null &&
                    trend?.slopePerYear !== undefined
                      ? formatTrendRate(trend.slopePerYear)
                      : "—"}
                  </td>
                  <td>{formatTrendP(trend?.pValue)}</td>
                  <td>{formatTrendP(adjusted)}</td>
                  <td
                    className={
                      !loading && adjusted < 0.05 ? "has-evidence" : undefined
                    }
                  >
                    {loading
                      ? "Pending"
                      : adjusted === undefined
                        ? error
                          ? "Source error"
                          : !data
                            ? "Loading"
                            : "Unavailable"
                        : adjusted < 0.05
                          ? "Significant"
                          : "Not significant"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export const TrendResults = memo(TrendResultsComponent);
