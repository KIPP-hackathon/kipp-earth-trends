import { memo } from "react";
import type { ComparisonMode } from "../lib/earthApi";
import { formatTrendP, formatTrendRate, trendKey } from "../lib/runtimeTrends";
import type { ComparisonEntry } from "./ComparisonAnalysis";
import { comparisonColor } from "../lib/comparisonColors";
import type { TrendFamilyTest } from "../lib/runtimeTrends";

function TrendResultsComponent({
  entries,
  mode,
  scope,
  adjustedP,
  familySize,
  loading,
  familyTests,
}: {
  entries: ComparisonEntry[];
  mode: ComparisonMode;
  scope: "global" | "regional";
  adjustedP: Record<string, number>;
  familySize: number;
  loading: boolean;
  familyTests: TrendFamilyTest[];
}) {
  const unit = mode === "standardized" ? "σ/year" : "points/year";
  const exportTrends = () => {
    const header = [
      "variable",
      "name",
      "scope",
      "mode",
      "rate_unit",
      "slope_per_year",
      "standard_error_per_year",
      "p_unadjusted",
      "p_holm",
      "family_size",
      "n",
      "first_month",
      "last_month",
      "inference_status",
      "reason",
      "slope_ci95_low_per_year",
      "slope_ci95_high_per_year",
      "original_unit",
      "original_slope_per_year",
      "original_p_unadjusted",
      "method",
      "hac_lags",
      "product",
      "source",
      "error",
      "simulated",
      "bbox",
      "region_name",
      "requested_start",
      "requested_end",
      "reference_start",
      "reference_end",
      "period_min",
      "period_max",
      "p_value_floor",
      "model_parameters",
    ];
    const rows = familyTests.map((test) => [
      test.variable,
      test.name,
      test.scope,
      mode,
      unit,
      test.trend?.slopePerYear,
      test.trend?.standardErrorPerYear,
      test.trend?.pValue,
      test.adjustedP,
      familySize,
      test.trend?.n,
      test.trend?.firstMonth,
      test.trend?.lastMonth,
      test.trend?.inferenceStatus,
      test.trend?.reason,
      test.trend?.slopeCi95PerYear?.[0],
      test.trend?.slopeCi95PerYear?.[1],
      test.unit,
      test.originalTrend?.slopePerYear,
      test.originalTrend?.pValue,
      test.trend?.method,
      test.trend?.hacLags,
      test.product,
      test.source,
      test.error,
      false,
      test.bbox,
      test.regionName,
      test.requestedStart,
      test.requestedEnd,
      test.referenceStart,
      test.referenceEnd,
      test.rangeMin,
      test.rangeMax,
      test.trend?.pValueFloor,
      test.trend?.modelParameters,
    ]);
    const text = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kipp-trend-family-${mode}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="runtime-trend-results">
      <p className="runtime-trend-caption">
        <span className="runtime-trend-key" />
        season-adjusted trend · {unit}
        <button
          type="button"
          disabled={loading || !familyTests.some((test) => test.trend)}
          onClick={exportTrends}
        >
          Trend CSV
        </button>
      </p>
      <div className="runtime-trend-table-scroll">
        <table>
          <caption>
            Trend and significance ·{" "}
            {mode === "standardized" ? "historical deviation" : "scale 0–100"}
          </caption>
          <thead>
            <tr>
              <th>Variable</th>
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
                <tr key={variable.id}>
                  <th>
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
