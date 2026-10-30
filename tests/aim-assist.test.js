import test from 'node:test';
import assert from 'node:assert/strict';
import { aimOffsets } from '../src/aim-assist.js';

test('the bare reticle tries only the center', () => {
  assert.deepEqual(aimOffsets(1, 0), [[0, 0]]);
});

test('the assisted search keeps the small five-point pattern on the cable side', () => {
  const offsets = aimOffsets(-1, 1);
  assert.equal(offsets.length, 5);
  assert.ok(offsets.every(([x]) => x <= 0), 'left cable searches to the left');
});

test('touch searches wider rings, nearest first, starting at the reticle', () => {
  const offsets = aimOffsets(1, 2);
  assert.deepEqual(offsets[0], [0, 0]);
  assert.equal(offsets.length, 25);
  const radii = offsets.map(([x, y]) => Math.hypot(x, y));
  for (let i = 1; i < radii.length; i++) assert.ok(radii[i] >= radii[i - 1] - 1e-9);
  assert.ok(Math.max(...radii) > .12 && Math.max(...radii) < .14);
});
