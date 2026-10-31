import test from 'node:test';
import assert from 'node:assert/strict';
import { createResume, loadResume, saveResume, clearResume, replayBeats, controlAt, continueTarget, RESUME_KEY } from '../src/campaign/resume.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };

test('a sub-mission checkpoint survives a reload and can be cleared', () => {
  const s = memory();
  const r = createResume(7, { index: 12, mission: { id: 'formacao', title: 'Formação' }, snapshot: { mission: 'formacao', lead: 2 } }, { jean: 'seguir' }, 93.6);
  assert.equal(saveResume(s, r), true);
  assert.deepEqual(loadResume(s), { version: 1, number: 7, index: 12, mission: { id: 'formacao', title: 'Formação' }, snapshot: { mission: 'formacao', lead: 2 }, choices: { jean: 'seguir' }, elapsed: 94 });
  clearResume(s); assert.equal(loadResume(s), null);
});

test('foreign or broken resume data is ignored', () => {
  const s = memory();
  for (const bad of ['{', '{"version":2}', JSON.stringify({ version: 1, number: 99, index: 0, choices: {}, mission: null, snapshot: null }), JSON.stringify({ version: 1, number: 3, index: -1, choices: {}, mission: null, snapshot: null }), JSON.stringify({ version: 1, number: 3, index: 2, choices: null, mission: null, snapshot: null })]) {
    s.setItem(RESUME_KEY, bad); assert.equal(loadResume(s), null, bad);
  }
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(loadResume(blocked), null); assert.equal(saveResume(blocked, {}), false); assert.equal(clearResume(blocked), false);
});

test('resuming replays the world beats before the checkpoint and the control mode there', () => {
  const script = [{ type: 'line' }, { type: 'event', id: 'gate', params: { force: 2 } }, { type: 'control', mode: 'odm' }, { type: 'fixed', id: 'carla' }, { type: 'mission', id: 'b' }, { type: 'event', id: 'later' }];
  assert.deepEqual(replayBeats(script, 4), [{ kind: 'event', id: 'gate', force: 2 }, { kind: 'control', mode: 'odm' }, { kind: 'fixed', id: 'carla' }]);
  assert.equal(controlAt(script, 4), 'odm'); assert.equal(controlAt(script, 0), 'walk');
});

test('Continuar opens the chapter in progress, else the first unfinished playable one', () => {
  const chapters = [{ number: 1, status: 'playable' }, { number: 2, status: 'playable' }, { number: 3, status: 'planned' }];
  assert.deepEqual(continueTarget({ number: 2, mission: { title: 'Fuga' } }, { completed: {} }, chapters), { number: 2, mission: 'Fuga' });
  assert.deepEqual(continueTarget(null, { completed: { 1: {} } }, chapters), { number: 2, mission: null });
  assert.deepEqual(continueTarget(null, { completed: { 1: {}, 2: {} } }, chapters), { number: 1, mission: null });
});
