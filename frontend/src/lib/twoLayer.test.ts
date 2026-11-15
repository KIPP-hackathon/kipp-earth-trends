import { expect, it } from "vitest";
import { fitLayers, gapTest, type LayerPair } from "./twoLayer";
import { monthFromIndex } from "./trendLab";

function noise(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };
}
/** Y = beta * X + ownTrend + seasonal cycle + noise; X trends upward. */
function synthetic(options: {
  months?: number;
  beta?: number;
  ownPerDecade?: number;
  xDrivesY?: boolean;
  skip?: (i: number) => boolean;
}): LayerPair[] {
  const n = options.months ?? 240;
  const beta = options.beta ?? -2;
  const rand = noise(11);
  const pairs: LayerPair[] = [];
  for (let i = 0; i < n; i++) {
    const x =
      0.5 * (i / 120) + 1.2 * Math.sin(i / 3.1) * rand() * 2 + rand() * 0.6;
    const y =
      (options.xDrivesY === false ? 0 : beta * x) +
      (options.ownPerDecade ?? 0) * (i / 120) +
      4 * Math.sin((2 * Math.PI * (i % 12)) / 12) +
      rand() * 0.4;
    if (options.skip?.(i)) continue;
    pairs.push({
      xMonth: monthFromIndex(24000 + i),
      yMonth: monthFromIndex(24000 + i),
      x,
      y,
    });
  }
  return pairs;
}

it("separates the trend carried by X from the trend of Y's own", () => {
  const fit = fitLayers(synthetic({ beta: -2, ownPerDecade: -0.5 }))!;
  // X rises 0.5 per decade, so X contributes about -1 per decade; own is -0.5.
  expect(fit.alone.slope).toBeCloseTo(-1.5, 0);
  expect(fit.withX.slope).toBeCloseTo(-0.5, 0);
  expect(fit.beta).toBeCloseTo(-2, 1);
  expect(fit.shareExplained!).toBeGreaterThan(0.5);
  expect(fit.shareExplained!).toBeLessThan(0.85);
  expect(fit.inference).toBe(true);
  expect(fit.withX.ci![0]).toBeLessThan(fit.withX.slope);
  expect(fit.withX.ci![1]).toBeGreaterThan(fit.withX.slope);
});

it("reports no explained trend when X does not drive Y", () => {
  const fit = fitLayers(
    synthetic({ xDrivesY: false, ownPerDecade: 1 }),
  )!;
  expect(Math.abs(fit.beta)).toBeLessThan(0.3);
  expect(Math.abs(fit.shareExplained!)).toBeLessThan(0.15);
});

it("withholds intervals when the common months have gaps", () => {
  const fit = fitLayers(synthetic({ skip: (i) => i >= 100 && i < 110 }))!;
  expect(fit.inference).toBe(false);
  expect(fit.alone.ci).toBeNull();
  expect(fit.withX.ci).toBeNull();
  expect(fit.alone.slope).toBeTypeOf("number");
});

it("rejects short or incomplete support", () => {
  expect(fitLayers(synthetic({ months: 20 }))).toBeNull();
  expect(
    fitLayers(synthetic({ months: 240 }).map((p) => ({ ...p, y: 3 }))),
  ).toBeNull();
});

it("gap test credits X only when it predicts hidden months", () => {
  const real = gapTest(synthetic({ beta: -2, ownPerDecade: -0.5 }), 24)!;
  expect(real.skill).toBeGreaterThan(0.5);
  expect(real.wins).toBe(real.blocks.length);
  expect(real.rmseWithX).toBeLessThan(real.rmseTime);
  const none = gapTest(synthetic({ xDrivesY: false }), 24)!;
  expect(none.skill).toBeLessThan(0.05);
});

it("gap test never trains on hidden months", () => {
  const test = gapTest(synthetic({ beta: -2 }), 12)!;
  const hidden = test.blocks.flatMap((b) => b.rows.map((r) => r.month));
  expect(new Set(hidden).size).toBe(hidden.length);
  expect(test.hidden).toBe(hidden.length);
  expect(gapTest(synthetic({ months: 20 }), 12)).toBeNull();
});

it("exposes what the layered trend chart needs", () => {
  const fit = fitLayers(synthetic({ beta: -2, ownPerDecade: -0.5 }))!;
  const d = fit.display;
  expect(fit.alone.se).toBeGreaterThan(0);
  expect(fit.withX.se).toBeGreaterThan(0);
  expect(d.yNoX).toHaveLength(d.y.length);
  // Removing X's contribution leaves a series whose own trend is layer 2's.
  const t = d.t.map((m) => (m - d.center.t0) / 120);
  const mt = t.reduce((a, b) => a + b, 0) / t.length;
  const my = d.yNoX.reduce((a, b) => a + b, 0) / t.length;
  const slope =
    t.reduce((s, v, i) => s + (v - mt) * (d.yNoX[i] - my), 0) /
    t.reduce((s, v) => s + (v - mt) ** 2, 0);
  expect(slope).toBeCloseTo(fit.withX.slope, 1);
  // Both lines pivot at the same centre.
  const at = (line: [number, number][], tt: number) =>
    line[0][1] + ((line[1][1] - line[0][1]) * (tt - line[0][0])) / (line[1][0] - line[0][0]);
  const pivot = d.center.t0 + d.center.tbar * 120;
  expect(at(d.alone, pivot)).toBeCloseTo(d.center.mean, 6);
  expect(at(d.withX, pivot)).toBeCloseTo(d.center.mean, 6);
});
