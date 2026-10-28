import test from 'node:test';
import assert from 'node:assert/strict';
import { beginBladeStrike, createBladeStrike, stepBladeStrike, bladeStrikePhase, bladeStrikePose, BLADE_IMPACT } from '../src/blade-strike.js';

test('strike spends blades once and refuses input during recovery or without blades', () => {
  const start = beginBladeStrike(createBladeStrike(), 100);
  assert.equal(start.accepted, true); assert.equal(start.cost, 5);
  assert.equal(beginBladeStrike(start.state, 95).accepted, false);
  assert.equal(beginBladeStrike(createBladeStrike(), 0).accepted, false);
  assert.equal(beginBladeStrike(createBladeStrike(), 2).cost, 2);
});
test('impact happens after preparation, exactly once including coarse timesteps', () => {
  let s = beginBladeStrike(createBladeStrike(), 100).state;
  let step = stepBladeStrike(s, .1); assert.equal(step.impact, false);
  step = stepBladeStrike(step.state, .061); assert.equal(step.impact, true);
  step = stepBladeStrike(step.state, .1); assert.equal(step.impact, false);
  assert.equal(bladeStrikePhase(step.state), 'recover');
  step = stepBladeStrike(step.state, 1); assert.equal(step.impact, false); assert.equal(bladeStrikePhase(step.state), 'ready');
  assert.equal(stepBladeStrike(s, 2).impact, true);
});
test('pause preserves the pending impact and cancellation cannot deal damage later', () => {
  const s = { active: true, time: .1 };
  assert.deepEqual(stepBladeStrike(s, 0), { state: s, impact: false });
  assert.equal(stepBladeStrike(createBladeStrike(), 1).impact, false);
});
test('different frame rates produce one impact per swing and the same completed state', () => {
  for (const rate of [20, 30, 60, 120]) {
    let s = beginBladeStrike(createBladeStrike(), 10).state, impacts = 0;
    for (let i = 0; i < rate; i++) { const step = stepBladeStrike(s, 1 / rate); s = step.state; impacts += Number(step.impact); }
    assert.equal(impacts, 1); assert.equal(s.active, false);
  }
});
test('pose mirrors the arms and reaches the cut at the impact timestamp', () => {
  const s = { active: true, time: BLADE_IMPACT };
  const left = bladeStrikePose(s, -1), right = bladeStrikePose(s, 1);
  assert.equal(left.x, -.7); assert.equal(left.x, right.x); assert.equal(left.z, -right.z); assert.ok(left.trail > 0);
  assert.deepEqual(bladeStrikePose(createBladeStrike(), 1, -1.7), { x: -1.7, z: 0, trail: 0 });
});
