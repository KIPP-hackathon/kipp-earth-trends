import { memo } from "react";
import type { ComparisonMode } from "../lib/earthApi";
import { formatTrendP, formatTrendRate, trendKey } from "../lib/runtimeTrends";
import type { ComparisonEntry } from "./ComparisonAnalysis";
import { comparisonColor } from "../lib/comparisonColors";

function TrendResultsComponent({
  entries,
  mode,
  scope,
  adjustedP,
  familySize,
  loading,
  hiddenVariables,
  onToggleVariable,
}: {
  entries: ComparisonEntry[];
  mode: ComparisonMode;
  scope: "global" | "regional";
  adjustedP: Record<string, number>;
  familySize: number;
  loading: boolean;
  hiddenVariables: Set<string>;
  onToggleVariable: (id: string) => void;
}) {
  const unit = mode === "standardized" ? "σ/year" : "points/year";
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
            {mode === "standardized" ? "historical deviation" : "scale 0–100"} ·{" "}
            {familySize} selected-area tests
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
                    {variable.name}
                    {trend && (
                      <small>
                        {trend.n} months · {trend.firstMonth ?? "—"}–
                        {trend.lastMonth ?? "—"}
                      </small>
                    )}
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
      <ul className="runtime-trend-reasons">
        {entries.map(({ variable, data }) => {
          const trend = data?.[scope].trends?.[mode];
          const reason =
            trend?.reason ??
            (data && !trend
              ? "Trend processing is unavailable in this response; refresh the catalog after the API update."
              : null);
          return reason ? (
            <li key={variable.id}>
              {variable.name}: {reason}
            </li>
          ) : null;
        })}
      </ul>
    </div>
  );
}
export const TrendResults = memo(TrendResultsComponent);
