import test from "node:test";
import assert from "node:assert/strict";
import { filmRect } from "../src/film-renderer.js";
test("portrait film band preserves the approved vertical position and full width", () => {
  assert.deepEqual(filmRect(390, 844), {
    x: 0,
    y: 270,
    width: 390,
    height: 219.375,
  });
});
test("wide desktop film covers the viewport without stretching", () => {
  const r = filmRect(1920, 900);
  assert.equal(r.x, 0);
  assert.equal(r.y, -90);
  assert.equal(r.width, 1920);
  assert.equal(r.height, 1080);
});
test("taller landscape viewport keeps the original centred crop", () => {
  const r = filmRect(1280, 900);
  assert.equal(r.x, -160);
  assert.equal(r.y, 0);
  assert.equal(r.width, 1600);
  assert.equal(r.height, 900);
});
