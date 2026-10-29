import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoryState, stepStory, validateScript } from '../src/story/engine.js';
import { SCRIPTS, PLACES } from '../src/story/shiganshina-script.js';
import { chapter } from '../src/campaign/chapters.js';

const decisionsOf = n => Object.fromEntries(chapter(n).decisions.map(d => [d.id, d]));

// Plays a script to the end: walks straight to objectives, presses through
// lines and interactions and picks the given option for every decision.
function play(script, n, pick = () => null, maxSteps = 5000) {
  const state = createStoryState(script); const events = []; let position = [0, 182];
  for (let i = 0; i < maxSteps && !state.finished; i++) {
    const preview = stepStory(state, 0, { position }, decisionsOf(n));
    const ui = preview.ui; events.push(...preview.events);
    if (ui.kind === 'objective' || ui.kind === 'interact') position = [...ui.target];
    const result = stepStory(state, .5, { position, advance: true, interact: true, choose: ui.kind === 'choice' ? pick(ui) ?? ui.options[0].id : null }, decisionsOf(n));
    events.push(...result.events);
  }
  return { state, events };
}

test('chapter scripts reference their decisions, stage fixed deaths and end', () => {
  for (const n of [1, 2]) assert.deepEqual(validateScript(SCRIPTS[n], chapter(n)), [], `chapter ${n}`);
});

test('chapter 1 runs from the tree to the canal', () => {
  const { state, events } = play(SCRIPTS[1], 1);
  assert.equal(state.finished, true);
  const missions = events.filter(e => e.kind === 'mission').map(e => e.id);
  assert.deepEqual(missions, ['arvore', 'portao', 'retorno', 'casa', 'canal']);
  assert.ok(events.some(e => e.kind === 'event' && e.id === 'survey-return'));
  assert.ok(state.log.indexOf('objective:portao') < state.log.indexOf('objective:canal'));
});

test('both options of every decision reach the same canonical ending', () => {
  for (const n of [1, 2]) {
    const decision = chapter(n).decisions[0];
    const runs = decision.options.map(option => play(SCRIPTS[n], n, () => option.id));
    const outcomes = runs.map(r => r.events.find(e => e.kind === 'choice').outcome);
    assert.equal(new Set(outcomes).size, 1);
    for (const r of runs) assert.equal(r.state.finished, true);
    const ends = runs.map(r => r.state.log.filter(entry => entry.startsWith('mission') || entry.startsWith('fixed')));
    assert.deepEqual(ends[0], ends[1], `chapter ${n} missions diverged`);
  }
});

test('Carla dies in chapter 2 no matter what Hannes does', () => {
  for (const option of ['lutar', 'recuar']) {
    const { state } = play(SCRIPTS[2], 2, () => option);
    assert.ok(state.log.includes('fixed:morte-carla'));
    assert.ok(state.log.indexOf(`choice:hannes:${option}`) < state.log.indexOf('fixed:morte-carla'));
  }
});

test('lines wait for input, objectives wait for the player and interactions count presses', () => {
  const script = [
    { type: 'line', speaker: 'A', text: 'x' },
    { type: 'objective', id: 'o', text: 'go', target: [10, 0], radius: 2 },
    { type: 'interact', id: 'i', text: 'push', target: [10, 0], radius: 2, presses: 3 },
    { type: 'event', id: 'e', duration: 1 },
    { type: 'end' },
  ];
  const state = createStoryState(script);
  assert.equal(stepStory(state, 1, {}).ui.kind, 'line');
  assert.equal(stepStory(state, .1, { advance: true }).ui.kind, 'objective');
  assert.equal(stepStory(state, 1, { position: [0, 0] }).ui.kind, 'objective');
  assert.equal(stepStory(state, .1, { position: [9, 0] }).ui.kind, 'interact');
  stepStory(state, .1, { position: [9, 0], interact: true });
  stepStory(state, .1, { position: [30, 0], interact: true });
  assert.equal(state.presses, 1, 'presses only count near the target');
  stepStory(state, .1, { position: [9, 0], interact: true });
  const event = stepStory(state, .1, { position: [9, 0], interact: true });
  assert.ok(event.events.some(e => e.kind === 'event' && e.id === 'e'));
  assert.equal(event.ui.kind, 'event');
  assert.equal(stepStory(state, .5, {}).ui.kind, 'event');
  stepStory(state, .6, {});
  assert.equal(state.finished, true);
});

test('places used by the scripts are inside the district bounds', () => {
  for (const [name, [x, z]] of Object.entries(PLACES)) assert.ok(Math.abs(x) < 120 && z > -125 && z < 200, name);
});

test('chapter 32 script follows the charge, the line and the Beast in order, whatever the recruit does', async () => {
  const { LAST_CHARGE } = await import('../src/story/last-charge-script.js');
  assert.deepEqual(validateScript(LAST_CHARGE, chapter(32)), []);
  for (const option of ['avancar', 'olhar']) {
    const state = createStoryState(LAST_CHARGE); const goals = new Set();
    for (let i = 0; i < 4000 && !state.finished; i++) {
      const { ui } = stepStory(state, 0, { goals }, decisionsOf(32));
      if (ui.kind === 'goal') goals.add(ui.id);
      stepStory(state, .5, { advance: true, goals, choose: ui.kind === 'choice' ? option : null }, decisionsOf(32));
    }
    assert.equal(state.finished, true);
    const order = state.log.filter(e => e.startsWith('goal:') || e.startsWith('fixed:'));
    assert.deepEqual(order, ['goal:carga', 'fixed:erwin-ferido', 'fixed:morte-marlo', 'goal:linha', 'goal:bestial']);
    assert.ok(state.log.includes('event:cart-rescue'), 'the Cart Titan always rescues Zeke');
  }
});

test('flares widen the barrage and the Beast exposes every part Levi must cut', async () => {
  const { barrageTargets, BEAST_ORDER } = await import('../src/story/last-charge-rules.js');
  const spread = list => Math.max(...list.map(([x, z]) => Math.hypot(x - 0, z + 4)));
  const aimed = barrageTargets({ seed: 5, player: [0, 0], count: 40 });
  const blinded = barrageTargets({ seed: 5, player: [0, 0], count: 40, flared: true });
  assert.equal(aimed.length, 40);
  assert.ok(spread(blinded) > spread(aimed) * 1.6, 'a flare makes the Beast miss wider');
  assert.deepEqual(barrageTargets({ seed: 9, player: [1, 2] }), barrageTargets({ seed: 9, player: [1, 2] }));
  assert.deepEqual(BEAST_ORDER, ['braco-esq', 'braco-dir', 'olhos', 'perna-esq', 'perna-dir']);
});
