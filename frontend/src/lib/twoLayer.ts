import { monthIndex } from "./trendLab";

/**
 * Two-layer view of a lagged relationship.
 *
 * Layer 1: Y ~ calendar-month effects + time          (trend of Y alone)
 * Layer 2: Y ~ calendar-month effects + time + X(lag) (trend of Y with X held fixed)
 *
 * The same complete-case pairs as the lag analysis are used, so both layers
 * describe exactly the months behind the selected lag. The comparison is
 * statistical adjustment, not causal decomposition: X may itself respond to Y.
 */
export type LayerPair = { xMonth: string; yMonth: string; x: number; y: number };

export type LayerFit = {
  n: number;
  /** Slope of Y per decade without X, in Y units. */
  alone: { slope: number; se: number | null; ci: [number, number] | null };
  /** Slope of Y per decade with X in the model. */
  withX: { slope: number; se: number | null; ci: [number, number] | null };
  /** Y change per unit of X, from the layer 2 model. */
  beta: number;
  betaCi: [number, number] | null;
  /** (alone - withX) / alone, null when the alone slope is effectively zero. */
  shareExplained: number | null;
  /** Fraction of the remaining variance explained by adding X. */
  r2Gain: number | null;
  /** True when both layers have intervals (60+ consecutive months). */
  inference: boolean;
  /** Y with the calendar-month effect removed, plus fitted trend lines. */
  display: {
    t: number[];
    months: string[];
    y: number[];
    alone: [number, number][];
    withX: [number, number][];
    /** Y with calendar-month effect and X's linear contribution removed. */
    yNoX: number[];
    /** Fitted trend lines pivot at (tbar decades after t0, mean). */
    center: { t0: number; tbar: number; mean: number };
  };
};

export type GapBlock = {
  start: string;
  end: string;
  rows: { month: string; t: number; y: number; time: number; withX: number }[];
};
export type GapTest = {
  blockMonths: number;
  blocks: GapBlock[];
  rmseTime: number;
  rmseWithX: number;
  /** 1 - SSE(time+X) / SSE(time only), pooled over hidden months. */
  skill: number;
  wins: number;
  hidden: number;
};

const Z95 = 1.959963984540054;
const monthOf = (month: string) => Number(month.slice(5)) - 1;
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);

type Design = { rows: number[][]; y: number[]; times: number[] };
function design(
  pairs: LayerPair[],
  withX: boolean,
  y0: number,
  sy: number,
  x0: number,
  sx: number,
  t0: number,
): Design {
  const rows: number[][] = [];
  const y: number[] = [];
  const times: number[] = [];
  for (const p of pairs) {
    const t = monthIndex(p.yMonth)!;
    const row = [1];
    for (let m = 1; m < 12; m++) row.push(monthOf(p.yMonth) === m ? 1 : 0);
    row.push((t - t0) / 120);
    if (withX) row.push((p.x - x0) / sx);
    rows.push(row);
    y.push((p.y - y0) / sy);
    times.push(t);
  }
  return { rows, y, times };
}

function invert(a: number[][]): number[][] | null {
  const k = a.length;
  const m = a.map((row, i) => [
    ...row,
    ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let c = 0; c < k; c++) {
    let pivot = c;
    for (let r = c + 1; r < k; r++)
      if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    if (Math.abs(m[pivot][c]) < 1e-10) return null;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    const d = m[c][c];
    for (let j = 0; j < 2 * k; j++) m[c][j] /= d;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = m[r][c];
      if (f !== 0) for (let j = 0; j < 2 * k; j++) m[r][j] -= f * m[c][j];
    }
  }
  return m.map((row) => row.slice(k));
}

type Ols = { beta: number[]; inv: number[][]; residual: number[]; sse: number };
function ols(rows: number[][], y: number[]): Ols | null {
  const k = rows[0].length;
  const xtx = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const xty = new Array<number>(k).fill(0);
  rows.forEach((r, i) => {
    for (let a = 0; a < k; a++) {
      xty[a] += r[a] * y[i];
      for (let b = 0; b < k; b++) xtx[a][b] += r[a] * r[b];
    }
  });
  const inv = invert(xtx);
  if (!inv) return null;
  const beta = inv.map((row) => sum(row.map((v, j) => v * xty[j])));
  const residual = rows.map((r, i) => y[i] - sum(r.map((v, j) => v * beta[j])));
  return { beta, inv, residual, sse: sum(residual.map((e) => e * e)) };
}

/** HAC (Bartlett, 12 lags) standard errors, n/(n-k) corrected; needs consecutive months. */
function hacSe(rows: number[][], fit: Ols): number[] {
  const n = rows.length;
  const k = rows[0].length;
  const scores = rows.map((r, i) => r.map((v) => v * fit.residual[i]));
  const meat = Array.from({ length: k }, (_, a) =>
    Array.from({ length: k }, (_, b) =>
      sum(scores.map((s) => s[a] * s[b])),
    ),
  );
  for (let l = 1; l <= 12; l++) {
    const w = 1 - l / 13;
    for (let a = 0; a < k; a++)
      for (let b = 0; b < k; b++) {
        let g = 0;
        for (let i = l; i < n; i++)
          g += scores[i][a] * scores[i - l][b] + scores[i][b] * scores[i - l][a];
        meat[a][b] += w * g;
      }
  }
  const scale = n / (n - k);
  return Array.from({ length: k }, (_, a) => {
    let v = 0;
    for (let p = 0; p < k; p++)
      for (let q = 0; q < k; q++)
        v += fit.inv[a][p] * meat[p][q] * fit.inv[q][a];
    return Math.sqrt(Math.max(0, v * scale));
  });
}

function enoughMonths(pairs: LayerPair[]) {
  const counts = new Array<number>(12).fill(0);
  for (const p of pairs) counts[monthOf(p.yMonth)]++;
  return pairs.length >= 24 && counts.every((c) => c >= 2);
}
function valid(pairs: LayerPair[]) {
  return pairs.every(
    (p) =>
      monthIndex(p.yMonth) !== null &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y),
  );
}
function scales(pairs: LayerPair[]) {
  const range = (v: number[]) => Math.max(...v) - Math.min(...v);
  const sy = range(pairs.map((p) => p.y));
  const sx = range(pairs.map((p) => p.x));
  return sy > 0 && sx > 0
    ? { y0: pairs[0].y, sy, x0: pairs[0].x, sx }
    : null;
}

export function fitLayers(input: LayerPair[]): LayerFit | null {
  const pairs = [...input].sort(
    (a, b) => monthIndex(a.yMonth)! - monthIndex(b.yMonth)!,
  );
  if (!valid(pairs) || !enoughMonths(pairs)) return null;
  const sc = scales(pairs);
  if (!sc) return null;
  const t0 = monthIndex(pairs[0].yMonth)!;
  const A = design(pairs, false, sc.y0, sc.sy, sc.x0, sc.sx, t0);
  const B = design(pairs, true, sc.y0, sc.sy, sc.x0, sc.sx, t0);
  const fa = ols(A.rows, A.y);
  const fb = ols(B.rows, B.y);
  if (!fa || !fb) return null;
  const timeCol = 12;
  const slopeA = fa.beta[timeCol] * sc.sy;
  const slopeB = fb.beta[timeCol] * sc.sy;
  const beta = (fb.beta[timeCol + 1] * sc.sy) / sc.sx;
  const last = A.times.at(-1)!;
  const consecutive = last - A.times[0] + 1 === pairs.length;
  const inference = consecutive && pairs.length >= 60;
  const seA = inference ? hacSe(A.rows, fa) : null;
  const seB = inference ? hacSe(B.rows, fb) : null;
  const ci = (v: number, se: number | null): [number, number] | null =>
    se === null ? null : [v - Z95 * se, v + Z95 * se];
  const monthEffect = (month: string) => {
    const m = monthOf(month);
    return (m === 0 ? 0 : fa.beta[m]) * sc.sy;
  };
  const adjusted = pairs.map((p) => p.y - monthEffect(p.yMonth));
  const ts = pairs.map((p) => (monthIndex(p.yMonth)! - t0) / 120);
  const mean = sum(adjusted) / adjusted.length;
  const xMean = sum(pairs.map((p) => p.x)) / pairs.length;
  const tbar = sum(ts) / ts.length;
  const ends = [ts[0], ts.at(-1)!];
  const line = (slope: number): [number, number][] =>
    ends.map((t) => [t0 + t * 120, mean + slope * (t - tbar)]);
  return {
    n: pairs.length,
    alone: {
      slope: slopeA,
      se: seA === null ? null : seA[timeCol] * sc.sy,
      ci: ci(slopeA, seA === null ? null : seA[timeCol] * sc.sy),
    },
    withX: {
      slope: slopeB,
      se: seB === null ? null : seB[timeCol] * sc.sy,
      ci: ci(slopeB, seB === null ? null : seB[timeCol] * sc.sy),
    },
    beta,
    betaCi: ci(
      beta,
      seB === null ? null : (seB[timeCol + 1] * sc.sy) / sc.sx,
    ),
    shareExplained:
      Math.abs(slopeA) > 1e-12 ? (slopeA - slopeB) / slopeA : null,
    r2Gain: fa.sse > 0 ? 1 - fb.sse / fa.sse : null,
    inference,
    display: {
      t: pairs.map((p) => monthIndex(p.yMonth)!),
      months: pairs.map((p) => p.yMonth),
      y: adjusted,
      alone: line(slopeA),
      withX: line(slopeB),
      yNoX: adjusted.map((v, i) => v - beta * (pairs[i].x - xMean)),
      center: { t0, tbar, mean },
    },
  };
}

/**
 * Hold out consecutive blocks of calendar months, refit both models on all other
 * pairs, and score predictions for the hidden months. Month effects and trend
 * come only from the training months, so hidden values never leak into the fit.
 */
export function gapTest(
  input: LayerPair[],
  blockMonths: number,
): GapTest | null {
  const pairs = [...input].sort(
    (a, b) => monthIndex(a.yMonth)! - monthIndex(b.yMonth)!,
  );
  if (!valid(pairs) || !enoughMonths(pairs) || blockMonths < 3) return null;
  const sc = scales(pairs);
  if (!sc) return null;
  const t0 = monthIndex(pairs[0].yMonth)!;
  const times = pairs.map((p) => monthIndex(p.yMonth)!);
  const blocks: GapBlock[] = [];
  let eTime = 0;
  let eX = 0;
  let wins = 0;
  let hidden = 0;
  const lastT = times.at(-1)!;
  for (let s = t0; s <= lastT; s += blockMonths) {
    const inBlock = (i: number) => times[i] >= s && times[i] < s + blockMonths;
    const test = pairs.filter((_, i) => inBlock(i));
    const train = pairs.filter((_, i) => !inBlock(i));
    if (test.length < Math.ceil(blockMonths / 2) || !enoughMonths(train))
      continue;
    const A = design(train, false, sc.y0, sc.sy, sc.x0, sc.sx, t0);
    const B = design(train, true, sc.y0, sc.sy, sc.x0, sc.sx, t0);
    const fa = ols(A.rows, A.y);
    const fb = ols(B.rows, B.y);
    if (!fa || !fb) continue;
    const TA = design(test, false, sc.y0, sc.sy, sc.x0, sc.sx, t0);
    const TB = design(test, true, sc.y0, sc.sy, sc.x0, sc.sx, t0);
    const predict = (f: Ols, row: number[]) =>
      sc.y0 + sc.sy * sum(row.map((v, j) => v * f.beta[j]));
    const rows = test.map((p, i) => ({
      month: p.yMonth,
      t: TA.times[i],
      y: p.y,
      time: predict(fa, TA.rows[i]),
      withX: predict(fb, TB.rows[i]),
    }));
    const sTime = sum(rows.map((r) => (r.y - r.time) ** 2));
    const sX = sum(rows.map((r) => (r.y - r.withX) ** 2));
    eTime += sTime;
    eX += sX;
    hidden += rows.length;
    if (sX < sTime) wins++;
    blocks.push({ start: rows[0].month, end: rows.at(-1)!.month, rows });
  }
  if (!blocks.length || eTime <= 0) return null;
  return {
    blockMonths,
    blocks,
    rmseTime: Math.sqrt(eTime / hidden),
    rmseWithX: Math.sqrt(eX / hidden),
    skill: 1 - eX / eTime,
    wins,
    hidden,
  };
}
