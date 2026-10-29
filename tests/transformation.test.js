import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransform, transformationPhase, lightningBolt, seeded, TIMELINE } from '../src/transformation.js';

test('transformations respect who holds the power and when', () => {
  assert.equal(canTransform({ character: 'eren', chapter: 10, wounded: true, intent: true }).allowed, true);
  assert.equal(canTransform({ character: 'eren', chapter: 9, wounded: true, intent: true }).allowed, false);
  assert.equal(canTransform({ character: 'armin', chapter: 33, wounded: true, intent: true }).allowed, false);
  assert.equal(canTransform({ character: 'armin', chapter: 38, wounded: true, intent: true }).allowed, true);
  assert.equal(canTransform({ character: 'mikasa', chapter: 30, wounded: true, intent: true }).allowed, false);
  assert.equal(canTransform({ character: 'ymir', chapter: 25, wounded: true, intent: true }).allowed, false);
});

test('intent, wound, fatigue, limit and space all gate the transformation', () => {
  const base = { character: 'eren', chapter: 12, wounded: true, intent: true };
  assert.match(canTransform({ ...base, intent: false }).reasons.join(), /intenção/);
  assert.match(canTransform({ ...base, wounded: false }).reasons.join(), /ferir-se/);
  assert.match(canTransform({ ...base, fatigue: 3 }).reasons.join(), /Exausto/);
  assert.match(canTransform({ ...base, used: 2 }).reasons.join(), /Limite/);
  assert.match(canTransform({ ...base, space: 'interior' }).reasons.join(), /fechado/);
  assert.equal(canTransform({ character: 'eren', chapter: 24, scripted: true }).allowed, true);
});

test('the timeline goes wound → spark → bolt → flash → form and grows monotonically', () => {
  const order = [];
  let growth = 0;
  for (let t = 0; t <= 2.4; t += .05) {
    const p = transformationPhase(t);
    if (order.at(-1) !== p.phase) order.push(p.phase);
    assert.ok(p.growth >= growth - 1e-9); growth = p.growth;
    for (const v of [p.bolt, p.flash, p.shock, p.growth, p.steam]) assert.ok(v >= 0 && v <= 1);
  }
  assert.deepEqual(order, ['wound', 'spark', 'bolt', 'flash', 'form', 'done']);
  assert.ok(transformationPhase(TIMELINE.bolt + .05).bolt > .9);
  assert.equal(transformationPhase(0).bolt, 0);
  assert.equal(transformationPhase(TIMELINE.done).growth, 1);
  // A compressed duration keeps the same order at proportional times.
  assert.equal(transformationPhase(.6, 1.1).phase, transformationPhase(1.2).phase);
});

test('lightning is deterministic, branched and lands on the target', () => {
  const a = lightningBolt(42, [0, 50, 0], [0, 0, 0]), b = lightningBolt(42, [0, 50, 0], [0, 0, 0]), c = lightningBolt(43, [0, 50, 0], [0, 0, 0]);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.length, 5);
  assert.deepEqual(a[0].points[0], [0, 50, 0]);
  assert.deepEqual(a[0].points.at(-1), [0, 0, 0]);
  assert.equal(a[0].points.length, 2 ** 6 + 1);
  for (const branch of a.slice(1)) assert.ok(branch.points.at(-1)[1] < branch.points[0][1], 'forks travel downward');
  const r = seeded(7); const values = Array.from({ length: 50 }, r);
  assert.ok(values.every(v => v >= 0 && v < 1));
});
