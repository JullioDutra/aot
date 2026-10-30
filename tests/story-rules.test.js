import test from 'node:test';
import assert from 'node:assert/strict';
import { titanIntent, grabReach, titanSpeed, createBalance, balanceStep, createDuel, duelStep, DUEL, cutScore, rivalScore, rankFor, syncGrade, carrySpeed, ROUTES, routeRisk, passesHoop, trainingGas, TRAINING_GAS } from '../src/story/story-rules.js';

test('pure titans chase the nearest prey and grab only what is in reach', () => {
  const titan = { position: [0, 0, 0], height: 10, kind: 'pure' };
  const near = { position: [3, 0, 0] }, far = { position: [30, 0, 0] };
  assert.deepEqual(titanIntent(titan, [far, near]).target, 1);
  assert.equal(titanIntent(titan, [near]).grab, true);
  assert.equal(titanIntent(titan, [{ position: [3, 12, 0] }]).grab, false, 'prey above the shoulders is safe');
  assert.equal(titanIntent(titan, [{ position: [200, 0, 0] }]).target, null);
  assert.ok(grabReach(15) > grabReach(4));
});

test('abnormals run for the crowd instead of the nearest person', () => {
  const crowd = [10, 11, 12, 13].map(z => ({ position: [40, 0, z] }));
  const lone = { position: [8, 0, 0] };
  assert.equal(titanIntent({ position: [0, 0, 0], height: 14, kind: 'pure' }, [lone, ...crowd]).target, 0);
  assert.ok(titanIntent({ position: [0, 0, 0], height: 14, kind: 'abnormal' }, [lone, ...crowd]).target > 0);
  assert.ok(titanSpeed(14, 'abnormal') > titanSpeed(14, 'pure'));
});

test('the broken belt always flips Eren; a good belt can be held', () => {
  let faulty = createBalance();
  for (let i = 0; i < 400 && !faulty.fallen; i++) faulty = balanceStep(faulty, -1, .05, { faulty: true });
  assert.equal(faulty.fallen, true, 'no steering saves the broken belt');
  assert.ok(faulty.time < 12);
  let good = createBalance();
  for (let i = 0; i < 160; i++) good = balanceStep(good, -good.tilt * 3 - good.velocity * 1.5, .05);
  assert.equal(good.fallen, false);
  assert.ok(good.worst < .5);
  let idle = createBalance();
  for (let i = 0; i < 600 && !idle.fallen; i++) idle = balanceStep(idle, 0, .05);
  assert.equal(idle.fallen, true, 'doing nothing falls');
});

test('the hand-to-hand drill rewards waiting for the strike', () => {
  let d = createDuel();
  d = duelStep(d, .2, true);
  assert.equal(d.last, 'whiff');
  d = createDuel();
  d = duelStep(d, DUEL.idle + .01);
  assert.equal(d.phase, 'tell');
  d = duelStep(d, DUEL.tell - DUEL.window + .05, true);
  assert.equal(d.last, 'disarm');
  assert.equal(d.wins, 1);
  let h = createDuel();
  for (let i = 0; i < 60 && !h.hits; i++) h = duelStep(h, .05);
  assert.equal(h.hits, 1, 'an unanswered strike lands');
});

test('forest scoring, Jean and the ranking', () => {
  assert.ok(cutScore(40) > cutScore(5));
  assert.equal(cutScore(10, true), cutScore(10) * 2);
  assert.ok(rivalScore(120) > rivalScore(60));
  assert.ok(rankFor(260) <= 10 && rankFor(40) > 10);
});

test('sync cut, boulder weight and route risk', () => {
  assert.equal(syncGrade(.1), 'perfeito'); assert.equal(syncGrade(-.5), 'bom'); assert.equal(syncGrade(1.2), 'falhou');
  assert.ok(carrySpeed(7, { load: 1 }) < carrySpeed(7, { load: 0 }));
  assert.ok(carrySpeed(7, { load: 1, blocked: 1 }) < carrySpeed(7, { load: 1 }));
  const risk = Object.fromEntries(ROUTES.map(r => [r.id, routeRisk(r)]));
  assert.ok(risk.telhados < risk.avenida, 'the unknown titan clears the rooftop route');
  assert.ok(routeRisk(ROUTES[0], false) > routeRisk(ROUTES[0], true));
});

test('the training course counts a hoop a little past its rim and refills practice tanks on the ground', () => {
  assert.equal(passesHoop([70, 9, -10], [70, 9, -10]), true);
  assert.equal(passesHoop([70, 9 + 4.2, -10], [70, 9, -10]), true);
  assert.equal(passesHoop([70, 9 + 5, -10], [70, 9, -10]), false);
  assert.ok(TRAINING_GAS.rate < 1);
  // Grounded and free: refills; in the air or on a cable: unchanged.
  assert.equal(trainingGas(0, 1, { grounded: true }), TRAINING_GAS.refill);
  assert.equal(trainingGas(90, 1, { grounded: true }), 100);
  assert.equal(trainingGas(10, 1, { grounded: false }), 10);
  assert.equal(trainingGas(10, 1, { grounded: true, attached: true }), 10);
});
