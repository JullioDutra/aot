import test from 'node:test';
import assert from 'node:assert/strict';
import { stepTrostTitan } from '../src/trost-titan-ai.js';

const idle = () => ({ phase: 'walk', yaw: 0, attackTimer: 0 });
const input = (extra = {}) => ({ position: [0, 0, 0], player: [0, 0, 6], height: 15, index: 0, visible: true, ...extra });
test('occluded targets cannot trigger pursuit or a strike', () => {
  const s = stepTrostTitan(idle(), input({ visible: false }), 1);
  assert.equal(s.phase, 'walk'); assert.equal(s.moving, false);
  const strike = stepTrostTitan({ ...idle(), phase: 'windup', attackTimer: .1 }, input({ visible: false }), .1);
  assert.equal(strike.hit, false); assert.equal(strike.phase, 'recover');
});
test('front attack has a full windup and hits exactly once', () => {
  let s = stepTrostTitan(idle(), input(), .1);
  assert.equal(s.phase, 'windup'); assert.equal(s.attackTimer, .9); assert.equal(s.hit, false);
  s = stepTrostTitan(s, input(), .8); assert.equal(s.hit, false);
  s = stepTrostTitan(s, input(), .11); assert.equal(s.hit, true); assert.equal(s.phase, 'recover');
  s = stepTrostTitan(s, input(), .1); assert.equal(s.hit, false);
});
test('turning toward a rear target does not initiate a backwards attack', () => {
  const s = stepTrostTitan(idle(), input({ player: [0, 0, -6] }), .1);
  assert.equal(s.phase, 'walk'); assert.ok(Math.abs(s.yaw) <= .0551);
});
test('windup locks heading and can be dodged behind, above or out of range', () => {
  const prepared = stepTrostTitan(idle(), input(), .1);
  for (const player of [[0, 0, -6], [0, 13, 6], [0, 0, 12]]) {
    const s = stepTrostTitan(prepared, input({ player }), 1);
    assert.equal(s.yaw, prepared.yaw); assert.equal(s.hit, false); assert.equal(s.phase, 'recover');
  }
});
test('leaving detection range never cancels attack recovery', () => {
  let s = stepTrostTitan(idle(), input(), .1);
  s = stepTrostTitan(s, input({ player: [0, 0, 100] }), 1);
  assert.equal(s.phase, 'recover');
  s = stepTrostTitan(s, input(), .5); assert.equal(s.phase, 'recover');
  s = stepTrostTitan(s, input(), 1); assert.equal(s.phase, 'walk'); assert.equal(s.hit, false);
});
test('pursuit stops at reach and stays inside the authored avenue', () => {
  let s = stepTrostTitan(idle(), input({ player: [0, 0, 30] }), 20);
  assert.deepEqual(s.position, [0, 0, 23]);
  s = stepTrostTitan(idle(), input({ position: [0, 0, 67], player: [0, 0, 90] }), 10);
  assert.equal(s.position[2], 68);
});
test('inactive timestep preserves timers and never deals damage', () => {
  const s = stepTrostTitan({ ...idle(), phase: 'windup', attackTimer: .2 }, input(), 0);
  assert.equal(s.attackTimer, .2); assert.equal(s.hit, false);
});
