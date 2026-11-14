import { loadFrame } from "./earthApi";
import type { EarthFrame, EarthVariable } from "./earthApi";

// Shared by both comparison panels. Cached arrays stay below 32 MiB; only two
// downloads can run, and a foreground seek can interrupt speculative work.
const budget = 32 * 1024 * 1024;
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
) =>
  `${generation}/${variable.id}/${month}/${bbox ?? "global"}/${JSON.stringify(variable.render ?? null)}`;
const foreground = (job: Job) =>
  [...job.consumers.values()].some(
    (consumer) => consumer.priority === "foreground",
  );
const aborted = () => new DOMException("Consulta cancelada.", "AbortError");
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
  if (active.size >= 2 && queued.some(foreground)) {
    const speculative = [...active].find(
      (job) => !foreground(job) && !job.interrupted,
    );
    if (speculative) {
      speculative.interrupted = true;
      speculative.controller?.abort();
    }
  }
  while (active.size < 2 && queued.length) {
    const job = queued.shift()!;
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
