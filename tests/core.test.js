import test from "node:test";
import assert from "node:assert/strict";
import { seats, totals, segments, locate, journeyLength } from "../src/data.js";
test("inventory has stable unique IDs in every side block and zone", () => {
  assert.equal(seats.length, 72);
  assert.equal(new Set(seats.map((s) => s.id)).size, 72);
  for (const zone of ["front", "middle", "rear"])
    for (const block of ["Left", "Centre", "Right"])
      assert.ok(seats.some((s) => s.zone === zone && s.block === block));
});
test("sample prices and fees remain correct across zones", () => {
  assert.equal(totals(new Set(["A01", "A08", "D03", "G07"])).total, 28800);
  assert.equal(totals(new Set(["A01", "D03", "G07"])).total, 20100);
  assert.equal(totals(new Set()).total, 0);
});
test("unknown and unavailable seats never enter a booking total", () => {
  const invalid = seats
    .filter((s) => s.status === "unavailable")
    .map((s) => s.id);
  assert.equal(totals(new Set([...invalid, "Z99"])).selected.length, 0);
  assert.equal(totals(new Set([...invalid, "A01"])).total, 8700);
});
test("global timeline has no gaps and finishes on a held rear frame", () => {
  assert.equal(segments[0].start, 0);
  for (let i = 1; i < segments.length; i++)
    assert.equal(segments[i].start, segments[i - 1].end);
  assert.equal(locate(journeyLength).clip, 6);
  assert.equal(locate(journeyLength).time, 7.958);
  assert.equal(segments.at(-1).from, segments.at(-1).to);
});
test("reverse positions resolve to same deterministic media ranges", () => {
  const positions = Array.from(
    { length: 101 },
    (_, i) => (journeyLength * i) / 100,
  );
  const forward = positions.map((p) => locate(p));
  const reverse = positions
    .toReversed()
    .map((p) => locate(p))
    .reverse();
  assert.deepEqual(forward, reverse);
  assert.deepEqual(
    new Set(segments.map((s) => s.clip)),
    new Set([1, 2, 3, 4, 5, 6]),
  );
});
