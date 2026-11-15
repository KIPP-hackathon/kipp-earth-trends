import { monthIndex } from "./trendLab";

export type ChartPoint = { month: string; value: number | null };

/**
 * Trailing 12-month (or `window`-month) mean. A value is produced only when
 * every month in the window is present and valid, so gaps are never bridged.
 */
export function trailingMean(points: ChartPoint[], window = 12): ChartPoint[] {
  const byIndex = new Map<number, number | null>();
  for (const p of points) {
    const i = monthIndex(p.month);
    if (i !== null) byIndex.set(i, p.value);
  }
  return points.map((p) => {
    const end = monthIndex(p.month);
    if (end === null) return { month: p.month, value: null };
    let sum = 0;
    for (let i = end - window + 1; i <= end; i++) {
      const v = byIndex.get(i);
      if (v === null || v === undefined || !Number.isFinite(v))
        return { month: p.month, value: null };
      sum += v;
    }
    return { month: p.month, value: sum / window };
  });
}

/** January ticks between two months, thinned to at most `max` labels. */
export function yearTicks(start: string, end: string, max = 8): string[] {
  const a = monthIndex(start),
    b = monthIndex(end);
  if (a === null || b === null || b < a) return [];
  const first = Math.ceil(a / 12),
    last = Math.floor(b / 12);
  const years = last - first + 1;
  if (years <= 0) return [];
  const step = [1, 2, 5, 10, 20].find((s) => Math.ceil(years / s) <= max) ?? 50;
  const ticks: string[] = [];
  for (let y = first; y <= last; y++)
    if (y % step === 0) ticks.push(`${y}-01`);
  return ticks;
}
