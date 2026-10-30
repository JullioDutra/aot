import * as THREE from 'three';
import './story.css';
import './touch-controls.css';
import { chapter as chapterData, CHAPTERS } from './campaign/chapters.js';
import { createStoryState, stepStory } from './story/engine.js';
import { loadProgress, saveProgress, completeChapter, rateRun, chapterAvailability } from './campaign/progress.js';
import { createGamepadInput } from './gamepad-input.js';
import { createTouchControls } from './touch-controls.js';
import { initialProfile, nextProfile, mergeFrames, toggleFullscreen, fullscreenState, prompt } from './platform.js';
import { ArenaAudio } from './arena-audio.js';
import { clamp } from './mechanics.js';

// Shell shared by every story chapter: renderer, input for keyboard/mouse,
// controller and touch, dialogue, choices, objectives, pause, failure with a
// quick checkpoint return and the end card. Chapters plug in an adapter that
// owns the world, the player and the scripted events.
const ADAPTERS = {
  1: () => import('./story/shiganshina-chapter.js'), 2: () => import('./story/shiganshina-chapter.js'),
  3: () => import('./story/retreat-chapter.js'), 4: () => import('./story/training-chapter.js'), 5: () => import('./story/training-chapter.js'),
  6: () => import('./story/trost-ch06.js'), 7: () => import('./story/trost-ch07.js'), 8: () => import('./story/trost-ch08.js'), 9: () => import('./story/trost-ch09.js'),
  10: () => import('./story/trost-ch10.js'), 11: () => import('./story/trost-ch11.js'), 12: () => import('./story/trost-ch12.js'),
  13: () => import('./story/act3-ch13.js'), 14: () => import('./story/act3-ch14.js'), 15: () => import('./story/act3-ch15.js'),
  16: () => import('./story/act3-ch16.js'), 17: () => import('./story/act3-ch17.js'), 18: () => import('./story/act3-ch18.js'),
  19: () => import('./story/act4-ch19.js'), 20: () => import('./story/act4-ch20.js'), 21: () => import('./story/act4-ch21.js'),
  22: () => import('./story/act4-ch22.js'), 23: () => import('./story/act4-ch23.js'), 24: () => import('./story/act4-ch24.js'),
  32: () => import('./story/last-charge-chapter.js'),
};

const $ = id => document.getElementById(id);
const number = Number(new URLSearchParams(location.search).get('fase')) || 1;
const data = chapterData(number);
if (!data || !ADAPTERS[number]) { $('story-missing').hidden = false; throw new Error(`Fase ${number} indisponível`); }
document.title = `${String(number).padStart(2, '0')} · ${data.title} · Asas da Liberdade`;

const canvas = $('story-canvas');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (error) { $('story-error').hidden = false; throw error; }
const touchFirst = initialProfile({ coarsePointer: matchMedia('(pointer: coarse)').matches, hover: matchMedia('(hover: hover)').matches, maxTouchPoints: navigator.maxTouchPoints }) === 'touch';
renderer.setPixelRatio(Math.min(devicePixelRatio, touchFirst ? .9 : 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !touchFirst; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 2000);
const audio = new ArenaAudio();

let storage = null; try { storage = localStorage; } catch { /* Progress stays in memory. */ }
let progress = loadProgress(storage);
let mode = 'intro', inputProfile = touchFirst ? 'touch' : 'keyboard', syncedMode = null;
let story, adapter, elapsed = 0, damage = 0, highlighted = 0, fadeTarget = 0, fade = 0, failTimer = 0, checkpoint = null;
const keys = new Set(), edges = new Set(); let lookDelta = [0, 0], dragging = false, advanceQueued = false, interactQueued = false, chooseQueued = null, previousHeld = {};
const gamepad = createGamepadInput({ advance: 0, jump: 0, run: 1, attack: 2, interact: 3, left: 6, right: 7, up: 12, down: 13, menu: 9, back: 8 }, ['menu', 'back']);
let padFrame = gamepad.sample();
const touch = createTouchControls({ root: document.body, buttons: [
  { action: 'advance', label: 'CONTINUAR', className: 'primary' }, { action: 'interact', label: 'AGIR' }, { action: 'run', label: 'CORRER' },
  { action: 'attack', label: 'LÂMINA', className: 'primary story-combat' }, { action: 'left', label: '◀ CABO', className: 'cable-left story-combat' }, { action: 'right', label: 'CABO ▶', className: 'cable-right story-combat' },
  { action: 'jump', label: 'GÁS', className: 'story-combat' }, { action: 'menu', label: 'Ⅱ', className: 'menu' }] });
const key = action => prompt(inputProfile, action);

function syncInput() {
  document.body.dataset.input = inputProfile; document.body.dataset.playing = mode === 'playing'; syncedMode = mode;
  touch.setVisible(inputProfile === 'touch' && mode === 'playing');
  $('story-advance-hint').textContent = `${key('advance')} para continuar`;
}
function setInput(event) { const next = nextProfile(inputProfile, event); if (next !== inputProfile) { inputProfile = next; syncInput(); } }

// ── UI helpers ────────────────────────────────────────────────────────────
let bannerTime = 0, toastTime = 0;
function banner(title, sub = '') { $('story-banner-title').textContent = title; $('story-banner-sub').textContent = sub; $('story-banner').classList.add('visible'); bannerTime = 3.2; }
function toast(text, seconds = 3) { $('story-toast').textContent = text; $('story-toast').classList.add('visible'); toastTime = seconds; }
const ui = { banner, toast, setFade: v => { fadeTarget = v; }, flash: (color = '#ffffff', strength = 1) => { const el = $('story-flash'); el.style.background = color; el.style.opacity = strength; requestAnimationFrame(() => { el.style.transition = 'opacity .9s'; el.style.opacity = 0; setTimeout(() => { el.style.transition = ''; }, 950); }); }, damage: amount => { damage += amount; } };

function renderUI(view) {
  const line = view.kind === 'line', choice = view.kind === 'choice';
  $('story-dialogue').hidden = !line;
  if (line) { $('story-speaker').textContent = view.speaker; $('story-text').textContent = view.text; $('story-advance-hint').hidden = view.auto; $('story-dialogue').dataset.speaker = view.speaker; }
  $('story-choice').hidden = !choice;
  if (choice && $('story-choice').dataset.id !== view.id) {
    $('story-choice').dataset.id = view.id; highlighted = 0;
    $('story-choice-prompt').textContent = view.prompt;
    $('story-options').replaceChildren(...view.options.map((option, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.option = option.id; b.textContent = `${i + 1}. ${option.label}`;
      b.addEventListener('click', () => { chooseQueued = option.id; }); return b;
    }));
  }
  if (choice) [...$('story-options').children].forEach((b, i) => b.classList.toggle('highlight', i === highlighted));
  if (!choice) $('story-choice').dataset.id = '';
  const objective = view.kind === 'objective' || view.kind === 'interact' || view.kind === 'goal';
  $('story-objective').hidden = !objective;
  if (objective) {
    $('story-objective-text').textContent = view.kind === 'interact' ? `${view.text} · ${key('interact')} (${view.presses}/${view.needed})` : view.text.replace(/\{(\w+)\}/g, (_, action) => key(action));
    $('story-objective-status').textContent = adapter.status?.() ?? '';
  }
  if (objective && view.target) {
    const target = new THREE.Vector3(view.target[0], adapter.markerHeight?.(view.target) ?? 2, view.target[1]).project(camera);
    const marker = $('story-marker'), visible = target.z < 1;
    marker.hidden = !visible;
    if (visible) { marker.style.left = `${clamp((target.x + 1) / 2, .04, .96) * 100}%`; marker.style.top = `${clamp((1 - target.y) / 2, .08, .9) * 100}%`; }
    const p = adapter.playerPosition(); $('story-distance').textContent = `${Math.round(Math.hypot(view.target[0] - p[0], view.target[1] - p[1]))} m`;
  } else { $('story-marker').hidden = true; $('story-distance').textContent = ''; }
  $('story-mission').textContent = view.mission?.title ?? '';
}

// ── Flow ──────────────────────────────────────────────────────────────────
async function boot() {
  const module = await ADAPTERS[number]();
  adapter = module.createChapter({ scene, camera, renderer, number, ui, audio, data });
  story = createStoryState(adapter.script);
  window.__STORY_SCRIPT__ = adapter.script;
  checkpoint = { index: 0, snapshot: adapter.checkpoint?.() };
  $('story-intro-number').textContent = String(number).padStart(2, '0');
  $('story-intro-title').textContent = data.title;
  $('story-intro-meta').textContent = `${data.year} · ${data.setting}`;
  $('story-intro-synopsis').textContent = data.synopsis;
  $('story-start').disabled = false; $('story-start').textContent = 'COMEÇAR';
  if (data.fixed.some(f => f.kind === 'death')) $('story-intro-warning').hidden = false;
  window.__STORY__.ready = true;
}

function start() {
  if (!story) return;
  mode = 'playing'; $('story-intro').hidden = true; $('story-pause').hidden = true; $('story-hud').hidden = false; syncInput();
  void audio.start();
  if (inputProfile === 'touch' && !fullscreenState(document).active) void toggleFullscreen(document, document.documentElement);
}
function pause() { if (mode !== 'playing') return; mode = 'paused'; audio.pause?.(); clearInput(); $('story-pause').hidden = false; syncInput(); if (document.pointerLockElement) document.exitPointerLock(); }
function clearInput() { keys.clear(); edges.clear(); previousHeld = {}; gamepad.suspend(); touch.suspend(); lookDelta = [0, 0]; dragging = false; advanceQueued = interactQueued = false; chooseQueued = null; }
function restartChapter() { location.reload(); }

function fail(reason) {
  if (mode !== 'playing') return;
  mode = 'failed'; failTimer = 2.2; clearInput(); syncInput();
  $('story-fail-reason').textContent = reason; $('story-fail').hidden = false; ui.flash('#7a1010', .7);
}
function resumeCheckpoint() {
  $('story-fail').hidden = true;
  story = createStoryState(adapter.script); story.index = checkpoint.index; story.mission = checkpoint.mission ?? null;
  adapter.restore?.(checkpoint.snapshot); mode = 'playing'; syncInput();
  toast('De volta ao início da sub-fase.', 2.5);
}

function finish() {
  mode = 'finished'; syncInput();
  const deaths = data.fixed.some(f => f.kind === 'death');
  const rating = rateRun({ time: elapsed, par: adapter.par ?? 420, damage, challenges: adapter.challengesDone?.().length ?? 0 });
  progress = completeChapter(progress, number, { time: Math.round(elapsed), rating, decisions: story.choices, challenges: adapter.challengesDone?.() ?? [] });
  const saved = saveProgress(storage, progress);
  $('story-end-title').textContent = data.title;
  // No score or medals over a fixed death: the card only shows what was lived.
  $('story-end-rating').hidden = deaths; $('story-end-rating').textContent = deaths ? '' : `Avaliação ${rating}`;
  const reflections = data.decisions.map(d => { const id = story.choices[d.id]; const option = d.options.find(o => o.id === id); return option ? option.reflection : null; }).filter(Boolean);
  $('story-end-reflection').replaceChildren(...reflections.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
  const done = adapter.challengesDone?.() ?? [];
  $('story-end-challenges').textContent = data.challenges.length ? `Desafios: ${done.length} / ${data.challenges.length}${done.length ? ` · ${done.join(', ')}` : ''}` : '';
  $('story-end-save').textContent = saved ? 'Progresso salvo neste navegador.' : 'Não foi possível salvar o progresso neste navegador.';
  const nextChapter = CHAPTERS.find(c => c.number > number && chapterAvailability(c) === 'open');
  $('story-next').hidden = !nextChapter; if (nextChapter) { $('story-next').href = `./story.html?fase=${nextChapter.number}`; $('story-next').textContent = `FASE ${nextChapter.number} · ${nextChapter.title.toUpperCase()} ↗`; }
  $('story-end').hidden = false; $('story-hud').hidden = true; audio.pause?.();
  if (document.pointerLockElement) document.exitPointerLock();
}

// ── Input ─────────────────────────────────────────────────────────────────
addEventListener('keydown', event => {
  setInput('keyboard');
  if (event.code === 'KeyF' && !event.repeat) { void toggleFullscreen(document, document.documentElement); return; }
  if (event.code === 'Escape') { if (mode === 'playing') pause(); else if (mode === 'paused') start(); return; }
  if (mode === 'intro' && (event.code === 'Enter' || event.code === 'Space')) { start(); return; }
  if (mode !== 'playing') return;
  if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyG', 'KeyQ', 'ShiftLeft'].includes(event.code)) event.preventDefault();
  keys.add(event.code); if (event.repeat) return;
  edges.add(event.code);
  if (event.code === 'Space' || event.code === 'Enter') advanceQueued = true;
  if (event.code === 'KeyG' || event.code === 'KeyR') interactQueued = true;
  if (/^Digit[1-3]$/.test(event.code)) chooseQueued = Number(event.code.at(-1)) - 1;
  adapter?.onKey?.(event.code, true);
});
addEventListener('keyup', event => { keys.delete(event.code); adapter?.onKey?.(event.code, false); });
addEventListener('pointerdown', event => setInput(event.pointerType === 'touch' ? 'touch' : 'mouse'), true);
canvas.addEventListener('mousedown', event => {
  if (mode !== 'playing') return; dragging = true;
  if (event.button === 0) { if ($('story-dialogue').hidden) edges.add('Mouse0'); else advanceQueued = true; }
  if (!document.pointerLockElement && adapter?.wantsPointerLock) { try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* Drag still works. */ } }
});
addEventListener('mouseup', () => { dragging = false; adapter?.onKey?.('Mouse0', false); });
addEventListener('mousemove', event => { if (mode === 'playing' && (dragging || document.pointerLockElement === canvas)) { lookDelta[0] += event.movementX; lookDelta[1] += event.movementY; } });
canvas.addEventListener('contextmenu', event => event.preventDefault());
$('story-dialogue').addEventListener('click', () => { advanceQueued = true; });
$('story-start').addEventListener('click', start);
$('story-resume').addEventListener('click', start);
$('story-restart').addEventListener('click', restartChapter);
$('story-fail-retry').addEventListener('click', resumeCheckpoint);
for (const id of ['story-fullscreen', 'story-pause-fullscreen']) $(id).addEventListener('click', () => void toggleFullscreen(document, document.documentElement));
addEventListener('blur', pause); document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && mode === 'playing' && adapter?.wantsPointerLock) pause(); });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

function gatherInput(dt) {
  let pads = []; try { pads = navigator.getGamepads?.() ?? []; } catch { /* Keyboard and touch remain. */ }
  const physical = gamepad.sample(pads);
  if (physical.connected && (Object.values(physical.pressed).some(Boolean) || [...physical.move, ...physical.look].some(Boolean))) setInput('gamepad');
  padFrame = mergeFrames(physical, touch.sample());
  if (mode !== syncedMode) syncInput();
  if (padFrame.pressed.menu) { if (mode === 'playing') pause(); else if (mode === 'paused' || mode === 'intro') start(); }
  if (padFrame.pressed.back && mode === 'failed') resumeCheckpoint();
  if (mode === 'intro' && padFrame.pressed.advance) start();
  const move = [Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + padFrame.move[0], Number(keys.has('KeyS')) - Number(keys.has('KeyW')) + padFrame.move[1]];
  const length = Math.hypot(...move); if (length > 1) { move[0] /= length; move[1] /= length; }
  const look = [lookDelta[0] * .0024 + padFrame.lookDelta[0] * .005 + padFrame.look[0] * dt * 2.4, lookDelta[1] * .0024 + padFrame.lookDelta[1] * .004 + padFrame.look[1] * dt * 1.8];
  lookDelta = [0, 0];
  if (padFrame.pressed.up) highlighted = Math.max(0, highlighted - 1);
  if (padFrame.pressed.down) highlighted = Math.min($('story-options').children.length - 1, highlighted + 1);
  const choosing = !$('story-choice').hidden;
  const advance = advanceQueued || (!choosing && !!padFrame.pressed.advance); advanceQueued = false;
  let choose = chooseQueued; chooseQueued = null;
  if (choosing && padFrame.pressed.advance) choose = highlighted;
  const interact = interactQueued || !!padFrame.pressed.interact; interactQueued = false;
  const talking = !$('story-dialogue').hidden || choosing;
  const held = { ...padFrame.held, jump: (keys.has('Space') || !!padFrame.held.jump) && !talking, left: keys.has('KeyQ') || !!padFrame.held.left, right: keys.has('KeyE') || !!padFrame.held.right, attack: !!padFrame.held.attack };
  const pressed = { ...padFrame.pressed, attack: !!padFrame.pressed.attack || edges.has('Mouse0'), jump: (!!padFrame.pressed.jump || edges.has('Space')) && !talking, left: !!padFrame.pressed.left || edges.has('KeyQ'), right: !!padFrame.pressed.right || edges.has('KeyE') };
  edges.clear();
  const frame = { move, look, advance, interact, choose, run: keys.has('ShiftLeft') || keys.has('ShiftRight') || !!padFrame.held.run, held, pressed, previous: previousHeld, keyLabel: key };
  previousHeld = held;
  return frame;
}

// ── Loop ──────────────────────────────────────────────────────────────────
let last = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const input = gatherInput(dt);
  // Browser tests raise timeScale to run several fixed steps per rendered
  // frame; players always get one step per frame.
  for (let step = 0; step < (mode === 'playing' ? window.__STORY__.timeScale : 1); step++) {
    const frame = step ? { ...input, look: [0, 0], advance: false, interact: false, choose: null, pressed: {} } : input;
    if (adapter && mode === 'playing') {
      elapsed += dt;
      const choices = $('story-options').children;
      let choose = frame.choose;
      if (typeof choose === 'number') choose = choices[choose]?.dataset.option ?? null;
      const result = stepStory(story, dt, { position: adapter.playerPosition(), advance: frame.advance, interact: frame.interact, choose, goals: adapter.goals?.() }, Object.fromEntries(data.decisions.map(d => [d.id, d])));
      for (const event of result.events) {
        if (event.kind === 'mission') { banner(event.title, `Fase ${number} · ${data.title}`); checkpoint = { index: story.index, mission: story.mission, snapshot: adapter.checkpoint?.(story.mission) }; }
        else if (event.kind === 'end') finish();
        else adapter.onStoryEvent(event);
      }
      const outcome = adapter.update(dt, frame, story.control, result.ui);
      if (outcome?.fail) fail(outcome.fail);
      if (mode === 'playing' || mode === 'finished') renderUI(result.ui);
    } else if (adapter) adapter.idle?.(dt);
  }
  if (mode === 'failed') { failTimer -= dt; $('story-fail-retry').disabled = failTimer > 1.4; }
  if (bannerTime > 0 && (bannerTime -= dt) <= 0) $('story-banner').classList.remove('visible');
  if (toastTime > 0 && (toastTime -= dt) <= 0) $('story-toast').classList.remove('visible');
  fade += (fadeTarget - fade) * Math.min(1, dt * 3); $('story-fade').style.opacity = fade.toFixed(3);
  renderer.render(scene, camera);
});

window.__STORY__ = { ready: false, timeScale: 1, debug: (name, ...args) => adapter?.debug?.[name]?.(...args), snapshot: () => ({ number, mode, ready: !!story, inputProfile, elapsed, fade, story: story ? { index: story.index, control: story.control, finished: story.finished, mission: story.mission, choices: { ...story.choices }, log: [...story.log] } : null, adapter: adapter?.snapshot?.() ?? null, progress: structuredClone(progress), drawCalls: renderer.info.render.calls, camera: camera.position.toArray().map(v => +v.toFixed(1)) }) };
boot().catch(error => { console.error(error); $('story-error').hidden = false; });
