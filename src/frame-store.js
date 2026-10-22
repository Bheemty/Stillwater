// Latest-window scheduling: cancel obsolete fetches; bound fetch/decode work and memory.
export class FrameStore {
  constructor(load, changed, { limit = 26, concurrency = 2 } = {}) {
    this.load = load;
    this.changed = changed;
    this.limit = limit;
    this.concurrency = concurrency;
    this.cache = new Map();
    this.active = new Map();
    this.failed = new Set();
    this.queue = [];
    this.wanted = new Set();
    this.paused = false;
    this.generation = 0;
  }
  plan(keys) {
    this.wanted = new Set(keys);
    for (const [key, task] of this.active)
      if (!this.wanted.has(key)) task.abort();
    this.queue = [...this.wanted].filter(
      (k) => !this.cache.has(k) && !this.failed.has(k),
    );
    this.pump();
  }
  pump() {
    if (this.paused) return;
    while (this.active.size < this.concurrency && this.queue.length) {
      const key = this.queue.shift();
      if (this.cache.has(key) || this.active.has(key)) continue;
      const controller = new AbortController(),
        generation = this.generation;
      this.active.set(key, controller);
      this.load(key, controller.signal)
        .then((image) => {
          if (generation !== this.generation || controller.signal.aborted) {
            image.close?.();
            return;
          }
          this.cache.set(key, image);
          const priority = [...this.wanted];
          const ranked = [...this.cache.keys()].sort((a, b) => {
            const ai = priority.indexOf(a),
              bi = priority.indexOf(b);
            return (ai < 0 ? 1e6 : ai) - (bi < 0 ? 1e6 : bi);
          });
          for (const old of ranked.slice(this.limit)) {
            this.cache.get(old)?.close?.();
            this.cache.delete(old);
          }
        })
        .catch((error) => {
          if (generation === this.generation && error.name !== "AbortError")
            this.failed.add(key);
        })
        .finally(() => {
          this.active.delete(key);
          // An aborted key may have become current again while abort completed.
          if (
            this.wanted.has(key) &&
            !this.cache.has(key) &&
            !this.failed.has(key) &&
            !this.queue.includes(key)
          )
            this.queue.unshift(key);
          this.changed();
          this.pump();
        });
    }
  }
  pause(value) {
    this.paused = value;
    if (value) {
      for (const controller of this.active.values()) controller.abort();
    } else this.pump();
  }
  clear() {
    this.generation++;
    for (const controller of this.active.values()) controller.abort();
    for (const image of this.cache.values()) image.close?.();
    this.cache.clear();
    this.queue = [];
    this.wanted.clear();
    this.failed.clear();
  }
}
