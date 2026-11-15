import { loadFrame, variableDataKey } from "./earthApi";
import type { EarthFrame, EarthVariable } from "./earthApi";

// Shared by both comparison panels. Cached arrays stay below 64 MiB so a few
// months of every selected layer can be buffered ahead of playback. Four
// downloads can run (the API admits four warehouse scans); speculative work may
// use only two of them and a foreground request can interrupt it.
const budget = 64 * 1024 * 1024;
const maxActive = 4;
const maxBackground = 2;
const lifetimeMs = 5 * 60 * 1000;
const cache = new Map<string, { frame: EarthFrame; expiresAt: number }>();
let cacheBytes = 0;
let generation = 0;
type Priority = "foreground" | "background";
type Consumer = {
  priority: Priority;
  resolve: (frame: EarthFrame) => void;
  reject: (error: unknown) => void;
  detach: () => void;
};
type Job = {
  key: string;
  variable: EarthVariable;
  month: string;
  bbox?: string;
  consumers: Map<symbol, Consumer>;
  controller?: AbortController;
  interrupted: boolean;
};
const jobs = new Map<string, Job>();
const active = new Set<Job>();
export const frameKey = (
  variable: EarthVariable,
  month: string,
  bbox?: string,
) => `${generation}/${variableDataKey(variable)}/${month}/${bbox ?? "global"}`;
const foreground = (job: Job) =>
  [...job.consumers.values()].some(
    (consumer) => consumer.priority === "foreground",
  );
const aborted = () => new DOMException("Request cancelled.", "AbortError");
function removeCached(key: string) {
  const previous = cache.get(key);
  if (!previous) return;
  cacheBytes -=
    previous.frame.values.byteLength + previous.frame.coverage.byteLength;
  cache.delete(key);
}
export function invalidateFrames() {
  generation++;
  cache.clear();
  cacheBytes = 0;
  for (const job of jobs.values()) {
    for (const consumer of job.consumers.values()) {
      consumer.detach();
      consumer.reject(aborted());
    }
    job.consumers.clear();
    job.controller?.abort();
    if (!active.has(job)) jobs.delete(job.key);
  }
}
function remember(key: string, frame: EarthFrame) {
  if (!key.startsWith(`${generation}/`)) return;
  const bytes = frame.values.byteLength + frame.coverage.byteLength;
  if (bytes > budget) return;
  for (const [cachedKey, entry] of cache) {
    if (entry.expiresAt <= Date.now()) removeCached(cachedKey);
  }
  removeCached(key);
  while (cacheBytes + bytes > budget && cache.size) {
    const oldest = cache.keys().next().value!;
    removeCached(oldest);
  }
  cache.set(key, { frame, expiresAt: Date.now() + lifetimeMs });
  cacheBytes += bytes;
}
function pump() {
  const queued = [...jobs.values()].filter(
    (job) => !active.has(job) && job.consumers.size,
  );
  queued.sort((a, b) => Number(foreground(b)) - Number(foreground(a)));
  if (active.size >= maxActive && queued.some(foreground)) {
    const speculative = [...active].find(
      (job) => !foreground(job) && !job.interrupted,
    );
    if (speculative) {
      speculative.interrupted = true;
      speculative.controller?.abort();
    }
  }
  let background = [...active].filter((job) => !foreground(job)).length;
  for (const job of queued) {
    if (active.size >= maxActive) break;
    if (!foreground(job)) {
      if (background >= maxBackground) continue;
      background++;
    }
    start(job);
  }
}
function start(job: Job) {
  active.add(job);
  job.interrupted = false;
  const controller = new AbortController();
  job.controller = controller;
  void loadFrame(
    job.variable.id,
    job.month,
    controller.signal,
    job.variable.render,
    job.bbox,
  )
    .then(
      (frame) => {
        if (controller.signal.aborted) return;
        remember(job.key, frame);
        for (const consumer of job.consumers.values()) {
          consumer.detach();
          consumer.resolve(frame);
        }
        job.consumers.clear();
      },
      (error: unknown) => {
        if (job.interrupted) return;
        for (const consumer of job.consumers.values()) {
          consumer.detach();
          consumer.reject(error);
        }
        job.consumers.clear();
      },
    )
    .finally(() => {
      active.delete(job);
      job.controller = undefined;
      if (!job.consumers.size && jobs.get(job.key) === job)
        jobs.delete(job.key);
      pump();
    });
}
export function requestFrame(
  variable: EarthVariable,
  month: string,
  signal: AbortSignal,
  priority: Priority = "foreground",
  bbox?: string,
): Promise<EarthFrame> {
  if (signal.aborted) return Promise.reject(aborted());
  const key = frameKey(variable, month, bbox);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    cache.delete(key);
    cache.set(key, cached);
    return Promise.resolve(cached.frame);
  }
  if (cached) removeCached(key);
  let job = jobs.get(key);
  if (!job) {
    job = {
      key,
      variable,
      month,
      bbox,
      consumers: new Map(),
      interrupted: false,
    };
    jobs.set(key, job);
  }
  const current = job;
  return new Promise((resolve, reject) => {
    const token = Symbol();
    const cancel = () => {
      current.consumers.delete(token);
      signal.removeEventListener("abort", cancel);
      reject(aborted());
      if (!current.consumers.size) {
        if (active.has(current)) current.controller?.abort();
        else if (jobs.get(key) === current) jobs.delete(key);
      }
    };
    current.consumers.set(token, {
      priority,
      resolve,
      reject,
      detach: () => signal.removeEventListener("abort", cancel),
    });
    signal.addEventListener("abort", cancel, { once: true });
    // Strict Mode may resubscribe before an aborted request settles.
    if (current.controller?.signal.aborted) current.interrupted = true;
    pump();
  });
}
export function followingMonths(
  variable: EarthVariable,
  month: string,
  count = 3,
) {
  const index = variable.months.findIndex((entry) => entry.month === month);
  return Array.from(
    { length: Math.min(count, variable.months.length - 1) },
    (_, offset) =>
      variable.months[(index + offset + 1) % variable.months.length].month,
  );
}

/** The months that follow `index`, wrapping like playback does; never the current month. */
export function upcomingMonths(months: string[], index: number, count: number) {
  const length = Math.max(0, Math.min(Math.floor(count), months.length - 1));
  return Array.from({ length }, (_, offset) => months[(index + offset + 1) % months.length]);
}
/**
 * How many months to buffer before playback starts. `configured` months, but never
 * so many that the layers of the window outgrow the shared frame cache.
 */
export function bufferWindow(configured: number, layers: number, maxFrames = 24) {
  return Math.max(1, Math.min(Math.floor(configured), Math.floor(maxFrames / Math.max(1, layers))));
}

/**
 * Batched look-ahead for globe playback. `requested` holds the months already
 * asked for. While more than `threshold` consecutive months after `index` are
 * requested nothing happens; once the run drops to `threshold` (or the window is
 * empty) the next `batch` months after the run are returned, never wrapping past
 * the current month. Months outside the run are pruned from `requested` so a
 * loop re-requests frames the cache may have evicted.
 */
export function playbackRefill(
  months: string[],
  index: number,
  requested: Set<string>,
  batch: number,
  threshold: number,
) {
  const length = months.length;
  if (length < 2 || index < 0) {
    requested.clear();
    return [];
  }
  let ahead = 0;
  while (ahead < length - 1 && requested.has(months[(index + ahead + 1) % length])) ahead++;
  const run = new Set(upcomingMonths(months, index, ahead));
  for (const month of requested) if (!run.has(month)) requested.delete(month);
  if (ahead > threshold) return [];
  const load = upcomingMonths(months, index + ahead, Math.min(batch, length - 1 - ahead));
  for (const month of load) requested.add(month);
  return load;
}
