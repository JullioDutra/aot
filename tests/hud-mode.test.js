import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMinimalHud, saveMinimalHud, HUD_KEY } from '../src/hud-mode.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('the clean screen choice persists and defaults to the full HUD', () => {
  const s = memory();
  assert.equal(loadMinimalHud(s), false);
  assert.equal(saveMinimalHud(s, true), true); assert.equal(s.getItem(HUD_KEY), '1'); assert.equal(loadMinimalHud(s), true);
  saveMinimalHud(s, false); assert.equal(loadMinimalHud(s), false);
});

test('blocked storage keeps the full HUD without throwing', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadMinimalHud(blocked), false); assert.equal(saveMinimalHud(blocked, true), false);
  assert.equal(loadMinimalHud(undefined), false);
});
