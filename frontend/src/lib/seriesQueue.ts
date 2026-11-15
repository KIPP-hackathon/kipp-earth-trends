// Shares a two-request budget across all variable charts and comparison panels.
// Removed/inactive charts cancel queued work before it reaches the API.
type Job = { signal: AbortSignal; start: () => void; cancel: () => void };
const pending: Job[] = [];
let running = 0;
function pump() {
  while (running < 2 && pending.length) {
    const job = pending.shift()!;
    if (job.signal.aborted) job.cancel();
    else { running++; job.start(); }
  }
}
export function queuedSeries<T>(signal: AbortSignal, load: () => Promise<T>): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const cancel = () => {
      const index = pending.indexOf(job);
      if (index >= 0) pending.splice(index, 1);
      signal.removeEventListener("abort", cancel);
      reject(signal.reason ?? new DOMException("Cancelled", "AbortError"));
    };
    const job: Job = {signal, cancel, start: () => {
      signal.removeEventListener("abort", cancel);
      void Promise.resolve().then(() => { signal.throwIfAborted(); return load(); })
        .then(resolve, reject).finally(() => { running--; pump(); });
    }};
    signal.addEventListener("abort", cancel, {once:true});
    pending.push(job);
    pump();
  });
}
