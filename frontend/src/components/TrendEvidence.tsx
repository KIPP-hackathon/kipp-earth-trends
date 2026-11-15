import { useId } from "react";
import type { EarthTrendEvidence } from "../lib/earthApi";
import { loadTrendEvidence, realUnit } from "../lib/earthApi";
import { useEarthResource } from "../lib/useEarthResource";
import "./trend-evidence.css";

const format = (value: number | null) =>
  value === null
    ? "Unavailable"
    : value.toLocaleString("en-US", { maximumSignificantDigits: 6 });
const methodLabels: Record<string, string> = {
  seasonal_mann_kendall: "Seasonal Mann–Kendall",
  mann_kendall_sen_anomaly: "Mann–Kendall / Sen, anomalies",
  ols_anomaly_ar1: "OLS anomalies, AR(1) adjusted",
  ols_anomaly: "OLS anomalies, independent residuals",
  mann_kendall_raw: "Mann–Kendall raw (reference only)",
};

export function TrendEvidence({
  variable,
  bbox,
  start,
  end,
  onSelectContext,
}: {
  variable: string;
  bbox: string;
  start: string;
  end: string;
  onSelectContext?: (
    context: EarthTrendEvidence["supportedContexts"][number],
  ) => void;
}) {
  const heading = useId();
  const key = JSON.stringify([variable, bbox, start, end]);
  const { data, loading, error, retry } = useEarthResource(key, (signal) =>
    loadTrendEvidence(variable, bbox, start, end, signal),
  );
  const first = data?.results[0];
  const disagreement =
    data?.results.some((row) => row.is_significant === true) &&
    data.results.some((row) => row.is_significant === false);
  return (
    <section className="trend-evidence" aria-labelledby={heading}>
      <div className="trend-evidence-heading">
        <div>
          <span className="trend-evidence-kicker">
            Analysis · stored reference
          </span>
          <h2 id={heading}>Rate of change & statistical evidence</h2>
        </div>
        <span className="trend-evidence-badge">
          {data?.status === "exact"
            ? "Precomputed · real data"
            : "Stored reference"}
        </span>
      </div>
      <p>
        This section checks for a stored result with exactly the selected
        variable, numeric rectangle and full monthly period. It does not
        calculate a new trend from the chart.
      </p>
      <p className="trend-evidence-selection">
        <strong>{variable}</strong> · {start} – {end} · bbox {bbox}
      </p>
      {loading && <p role="status">Checking the stored reference…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={retry}>
            Retry stored evidence
          </button>
        </div>
      )}
      {data && (
        <>
          {data.status !== "exact" && (
            <p className="trend-evidence-notice" role="status">
              <strong>No stored analysis available for this selection.</strong>{" "}
              {data.reason}
            </p>
          )}
          {(data.referenceTruncated ||
            data.resultsTruncated ||
            data.contextsTruncated) && (
            <p className="trend-evidence-notice">
              This reference is incomplete or a response limit was reached.
              Listed contexts and methods may be incomplete; missing results do
              not establish absence of a trend.
            </p>
          )}
          {first && (
            <>
              <p>
                <strong>{first.region_name}</strong> · {first.period_start} –{" "}
                {first.period_end} · {first.source_dataset} · {first.data_type}
              </p>
              {disagreement && (
                <p className="trend-evidence-notice">
                  <strong>Methods disagree on significance.</strong> Compare all
                  methods and their assumptions, including the autocorrelation
                  adjustment; choosing only the smallest p-value would hide
                  uncertainty.
                </p>
              )}
              <div
                className="trend-evidence-table-scroll"
                role="region"
                aria-label="Stored trend methods"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Stored method</th>
                      <th scope="col">Observations</th>
                      <th scope="col">Slope / month</th>
                      <th scope="col">Slope / decade</th>
                      <th scope="col">Stored CI / decade</th>
                      <th scope="col">p-value</th>
                      <th scope="col">Alpha</th>
                      <th scope="col">Significant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((row, index) => (
                      <tr key={`${row.region_id}:${row.method}:${index}`}>
                        <th scope="row">
                          {methodLabels[row.method] ?? row.method}
                        </th>
                        <td>{format(row.n_obs)}</td>
                        <td>
                          {format(row.slope_per_month)} {realUnit(row.unit)}
                          /month
                        </td>
                        <td>
                          {format(row.slope_per_decade)} {realUnit(row.unit)}
                          /decade
                        </td>
                        <td>
                          {row.slope_ci_low_per_decade === null ||
                          row.slope_ci_high_per_decade === null
                            ? "Unavailable"
                            : `${format(row.slope_ci_low_per_decade)} to ${format(row.slope_ci_high_per_decade)} ${realUnit(row.unit)}/decade`}
                        </td>
                        <td>{format(row.p_value)}</td>
                        <td>{format(row.alpha)}</td>
                        <td>
                          {row.is_significant === null
                            ? "Unavailable"
                            : row.is_significant
                              ? "Yes (stored)"
                              : "No (stored)"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details>
                <summary>Method notes, aggregation & provenance</summary>
                {data.results.map((row, index) => (
                  <div
                    className="trend-evidence-method"
                    key={`${row.method}:${index}`}
                  >
                    <h3>{methodLabels[row.method] ?? row.method}</h3>
                    <p>{row.notes || "No additional stored notes."}</p>
                    <p>
                      Aggregation: {row.aggregation}. Direction:{" "}
                      {row.trend_direction}. Computed: {row.computed_at}.
                    </p>
                    <p>
                      Source: {row.source_table}. Region type: {row.region_type}
                      . Bounds: {row.lon_min}, {row.lat_min}, {row.lon_max},{" "}
                      {row.lat_max}.
                    </p>
                  </div>
                ))}
              </details>
            </>
          )}
          {!first && data.supportedContexts.length > 0 && (
            <details open>
              <summary>Available stored contexts</summary>
              <p>
                Open one of these studies to inspect its data and methods. Your
                current filters stay unchanged until you choose a study.
              </p>
              <ul>
                {data.supportedContexts.map((context, index) => (
                  <li key={`${context.regionId}:${context.start}:${index}`}>
                    <strong>{context.regionName}</strong> · surface temperature
                    · {context.start} – {context.end} · {format(context.n_obs)}{" "}
                    monthly values
                    {onSelectContext && (
                      <button
                        type="button"
                        onClick={() => onSelectContext(context)}
                      >
                        Open this analysis
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="trend-evidence-caveat">
            Interpret this short monthly record only within its observed period.
            A per-decade slope is a rescaled rate, not ten years of observations
            or a forecast. Autocorrelation can reduce the effective sample size
            substantially; see each method's stored notes. Seasonal tests have
            few years per calendar month and low power. Unavailable evidence or
            a non-significant test does not establish no change. Significance is
            not importance or causality.
          </p>
          <details>
            <summary>Reference limitations</summary>
            <ul>
              {data.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
            <p>
              Reference: {data.referenceTable}
              {data.referenceFetchedAt
                ? ` · checked ${data.referenceFetchedAt}`
                : ""}
              .
            </p>
          </details>
        </>
      )}
    </section>
  );
}
