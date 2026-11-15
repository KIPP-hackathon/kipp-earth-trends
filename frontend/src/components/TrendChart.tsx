import { useEffect, useId, useRef, useState } from "react";
import type { MonthlyTrend } from "../lib/trendLab";
import { formatTrendValue, monthFromIndex } from "../lib/trendLab";

const TOP = 40;
const BOTTOM = 61;
const OBSERVED = "#84dbe8";
const EXTENSION = "#e9bf80";
const TEXT = "#b4c4da";

function monthLabel(index: number) {
  const month = monthFromIndex(index);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export function TrendChart({
  trend,
  from,
  to,
  unit,
}: {
  trend: MonthlyTrend;
  from: number;
  to: number;
  unit: string;
}) {
  const id = useId();
  const figureRef = useRef<HTMLElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(800);

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const updateWidth = (width: number) => {
      // Hidden workspaces report zero; retain their last usable dimensions.
      if (width > 0)
        setMeasuredWidth((previous) =>
          Math.abs(previous - width) > 0.5 ? width : previous,
        );
    };
    const measure = () => updateWidth(figure.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) updateWidth(entry.contentRect.width);
    });
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  const WIDTH = Math.max(280, measuredWidth);
  const narrow = WIDTH < 500;
  const HEIGHT = narrow ? 340 : 390;
  const LEFT = narrow ? 70 : 88;
  const RIGHT = narrow ? 20 : 24;
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const clipId = `${id}-plot`;
  const minMonth = Math.min(trend.startMonth, from, to);
  const maxMonth = Math.max(trend.endMonth, from, to);
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (month: number) =>
    LEFT + ((month - minMonth) / Math.max(1, maxMonth - minMonth)) * plotWidth;
  const aValue = trend.predict(from);
  const bValue = trend.predict(to);
  const difference = bValue - aValue;
  const signedDifference = `${difference > 0 ? "+" : ""}${formatTrendValue(difference)}`;
  const deltaLabel = `Δ ${signedDifference} ${unit}`;

  // The fitted-mean interval stays inside the observed date range. It does not
  // describe future observations or account for model misspecification.
  const confidenceCount = Math.min(
    180,
    Math.max(2, trend.endMonth - trend.startMonth + 1),
  );
  const confidenceSamples = Array.from(
    { length: confidenceCount },
    (_, index) => {
      const month =
        trend.startMonth +
        (index / (confidenceCount - 1)) * (trend.endMonth - trend.startMonth);
      return { month, interval: trend.confidenceAt(month) };
    },
  );
  const showConfidence =
    confidenceSamples.length > 1 &&
    confidenceSamples.every(
      (sample) =>
        sample.interval !== null && sample.interval.every(Number.isFinite),
    );
  const values = [
    ...trend.points.map((point) => point.value),
    trend.predict(trend.startMonth),
    trend.predict(trend.endMonth),
    aValue,
    bValue,
    ...(showConfidence
      ? confidenceSamples.flatMap((sample) => sample.interval ?? [])
      : []),
  ].filter(Number.isFinite);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || Math.abs(minValue) * 0.1 || 1;
  const lower = minValue - span * 0.12;
  const upper = maxValue + span * 0.12;
  const y = (value: number) =>
    TOP + ((upper - value) / (upper - lower)) * plotHeight;
  const xTickCount = narrow ? 3 : 5;
  const xTicks = Array.from(
    new Set(
      Array.from({ length: xTickCount }, (_, index) =>
        Math.round(
          minMonth + ((maxMonth - minMonth) * index) / (xTickCount - 1),
        ),
      ),
    ),
  );
  const yTicks = Array.from(
    { length: 5 },
    (_, index) => lower + ((upper - lower) * index) / 4,
  );
  const confidencePath = showConfidence
    ? [
        ...confidenceSamples.map(
          (sample) => `${x(sample.month)},${y(sample.interval![1])}`,
        ),
        ...confidenceSamples
          .toReversed()
          .map((sample) => `${x(sample.month)},${y(sample.interval![0])}`),
      ].join(" L ")
    : "";
  const endpointColor = (month: number) =>
    month > trend.endMonth || month < trend.startMonth ? EXTENSION : OBSERVED;
  const showBracket =
    Math.abs(x(to) - x(from)) > Math.max(130, deltaLabel.length * 6.5);
  const hasExtension = maxMonth > trend.endMonth;

  return (
    <figure className="trend-chart" ref={figureRef}>
      <div className="trend-chart-unit">Monthly value ({unit})</div>
      <svg
        className="trend-chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        style={{ display: "block", height: "auto" }}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        focusable="false"
      >
        <title id={titleId}>Monthly observations and fitted linear trend</title>
        <desc id={descriptionId}>
          {`${trend.n} available monthly values from ${monthLabel(trend.startMonth)} to ${monthLabel(trend.endMonth)}, in ${unit}. Dots are real source data; missing months are left empty. The solid cyan line is the fitted trend during the observed period. The dashed amber line is a linear trend extension, not a forecast. Point A: ${monthLabel(from)}, ${formatTrendValue(aValue)} ${unit}. Point B: ${monthLabel(to)}, ${formatTrendValue(bValue)} ${unit}. Fitted change: ${signedDifference} ${unit}.${showConfidence ? " The shaded band is the 95% confidence interval of the fitted mean over the observed period, not a prediction interval." : ""}`}
        </desc>
        <defs>
          <clipPath id={clipId}>
            <rect
              x={LEFT - 7}
              y={TOP - 7}
              width={plotWidth + 14}
              height={plotHeight + 14}
            />
          </clipPath>
        </defs>
        <g fill={TEXT} fontSize="12" fontFamily="inherit">
          {yTicks.map((value, index) => (
            <g key={index}>
              <line
                x1={LEFT}
                x2={WIDTH - RIGHT}
                y1={y(value)}
                y2={y(value)}
                stroke="#b4c4da"
                strokeOpacity="0.13"
              />
              <text x={LEFT - 11} y={y(value) + 4} textAnchor="end">
                {formatTrendValue(value)}
              </text>
            </g>
          ))}
          {xTicks.map((month, index) => (
            <g key={month}>
              <line
                x1={x(month)}
                x2={x(month)}
                y1={HEIGHT - BOTTOM}
                y2={HEIGHT - BOTTOM + 5}
                stroke={TEXT}
                strokeOpacity="0.5"
              />
              <text
                x={x(month)}
                y={HEIGHT - BOTTOM + 24}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === xTicks.length - 1
                      ? "end"
                      : "middle"
                }
              >
                {monthLabel(month)}
              </text>
            </g>
          ))}
          <text x={LEFT + plotWidth / 2} y={HEIGHT - 8} textAnchor="middle">
            Calendar month
          </text>
        </g>
        <g clipPath={`url(#${clipId})`}>
          {showConfidence && (
            <path
              className="trend-chart-confidence"
              d={`M ${confidencePath} Z`}
              fill={OBSERVED}
              fillOpacity="0.12"
              stroke="none"
            />
          )}
          <line
            className="trend-chart-last-observation"
            x1={x(trend.endMonth)}
            x2={x(trend.endMonth)}
            y1={TOP}
            y2={HEIGHT - BOTTOM}
            stroke={TEXT}
            strokeOpacity="0.55"
            strokeDasharray="3 5"
          />
          <line
            x1={x(trend.startMonth)}
            x2={x(trend.endMonth)}
            y1={y(trend.predict(trend.startMonth))}
            y2={y(trend.predict(trend.endMonth))}
            stroke={OBSERVED}
            strokeWidth="2.7"
          />
          {hasExtension && (
            <line
              className="trend-chart-extension"
              x1={x(trend.endMonth)}
              x2={x(maxMonth)}
              y1={y(trend.predict(trend.endMonth))}
              y2={y(trend.predict(maxMonth))}
              stroke={EXTENSION}
              strokeWidth="2.7"
              strokeDasharray="8 6"
            />
          )}
          {minMonth < trend.startMonth && (
            <line
              x1={x(minMonth)}
              x2={x(trend.startMonth)}
              y1={y(trend.predict(minMonth))}
              y2={y(trend.predict(trend.startMonth))}
              stroke={EXTENSION}
              strokeWidth="2.7"
              strokeDasharray="8 6"
            />
          )}
          {trend.points.map((point) => (
            <circle
              key={point.month}
              className="trend-chart-observation"
              cx={x(point.x)}
              cy={y(point.value)}
              r="3.4"
              fill={OBSERVED}
              fillOpacity="0.72"
              stroke="#101c2b"
              strokeWidth="0.8"
            >
              <title>
                {`${monthLabel(point.x)}: ${formatTrendValue(point.value)} ${unit}`}
              </title>
            </circle>
          ))}
          {[
            { label: "A", month: from, value: aValue },
            { label: "B", month: to, value: bValue },
          ].map(({ label, month, value }) => (
            <circle
              key={label}
              cx={x(month)}
              cy={y(value)}
              r="6"
              fill="#0b1727"
              stroke={endpointColor(month)}
              strokeWidth="2.7"
            >
              <title>
                {`${label}: fitted mean at ${monthLabel(month)}, ${formatTrendValue(value)} ${unit}`}
              </title>
            </circle>
          ))}
        </g>
        <g fontFamily="inherit" fontSize="13" fontWeight="700">
          <text
            x={x(from) - 10}
            y={y(aValue) - 12}
            textAnchor="end"
            fill={endpointColor(from)}
          >
            A
          </text>
          <text
            x={Math.min(WIDTH - 10, x(to) + 10)}
            y={y(bValue) - 12}
            fill={endpointColor(to)}
          >
            B
          </text>
        </g>
        <text
          x={narrow ? WIDTH - RIGHT : x(trend.endMonth)}
          y={TOP - 14}
          textAnchor={narrow || x(trend.endMonth) > WIDTH / 2 ? "end" : "start"}
          fill={TEXT}
          fontFamily="inherit"
          fontSize="11"
        >
          Last observation · {monthLabel(trend.endMonth)}
        </text>
        {showBracket && (
          <g
            className="trend-chart-delta"
            stroke={EXTENSION}
            fill={EXTENSION}
            fontFamily="inherit"
            fontSize="12"
          >
            <path
              d={`M ${x(from)},${TOP + 25} v -7 H ${x(to)} v 7`}
              fill="none"
              strokeWidth="1.3"
            />
            <text
              x={(x(from) + x(to)) / 2}
              y={TOP + 10}
              textAnchor="middle"
              stroke="none"
            >
              {deltaLabel}
            </text>
          </g>
        )}
      </svg>
      <ul className="trend-chart-legend" aria-label="Chart legend">
        <li>
          <svg width="24" height="12" aria-hidden="true">
            <circle cx="12" cy="6" r="3.4" fill={OBSERVED} />
          </svg>
          Monthly source data
        </li>
        <li>
          <svg width="24" height="12" aria-hidden="true">
            <line
              x1="0"
              x2="24"
              y1="6"
              y2="6"
              stroke={OBSERVED}
              strokeWidth="2.7"
            />
          </svg>
          Fitted linear trend
        </li>
        <li>
          <svg width="24" height="12" aria-hidden="true">
            <line
              x1="0"
              x2="24"
              y1="6"
              y2="6"
              stroke={EXTENSION}
              strokeWidth="2.7"
              strokeDasharray="5 4"
            />
          </svg>
          Trend extension
        </li>
        {showConfidence && (
          <li>
            <svg width="24" height="12" aria-hidden="true">
              <rect
                x="0"
                y="2"
                width="24"
                height="8"
                fill={OBSERVED}
                fillOpacity="0.25"
              />
            </svg>
            95% CI of fitted mean · observed period only
          </li>
        )}
      </ul>
      <figcaption className="trend-chart-caption">
        A · {monthLabel(from)}: {formatTrendValue(aValue)} {unit}
        {" · "}B · {monthLabel(to)}: {formatTrendValue(bValue)} {unit}. Fitted
        change: {signedDifference} {unit}. The extension is not a forecast.
        {showConfidence && " The shaded interval is not a prediction interval."}
      </figcaption>
    </figure>
  );
}
