import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, CHAPTERS } from '../src/campaign/chapters.js';
import { CHARACTER_SPECS } from '../src/character-specs.js';
import { HOME_SCENES, HOW_TO_PLAY, chapterSummary } from '../src/home-content.js';

test('home summary lists all 47 chapters once, grouped by act and in order', () => {
  const summary = chapterSummary(ACTS, CHAPTERS);
  assert.equal(summary.length, 8);
  const numbers = summary.flatMap(act => act.chapters.map(c => c.number));
  assert.deepEqual(numbers, Array.from({ length: 47 }, (_, i) => i + 1));
  assert.equal(summary[0].label, 'ATO I'); assert.equal(summary[7].label, 'ATO VIII');
  for (const act of summary) for (const c of act.chapters) assert.equal(CHAPTERS.find(x => x.number === c.number).act, act.id);
});

test('playable chapters link to the story mode', () => {
  const summary = chapterSummary(ACTS, CHAPTERS);
  const first = summary[0].chapters[0];
  assert.equal(first.href, './story.html?fase=1');
  const locked = chapterSummary(ACTS, [{ ...CHAPTERS[0], status: 'planned' }]);
  assert.equal(locked[0].chapters[0].href, null);
});

test('home scenes show Eren and Mikasa with existing character specs', () => {
  assert.equal(HOME_SCENES.length, 3);
  for (const scene of HOME_SCENES) {
    assert.ok(scene.cast.some(id => id.startsWith('eren')) && scene.cast.some(id => id.startsWith('mikasa')));
    for (const id of scene.cast) assert.ok(CHARACTER_SPECS[id], id);
  }
});

test('how to play covers keyboard, controller and touch', () => {
  assert.deepEqual(HOW_TO_PLAY.inputs.map(i => i.id), ['keyboard', 'gamepad', 'touch']);
  for (const input of HOW_TO_PLAY.inputs) assert.ok(input.keys.length >= 5);
});
