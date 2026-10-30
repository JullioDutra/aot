import test from 'node:test';
import assert from 'node:assert/strict';
import { noiseStep, tooLoud, ROCKS, rockPlan, SPEARS, detonate, GRIP, createGrip, gripStep } from '../src/story/act6-rules.js';

test('running in the dark gets loud; walking lets the noise fade', () => {
  let n = 0;
  for (let i = 0; i < 80; i++) n = noiseStep(n, .05, 'run');
  assert.equal(tooLoud(n), true);
  for (let i = 0; i < 200; i++) n = noiseStep(n, .05, 'walk');
  assert.equal(n, 0);
  let calm = 0; for (let i = 0; i < 400; i++) calm = noiseStep(calm, .05, i % 4 ? 'walk' : 'run');
  assert.equal(tooLoud(calm), false, 'short bursts are fine');
});

test('each rock is announced by its shadow before it lands on one herd', () => {
  const a = rockPlan(6, .5);
  assert.equal(a.warning, true);
  assert.equal(a.landsAt, ROCKS.warning);
  assert.equal(rockPlan(6, ROCKS.warning + .5).warning, false);
  const herds = new Set(Array.from({ length: 12 }, (_, i) => rockPlan(6, i * ROCKS.every).herd));
  assert.ok(herds.size >= 4, 'the Beast spreads its rocks');
});

test('thunder spears open the armor once enough go off; the window decides the challenge', () => {
  assert.equal(detonate([0, 1, 2]).opened, false);
  const together = detonate([10, 10.2, 10.4, 10.5, 10.9, 11.1]);
  assert.deepEqual(together, { opened: true, together: true });
  assert.equal(detonate([1, 2, 3, 4, 5, 6]).together, false);
  assert.equal(SPEARS.needed, 6);
});

test('Armin falls if he stops tightening his grip, and holds with steady presses', () => {
  let s = createGrip();
  for (let i = 0; i < 200 && !s.fell; i++) s = gripStep(s, .05);
  assert.equal(s.fell, true);
  let h = createGrip();
  for (let i = 0; i < 1000 && !h.held && !h.fell; i++) h = gripStep(h, .05, i % 3 === 0);
  assert.equal(h.held, true);
  assert.ok(h.time >= GRIP.hold);
});
