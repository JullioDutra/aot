import test from 'node:test';
import assert from 'node:assert/strict';
import { latchTap, latchSync } from '../src/touch-controls.js';

test('a tap on a free cable fires and latches it', () => {
  assert.deepEqual(latchTap(false), { latched: true, press: true });
});

test('a tap on a latched cable lets go without firing again', () => {
  assert.deepEqual(latchTap(true), { latched: false, press: false });
});

test('a latched cable stays only while the game still hooks it', () => {
  assert.equal(latchSync(true, true), true);
  assert.equal(latchSync(true, false), false);
  assert.equal(latchSync(true, undefined), false);
  assert.equal(latchSync(false, true), false);
});
