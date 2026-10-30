import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitControl, finisherWindow, FINISHER } from '../src/titan-hook.js';

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

test('sideways input on a cable pushes around the anchor, never toward or away from it', () => {
  const position = [10, 5, 0], anchor = [0, 8, 0];
  const right = orbitControl(position, anchor, [1, 0]);
  const radial = [-1, 0, 0];
  assert.ok(Math.abs(dot(right.acceleration, radial)) < 1e-9);
  assert.ok(Math.hypot(...right.acceleration) > 10);
  const left = orbitControl(position, anchor, [-1, 0]);
  assert.ok(dot(left.acceleration, right.acceleration) < 0, 'left and right orbit in opposite directions');
});

test('forward reels the cable in, back lets it out, no input keeps it', () => {
  assert.ok(orbitControl([5, 0, 0], [0, 6, 0], [0, -1]).reel < 0);
  assert.ok(orbitControl([5, 0, 0], [0, 6, 0], [0, 1]).reel > 0);
  assert.equal(orbitControl([5, 0, 0], [0, 6, 0], [0, 0]).reel, 0);
  assert.deepEqual(orbitControl([0, 0, 0], [0, 6, 0], [1, 0]).acceleration, [0, 0, 0], 'straight below the anchor there is no tangent');
});

// A titan at the origin facing +z: its nape is at the back of the neck.
const nape = [0, 12, -.6], facing = [0, 0, 1];

test('the finisher opens behind the nape, close and fast enough', () => {
  const w = finisherWindow([0, 13, -5], [0, 0, 12], nape, facing);
  assert.equal(w.ready, true);
  assert.ok(w.distance < FINISHER.reach);
});

test('the finisher stays closed in front, far, slow, too low or without blades', () => {
  assert.equal(finisherWindow([0, 13, 4], [0, 0, -12], nape, facing).ready, false, 'in front of the face');
  assert.equal(finisherWindow([0, 13, -14], [0, 0, 12], nape, facing).ready, false, 'too far');
  assert.equal(finisherWindow([0, 13, -5], [0, 0, 1], nape, facing).ready, false, 'too slow');
  assert.equal(finisherWindow([0, 2, -5], [0, 0, 12], nape, facing).ready, false, 'down at the ankles');
  assert.equal(finisherWindow([0, 13, -5], [0, 0, 12], nape, facing, { blades: 0 }).ready, false, 'no blades');
});

test('hanging on the titan itself counts as speed', () => {
  assert.equal(finisherWindow([0, 13, -5], [0, 0, 1], nape, facing, { onTitan: true }).ready, true);
});

test('a guarded nape blocks the finisher', () => {
  assert.equal(finisherWindow([0, 13, -5], [0, 0, 12], nape, facing, { guarded: true }).ready, false);
});
