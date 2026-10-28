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

test('search uses only the last observation, never the hidden player position', () => {
  const observed = stepTrostTitan(idle(), input({ player: [0, 0, 30] }), .1);
  const before = structuredClone(observed);
  const hidden = player => stepTrostTitan(observed, input({ position: observed.position, player, visible: false }), 1);
  const a = hidden([25, 0, -20]), b = hidden([-30, 50, 80]);
  assert.deepEqual(a, b); assert.deepEqual(observed, before);
  assert.equal(a.awareness, 'searching'); assert.equal(a.memory, 4);
  assert.deepEqual(a.lastSeen, [0, 0, 30]); assert.ok(a.position[2] > observed.position[2]);
  assert.equal(a.hit, false); assert.equal(a.phase, 'walk');
});
test('memory expires, freezes with pause and is renewed only by valid detection', () => {
  const observed = stepTrostTitan(idle(), input({ player: [0, 0, 30] }), .1);
  const hidden = input({ position: observed.position, player: [0, 0, 100] });
  const paused = stepTrostTitan(observed, hidden, 0);
  assert.equal(paused.memory, 5); assert.deepEqual(paused.lastSeen, observed.lastSeen);
  const expired = stepTrostTitan(observed, hidden, 5);
  assert.equal(expired.awareness, 'idle'); assert.equal(expired.lastSeen, null); assert.equal(expired.moving, false);
  const found = stepTrostTitan(expired, input({ player: [0, 0, 20] }), .1);
  assert.equal(found.awareness, 'tracking'); assert.equal(found.memory, 5); assert.deepEqual(found.lastSeen, [0, 0, 20]);
});
test('search reaches the avenue projection and waits without attacking a hidden nearby target', () => {
  const state = { ...idle(), lastSeen: [30, 0, 10], memory: 5 };
  const s = stepTrostTitan(state, input({ position: [9, 0, 9.8], player: [9, 0, 10], visible: false }), .1);
  assert.equal(s.moving, false); assert.equal(s.phase, 'walk'); assert.equal(s.hit, false);
  assert.equal(s.awareness, 'searching');
});
test('recovery and windup still finish when search memory expires', () => {
  const state = { ...idle(), phase: 'windup', attackTimer: .1, lastSeen: [0, 0, 6], memory: .1 };
  const s = stepTrostTitan(state, input({ visible: false }), .2);
  assert.equal(s.phase, 'recover'); assert.equal(s.hit, false); assert.equal(s.lastSeen, null);
  const recovered = stepTrostTitan(s, input({ visible: false }), 2);
  assert.equal(recovered.phase, 'walk'); assert.equal(recovered.moving, false);
});
test('visible but unreachable altitude does not refresh the last observation', () => {
  const state = { ...idle(), lastSeen: [0, 0, 20], memory: 3 };
  const s = stepTrostTitan(state, input({ player: [0, 50, 6] }), 1);
  assert.equal(s.memory, 2); assert.deepEqual(s.lastSeen, [0, 0, 20]); assert.equal(s.awareness, 'searching');
});
