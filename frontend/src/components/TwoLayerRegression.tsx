import { useMemo, useState } from "react";
import type { Investigation } from "../lib/earthApi";
import { fitLayers, gapTest, type GapBlock } from "../lib/twoLayer";
import { formatTrendValue, monthFromIndex, trendUnit } from "../lib/trendLab";
import { ChartInfo } from "./ChartInfo";
import { LayeredTrend } from "./LayeredTrend";
import "./two-layer.css";

const cyan = "#87dbe5";
const coral = "#f2958a";
const ink = "#b4c4da";
const grid = "#a2bfe52b";
const W = 720;
const margin = { l: 56, r: 12, t: 18, b: 26 };

const num = (v: number, signed = true) =>
  formatTrendValue(Number(v.toPrecision(3)), signed);
const pct = (v: number) => `${Math.round(v * 100)}%`;

type Series = {
  label: string;
  color: string;
  dash?: string;
  width: number;
  opacity?: number;
  /** Points are drawn as separate segments wherever a month is missing. */
  segments: [number, number][][];
};

function splitRuns(points: [number, number][], gap = 1): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  for (const point of points) {
    if (run.length && point[0] - run.at(-1)![0] > gap) {
      runs.push(run);
      run = [];
    }
    run.push(point);
  }
  if (run.length) runs.push(run);
  return runs;
}

function Plot({
  label,
  height,
  series,
  bands = [],
  unit,
}: {
  label: string;
  height: number;
  series: Series[];
  bands?: { from: number; to: number; title: string }[];
  unit: string;
}) {
  const all = series.flatMap((s) => s.segments.flat());
  if (!all.length) return null;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const pad = (Math.max(...ys) - Math.min(...ys) || 1) * 0.08;
  const y0 = Math.min(...ys) - pad;
  const y1 = Math.max(...ys) + pad;
  const sx = (v: number) =>
    margin.l + ((v - x0) / (x1 - x0 || 1)) * (W - margin.l - margin.r);
  const sy = (v: number) =>
    margin.t + (1 - (v - y0) / (y1 - y0 || 1)) * (height - margin.t - margin.b);
  const years = (x1 - x0) / 12;
  const step = years > 14 ? 5 : years > 6 ? 2 : 1;
  const firstYear = Math.ceil(x0 / 12 / step) * step;
  const ticks: number[] = [];
  for (let year = firstYear; year * 12 <= x1; year += step) ticks.push(year);
  const yTicks = [0, 1, 2, 3, 4].map((i) => y0 + ((y1 - y0) * i) / 4);
  const path = (run: [number, number][]) =>
    run
      .map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`)
      .join(" ");
  return (
    <svg
      className="layers-plot"
      viewBox={`0 0 ${W} ${height}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={margin.l} x2={W - margin.r} y1={sy(v)} y2={sy(v)} stroke={grid} />
          <text x={margin.l - 6} y={sy(v) + 4} textAnchor="end" fill={ink} fontSize="11">
            {formatTrendValue(Number(v.toPrecision(3)))}
          </text>
        </g>
      ))}
      <text x={margin.l} y={9} fill={ink} fontSize="10" opacity="0.8">
        {unit}
      </text>
      {bands.map((b) => (
        <g key={b.from}>
          <rect
            x={sx(b.from)}
            y={margin.t}
            width={Math.max(1, sx(b.to) - sx(b.from))}
            height={height - margin.t - margin.b}
            fill="#a2bfe5"
            opacity="0.1"
          >
            <title>{b.title}</title>
          </rect>
          <text
            x={(sx(b.from) + sx(b.to)) / 2}
            y={margin.t + 12}
            textAnchor="middle"
            fill={ink}
            fontSize="10"
            letterSpacing="0.08em"
          >
            HIDDEN
          </text>
        </g>
      ))}
      {ticks.map((year) => (
        <text
          key={year}
          x={sx(year * 12)}
          y={height - 8}
          textAnchor="middle"
          fill={ink}
          fontSize="11"
        >
          {year}
        </text>
      ))}
      {series.map((s) =>
        s.segments.map((run, i) => (
          <path
            key={`${s.label}-${i}`}
            d={path(run)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeDasharray={s.dash}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={s.opacity ?? 1}
          />
        )),
      )}
    </svg>
  );
}

const Legend = ({ items }: { items: [string, string, boolean?][] }) => (
  <div className="layers-legend">
    {items.map(([text, color, dashed]) => (
      <span key={text}>
        <i
          style={{
            background: dashed
              ? `repeating-linear-gradient(90deg,${color} 0 5px,transparent 5px 8px)`
              : color,
          }}
        />
        {text}
      </span>
    ))}
  </div>
);

type Slope = { slope: number; ci: [number, number] | null };

/** Dot-and-whisker comparison of both trend slopes on one axis with zero. */
function SlopeCompare({
  rows,
  unit,
}: {
  rows: { label: string; tag: string; color: string; fit: Slope }[];
  unit: string;
}) {
  const values = rows.flatMap((r) => [r.fit.slope, ...(r.fit.ci ?? [])]);
  const lo0 = Math.min(0, ...values);
  const hi0 = Math.max(0, ...values);
  const raw = (hi0 - lo0 || 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((s) => s * mag >= raw) ?? 10) * mag;
  const lo = Math.floor((lo0 - raw * 0.3) / step) * step;
  const hi = Math.ceil((hi0 + raw * 0.3) / step) * step;
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return (
    <div className="layers-slopes" role="group" aria-label="Trend per decade, both layers">
      {rows.map((r) => {
        const crosses = r.fit.ci ? r.fit.ci[0] <= 0 && r.fit.ci[1] >= 0 : null;
        return (
          <div className="layers-slope-row" key={r.tag}>
            <div className="layers-slope-label">
              <span className="layers-tag" style={{ color: r.color }}>
                {r.tag}
              </span>
              {r.label}
            </div>
            <div className="layers-slope-track" aria-hidden="true">
              <span className="layers-zero" style={{ left: at(0) }} />
              {r.fit.ci && (
                <span
                  className="layers-ci"
                  style={{
                    left: at(r.fit.ci[0]),
                    width: `calc(${at(r.fit.ci[1])} - ${at(r.fit.ci[0])})`,
                    background: r.color,
                  }}
                />
              )}
              <span
                className="layers-dot"
                style={{ left: at(r.fit.slope), borderColor: r.color }}
              />
            </div>
            <div className="layers-slope-value">
              <strong>{num(r.fit.slope)}</strong>
              <small>
                {r.fit.ci
                  ? `95% CI ${num(r.fit.ci[0])} to ${num(r.fit.ci[1])}`
                  : "interval unavailable"}
              </small>
              {crosses !== null && (
                <em data-clear={!crosses}>
                  {crosses ? "includes zero" : "clear of zero"}
                </em>
              )}
            </div>
          </div>
        );
      })}
      <div className="layers-slope-axis" aria-hidden="true">
        <span />
        <div>
          {ticks.map((v, i) => (
            <span
              key={i}
              style={{ left: at(v) }}
              data-edge={i === 0 ? "start" : i === ticks.length - 1 ? "end" : undefined}
            >
              {formatTrendValue(Number(v.toPrecision(3)))}
            </span>
          ))}
        </div>
        <small>{unit} / decade</small>
      </div>
    </div>
  );
}

const blockSse = (b: GapBlock) => ({
  time: b.rows.reduce((s, r) => s + (r.y - r.time) ** 2, 0),
  withX: b.rows.reduce((s, r) => s + (r.y - r.withX) ** 2, 0),
});

export function TwoLayerRegression({
  data,
  lag,
}: {
  data: Investigation;
  lag: number;
}) {
  const [blockMonths, setBlockMonths] = useState(24);
  const [shown, setShown] = useState<{ key: string; start: string }>();
  const rel = data.lags[lag];
  const xName = data.series[0].name;
  const yName = data.series[1].name;
  const yUnit = trendUnit(data.series[1].unit);
  const xUnit = trendUnit(data.series[0].unit);
  const fit = useMemo(() => fitLayers(rel.pairs), [rel]);
  const test = useMemo(
    () => (fit ? gapTest(rel.pairs, blockMonths) : null),
    [rel, fit, blockMonths],
  );
  const offsets = useMemo(() => {
    const map = new Map<string, number>();
    if (!fit) return map;
    const byMonth = new Map(rel.pairs.map((p) => [p.yMonth, p.y]));
    fit.display.months.forEach((m, i) =>
      map.set(m, fit.display.y[i] - byMonth.get(m)!),
    );
    return map;
  }, [fit, rel]);

  const lagText = lag === 0 ? "same month" : `X leads by ${lag} months`;
  const roles = (
    <dl className="layers-roles">
      <div data-role="y">
        <dt>Y</dt>
        <dd>{yName}</dd>
      </div>
      <div data-role="x">
        <dt>X</dt>
        <dd>{xName}</dd>
      </div>
      <div>
        <dt>Lag</dt>
        <dd>{lagText}</dd>
      </div>
    </dl>
  );
  const heading = (
    <header className="layers-head">
      <div className="investigation-heading-row">
        <div>
          <span className="trend-kicker">Two-layer regression</span>
          <h4>
            Does {xName} explain the trend in {yName}?
          </h4>
        </div>
        <ChartInfo label="How to read the two layers">
          <p>
            Layer 1 is the straight-line trend of Y on its own, with
            calendar-month effects removed. Layer 2 fits the same trend while
            also using X {lag === 0 ? "in the same month" : `${lag} months earlier`}.
          </p>
          <p>
            If the trend shrinks in layer 2, part of it moves together with X.
            That is statistical adjustment, not proof of cause: X may also
            respond to Y.
          </p>
          <p>
            The gap test hides blocks of months, refits without them, and
            checks whether the model that includes X predicts them better.
          </p>
        </ChartInfo>
      </div>
      {roles}
    </header>
  );

  if (!fit)
    return (
      <section className="investigation-layers" aria-label="Two-layer regression">
        {heading}
        <p className="layers-empty">
          This comparison needs at least 24 common month pairs with two of every
          calendar month and some variation in both indicators. Choose a longer
          period or indicators with more overlapping coverage.
        </p>
      </section>
    );

  const display = fit.display;
  const observed = splitRuns(display.t.map((t, i) => [t, display.y[i]]));
  const share = fit.shareExplained;
  const aloneSignificant = fit.alone.ci
    ? fit.alone.ci[0] > 0 || fit.alone.ci[1] < 0
    : null;
  const withXSignificant = fit.withX.ci
    ? fit.withX.ci[0] > 0 || fit.withX.ci[1] < 0
    : null;
  const shareMeaningful = aloneSignificant !== false && share !== null;
  const helps = test ? test.skill > 0.05 && test.wins > test.blocks.length / 2 : false;
  const adjusted = (month: string, value: number) =>
    value + (offsets.get(month) ?? 0);
  const focusKey = `${lag}:${blockMonths}`;
  const focus =
    test &&
    (test.blocks.find(
      (b) => shown?.key === focusKey && b.start === shown.start,
    ) ?? test.blocks[Math.floor(test.blocks.length / 2)]);
  const around = focus
    ? observed
        .flat()
        .filter(
          (p) =>
            p[0] >= focus.rows[0].t - 36 &&
            p[0] <= focus.rows.at(-1)!.t + 36,
        )
    : [];
  const focusRmse = focus && [
    Math.sqrt(blockSse(focus).time / focus.rows.length),
    Math.sqrt(blockSse(focus).withX / focus.rows.length),
  ];

  const layerVerdict: { state: "yes" | "no" | "neutral"; title: string; text: string } =
    aloneSignificant === false
      ? {
          state: "neutral",
          title: "No clear trend in Y to explain",
          text: `Y's own trend (${num(fit.alone.slope)} ${yUnit}/decade) is not distinguishable from zero, so the share carried by X is not meaningful.`,
        }
      : share === null
        ? {
            state: "neutral",
            title: "Trend too small to split",
            text: "Y's trend is effectively zero, so no share can be computed.",
          }
        : share > 0.2
          ? {
              state: "yes",
              title: `About ${pct(Math.min(share, 1))} of Y's trend moves with X`,
              text: `Trend falls from ${num(fit.alone.slope)} to ${num(fit.withX.slope)} ${yUnit}/decade once X is held fixed${withXSignificant === false ? " and is no longer clear of zero" : ""}.`,
            }
          : {
              state: "no",
              title: "Y's trend barely changes when X is added",
              text: `${num(fit.alone.slope)} → ${num(fit.withX.slope)} ${yUnit}/decade with X held fixed.`,
            };
  const gapVerdict = test
    ? {
        state: helps ? ("yes" as const) : ("no" as const),
        title: helps
          ? "X improves predictions of hidden months"
          : "X does not clearly improve hidden-month predictions",
        text: `Squared error ${test.skill >= 0 ? "−" : "+"}${Math.abs(Math.round(test.skill * 100))}% with X; better in ${test.wins} of ${test.blocks.length} blocks.`,
      }
    : null;

  const maxRmse = test ? Math.max(test.rmseTime, test.rmseWithX) || 1 : 1;
  return (
    <section className="investigation-layers" aria-label="Two-layer regression">
      {heading}

      <div className="layers-summary" aria-label="Two-layer summary">
        {[
          { step: "1", name: "Layer test", v: layerVerdict },
          ...(gapVerdict ? [{ step: "2", name: "Gap test", v: gapVerdict }] : []),
        ].map(({ step, name, v }) => (
          <div key={step} className="layers-summary-item" data-evidence={v.state}>
            <span className="layers-summary-step">
              {step} · {name}
            </span>
            <strong>{v.title}</strong>
            <p>{v.text}</p>
          </div>
        ))}
      </div>

      <div className="layers-step">
        <div className="layers-step-head">
          <span className="layers-step-num">1</span>
          <div>
            <h5>Does Y&apos;s trend change when X is added?</h5>
            <p>
              Same {fit.n} common months as the lag {lag} result above, seasonal
              effects removed.
              {!fit.inference &&
                " Intervals need 60 consecutive common months, so only point estimates are shown."}
            </p>
          </div>
        </div>
        <SlopeCompare
          unit={yUnit}
          rows={[
            {
              tag: "Layer 1",
              label: "Y trend alone",
              color: cyan,
              fit: fit.alone,
            },
            {
              tag: "Layer 2",
              label: "Y with X held fixed",
              color: coral,
              fit: fit.withX,
            },
          ]}
        />
        <div className="layers-facts">
          <div data-muted={!shareMeaningful}>
            <span>Trend carried by X</span>
            <strong>{share === null ? "—" : pct(share)}</strong>
            <small>
              {shareMeaningful
                ? "(Layer 1 − Layer 2) ÷ Layer 1"
                : "Not meaningful: Layer 1 includes zero"}
            </small>
          </div>
          <div>
            <span>Y per unit of X</span>
            <strong>{num(fit.beta)}</strong>
            <small>
              {yUnit} per {xUnit}
              {fit.betaCi
                ? ` · CI ${num(fit.betaCi[0])} to ${num(fit.betaCi[1])}`
                : ""}
            </small>
          </div>
          {fit.r2Gain !== null && (
            <div>
              <span>Extra variation explained</span>
              <strong>{pct(fit.r2Gain)}</strong>
              <small>of what time + season leave unexplained</small>
            </div>
          )}
        </div>
        <LayeredTrend data={data} lag={lag} heading={false} />
      </div>

      <div className="layers-step">
        <div className="layers-step-head">
          <span className="layers-step-num">2</span>
          <div>
            <h5>Gap test: does X help predict months the model never saw?</h5>
            <p>
              Hide one block at a time, refit on the rest, then score both
              models on the hidden months.
            </p>
          </div>
          <div
            className="layers-seg"
            role="radiogroup"
            aria-label="Gap test block length"
          >
            {[12, 24, 36].map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={blockMonths === m}
                onClick={() => setBlockMonths(m)}
              >
                {m} mo
              </button>
            ))}
          </div>
        </div>
        {test ? (
          <>
            <div className="layers-errors" aria-label="Error on hidden months">
              {[
                { label: "Time only", v: test.rmseTime, color: cyan },
                { label: "Time + X", v: test.rmseWithX, color: coral },
              ].map((e) => (
                <div key={e.label} className="layers-error-row">
                  <span>{e.label}</span>
                  <div className="layers-error-track">
                    <i style={{ width: `${(e.v / maxRmse) * 100}%`, background: e.color }} />
                  </div>
                  <strong>
                    {num(e.v, false)} <small>{yUnit} RMSE</small>
                  </strong>
                </div>
              ))}
              <p className="layers-error-note">
                {test.blocks.length} blocks × {test.blockMonths} months ·{" "}
                {test.hidden} hidden months · skill{" "}
                <b data-good={test.skill > 0}>
                  {test.skill >= 0 ? "+" : "−"}
                  {Math.abs(Math.round(test.skill * 100))}%
                </b>
              </p>
            </div>

            <div className="layers-blocks">
              <div className="layers-blocks-head">
                <span>Show hidden block</span>
                <span className="layers-blocks-key">
                  <i data-win="true" /> X helped
                  <i data-win="false" /> X did not help
                </span>
              </div>
              <div className="layers-blocks-strip" role="radiogroup" aria-label="Hidden block to display">
                {test.blocks.map((b) => {
                  const e = blockSse(b);
                  const win = e.withX < e.time;
                  return (
                    <button
                      key={b.start}
                      type="button"
                      role="radio"
                      aria-checked={focus?.start === b.start}
                      data-win={win}
                      title={`${b.start} – ${b.end}: ${win ? "time + X" : "time only"} had lower error`}
                      aria-label={`${b.start} to ${b.end}, ${win ? "X helped" : "X did not help"}`}
                      onClick={() => setShown({ key: focusKey, start: b.start })}
                    />
                  );
                })}
              </div>
              <div className="layers-blocks-ends" aria-hidden="true">
                <span>{test.blocks[0].start.slice(0, 4)}</span>
                <span>{test.blocks.at(-1)!.end.slice(0, 4)}</span>
              </div>
            </div>

            {focus && focusRmse && (
              <figure className="layers-focus">
                <figcaption>
                  <strong>
                    {focus.start} – {focus.end}
                  </strong>
                  <span>
                    error {num(focusRmse[0], false)} time only vs{" "}
                    {num(focusRmse[1], false)} with X ({yUnit})
                  </span>
                </figcaption>
                <Plot
                  label={`Hidden months ${focus.start} to ${focus.end}: observed values and two predictions`}
                  height={210}
                  unit={yUnit}
                  bands={[
                    {
                      from: focus.rows[0].t,
                      to: focus.rows.at(-1)!.t,
                      title: `${focus.start} to ${focus.end} hidden`,
                    },
                  ]}
                  series={[
                    {
                      label: "Y",
                      color: ink,
                      width: 1.3,
                      opacity: 0.7,
                      segments: splitRuns(around),
                    },
                    {
                      label: "time",
                      color: cyan,
                      width: 2.2,
                      dash: "5 4",
                      segments: [focus.rows.map((r) => [r.t, adjusted(r.month, r.time)])],
                    },
                    {
                      label: "withX",
                      color: coral,
                      width: 2.2,
                      segments: [focus.rows.map((r) => [r.t, adjusted(r.month, r.withX)])],
                    },
                  ]}
                />
                <Legend
                  items={[
                    ["Y observed", ink],
                    ["Predicted · time only", cyan, true],
                    ["Predicted · time + X", coral],
                  ]}
                />
              </figure>
            )}
          </>
        ) : (
          <p className="layers-empty">
            Not enough months remain after hiding blocks of {blockMonths} months.
            Try a shorter block or a longer period.
          </p>
        )}
      </div>

      <p className="layers-caveat">
        <strong>Association, not cause.</strong> X may respond to Y, or both may
        share another driver. You chose lag {lag}; scanning lags and keeping the
        best one overstates the skill. The charts remove each month&apos;s
        seasonal effect for display; scoring uses the full values.{" "}
        {monthFromIndex(display.t[0])} – {monthFromIndex(display.t.at(-1)!)}.
      </p>
    </section>
  );
}
