import test from 'node:test';
import assert from 'node:assert/strict';
import { relaySignal, RELAY_WINDOW, rideSpeed, HORSE, formationGap, inFormation, femaleReaction, napeOpen, createTitanDuel, titanDuelStep, ANNIE, rescueCut, RESCUE_ORDER, createClimb, climbStep } from '../src/story/act3-rules.js';

test('a smoke signal is relayed only with the same colour and in time', () => {
  assert.equal(relaySignal('red', 'red', 2), 'ok');
  assert.equal(relaySignal('red', 'green', 1), 'wrong');
  assert.equal(relaySignal('black', 'black', RELAY_WINDOW + 1), 'late');
});

test('horses ease toward trot, gallop and sprint and stop when reined', () => {
  let s = 0;
  for (let i = 0; i < 100; i++) s = rideSpeed(s, 1, .05);
  assert.ok(Math.abs(s - HORSE.gallop) < .01);
  for (let i = 0; i < 100; i++) s = rideSpeed(s, 1, .05, true);
  assert.ok(Math.abs(s - HORSE.sprint) < .01);
  for (let i = 0; i < 100; i++) s = rideSpeed(s, -1, .05);
  assert.equal(s, 0);
  for (let i = 0; i < 100; i++) s = rideSpeed(s, 0, .05);
  assert.ok(Math.abs(s - HORSE.trot) < .01);
  assert.equal(inFormation(formationGap([0, 0], [6, 8])), true);
  assert.equal(inFormation(formationGap([0, 0], [30, 0])), false);
});

test('the Female Titan guards the nape from behind and strikes what is in front', () => {
  assert.equal(femaleReaction([2, 12, -8]), 'guard');
  assert.equal(femaleReaction([1, 9, 6]), 'swat');
  assert.equal(femaleReaction([1, 1, 2]), 'kick');
  assert.equal(femaleReaction([0, 10, -60]), 'chase');
  assert.equal(femaleReaction([0, 30, 5]), 'chase', 'far above her reach');
  assert.equal(napeOpen('guard'), false);
  assert.equal(napeOpen('guard', true), true, 'a busy hand leaves the nape open');
  assert.equal(napeOpen('swat'), true);
});

test('in the titan duel only punches in her recovery land; dodging avoids the strike', () => {
  let d = createTitanDuel();
  d = titanDuelStep(d, .1, { punch: true });
  assert.equal(d.last, 'blocked');
  assert.equal(d.health, 100 - ANNIE.blocked);
  // Let the tell and strike play out: the blow lands.
  let hit = d; for (let i = 0; i < 40 && hit.last !== 'hit'; i++) hit = titanDuelStep(hit, .05);
  assert.equal(hit.last, 'hit');
  assert.equal(hit.health, 100 - ANNIE.blocked - ANNIE.damage);
  const landed = titanDuelStep(hit, .05, { punch: true });
  assert.equal(landed.last, 'landed');
  assert.equal(landed.landed, 1);
  // A dodge during the strike turns it into an opening.
  let s = { ...createTitanDuel(), phase: 'strike', t: 0 };
  s = titanDuelStep(s, .05, { dodge: true });
  assert.equal(s.last, 'dodged');
  assert.equal(titanDuelStep(s, .05, { punch: true }).last, 'landed');
});

test('Levi cuts eyes, then shoulders, then the mouth', () => {
  assert.equal(rescueCut([], 'boca').ok, false);
  assert.equal(rescueCut([], 'braco-e').reason, 'ela ainda vê');
  let done = [];
  for (const point of RESCUE_ORDER) { const r = rescueCut(done, point); assert.equal(r.ok, true, point); done = r.done; }
  assert.equal(rescueCut(done, 'boca').ok, false);
});

test('Annie climbs the wall; cuts make her slip and both hands make her fall', () => {
  let c = createClimb();
  for (let i = 0; i < 40; i++) c = climbStep(c, 1);
  assert.equal(c.escaped, true, 'left alone she escapes');
  let slow = climbStep(createClimb(), 1, { cut: ['left'] });
  assert.ok(slow.y < createClimb().y);
  assert.equal(slow.falling, false);
  const fall = climbStep(slow, .1, { cut: ['right'] });
  assert.equal(fall.falling, true);
});
