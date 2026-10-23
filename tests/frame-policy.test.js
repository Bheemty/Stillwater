import test from 'node:test';
import assert from 'node:assert/strict';
import { locate, segments } from '../src/data.js';
import { frameWindow, displayedPosition, boundaryFrames } from '../src/frame-policy.js';

test('prediction follows forward and reverse movement without adding playhead lag', () => {
  assert.equal(frameWindow(1, 100, 50, .12)[0], 106);
  assert.equal(frameWindow(1, 100, -50, .12)[0], 94);
  assert.ok(frameWindow(1, 100, 50).includes(100));
  assert.equal(frameWindow(1, 100, 0)[0], 100);
});
test('frame windows remain unique and within each source', () => {
  for (const [clip, max] of [[1,480],[2,240],[3,192],[6,192]]) {
    for (const frame of [1, max]) for (const velocity of [-900,0,900]) {
      const frames = frameWindow(clip, frame, velocity);
      assert.equal(new Set(frames).size, frames.length);
      assert.ok(frames.every(f => f >= 1 && f <= max));
    }
  }
});
test('join preparation uses the approved trimmed turn and seating frames', () => {
  assert.ok(boundaryFrames(segments[6]).some(e=>e.c===5 && e.f===4));
  assert.ok(boundaryFrames(segments[7]).some(e=>e.c===4 && e.f===151));
});
test('late loaded footage retains its own scene rather than showing future text', () => {
  assert.equal(displayedPosition(locate(1.8), 20).scene, 'arrival');
  assert.equal(displayedPosition(locate(1), 400).scene, 'lobby');
  const hold = locate(segments[8].start + .3);
  assert.equal(displayedPosition(hold, 63).scene, 'front');
});
