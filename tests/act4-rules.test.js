import test from 'node:test';
import assert from 'node:assert/strict';
import { aimTarget, blindTime, createSiege, siegeStep, createArmoredDuel, armoredStep, ARMORED, createArmlock, armlockStep, ARMLOCK } from '../src/story/act4-rules.js';

test('the bow picks the nearest titan inside the cone ahead', () => {
  // yaw 0 looks toward -z.
  const targets = [[0, -30], [0, -12], [20, -5], [0, 20]];
  assert.equal(aimTarget([0, 0], 0, targets), 1);
  assert.equal(aimTarget([0, 0], Math.PI, targets), 3, 'turned around');
  assert.equal(aimTarget([0, 0], Math.PI / 2, [[0, -30]]), -1, 'nothing in the cone');
  assert.equal(aimTarget([0, 0], 0, [[0, -80]]), -1, 'out of range');
  assert.ok(blindTime(1) > blindTime(2));
});

test('the tower falls if no one stabs the climbers; stabbing holds it', () => {
  let s = createSiege();
  for (let i = 0; i < 400 && s.breached < 0; i++) s = siegeStep(s, .1);
  assert.ok(s.breached >= 0);
  assert.ok(s.time < 25);
  let held = createSiege();
  for (let i = 0; i < 400; i++) { const worst = held.climbers.reduce((b, c, k) => (c.progress > held.climbers[b].progress ? k : b), 0); held = siegeStep(held, .1, i % 10 === 0 ? worst : -1); }
  assert.equal(held.breached, -1);
  assert.ok(held.stabs > 0);
});

test('against the Armored Titan, punches clang and sidestepping opens a takedown', () => {
  let d = armoredStep(createArmoredDuel(), .1, { punch: true });
  assert.equal(d.last, 'clang');
  assert.equal(d.health, 100);
  let hit = d; for (let i = 0; i < 80 && hit.last !== 'hit'; i++) hit = armoredStep(hit, .05);
  assert.equal(hit.health, 100 - ARMORED.damage);
  let s = { ...createArmoredDuel(), phase: 'charge', t: 0 };
  s = armoredStep(s, .05, { dodge: true });
  assert.equal(s.phase, 'overextended');
  s = armoredStep(s, .05, { grab: true });
  assert.equal(s.last, 'takedown');
  assert.equal(s.takedowns, 1);
  assert.equal(armoredStep({ ...createArmoredDuel(), phase: 'stance' }, .05, { grab: true }).takedowns, 0, 'grabbing a guarded Reiner does nothing');
});

test('the arm lock tears with steady pressure and fails if Reiner can scream', () => {
  let a = createArmlock();
  for (let i = 0; i < 300 && !a.torn; i++) a = armlockStep(a, .05, i % 2 === 0);
  assert.equal(a.torn, true);
  let idle = createArmlock();
  for (let i = 0; i < 400 && !idle.screamed; i++) idle = armlockStep(idle, .05, i % 9 === 0);
  assert.equal(idle.screamed, true);
  assert.ok(ARMLOCK.time > 5);
});
