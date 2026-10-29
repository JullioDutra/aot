import * as THREE from 'three';
import './coop.css';
import { CHARACTER_SPECS } from './character-specs.js';
import { createCharacter, toon, outlineMaterial } from './character-model.js';
import { characterPose, applyPose } from './character-animation.js';
import { TITAN_FORMS, createTitanForm } from './titan-forms.js';
import { createOdm } from './story/odm-controller.js';
import { createParticles } from './story/props.js';
import { createGamepadInput } from './gamepad-input.js';
import { toggleFullscreen } from './platform.js';
import { ArenaAudio } from './arena-audio.js';
import { assignControllers, combinedStrike, reviveProgress, COOP_RULES } from './coop-rules.js';
import { canStrikeNape } from './mechanics.js';

// Local split-screen co-op, outside the story continuity: two soldiers clear
// a field of titans with ODM gear. Strikes on the same nape within a short
// window count as a combined attack; a grabbed partner is freed by killing
// the titan, a downed partner is revived by holding the action button.
const $ = id => document.getElementById(id);
const canvas = $('coop-canvas');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (error) { $('coop-error').hidden = false; throw error; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); renderer.shadowMap.enabled = true; renderer.setScissorTest(true);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#aebfbf'); scene.fog = new THREE.Fog('#aebfbf', 90, 330);
scene.add(new THREE.HemisphereLight('#eaf1ee', '#6d6650', 1.6));
const sun = new THREE.DirectionalLight('#fff0d0', 2.2); sun.position.set(60, 120, 50); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, far: 400 }); scene.add(sun);
const audio = new ArenaAudio(); const particles = createParticles(scene, 500);

// Field with houses for anchors.
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), toon('#a2a074')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const colliders = [], anchorRoots = [], houses = new THREE.Group(); scene.add(houses); anchorRoots.push(houses);
const line = outlineMaterial(.05);
let seed = 7; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
for (let i = 0; i < 46; i++) {
  const a = rand() * Math.PI * 2, r = 25 + rand() * 105, x = Math.cos(a) * r, z = Math.sin(a) * r, w = 8 + rand() * 6, d = 8 + rand() * 6, h = 6 + Math.floor(rand() * 4) * 3;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(['#e3d8c2', '#d8cbb1', '#ece4d4'][i % 3])); body.position.set(x, h / 2, z); body.castShadow = body.receiveShadow = true; body.add(new THREE.Mesh(body.geometry, line)); houses.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * .75, 3, 4), toon(['#8f4a37', '#7e5a45'][i % 2])); roof.position.set(x, h + 1.5, z); roof.rotation.y = Math.PI / 4; houses.add(roof);
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h });
}

const ROSTER = ['eren', 'mikasa', 'levi', 'armin', 'jean', 'sasha', 'connie', 'hange'];
const pads = [createGamepadInput({ jump: 0, run: 1, attack: 2, interact: 3, left: 6, right: 7, menu: 9 }, ['menu'], 0), createGamepadInput({ jump: 0, run: 1, attack: 2, interact: 3, left: 6, right: 7, menu: 9 }, ['menu'], 1)];
const keys = new Set(), edges = new Set(); let mouse = [0, 0];
let state = 'intro', time = 0, timer = COOP_RULES.time, kills = 0, combos = 0;
const players = [];
function createPlayer(index, characterId) {
  const camera = new THREE.PerspectiveCamera(60, 1, .1, 900);
  const odm = createOdm({ scene, camera, colliders, anchorRoots, bounds: 170 });
  const rig = createCharacter(CHARACTER_SPECS[characterId], { blades: true }); rig.root.rotation.y = Math.PI; scene.add(rig.root);
  odm.player.position.set(index ? 6 : -6, 0, 60);
  // Both start at the south edge looking north, toward the titans.
  return { index, characterId, camera, odm, rig, yaw: 0, pitch: .12, state: 'active', grabbedBy: null, revive: 0, down: 0, strike: 0, input: null, previous: {} };
}
const titans = [];
const pureIds = ['barbudo', 'nariz', 'cabeludo', 'gordo', 'anormal', 'pequeno', 'sorridente'];
function spawnTitan(i) {
  const spec = { ...TITAN_FORMS.find(t => t.id === pureIds[i % pureIds.length]) }; spec.height = 6 + (i * 7) % 10; spec.id = `${spec.id}-${i}`;
  const titan = createTitanForm(spec); const a = i / COOP_RULES.titans * Math.PI * 2;
  titan.root.position.set(Math.cos(a) * 95, 0, Math.sin(a) * 95 - 20); scene.add(titan.root); anchorRoots.push(titan.root);
  titans.push({ titan, alive: true, death: 0, windup: 0, holding: null, hold: 0, speed: 1.4 + (i % 4) * .4 });
}

function start() {
  const choices = [$('coop-p1').value, $('coop-p2').value];
  for (const [i, id] of choices.entries()) players.push(createPlayer(i, id));
  for (let i = 0; i < COOP_RULES.titans; i++) spawnTitan(i);
  state = 'playing'; $('coop-intro').hidden = true; $('coop-hud').hidden = false; void audio.start();
}

function readInputs(dt) {
  let list = []; try { list = [...(navigator.getGamepads?.() ?? [])]; } catch { /* keyboard only */ }
  const connected = list.filter(p => p && p.connected !== false && p.mapping === 'standard').length;
  const sources = assignControllers(connected);
  $('coop-sources').textContent = sources.map((s, i) => `J${i + 1}: ${s === 'keyboard' ? 'teclado + mouse' : s === 'keyboard2' ? 'teclado (IJKL)' : `controle ${s.slice(-1) * 1 + 1}`}`).join(' · ');
  const frames = pads.map(p => p.sample(list));
  return sources.map(source => {
    if (source.startsWith('pad')) { const f = frames[Number(source.slice(-1))]; return { move: f.move, look: [f.look[0] * dt * 2.4, f.look[1] * dt * 1.8], held: f.held, pressed: f.pressed }; }
    if (source === 'keyboard') return { move: [Number(keys.has('KeyD')) - Number(keys.has('KeyA')), Number(keys.has('KeyS')) - Number(keys.has('KeyW'))], look: [mouse[0] * .0024, mouse[1] * .0024], held: { left: keys.has('KeyQ'), right: keys.has('KeyE'), jump: keys.has('Space'), interact: keys.has('KeyG') }, pressed: { attack: edges.has('Mouse0') || edges.has('KeyF'), jump: edges.has('Space'), menu: edges.has('Escape') } };
    return { move: [Number(keys.has('KeyL')) - Number(keys.has('KeyJ')), Number(keys.has('KeyK')) - Number(keys.has('KeyI'))], look: [(Number(keys.has('Period')) - Number(keys.has('Comma'))) * dt * 2.2, 0], held: { left: keys.has('KeyU'), right: keys.has('KeyO'), jump: keys.has('ShiftRight'), interact: keys.has('KeyH') }, pressed: { attack: edges.has('Enter') || edges.has('NumpadEnter'), jump: edges.has('ShiftRight') } };
  });
}

const tmp = new THREE.Vector3();
function updatePlayer(p, input, dt) {
  const P = p.odm.player.position;
  if (p.state === 'grabbed') { p.grabbedBy.titan.hands[1].getWorldPosition(tmp); P.copy(tmp).add(new THREE.Vector3(0, -1, 0)); p.odm.player.velocity.set(0, 0, 0); p.rig.root.position.copy(P); applyPose(p.rig, characterPose('reach', time)); return; }
  if (p.state === 'down') { p.rig.root.position.copy(P); p.rig.root.rotation.x = -Math.PI / 2; applyPose(p.rig, characterPose('idle', 0)); return; }
  p.rig.root.rotation.x = 0;
  p.yaw += input.look[0]; p.pitch = Math.max(-.85, Math.min(1.05, p.pitch - input.look[1]));
  if (input.held.left && !p.previous.left && !p.odm.attach(-1, p.yaw)) flash(p, 'Sem ancoragem');
  if (input.held.right && !p.previous.right && !p.odm.attach(1, p.yaw)) flash(p, 'Sem ancoragem');
  if (!input.held.left) p.odm.release(-1); if (!input.held.right) p.odm.release(1);
  p.odm.step(dt, { move: input.move, boost: input.held.jump, jump: input.pressed.jump, yaw: p.yaw, pitch: p.pitch });
  p.previous = { ...input.held };
  p.rig.root.position.copy(P); const v = p.odm.player.velocity; if (v.lengthSq() > .5) p.rig.root.rotation.y = Math.atan2(v.x, v.z);
  p.strike -= dt;
  applyPose(p.rig, characterPose(p.strike > .2 ? 'strike' : p.odm.player.grounded ? (v.length() > 1 ? 'run' : 'idle') : 'odm', time, { progress: 1 - (p.strike - .2) / .4 }));
  if (input.pressed.attack && p.strike <= 0) { p.strike = .6; audio.play('dodge', 2, p.index ? .4 : -.4, .5); strike(p); }
  // Revive a downed partner by holding the action button nearby.
  const partner = players[1 - p.index];
  if (partner?.state === 'down' && P.distanceTo(partner.odm.player.position) < COOP_RULES.reviveRadius) {
    partner.revive = reviveProgress(partner.revive, dt, !!input.held.interact);
    if (partner.revive >= 1) { partner.state = 'active'; partner.revive = 0; partner.odm.player.health = 50; flash(partner, 'Reanimado!'); flash(p, 'Você levantou seu parceiro'); }
  }
}

function strike(p) {
  const P = p.odm.player.position, reach = p.odm.player.velocity.length() > 24 ? 8.5 : 6.5;
  for (const t of titans) {
    if (!t.alive) continue;
    t.titan.nape.getWorldPosition(tmp);
    const fwd = [Math.sin(t.titan.root.rotation.y), 0, Math.cos(t.titan.root.rotation.y)];
    if (!canStrikeNape(P.clone().setY(P.y + 1).toArray(), tmp.toArray(), fwd, 100, true) && P.distanceTo(tmp) > reach * .55) continue;
    const combined = combinedStrike(t.targetIndex ?? null, p.index);
    t.alive = false; kills++; particles.burst(tmp, 'blood', 28, 5); particles.burst(tmp, 'steam', 12, 4); audio.play('punch', 3, 0, .8);
    if (combined) { combos++; timer += COOP_RULES.comboBonus; flash(players[0], `Golpe combinado! +${COOP_RULES.comboBonus}s`); flash(players[1], `Golpe combinado! +${COOP_RULES.comboBonus}s`); }
    for (const q of players) if (q.grabbedBy === t) { q.state = 'active'; q.grabbedBy = null; q.odm.player.health = 35; flash(q, 'Solto! Seu parceiro cortou a nuca.'); }
    return;
  }
}

function updateTitans(dt) {
  for (const t of titans) {
    if (!t.alive) { t.death += dt; t.titan.root.rotation.x = -Math.min(1.5, t.death); if (t.death > 4) t.titan.root.visible = false; continue; }
    t.titan.animate(time);
    const targets = players.filter(p => p.state === 'active');
    if (!targets.length) continue;
    const pos = t.titan.root.position;
    const target = targets.reduce((a, b) => (a.odm.player.position.distanceTo(pos) < b.odm.player.position.distanceTo(pos) ? a : b));
    const to = target.odm.player.position.clone().sub(pos); to.y = 0; const dist = to.length();
    t.titan.root.rotation.y = Math.atan2(to.x, to.z); t.targetIndex = target.index;
    if (t.holding) {
      t.hold += dt; t.titan.arms[1].rotation.x = -2.2;
      if (t.hold > COOP_RULES.grabTime) { const victim = t.holding; victim.state = 'down'; victim.grabbedBy = null; victim.odm.player.position.y = 0; t.holding = null; flash(victim, 'Você caiu. Seu parceiro pode reanimá-lo.'); }
      continue;
    }
    if (t.windup > 0) {
      t.windup -= dt; t.titan.arms[1].rotation.x = -1.6;
      if (t.windup <= 0) {
        t.titan.hands[1].getWorldPosition(tmp);
        if (tmp.distanceTo(target.odm.player.position) < 4.5 && target.state === 'active') { target.state = 'grabbed'; target.grabbedBy = t; target.odm.releaseAll(); t.holding = target; t.hold = 0; flash(target, 'Agarrado! Seu parceiro precisa cortar a nuca deste titã.'); audio.play('heavy', 2, 0, .8); }
        t.titan.arms[1].rotation.x = 0;
      }
    } else if (dist < t.titan.spec.height * .5 && target.odm.player.position.y < t.titan.spec.height * .8) t.windup = .9;
    else if (dist > 2) { const step = Math.min(dist, t.speed * dt); pos.addScaledVector(to.normalize(), step); const s = Math.sin(time * t.speed * 2); t.titan.legs[0].rotation.x = s * .4; t.titan.legs[1].rotation.x = -s * .4; }
  }
}

function flash(p, text) { const el = $(`coop-msg-${p.index + 1}`); el.textContent = text; el.classList.add('visible'); clearTimeout(el.timer); el.timer = setTimeout(() => el.classList.remove('visible'), 1800); }

function finish(win) {
  state = 'finished'; $('coop-end').hidden = false; $('coop-hud').hidden = true; document.exitPointerLock?.();
  $('coop-end-title').textContent = win ? 'Campo limpo.' : 'A dupla caiu.';
  $('coop-end-stats').textContent = `${kills} / ${COOP_RULES.titans} titãs · ${combos} golpes combinados · ${Math.max(0, Math.round(timer))} s restantes`;
}

addEventListener('keydown', e => { keys.add(e.code); if (!e.repeat) edges.add(e.code); if (['Space', 'Tab'].includes(e.code)) e.preventDefault(); if (e.code === 'KeyF' && e.shiftKey) void toggleFullscreen(document, document.documentElement); });
addEventListener('keyup', e => keys.delete(e.code));
canvas.addEventListener('mousedown', e => { if (e.button === 0) edges.add('Mouse0'); if (state === 'playing' && !document.pointerLockElement) { try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* drag fallback */ } } });
addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { mouse[0] += e.movementX; mouse[1] += e.movementY; } });
$('coop-start').addEventListener('click', start);
$('coop-retry').addEventListener('click', () => location.reload());
$('coop-fullscreen').addEventListener('click', () => void toggleFullscreen(document, document.documentElement));
for (const [i, id] of ['coop-p1', 'coop-p2'].entries()) $(id).replaceChildren(...ROSTER.map(c => { const o = document.createElement('option'); o.value = c; o.textContent = CHARACTER_SPECS[c].name; o.selected = c === ['eren', 'mikasa'][i]; return o; }));
addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight)); renderer.setSize(innerWidth, innerHeight);

const overview = new THREE.PerspectiveCamera(50, 1, .1, 900); overview.position.set(0, 90, 150); overview.lookAt(0, 0, 0);
let last = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
  if (state === 'playing') {
    const inputs = readInputs(dt); mouse = [0, 0]; edges.clear();
    players.forEach((p, i) => updatePlayer(p, inputs[i], dt));
    updateTitans(dt); timer -= dt;
    if (kills >= COOP_RULES.titans) finish(true);
    else if (timer <= 0 || players.every(p => p.state !== 'active')) finish(false);
    for (const p of players) {
      const n = p.index + 1, o = p.odm.player;
      $(`coop-gas-${n}`).style.width = `${o.gas}%`; $(`coop-hp-${n}`).style.width = `${Math.max(0, o.health)}%`;
      $(`coop-state-${n}`).textContent = p.state === 'down' ? `CAÍDO · reanimação ${Math.round(p.revive * 100)}%` : p.state === 'grabbed' ? 'AGARRADO' : CHARACTER_SPECS[p.characterId].name.toUpperCase();
    }
    $('coop-kills').textContent = `${kills} / ${COOP_RULES.titans}`; $('coop-timer').textContent = `${Math.max(0, Math.ceil(timer))} s`;
  }
  particles.update(dt);
  const w = innerWidth, h = innerHeight;
  if (players.length) for (const p of players) {
    const P = p.odm.player.position, d = 6.5;
    p.camera.position.set(P.x - Math.sin(p.yaw) * Math.cos(p.pitch) * d, Math.max(.6, P.y + 2.4 - Math.sin(p.pitch) * d), P.z + Math.cos(p.yaw) * Math.cos(p.pitch) * d);
    p.camera.lookAt(P.x + Math.sin(p.yaw) * 20, P.y + 1.4 + Math.sin(p.pitch) * 10, P.z - Math.cos(p.yaw) * 20);
    const x = p.index * w / 2; p.camera.aspect = (w / 2) / h; p.camera.updateProjectionMatrix();
    renderer.setViewport(x, 0, w / 2, h); renderer.setScissor(x, 0, w / 2, h); renderer.render(scene, p.camera);
  } else { overview.aspect = w / h; overview.updateProjectionMatrix(); renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h); renderer.render(scene, overview); }
});
window.__COOP__ = Object.freeze({ snapshot: () => ({ state, kills, combos, timer, players: players.map(p => ({ id: p.characterId, state: p.state, revive: p.revive, position: p.odm.player.position.toArray(), health: p.odm.player.health })), titans: titans.filter(t => t.alive).length }), debugDown: i => { if (players[i]) { players[i].state = 'down'; } }, debugMove: (i, xyz) => players[i]?.odm.player.position.set(...xyz) });
