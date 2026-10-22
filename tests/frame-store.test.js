import test from "node:test";
import assert from "node:assert/strict";
import { FrameStore } from "../src/frame-store.js";
const flush = async () => {
  for (let i = 0; i < 8; i++)
    await new Promise((resolve) => setImmediate(resolve));
};
test("latest intended frame supersedes obsolete active fetches", async () => {
  const calls = [],
    pending = new Map();
  const store = new FrameStore(
    (key, signal) =>
      new Promise((resolve, reject) => {
        calls.push(key);
        pending.set(key, resolve);
        signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
    () => {},
    { concurrency: 1 },
  );
  store.plan(["old", "neighbour"]);
  store.plan(["latest"]);
  await flush();
  assert.deepEqual(calls, ["old", "latest"]);
  pending.get("latest")({});
  await flush();
  assert.equal(store.cache.has("latest"), true);
  assert.equal(store.failed.size, 0);
});
test("booking pause blocks all new loads until resumed", async () => {
  let count = 0;
  const store = new FrameStore(
    async () => {
      count++;
      return {};
    },
    () => {},
  );
  store.pause(true);
  store.plan(["a", "b"]);
  await flush();
  assert.equal(count, 0);
  store.pause(false);
  await flush();
  assert.equal(count, 2);
});
test("decoded frame cache closes evicted image bitmaps", async () => {
  let closed = 0;
  const store = new FrameStore(
    async () => ({
      close() {
        closed++;
      },
    }),
    () => {},
    { limit: 2, concurrency: 1 },
  );
  store.plan(["a", "b"]);
  await flush();
  store.plan(["c"]);
  await flush();
  assert.equal(store.cache.size, 2);
  assert.ok(store.cache.has("c"));
  assert.equal(closed, 1);
  store.clear();
  assert.equal(closed, 3);
});
