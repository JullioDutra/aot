import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentHitsBox, lineOfSight, GUN, createGunman, gunStep, createHardening, hardenStep, MOUTH, mouthOpen } from '../src/story/act5-rules.js';

test('a building between gunman and target blocks the shot', () => {
  const house = { minX: -2, maxX: 2, minZ: -2, maxZ: 2, top: 10 };
  assert.equal(segmentHitsBox([-10, 2, 0], [10, 2, 0], house), true);
  assert.equal(segmentHitsBox([-10, 14, 0], [10, 14, 0], house), false, 'over the roof');
  assert.equal(segmentHitsBox([-10, 2, 5], [10, 2, 5], house), false, 'beside it');
  assert.equal(lineOfSight([-10, 2, 0], [10, 2, 0], [house]), false);
  assert.equal(lineOfSight([-10, 2, 0], [-5, 2, 0], [house]), true, 'short of the wall');
});

test('a gunman telegraphs, then hits only what is in range and in sight', () => {
  let g = createGunman();
  for (let i = 0; i < 40 && g.phase !== 'aim'; i++) g = gunStep(g, .05, { inRange: true, visible: true });
  assert.equal(g.phase, 'aim');
  let shot = g; for (let i = 0; i < 40 && !shot.fired; i++) shot = gunStep(shot, .05, { inRange: true, visible: false });
  assert.equal(shot.fired, true);
  assert.equal(shot.hit, false, 'behind cover');
  let open = { ...createGunman(), phase: 'aim', t: GUN.aim - .01 };
  open = gunStep(open, .05, { inRange: true, visible: true });
  assert.equal(open.hit, true);
  let far = createGunman();
  for (let i = 0; i < 100; i++) far = gunStep(far, .05, { inRange: false });
  assert.equal(far.phase, 'reload', 'out of range it never aims');
});

test('hardening holds the cavern only with steady presses', () => {
  let h = createHardening();
  for (let i = 0; i < 400 && !h.held && !h.crushed; i++) h = hardenStep(h, .05, i % 3 === 0);
  assert.equal(h.held, true);
  let idle = createHardening();
  for (let i = 0; i < 1000 && !idle.crushed; i++) idle = hardenStep(idle, .05);
  assert.equal(idle.crushed, true);
});

test('the mouth opens on a fixed cycle', () => {
  assert.equal(mouthOpen(.2), true);
  assert.equal(mouthOpen(MOUTH.open + .1), false);
  assert.equal(mouthOpen(MOUTH.period + .1), true);
});
