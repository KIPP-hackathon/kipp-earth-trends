// Session-only cache for public JSON reads. Never stores errors or assistant replies.
export class EarthReadCache {
  private entries = new Map<
    string,
    { json: string; bytes: number; expires: number }
  >();
  private pending = new Map<
    string,
    { controller: AbortController; promise: Promise<unknown>; users: number }
  >();
  private bytes = 0;
  private generation = 0;

  constructor(
    private maxBytes = 4 * 1024 * 1024,
    private maxEntries = 80,
  ) {}

  clear() {
    this.generation++;
    this.entries.clear();
    this.bytes = 0;
    for (const request of this.pending.values()) request.controller.abort();
    this.pending.clear();
  }

  async read<T>(
    key: string,
    signal: AbortSignal,
    ttl: number,
    load: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    signal.throwIfAborted();
    for (const [id, entry] of this.entries) {
      if (entry.expires <= Date.now()) this.remove(id);
    }
    const cached = this.entries.get(key);
    if (cached) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return JSON.parse(cached.json) as T;
    }
    let request = this.pending.get(key);
    if (!request || request.controller.signal.aborted) {
      const controller = new AbortController();
      const generation = this.generation;
      const current = {
        controller,
        users: 0,
        promise: Promise.resolve() as Promise<unknown>,
      };
      current.promise = Promise.resolve()
        .then(() => {
          controller.signal.throwIfAborted();
          return load(controller.signal);
        })
        .then((value) => {
          controller.signal.throwIfAborted();
          const json = JSON.stringify(value);
          const bytes = new TextEncoder().encode(json).byteLength;
          if (generation === this.generation && bytes <= this.maxBytes) {
            this.remove(key);
            while (
              this.entries.size &&
              (this.bytes + bytes > this.maxBytes ||
                this.entries.size >= this.maxEntries)
            ) {
              this.remove(this.entries.keys().next().value!);
            }
            this.entries.set(key, { json, bytes, expires: Date.now() + ttl });
            this.bytes += bytes;
          }
          return json;
        })
        .finally(() => {
          if (this.pending.get(key) === current) this.pending.delete(key);
        });
      request = current;
      this.pending.set(key, request);
    }
    const current = request;
    current.users++;
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return false;
        settled = true;
        signal.removeEventListener("abort", abort);
        current.users--;
        if (!current.users) current.controller.abort();
        return true;
      };
      const abort = () => {
        if (finish()) reject(signal.reason);
      };
      signal.addEventListener("abort", abort, { once: true });
      current.promise.then(
        (json) => {
          if (finish()) resolve(JSON.parse(json as string) as T);
        },
        (error: unknown) => {
          if (finish()) reject(error);
        },
      );
    });
  }

  private remove(key: string) {
    const previous = this.entries.get(key);
    if (previous) this.bytes -= previous.bytes;
    this.entries.delete(key);
  }
}

export const earthReadCache = new EarthReadCache();
