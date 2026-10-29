import * as THREE from 'three';
import './titan-arena.css';
import { createTitan, createCadet, box, material } from './world.js';
import { createArenaState, arenaCommand, stepArena } from './titan-combat.js';
import { clamp, formatTime } from './mechanics.js';
import { combatPose, applyCombatPose } from './titan-animation.js';
import { createGamepadInput, ARENA_GAMEPAD_BINDINGS } from './gamepad-input.js';
import { ArenaAudio } from './arena-audio.js';
import { createTransformationFx } from './transformation-fx.js';
import { initialProfile, nextProfile, mergeFrames, toggleFullscreen, fullscreenState, prompt } from './platform.js';
import { createTouchControls } from './touch-controls.js';
import './touch-controls.css';

const $ = id => document.getElementById(id), canvas = $('arena-canvas');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (error) { $('arena-error').hidden = false; throw error; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#b4c7c4'); scene.fog = new THREE.Fog('#b4c7c4', 120, 380);
const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, .1, 600);
scene.add(new THREE.HemisphereLight('#e4f0ed', '#645a43', 2.4));
const sun = new THREE.DirectionalLight('#ffe3b0', 3); sun.position.set(-45, 85, 32); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 200 }); sun.shadow.normalBias = .3; scene.add(sun);
const stone = material('#8b9480'), trim = material('#65796b'), sand = material('#aaa487'), dark = material('#344b42');
const groundCanvas = document.createElement('canvas'); groundCanvas.width = groundCanvas.height = 256;
const ctx = groundCanvas.getContext('2d'); ctx.fillStyle = '#b2aa8f'; ctx.fillRect(0, 0, 256, 256);
let seed = 49; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
for (let i = 0; i < 3500; i++) { ctx.fillStyle = random() < .5 ? '#a29d86' : '#c1b79a'; ctx.fillRect(random() * 256, random() * 256, 2, 2); }
for (let i = 0; i < 14; i++) { ctx.beginPath(); let x = random() * 256, y = random() * 256; ctx.moveTo(x, y); for (let j = 0; j < 5; j++) { x += random() * 18 - 9; y += random() * 14; ctx.lineTo(x, y); } ctx.strokeStyle = '#888c7955'; ctx.stroke(); }
const texture = new THREE.CanvasTexture(groundCanvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(18, 18);
const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 96), material('#d2ccb0', { map: texture })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const boundary = new THREE.Mesh(new THREE.RingGeometry(51.7, 52.2, 96), material('#c7b081', { side: THREE.DoubleSide })); boundary.rotation.x = -Math.PI / 2; boundary.position.y = .045; scene.add(boundary);
for (let i = 0; i < 24; i++) {
  const angle = i / 24 * Math.PI * 2, x = Math.sin(angle) * 74, z = Math.cos(angle) * 74;
  const h = 24 + (i % 3) * 3; const segment = box(scene, stone, x, h / 2, z, 20, h, 5); segment.rotation.y = angle;
  const cap = box(scene, trim, x, h + .5, z, 21, 1, 6); cap.rotation.y = angle;
  for (let k = 0; k < 4; k++) { const block = box(scene, trim, x + Math.cos(angle) * (k * 5 - 7.5), h + 2, z - Math.sin(angle) * (k * 5 - 7.5), 2.8, 2, 5.5); block.rotation.y = angle; }
  const buttress = box(scene, trim, Math.sin(angle) * 70, h / 2, Math.cos(angle) * 70, 1.5, h, 3); buttress.rotation.y = angle;
}
// All dressing stays outside the playable circle, so it never hides invisible collisions.
for (let i = 0; i < 34; i++) {
  const angle = i * 2.39996, r = 57 + random() * 9;
  const debris = box(scene, i % 3 ? stone : dark, Math.sin(angle) * r, .8, Math.cos(angle) * r, 2 + random() * 3, 1 + random() * 2, 2 + random() * 2);
  debris.rotation.set(random() * .2, angle, random() * .3);
}
for (let i = 0; i < 9; i++) { const step = box(scene, sand, -64 + i * .3, i * .55, -12, 10 - i * .65, .6, 20); step.rotation.y = -.3; }
const bannerMat = material('#335a48', { side: THREE.DoubleSide });
for (const x of [-17, 17]) { const flag = new THREE.Mesh(new THREE.PlaneGeometry(5, 10), bannerMat); flag.position.set(x, 22, -69); scene.add(flag); box(scene, trim, x, 28, -69, 6, .3, .3); }
const human = createCadet(scene), hero = createTitan(scene, 0, 24, 15, 0, { variant: 'attack' }), enemy = createTitan(scene, 0, -10, 16, 2);
hero.root.visible = false;
const ring = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 64), new THREE.MeshBasicMaterial({ color: '#edcc8e', side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .12; scene.add(ring);
// Branching bolts, flash, shock ring and steam column for the transformation.
const transformFx = createTransformationFx(scene, { height: 15, duration: 2.2 });
let transformClock = null;
const particles = [], particleGeometry = new THREE.IcosahedronGeometry(1, 0);
function burst(x, z, y = 8, count = 12, color = '#ddd6bc') {
  for (let i = 0; i < count && particles.length < 90; i++) {
    const mesh = new THREE.Mesh(particleGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .45, depthWrite: false }));
    mesh.position.set(x, y, z); mesh.scale.setScalar(.5 + random() * .8); scene.add(mesh);
    particles.push({ mesh, life: 1.2, velocity: new THREE.Vector3((random() - .5) * 10, 2 + random() * 7, (random() - .5) * 10) });
  }
}
let state = createArenaState(), mode = 'intro', yaw = 0, pitch = .12, locked = true, dragging = false, readyCamera = false;
let noticeTime = 0, ringTime = 0, flashTime = 0, enemyHit = 0, heroHit = 0, steamTimer = 0, lastStrike = 0;
const keys = new Set(), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const audio = new ArenaAudio();
const gamepadInput = createGamepadInput(ARENA_GAMEPAD_BINDINGS, ['menu', 'restart']);
let padFrame = gamepadInput.sample();
let inputProfile = initialProfile({ coarsePointer: matchMedia('(pointer: coarse)').matches, hover: matchMedia('(hover: hover)').matches, maxTouchPoints: navigator.maxTouchPoints }), syncedMode = null;
const touch = createTouchControls({ root: document.body, buttons: [
  { action: 'transform', label: 'TITÃ', className: 'primary' }, { action: 'light', label: 'SOCO', className: 'primary' }, { action: 'heavy', label: 'FORTE' },
  { action: 'guard', label: 'DEFESA' }, { action: 'dodge', label: 'ESQUIVA' }, { action: 'grab', label: 'AGARRAR' },
  { action: 'regenerate', label: 'REGENERAR' }, { action: 'exit', label: 'SAIR' }, { action: 'lock', label: 'ALVO' }, { action: 'menu', label: 'Ⅱ', className: 'menu' }] });
function syncInputProfile() {
  document.body.dataset.input = inputProfile; document.body.dataset.playing = mode === 'playing'; syncedMode = mode;
  touch.setVisible(inputProfile === 'touch' && mode === 'playing');
  const pad = inputProfile === 'gamepad';
  $('arena-keyboard-controls').hidden = inputProfile !== 'keyboard'; $('arena-gamepad-controls').hidden = !pad;
  $('arena-keyboard-help').hidden = pad; $('arena-gamepad-help').hidden = !pad;
}
function setInputProfile(event) { const next = nextProfile(inputProfile, event); if (next !== inputProfile) { inputProfile = next; syncInputProfile(); hud(); } }
let shakeEnabled = !reducedMotion, impactTime = 0, impactPosition = new THREE.Vector3(), hitStop = 0;
const lastFootsteps = [-1, -1];
$('arena-shake').checked = shakeEnabled;
const key = action => prompt(inputProfile, action);
function notice(message, seconds = 3) { $('arena-notice').textContent = message; $('arena-notice').classList.add('visible'); noticeTime = seconds; }
function clearInput() { gamepadInput.suspend(); touch.suspend(); padFrame = { ...padFrame, armed: false, move: [0, 0], look: [0, 0], held: {}, pressed: {} }; keys.clear(); dragging = false; state.guarding = false; state.regenerating = false; }
function pointer() { try { canvas.requestPointerLock?.()?.catch(() => notice('Arraste a cena para controlar a câmera.')); } catch { notice('Arraste a cena para controlar a câmera.'); } }
function begin(lock = true) { mode = 'playing'; $('arena-intro').hidden = true; $('arena-hud').hidden = false; $('arena-pause').hidden = true; $('arena-result').hidden = true; document.body.classList.add('arena-playing'); clearInput(); void audio.start(); syncInputProfile(); if (inputProfile === 'touch') { if (!fullscreenState(document).active) void toggleFullscreen(document, document.documentElement); } else if (lock) pointer(); notice(state.form === 'human' ? `${key('transform')} · Prepare a transformação. O rival aguardará a mudança de forma.` : 'Observe os braços do adversário e ataque durante a recuperação.', 5); }
function reset(lock = true) {
  audio.silence(); hitStop = impactTime = 0; lastFootsteps.fill(-1);
  state = createArenaState(); yaw = 0; pitch = .12; locked = true; readyCamera = false; ringTime = flashTime = enemyHit = heroHit = steamTimer = lastStrike = 0;
  for (const p of particles) { scene.remove(p.mesh); p.mesh.material.dispose(); } particles.length = 0;
  transformFx.stop(); transformClock = null;
  enemy.root.rotation.set(0, 0, 0); hero.root.rotation.set(0, Math.PI, 0); enemy.root.visible = true;
  begin(lock);
}
function pause() { if (mode !== 'playing') return; mode = 'paused'; audio.pause(); clearInput(); syncInputProfile(); $('arena-pause').hidden = false; if (document.pointerLockElement) document.exitPointerLock(); }
function finish(won, exhausted = false) {
  mode = 'finished'; audio.silence(); audio.play('defeat'); clearInput(); if (document.pointerLockElement) document.exitPointerLock(); $('arena-result').hidden = false;
  $('arena-result-title').textContent = won ? 'Você dominou a força.' : exhausted ? 'Seu corpo chegou ao limite.' : 'Reagrupe. Tente outra vez.';
  $('arena-result-description').textContent = won ? 'Adversário derrotado. O ensaio validou uma transformação completa e o combate entre duas escalas gigantes.' : exhausted ? 'As reservas acabaram. Ataques, defesa e regeneração precisam dividir o mesmo tempo de transformação.' : 'Use a defesa para reduzir dano, esquive dos golpes e procure a abertura para um agarrão.';
  $('arena-result-stats').textContent = `${formatTime(state.time)} · ${state.stats.hits} acertos · ${state.stats.blocked} defesas · ${state.transforms} transformação(ões)`;
}
function movement() {
  const x = Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + padFrame.move[0], z = Number(keys.has('KeyW')) - Number(keys.has('KeyS')) - padFrame.move[1];
  return [Math.cos(yaw) * x + Math.sin(yaw) * z, Math.sin(yaw) * x - Math.cos(yaw) * z];
}
function command(action) {
  if (mode !== 'playing') return;
  const result = arenaCommand(state, action, movement());
  if (!result.accepted) { notice(result.reason, 2); return; }
  if (['light', 'heavy', 'grab'].includes(action)) lastStrike = 1 - lastStrike;
  if (action === 'dodge') audio.play('dodge');
  if (action === 'transform') { audio.play('transform'); ringTime = 1.5; flashTime = .22; transformFx.start(new THREE.Vector3(state.player.x, 0, state.player.z)); transformClock = 0; burst(state.player.x, state.player.z, 1, 24); notice('Objetivo definido. Transformação em curso.', 2.4); }
  if (action === 'exit') notice('Saindo da nuca. Recupere o fôlego antes de transformar novamente.');
}
function events(list) {
  for (const event of list) {
    if (event.kind === 'transformed') { burst(state.player.x, state.player.z, 10, 20); notice(`Forma titã · ${key('light')} soco, ${key('heavy')} golpe forte, ${key('guard')} defesa.`, 5); }
    if (event.kind === 'hit') {
      const target = event.target === 'enemy' ? state.enemy : state.player;
      burst(target.x, target.z, 10, 9, event.target === 'enemy' ? '#dfc092' : '#bd896f');
      if (event.target === 'enemy') enemyHit = .35; else heroHit = .3;
      audio.play(event.move === 'heavy' || event.move === 'grab' ? 'heavy' : 'punch');
      hitStop = event.move === 'heavy' || event.move === 'grab' ? .075 : .045;
      impactTime = .65; impactPosition.set(target.x, 11, target.z);
      $('arena-impact').textContent = `${event.damage} · ${event.target === 'enemy' ? 'ACERTO' : 'DANO'}`;
      $('arena-impact').classList.toggle('received', event.target === 'player');
    }
    if (event.kind === 'blocked') { audio.play('block'); notice('Defesa firme · dano reduzido. Prepare o contragolpe.', 1.5); }
    if (event.kind === 'guard-break') notice('Defesa quebrada. Sua resistência acabou.', 2);
    if (event.kind === 'miss') notice('Golpe fora de alcance. Aproxime-se sem perder a defesa.', 1.5);
    if (event.kind === 'exhausted') notice('Reservas esgotadas. A forma titã está se desfazendo.', 3);
    if (event.kind === 'won') finish(true);
    if (event.kind === 'lost') finish(false);
  }
}
function renderBodies(dt) {
  const titanVisible = ['titan', 'transforming', 'exiting', 'won', 'lost'].includes(state.form);
  human.root.visible = !titanVisible || state.form === 'transforming'; hero.root.visible = titanVisible;
  hero.root.position.set(state.player.x, 0, state.player.z); hero.root.rotation.y = state.player.yaw;
  human.root.position.set(state.player.x, 0, state.player.z); human.root.rotation.y = state.player.yaw;
  const growth = state.form === 'transforming' ? clamp(1 - state.formClock / 2.2, .03, 1) : state.form === 'exiting' ? Math.max(.02, state.formClock / 1.6) : 1;
  hero.root.scale.setScalar(hero.scale * growth);
  if (state.form === 'transforming') { human.arms[0].rotation.x = -2.3; human.arms[1].rotation.x = -1; }
  else { human.arms.forEach(a => { a.rotation.x = -.2; }); }
  enemy.root.position.set(state.enemy.x, 0, state.enemy.z); enemy.root.rotation.y = state.enemy.yaw;
  if (state.form === 'won') enemy.root.rotation.x = THREE.MathUtils.damp(enemy.root.rotation.x, -1.4, 2, dt);
  else if (state.form === 'lost') hero.root.rotation.x = THREE.MathUtils.damp(hero.root.rotation.x, -1.2, 2, dt);
  const heroWalking = mode === 'playing' && Math.hypot(...movement()) > 0 && !state.dodge;
  const enemyWalking = mode === 'playing' && state.form === 'titan' && state.enemy.action === 'idle' && Math.hypot(state.player.x - state.enemy.x, state.player.z - state.enemy.z) > 8;
  const foeAction = state.form === 'titan' && state.enemy.action !== 'idle'
    ? { kind: 'heavy', elapsed: state.enemy.action === 'windup' ? (1 - state.enemy.clock / .95) * .7 : .7 + (1 - state.enemy.clock / 1.65) * .8 }
    : null;
  applyCombatPose(hero, combatPose({ walking: heroWalking, time: state.time, guard: state.guarding, action: state.action, strikeSide: lastStrike, hit: heroHit }));
  applyCombatPose(enemy, combatPose({ walking: enemyWalking, time: state.time, action: foeAction, hit: enemyHit }));
  if (mode === 'playing' && state.form === 'titan') {
    [heroWalking, enemyWalking].forEach((walking, i) => {
      const beat = Math.floor(state.time * 4 / Math.PI);
      if (walking && lastFootsteps[i] !== beat) {
        const actor = i === 0 ? state.player : state.enemy;
        audio.play('step', Math.hypot(actor.x - state.player.x, actor.z - state.player.z));
        burst(actor.x, actor.z, .2, 3, '#b8ad8c'); lastFootsteps[i] = beat;
      }
    });
  }
  if (state.form === 'exiting' || state.regenerating) { steamTimer -= dt; if (steamTimer <= 0) { burst(state.player.x, state.player.z, 6, 3); audio.play('steam'); steamTimer = .45; } }
}
function updateCamera(dt) {
  if (mode === 'intro') { camera.position.set(34, 28, 48); camera.lookAt(0, 7, 4); return; }
  const grown = ['titan', 'won', 'lost'].includes(state.form) ? 1 : state.form === 'transforming' ? 1 - state.formClock / 2.2 : state.form === 'exiting' ? state.formClock / 1.6 : 0;
  const target = new THREE.Vector3(state.player.x, 1.6 + 9 * grown, state.player.z);
  const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  const desired = target.clone().addScaledVector(direction, -(7 + grown * 22)); desired.y += 2 + grown * 3;
  desired.add(new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)).multiplyScalar(grown * 6));
  const cameraRadius = Math.hypot(desired.x, desired.z);
  if (cameraRadius > 67) { desired.x *= 67 / cameraRadius; desired.z *= 67 / cameraRadius; }
  desired.y = Math.max(2, desired.y);
  if (!readyCamera) { camera.position.copy(desired); readyCamera = true; } else camera.position.lerp(desired, 1 - Math.exp(-6 * dt));
  if (shakeEnabled && mode === 'playing') {
    const strength = Math.max(heroHit * .6, enemyHit * .22);
    camera.position.x += Math.sin(state.time * 73) * strength;
    camera.position.y += Math.cos(state.time * 61) * strength * .5;
  }
  camera.lookAt(target.clone().addScaledVector(direction, 8)); camera.updateMatrixWorld();
}
function hud() {
  for (const key of ['health', 'stamina', 'energy']) { $(`arena-${key}`).textContent = `${Math.ceil(state[key])}%`; $(`arena-${key}-bar`).style.width = `${state[key]}%`; }
  $('enemy-hp').textContent = `${Math.ceil(state.enemy.health)} / 160`; $('enemy-bar').style.width = `${state.enemy.health / 1.6}%`;
  const labels = { human: 'HUMANO', transforming: 'TRANSFORMANDO', titan: 'TITÃ · 15 METROS', exiting: 'RETORNO À FORMA HUMANA', won: 'CONCLUÍDO', lost: 'DERROTADO' };
  $('arena-form').textContent = labels[state.form]; $('arena-transform-count').textContent = `${state.transforms} / 2 transformações${state.fatigue > 0 ? ` · fadiga ${Math.ceil(state.fatigue)} s` : ''}`;
  $('arena-objective').textContent = state.form === 'human' ? `${key('transform')} · Assuma a forma titã para enfrentar o rival.` : 'Derrote o adversário antes de esgotar suas reservas.';
  const intent = state.form !== 'titan' ? 'Aguardando transformação' : state.enemy.action === 'windup' ? 'ATAQUE IMINENTE · DEFENDA OU ESQUIVE' : state.enemy.action === 'recovery' ? `VULNERÁVEL · ${key('grab').toUpperCase()} PARA AGARRAR DE PERTO` : 'O adversário está se aproximando';
  $('enemy-intent').textContent = intent; $('enemy-status').classList.toggle('danger', state.enemy.action === 'windup'); $('enemy-status').classList.toggle('open', state.enemy.action === 'recovery');
  $('arena-action').textContent = state.guarding ? 'DEFENDENDO' : state.regenerating ? 'REGENERANDO' : state.dodge ? 'ESQUIVA' : state.action ? ({ light: 'SOCO', heavy: 'GOLPE FORTE', grab: 'AGARRÃO', stun: 'ATORDOADO' }[state.action.kind]) : labels[state.form];
  $('arena-distance').textContent = `${Math.round(Math.hypot(state.player.x - state.enemy.x, state.player.z - state.enemy.z))} m · ${locked ? 'ALVO FIXADO' : 'MIRA LIVRE'}`;
}

$('arena-start').addEventListener('click', begin); $('arena-resume').addEventListener('click', begin); $('arena-restart').addEventListener('click', reset); $('arena-retry').addEventListener('click', reset); $('arena-pause-button').addEventListener('click', pause);
$('arena-sound').addEventListener('change', e => audio.setEnabled(e.target.checked));
$('arena-shake').addEventListener('change', e => { shakeEnabled = e.target.checked; });
$('arena-quality').addEventListener('change', event => { renderer.setPixelRatio(event.target.value === 'low' ? .8 : Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = event.target.value !== 'low'; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); });
addEventListener('keydown', event => {
  setInputProfile('keyboard');
  if (event.code === 'Escape') { pause(); return; }
  if (mode !== 'playing') return;
  if (['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyT', 'KeyQ', 'KeyF', 'KeyE', 'KeyR'].includes(event.code)) event.preventDefault();
  keys.add(event.code); if (event.repeat) return;
  if (event.code === 'KeyT') command('transform'); if (event.code === 'KeyQ') command('heavy'); if (event.code === 'KeyF') command('grab'); if (event.code === 'KeyE') command('exit'); if (event.code === 'Space') command('dodge');
  if (event.code === 'Tab') { locked = !locked; notice(locked ? 'Alvo fixado: os golpes acompanham o adversário.' : 'Mira livre: direcione os golpes com a câmera.', 2); }
});
addEventListener('keyup', event => keys.delete(event.code));
canvas.addEventListener('mousedown', event => { if (mode !== 'playing') return; dragging = true; if (event.button === 0) command('light'); if (event.button === 2) keys.add('Guard'); });
addEventListener('mouseup', event => { dragging = false; if (event.button === 2) { keys.delete('Guard'); state.guarding = false; } });
addEventListener('mousemove', event => { if (mode !== 'playing' || (!dragging && document.pointerLockElement !== canvas)) return; yaw += event.movementX * .002; pitch = clamp(pitch + event.movementY * .002, -.35, .65); });
canvas.addEventListener('contextmenu', event => event.preventDefault());
addEventListener('pointerdown', event => setInputProfile(event.pointerType === 'touch' ? 'touch' : 'mouse'), true);
$('arena-fullscreen').addEventListener('click', () => void toggleFullscreen(document, document.documentElement));
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && mode === 'playing') pause(); });
addEventListener('blur', pause); document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); pause(); $('arena-error').hidden = false; });
function pollGamepad(dt) {
  let pads = [];
  try { pads = navigator.getGamepads?.() ?? []; } catch { /* Mouse and keyboard remain available. */ }
  const connectedBefore = padFrame.connected;
  const physical = gamepadInput.sample(pads);
  if (physical.connected && (Object.values(physical.pressed).some(Boolean) || [...physical.move, ...physical.look].some(Boolean))) setInputProfile('gamepad');
  padFrame = mergeFrames(physical, touch.sample());
  if (mode !== syncedMode) syncInputProfile();
  if (connectedBefore !== padFrame.connected) {
    $('arena-controller-status').textContent = padFrame.connected ? 'CONTROLE CONECTADO · START ENTRA NA ARENA' : 'CONTROLE PADRÃO · PRESSIONE UM BOTÃO PARA DETECTAR';
    hud();
  }
  if (padFrame.lost && mode === 'playing') { pause(); return; }
  if (document.hidden) { gamepadInput.suspend(); return; }
  if (padFrame.pressed.menu) {
    if (mode === 'playing') pause();
    else if (mode === 'finished') reset(false);
    else begin(false);
    return;
  }
  if (padFrame.pressed.restart && (mode === 'paused' || mode === 'finished')) { reset(false); return; }
  if (mode !== 'playing') return;
  yaw += padFrame.look[0] * dt * 2;
  pitch = clamp(pitch + padFrame.look[1] * dt * 1.5, -.35, .65);
  yaw += padFrame.lookDelta[0] * .005; pitch = clamp(pitch + padFrame.lookDelta[1] * .004, -.35, .65);
  if (!padFrame.held.guard && !keys.has('Guard')) state.guarding = false;
  for (const action of ['transform', 'exit', 'dodge', 'light', 'heavy', 'grab']) if (padFrame.pressed[action]) command(action);
  if (padFrame.pressed.lock) { locked = !locked; notice(locked ? 'Alvo fixado.' : 'Mira livre: direcione com o analógico direito.', 2); }
}
let previous = performance.now(), uiClock = 0;
function animate(now) {
  requestAnimationFrame(animate); const dt = Math.min(.05, (now - previous) / 1000); previous = now;
  pollGamepad(dt);
  if (mode === 'playing') {
    const count = Math.max(1, Math.ceil(dt * 60));
    for (let i = 0; i < count && mode === 'playing' && hitStop <= 0; i++) events(stepArena(state, dt / count, { move: movement(), guard: keys.has('Guard') || !!padFrame.held.guard, regenerate: keys.has('KeyR') || !!padFrame.held.regenerate, lock: locked, yaw: Math.PI - yaw }));
    if (state.form === 'human' && state.transforms > 0 && (state.energy < 25 || (state.transforms >= 2 && state.fatigue <= 0))) finish(false, true);
    hitStop = Math.max(0, hitStop - dt); impactTime = Math.max(0, impactTime - dt);
    noticeTime -= dt; if (noticeTime <= 0) $('arena-notice').classList.remove('visible');
    enemyHit = Math.max(0, enemyHit - dt); heroHit = Math.max(0, heroHit - dt); ringTime = Math.max(0, ringTime - dt); flashTime = Math.max(0, flashTime - dt);
    uiClock -= dt; if (uiClock <= 0) { hud(); uiClock = .08; }
  }
  if (mode !== 'paused') {
    renderBodies(dt); updateCamera(dt);
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt); p.mesh.scale.multiplyScalar(1 + dt * .6); p.mesh.material.opacity = Math.max(0, p.life / 1.2) * .45; if (p.life <= 0) { scene.remove(p.mesh); p.mesh.material.dispose(); particles.splice(i, 1); } }
  }
  ring.position.set(state.player.x, .12, state.player.z); ring.scale.setScalar(1 + (1.5 - ringTime) * 17); ring.material.opacity = ringTime > 0 ? ringTime / 3 : 0;
  // The effect clock only advances while playing, so pause freezes the bolts.
  if (transformClock !== null) { if (mode === 'playing') transformClock += dt; transformFx.update(transformClock); if (transformClock > 5) { transformFx.stop(); transformClock = null; } }
  $('arena-flash').style.opacity = reducedMotion ? '0' : String(Math.min(.45, flashTime * 2));
  const impactScreen = impactPosition.clone().project(camera);
  $('arena-impact').hidden = impactTime <= 0 || Math.abs(impactScreen.x) > 1 || Math.abs(impactScreen.y) > 1 || impactScreen.z < -1 || impactScreen.z > 1;
  $('arena-impact').style.left = `${(impactScreen.x + 1) * 50}%`; $('arena-impact').style.top = `${(1 - impactScreen.y) * 50}%`;
  $('arena-impact').style.opacity = String(Math.min(1, impactTime * 3));
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
window.__TITAN_ARENA__ = Object.freeze({ snapshot: () => ({ mode, controller: { connected: padFrame.connected, armed: padFrame.armed }, inputProfile, touchVisible: !touch.element.hidden, transformFx: { visible: transformFx.group.visible, clock: transformClock }, yaw, pitch, ...structuredClone(state), lock: locked, audio: audio.snapshot(), shakeEnabled, hitStop, heroRig: { elbows: hero.elbows.map(e => e.rotation.x), torso: hero.body.rotation.toArray().slice(0, 3) }, drawCalls: renderer.info.render.calls }) });
