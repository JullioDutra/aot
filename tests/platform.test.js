import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProfile, nextProfile, mergeFrames, emptyFrame, defaultQuality, fullscreenState, toggleFullscreen, prompt, PROMPTS } from '../src/platform.js';
import { stickVector, STICK_RADIUS } from '../src/touch-controls.js';

test('touch is chosen only for coarse pointers without hover', () => {
  assert.equal(initialProfile({ coarsePointer: true, maxTouchPoints: 5, hover: false }), 'touch');
  assert.equal(initialProfile({ coarsePointer: true, maxTouchPoints: 5, hover: true }), 'keyboard');
  assert.equal(initialProfile({ coarsePointer: false, maxTouchPoints: 10, hover: true }), 'keyboard');
  assert.equal(initialProfile(), 'keyboard');
});

test('the most recent input source decides the profile', () => {
  assert.equal(nextProfile('keyboard', 'touch'), 'touch');
  assert.equal(nextProfile('touch', 'gamepad'), 'gamepad');
  assert.equal(nextProfile('gamepad', 'mouse'), 'keyboard');
  assert.equal(nextProfile('touch', 'unknown'), 'touch');
  assert.equal(nextProfile('bogus', 'unknown'), 'keyboard');
});

test('merged frames sum analog input, clamp it and OR the buttons', () => {
  const pad = { ...emptyFrame(), connected: true, armed: true, move: [.8, 0], held: { jump: true }, pressed: {} };
  const touch = { ...emptyFrame(), armed: true, move: [.8, .6], lookDelta: [12, -4], held: { left: true }, pressed: { attack: true } };
  const frame = mergeFrames(pad, touch);
  assert.ok(Math.abs(Math.hypot(...frame.move) - 1) < 1e-9);
  assert.deepEqual(frame.lookDelta, [12, -4]);
  assert.deepEqual(frame.held, { jump: true, left: true });
  assert.deepEqual(frame.pressed, { attack: true });
  assert.equal(frame.connected, true);
  const lone = mergeFrames(undefined, { ...emptyFrame(), move: [.3, .2] });
  assert.deepEqual(lone.move, [.3, .2]);
  assert.equal(lone.connected, false);
});

test('touch devices default to the performance profile unless a choice was saved', () => {
  assert.equal(defaultQuality('touch', null), 'low');
  assert.equal(defaultQuality('keyboard', null), 'high');
  assert.equal(defaultQuality('touch', 'high'), 'high');
});

test('fullscreen toggles through the standard API and reports unsupported documents', async () => {
  assert.deepEqual(fullscreenState(null), { supported: false, active: false });
  assert.equal(await toggleFullscreen({}, {}), false);
  const calls = [];
  const doc = { fullscreenEnabled: true, fullscreenElement: null, exitFullscreen: async () => { calls.push('exit'); } };
  const element = { requestFullscreen: async options => { calls.push(['enter', options.navigationUI]); doc.fullscreenElement = element; } };
  assert.equal(await toggleFullscreen(doc, element), true);
  assert.equal(fullscreenState(doc).active, true);
  assert.equal(await toggleFullscreen(doc, element), true);
  assert.deepEqual(calls, [['enter', 'hide'], 'exit']);
  const refused = { fullscreenEnabled: true, fullscreenElement: null };
  assert.equal(await toggleFullscreen(refused, { requestFullscreen: async () => { throw new Error('denied'); } }), false);
});

test('prompts exist for every profile and fall back to the keyboard label', () => {
  for (const action of Object.keys(PROMPTS.keyboard)) {
    for (const profile of ['gamepad', 'touch']) assert.ok(PROMPTS[profile][action], `${profile} lacks ${action}`);
  }
  assert.equal(prompt('gamepad', 'transform'), 'RB/R1');
  assert.equal(prompt('touch', 'attack'), 'Lâmina');
  assert.equal(prompt('unknown', 'jump'), 'Espaço');
  assert.equal(prompt('keyboard', 'missing'), 'missing');
});

test('the floating stick has a dead zone and saturates at its radius', () => {
  assert.deepEqual(stickVector([100, 100], [103, 101]), [0, 0]);
  const half = stickVector([0, 0], [STICK_RADIUS / 2, 0]);
  assert.ok(Math.abs(half[0] - .5) < 1e-9 && half[1] === 0);
  const far = stickVector([0, 0], [0, STICK_RADIUS * 3]);
  assert.ok(Math.abs(far[1] - 1) < 1e-9 && far[0] === 0);
});

test('keyboard texts are relabeled for touch and controller profiles', async () => {
  const { localizeKeys } = await import('../src/platform.js');
  const text = 'Aproxime-se do grupo e pressione G.';
  assert.equal(localizeKeys(text, 'keyboard'), text);
  assert.equal(localizeKeys(text, 'touch'), 'Aproxime-se do grupo e use Agir.');
  assert.equal(localizeKeys('Use R junto à caixa azul.', 'gamepad'), 'Use RB/R1 junto à caixa azul.');
  assert.equal(localizeKeys('Abasteça na caixa azul com R.', 'touch'), 'Abasteça na caixa azul com Abastecer.');
  assert.equal(localizeKeys('Q/E continuam prendendo', 'touch'), '◀ Cabo / Cabo ▶ continuam prendendo');
});
