export type PlaybackCalendar = { months: string[]; month: string };
export type ComparePlaybackPanel = PlaybackCalendar & {
  loading: boolean;
  playing?: boolean;
  error?: string;
  studyKey?: string;
  prepare: (month: string, signal: AbortSignal) => Promise<unknown>;
  commit: (month: string) => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
};
export const commonPlaybackMonths = (a: string[], b: string[]) => {
  const other = new Set(b);
  return [...new Set(a)].filter((month) => other.has(month)).sort();
};
export function playbackTargets(
  a: PlaybackCalendar,
  b: PlaybackCalendar,
  sameMonth: boolean,
  initial: boolean,
) {
  if (a.months.length < 2 || b.months.length < 2) return null;
  const next = (calendar: PlaybackCalendar) =>
    initial
      ? calendar.months.includes(calendar.month)
        ? calendar.month
        : calendar.months[0]
      : calendar.months[
          (calendar.months.indexOf(calendar.month) + 1) % calendar.months.length
        ];
  if (!sameMonth) return { A: next(a), B: next(b) };
  const common = commonPlaybackMonths(a.months, b.months);
  if (common.length < 2) return null;
  const month = initial
    ? common.includes(a.month)
      ? a.month
      : common[0]
    : common[(common.indexOf(a.month) + 1) % common.length];
  return { A: month, B: month };
}
function wait(milliseconds: number, signal: AbortSignal) {
  if (milliseconds <= 0 || signal.aborted) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, milliseconds);
    signal.addEventListener("abort", done, { once: true });
  });
}
/** Prepare both frames before changing either selected date; one clock owns both. */
export async function runComparisonPlayback(
  panels: { A: ComparePlaybackPanel; B: ComparePlaybackPanel },
  {
    sameMonth,
    cadenceMs,
    signal,
    onPreparing,
  }: {
    sameMonth: boolean;
    cadenceMs: number;
    signal: AbortSignal;
    onPreparing: (value: boolean) => void;
  },
) {
  let a: PlaybackCalendar = panels.A,
    b: PlaybackCalendar = panels.B;
  let initial = true;
  try {
    while (!signal.aborted) {
      const targets = playbackTargets(a, b, sameMonth, initial);
      if (!targets)
        throw new Error(
          sameMonth
            ? "At least two common months are needed."
            : "Choose at least two months in both panels.",
        );
      const deadline = Date.now() + (initial ? 0 : cadenceMs);
      onPreparing(true);
      await Promise.all([
        panels.A.prepare(targets.A, signal),
        panels.B.prepare(targets.B, signal),
      ]);
      if (signal.aborted) return;
      onPreparing(false);
      await wait(Math.max(0, deadline - Date.now()), signal);
      if (signal.aborted) return;
      panels.A.commit(targets.A);
      panels.B.commit(targets.B);
      a = { months: a.months, month: targets.A };
      b = { months: b.months, month: targets.B };
      initial = false;
    }
  } finally {
    onPreparing(false);
  }
}
