import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, CHAPTERS, chapter } from '../src/campaign/chapters.js';
import { CHARACTERS, powerAvailable, aliveIn } from '../src/campaign/characters.js';
import { validateCampaign, resolveDecision, campaignStats } from '../src/campaign/canon.js';
import { emptyProgress, loadProgress, saveProgress, completeChapter, rateRun, chapterAvailability, PROGRESS_KEY } from '../src/campaign/progress.js';

test('the campaign plan respects every fidelity rule', () => {
  assert.deepEqual(validateCampaign(CHAPTERS, ACTS), []);
});

test('the plan covers the 47 chapters across eight acts and the reference scenes', () => {
  assert.equal(CHAPTERS.length, 47);
  assert.deepEqual([...new Set(CHAPTERS.map(c => c.act))], [1, 2, 3, 4, 5, 6, 7, 8]);
  const videos = CHAPTERS.flatMap(c => c.videoRefs ?? []);
  for (const id of ['rhjl6UOhcP0', 'mzQkTmXas-M', 'IqyPB0WCgM4', 'JNk6ARuIQYc', '0EewLaBMxT4', 'IH-xPmiCGBo', 'EhSGVBkVX6I', 'p1GHM-L0RAs', '6FSpfuG63sI', 'Hg4dmuJF-A0', 'F96R5Qk3L94']) assert.ok(videos.includes(id), id);
  assert.ok(chapter(1).missions[0].title.includes('árvore'), 'the story opens under the tree');
  const levi = chapter(32);
  assert.deepEqual(levi.missions.map(x => x.id), ['acordo', 'discurso', 'carga', 'linha', 'bestial', 'carroca']);
});

test('powers follow the canonical timeline', () => {
  assert.equal(powerAvailable('eren', 'hardening', 26), false);
  assert.equal(powerAvailable('eren', 'hardening', 27), true);
  assert.equal(powerAvailable('eren', 'coordinateGlimpse', 24), true);
  assert.equal(powerAvailable('eren', 'coordinateGlimpse', 25), false);
  assert.equal(powerAvailable('armin', 'colossalTitan', 33), false);
  assert.equal(powerAvailable('falco', 'falcoFlight', 45), false);
  assert.equal(powerAvailable('mikasa', 'attackTitan', 10), false);
});

test('the validator catches broken fidelity', () => {
  const base = structuredClone(CHAPTERS);
  base[9].powers.eren = ['hardening'];
  base[30].present.push('erwin', 'carla');
  base[1].fixed = base[1].fixed.filter(f => f.who !== 'carla');
  base[6].decisions.push({ id: 'x', prompt: '?', options: [{ id: 'a', label: 'Salvar Thomas da morte', reflection: 'r' }, { id: 'b', label: 'b', reflection: 'r' }], resolves: 'y' });
  const errors = validateCampaign(base, ACTS).join('\n');
  assert.match(errors, /eren não possui hardening/);
  assert.match(errors, /carla já morreu/);
  assert.match(errors, /carla: morte canônica na fase 2 sem encenação/);
  assert.match(errors, /promete evitar uma morte fixa/);
});

test('every decision converges to its single canonical outcome', () => {
  for (const c of CHAPTERS) for (const d of c.decisions) {
    const outcomes = new Set(d.options.map(o => resolveDecision(d, o.id).outcome));
    assert.deepEqual([...outcomes], [d.resolves], `${c.number}/${d.id}`);
  }
  const serum = chapter(34).decisions[0];
  assert.equal(resolveDecision(serum, 'erwin').outcome, 'armin-recebe-o-soro');
});

test('dead characters stay dead outside flashbacks', () => {
  assert.equal(aliveIn('carla', 2), true);
  assert.equal(aliveIn('carla', 3), false);
  assert.equal(aliveIn('carla', 30, true), true);
  assert.equal(aliveIn('levi', 47), true);
  assert.equal(CHARACTERS.erwin.death, 34);
});

test('campaign stats summarize the plan', () => {
  const stats = campaignStats(CHAPTERS);
  assert.equal(stats.chapters, 47);
  assert.ok(stats.missions >= 130, `missions ${stats.missions}`);
  assert.equal(stats.fixedDeaths, Object.values(CHARACTERS).filter(c => c.death !== undefined).length);
});

test('progress persists, keeps the best run and survives broken storage', () => {
  const memory = new Map();
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  let progress = loadProgress(storage);
  assert.deepEqual(progress, emptyProgress());
  progress = completeChapter(progress, 1, { time: 300, rating: 'B', decisions: { tropa: 'defender' }, challenges: ['marcos'] });
  progress = completeChapter(progress, 1, { time: 280, rating: 'C', challenges: ['ritmo'] });
  assert.deepEqual(progress.completed[1], { time: 300, rating: 'B' });
  assert.deepEqual(progress.challenges[1], ['marcos', 'ritmo']);
  assert.ok(saveProgress(storage, progress));
  assert.deepEqual(loadProgress(storage), progress);
  memory.set(PROGRESS_KEY, '{broken');
  assert.deepEqual(loadProgress(storage), emptyProgress());
  assert.equal(saveProgress({ setItem() { throw new Error('quota'); } }, progress), false);
  assert.deepEqual(loadProgress(null), emptyProgress());
});

test('ratings reward execution without depending on equipment', () => {
  assert.equal(rateRun({ time: 50, par: 60, damage: 0, challenges: 1 }), 'S');
  assert.equal(rateRun({ time: 100, par: 60, damage: 80 }), 'C');
  assert.equal(rateRun({ time: 70, par: 60 }), 'B');
  assert.equal(chapterAvailability({ status: 'planned' }), 'locked');
  assert.equal(chapterAvailability({ status: 'playable' }), 'open');
});
