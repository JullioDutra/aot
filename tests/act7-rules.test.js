import test from 'node:test';
import assert from 'node:assert/strict';
import { NEST, nestDamage, SPIKE, spikePhase, spikeHits, distanceToSegment, onCord } from '../src/story/act7-rules.js';

test('machine-gun nests in range wear the titan down; moving halves the fire', () => {
  const nests = [{ x: 0, z: 20, alive: true }, { x: 0, z: 200, alive: true }, { x: 10, z: 0, alive: false }];
  assert.equal(nestDamage(nests, [0, 0], 1), NEST.dps);
  assert.equal(nestDamage(nests, [0, 0], 1, true), NEST.dps / 2);
  assert.equal(nestDamage(nests, [500, 0], 1), 0);
});

test('the War Hammer warns before its spikes burst and they only hit inside the circle', () => {
  assert.equal(spikePhase(.2), 'warning');
  assert.equal(spikePhase(SPIKE.warning + .1), 'strike');
  assert.equal(spikePhase(SPIKE.every - .1), 'rest');
  assert.equal(spikePhase(SPIKE.every + .1), 'warning', 'the cycle repeats');
  assert.equal(spikeHits([0, 0], [3, 3]), true);
  assert.equal(spikeHits([0, 0], [8, 0]), false);
});

test('the flesh cord can be followed from the titan to the crystal', () => {
  assert.equal(distanceToSegment([5, 3], [0, 0], [10, 0]), 3);
  assert.equal(distanceToSegment([-4, 0], [0, 0], [10, 0]), 4, 'past the end it measures to the tip');
  assert.equal(onCord([5, 2], [0, 0], [10, 0]), true);
  assert.equal(onCord([5, 9], [0, 0], [10, 0]), false);
});
