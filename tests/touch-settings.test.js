import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTouchSettings, loadTouchSettings, saveTouchSettings, TOUCH_DEFAULTS, TOUCH_SETTINGS_KEY } from '../src/touch-settings.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('touch settings default to medium, opaque, right-handed and latched cables', () => {
  assert.deepEqual(loadTouchSettings(memory()), { ...TOUCH_DEFAULTS });
  assert.deepEqual(TOUCH_DEFAULTS, { size: 'm', opacity: 1, leftHanded: false, latch: true });
});

test('saved choices come back and invalid values fall back or clamp', () => {
  const s = memory();
  saveTouchSettings(s, { size: 'l', opacity: '0.6', leftHanded: true, latch: false });
  assert.deepEqual(loadTouchSettings(s), { size: 'l', opacity: .6, leftHanded: true, latch: false });
  assert.deepEqual(normalizeTouchSettings({ size: 'xl', opacity: 0, leftHanded: 'sim', latch: null }), { size: 'm', opacity: .4, leftHanded: false, latch: true });
  s.setItem(TOUCH_SETTINGS_KEY, '{broken'); assert.deepEqual(loadTouchSettings(s), { ...TOUCH_DEFAULTS });
});

test('blocked storage keeps the defaults without throwing', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadTouchSettings(blocked), { ...TOUCH_DEFAULTS }); assert.equal(saveTouchSettings(blocked, TOUCH_DEFAULTS), false);
});
