import test from 'node:test';
import assert from 'node:assert/strict';
import { stick, createGamepadInput } from '../src/gamepad-input.js';
const pad = (pressed = [], axes = [0, 0, 0, 0]) => ({ index: 0, id: 'test', connected: true, mapping: 'standard', axes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })) });
test('radial deadzone removes drift and preserves partial analog magnitude', () => {
  assert.deepEqual(stick(.1, .1), [0, 0]);
  const half = stick(.5, 0); assert.ok(half[0] > 0 && half[0] < .5);
  assert.ok(Math.abs(Math.hypot(...stick(1, 1)) - 1) < 1e-10);
  assert.deepEqual(stick(NaN, 1), [0, 0]);
});
test('actions fire on press edges and cable triggers remain held independently', () => {
  const input = createGamepadInput(); input.sample([pad()]);
  const first = input.sample([pad([2, 6])]); assert.equal(first.pressed.attack, true); assert.equal(first.held.left, true); assert.equal(first.held.right, false);
  const held = input.sample([pad([2, 6])]); assert.equal(held.pressed.attack, false); assert.equal(held.held.left, true);
  input.sample([pad()]); assert.equal(input.sample([pad([2])]).pressed.attack, true);
});
test('pause requires neutral sticks and buttons before gameplay can resume', () => {
  const input = createGamepadInput(); input.sample([pad()]); input.suspend();
  let s = input.sample([pad([0, 6], [1, 0, 0, 0])]); assert.equal(s.armed, false); assert.deepEqual(s.move, [0, 0]); assert.equal(s.held.left, undefined);
  s = input.sample([pad([9])]); assert.equal(s.pressed.menu, true); assert.equal(s.armed, false);
  assert.equal(input.sample([pad()]).armed, true); assert.equal(input.sample([pad([0])]).pressed.jump, true);
});
test('disconnect clears held inputs and replacement controllers require neutral', () => {
  const input = createGamepadInput(); input.sample([pad()]); input.sample([pad([6])]);
  const disconnected = input.sample([]); assert.equal(disconnected.lost, true); assert.deepEqual(disconnected.held, {});
  assert.equal(input.sample([pad([6])]).armed, false);
  input.sample([pad()]); const replacement = { ...pad([2]), index: 1, id: 'other' };
  assert.equal(input.sample([replacement]).lost, true);
});
test('missing API data and nonstandard mappings are ignored', () => {
  const input = createGamepadInput(); assert.equal(input.sample().connected, false);
  assert.equal(input.sample([null, { ...pad(), mapping: '' }]).connected, false);
});
