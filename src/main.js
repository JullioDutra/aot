import * as THREE from 'three';
import './style.css';
import { createWorld, createCadet, createTitan } from './world.js';
import { createBladeStrike, beginBladeStrike, stepBladeStrike, bladeStrikePhase, bladeStrikePose } from './blade-strike.js';
import { stepTrostTitan } from './trost-titan-ai.js';
import { clamp, cableAcceleration, canStrikeNape, insideSupplyRadius, formatTime } from './mechanics.js';
import { resolveMotion, segmentObstructed } from './collision.js';
import { stepEscort, escortPosition, escortProgress, ESCORT_ROUTE } from './civilian-escort.js';
import { animateCivilians } from './civilian-model.js';
import { selectAnchor } from './targeting.js';
import { LOCATIONS, createMission, missionStage, missionObjective, advanceMission, createCheckpoint, checkpointSpawn, loadCheckpoint, saveCheckpoint } from './trost-mission.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  $('fatal').hidden = false;
  $('fatal-message').textContent = `WebGL 2 indisponível. Ative a aceleração gráfica ou use outro navegador. ${error.message}`;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#b3c5c5'); scene.fog = new THREE.FogExp2('#b4c4bd', .0035);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .15, 1000);
const hemi = new THREE.HemisphereLight('#d8e8ef', '#706d52', 2.2); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe0a6', 3.1); sun.position.set(-80, 120, 65); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 400 });
sun.shadow.bias = -.0003; sun.shadow.normalBias = .4; scene.add(sun);
const skyGeo = new THREE.SphereGeometry(750, 32, 16);
const sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color('#668d9d') }, bottom: { value: new THREE.Color('#e4d5b5') } }, vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: `varying vec3 vPosition; uniform vec3 top; uniform vec3 bottom;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){vec3 direction=normalize(vPosition);float t=pow(max(direction.y,0.0),0.55);vec3 col=mix(bottom,top,t);vec2 uv=direction.xz/max(.08,direction.y)*2.0;float clouds=noise(uv)*.55+noise(uv*2.1)*.28+noise(uv*4.2)*.17;float mask=smoothstep(.53,.8,clouds)*smoothstep(.03,.25,direction.y)*.5;col=mix(col,vec3(.9,.91,.87),mask);gl_FragColor=vec4(col,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` })); scene.add(sky);
const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(12, 20, 12), new THREE.MeshBasicMaterial({ color: '#fff2c9', fog: false })); sunDisk.position.set(-230, 180, -470); scene.add(sunDisk);
const world = createWorld(scene), cadet = createCadet(scene);
const bladeTrails = cadet.arms.map(arm => {
  const trail = new THREE.Mesh(new THREE.RingGeometry(.7, 1.25, 20, 1, -.8, 1.6), new THREE.MeshBasicMaterial({ color: '#e3f3e8', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  trail.rotation.y = Math.PI / 2; trail.position.set(0, -.55, .6); trail.visible = false; arm.add(trail); return trail;
});
const titans = [createTitan(scene, 1, -6, 15, 0), createTitan(scene, -3, -62, 18, 1), createTitan(scene, 10, -112, 13, 2)];
// Ground sector matches the frontal strike cone (dot > .25, radius 9 m).
const strikeSector = new THREE.RingGeometry(.35, 9, 40, 1, -Math.PI / 2 - Math.acos(.25), 2 * Math.acos(.25));
for (const t of titans) {
  const sector = new THREE.Mesh(strikeSector, new THREE.MeshBasicMaterial({ color: '#ef9b53', transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
  sector.rotation.x = -Math.PI / 2;
  t.telegraph = new THREE.Group(); t.telegraph.add(sector); t.telegraph.visible = false; scene.add(t.telegraph);
}
const waypoint = new THREE.Mesh(new THREE.OctahedronGeometry(.85), new THREE.MeshBasicMaterial({ color: '#edc987', transparent: true, opacity: .85 })); scene.add(waypoint); waypoint.visible = false;
function updateMissionGuide(objective) {
  let destination = objective.position ? new THREE.Vector3(...objective.position) : null;
  if (missionStage(mission) === 'combat') {
    const next = titans.find(t => t.alive);
    if (next) { next.root.updateWorldMatrix(true, true); destination = next.nape.getWorldPosition(new THREE.Vector3()); }
  }
  waypoint.visible = !!destination && mode === 'playing';
  $('waypoint-label').hidden = !destination; $('mission-nav').hidden = !destination;
  if (!destination) return;
  const target = destination.clone(); if (objective.position) target.y += 4;
  waypoint.position.copy(target);
  const delta = destination.clone().sub(player.position), meters = Math.round(delta.length());
  const angle = Math.atan2(delta.x, -delta.z) - yaw;
  $('mission-nav-arrow').style.transform = `rotate(${angle}rad)`;
  $('mission-nav-text').textContent = `${meters} m · ${objective.title}`;
  const screen = target.project(camera);
  $('waypoint-label').hidden = screen.z < -1 || screen.z > 1 || Math.abs(screen.x) > .9 || Math.abs(screen.y) > .8;
  $('waypoint-label').style.left = `${(screen.x + 1) * 50}%`; $('waypoint-label').style.top = `${(1 - screen.y) * 50}%`;
  $('waypoint-label').textContent = `${objective.key} · ${meters} m`;
}
const raycaster = new THREE.Raycaster(); const napePosition = new THREE.Vector3();
const player = { position: new THREE.Vector3(-25, 17, 65), velocity: new THREE.Vector3(), health: 100, gas: 100, blades: 100, grounded: true, invincible: 0 };
cadet.root.position.copy(player.position);
let mission = createMission(), checkpointStorage;
let bladeStrike = createBladeStrike();
let escortStatus = 'idle', escortHeading = 0;
try { checkpointStorage = window.localStorage; } catch { /* Session-only checkpoints remain available. */ }
let checkpoint = loadCheckpoint(checkpointStorage), checkpointPersistent = !!checkpoint;
let mode = 'menu', yaw = -.5, pitch = 0, elapsed = 0, kills = 0, rescued = false, toastTime = 0, damageTime = 0;
let sensitivity = 1, dragging = false, jumpQueued = false, soundEnabled = true, audioContext, hookToneTime = 0;
let cameraInitialized = false;
let assistedAnchors = true, fovEffect = true;
const keys = new Set(), effects = [];
const hooks = [-1, 1].map(side => {
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#e5ddbf' })); line.visible = false; line.frustumCulled = false; scene.add(line);
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.16), new THREE.MeshBasicMaterial({ color: '#ead5a5' })); tip.visible = false; scene.add(tip);
  return { side, point: new THREE.Vector3(), length: 0, active: false, line, tip, releasedBy: null };
});
const particleGeometry = new THREE.SphereGeometry(1, 6, 4);
const particleMaterials = { steam: new THREE.MeshBasicMaterial({ color: '#e3e6da', transparent: true, opacity: .3, depthWrite: false }), spark: new THREE.MeshBasicMaterial({ color: '#ffe1a0', transparent: true }), blood: new THREE.MeshBasicMaterial({ color: '#943f31', transparent: true }) };
function particles(position, kind, count = 8, strength = 5) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(particleGeometry, particleMaterials[kind].clone()); m.position.copy(position); m.scale.setScalar(kind === 'steam' ? .35 + Math.random() * .5 : .08 + Math.random() * .12); scene.add(m);
    effects.push({ mesh: m, velocity: new THREE.Vector3((Math.random() - .5) * strength, Math.random() * strength, (Math.random() - .5) * strength), life: kind === 'steam' ? 1.5 : .6, maxLife: kind === 'steam' ? 1.5 : .6, kind });
  }
}
function sound(freq = 200, duration = .12, type = 'triangle', volume = .06) {
  if (!soundEnabled || !audioContext) return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(freq, audioContext.currentTime); oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, freq * .4), audioContext.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}
function toast(message, duration = 3) { $('toast').textContent = message; $('toast').classList.add('visible'); toastTime = duration; }
function releaseHook(h, reason = 'manual') { h.active = false; h.line.visible = h.tip.visible = false; h.releasedBy = reason; }
function clearHooks() { hooks.forEach(h => releaseHook(h)); }
function clearInput() { keys.clear(); dragging = false; jumpQueued = false; clearHooks(); }
function lockMouse() {
  try { const result = canvas.requestPointerLock?.(); result?.catch(() => toast('Arraste a cena para olhar; Q/E continuam prendendo os cabos.')); } catch { toast('Arraste a cena para controlar a câmera.'); }
}
function start() {
  $('landing').hidden = true; $('operation-card').hidden = true; $('landing-footer').hidden = true; $('pause').hidden = true; $('result').hidden = true; $('hud').hidden = false;
  document.body.classList.add('playing'); mode = 'playing'; clearInput();
  if (!audioContext) { try { audioContext = new AudioContext(); } catch { /* Audio is optional. */ } }
  audioContext?.resume().catch(() => {}); lockMouse(); toast(`${missionObjective(mission).title}. ${missionObjective(mission).detail}`, 6);
}
function reset(save = true) {
  mission = createMission(); escortStatus = 'idle'; escortHeading = 0; world.civilians.position.copy(world.rescue);
  player.position.set(-25, 17, 65); player.velocity.set(0, 0, 0); Object.assign(player, { health: 100, gas: 100, blades: 100, grounded: true, invincible: 0 });
  elapsed = kills = damageTime = 0; bladeStrike = createBladeStrike(); rescued = false; yaw = -.5; pitch = 0; cameraInitialized = false; world.civilians.visible = true;
  for (const t of titans) { t.alive = true; t.deathTime = 0; t.root.visible = true; t.root.position.copy(t.spawn); t.root.rotation.set(0, Math.PI, 0); t.yaw = Math.PI; t.attackTimer = 0; t.phase = 'walk'; t.telegraph.visible = false; }
  for (const effect of effects) { scene.remove(effect.mesh); effect.mesh.material.dispose(); } effects.length = 0;
  if (save) recordCheckpoint();
  start();
}
function pause() { if (mode !== 'playing') return; mode = 'paused'; clearInput(); $('pause').hidden = false; if (document.pointerLockElement) document.exitPointerLock(); }
function finish(victory) {
  mode = victory ? 'won' : 'dead'; clearInput(); if (document.pointerLockElement) document.exitPointerLock();
  $('result-label').textContent = victory ? 'OPERAÇÃO CONCLUÍDA' : 'OPERAÇÃO INTERROMPIDA';
  $('result-title').textContent = victory ? 'O distrito respira.' : 'Ainda podemos lutar.';
  $('result-description').textContent = victory ? 'Civis encaminhados, abastecimento recuperado e retirada confirmada. Este ensaio é uma missão original inspirada em Trost, fora da continuidade canônica.' : 'Você foi derrubado. Retome o checkpoint com os objetivos e abates já registrados, ou inicie uma nova operação.';
  $('result-stats').textContent = `${kills} / 3 titãs · ${formatTime(elapsed)} · Civis ${rescued ? 'resgatados' : 'não resgatados'}`;
  $('result').hidden = false;
  refreshCheckpointButtons();
}
function forward() { return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); }
function hookOrigin(side) {
  return player.position.clone().add(new THREE.Vector3(Math.cos(yaw) * side * .35, 1.1, Math.sin(yaw) * side * .35));
}
function aimHit(index) {
  const other = hooks[1 - index];
  return selectAnchor(camera, hookOrigin(hooks[index].side), hooks[index].side, world.anchors, world.colliders, assistedAnchors, other.active ? other.point : null);
}
function validateCables() {
  let blocked = false;
  for (const hook of hooks) if (hook.active && segmentObstructed(hookOrigin(hook.side).toArray(), hook.point.toArray(), world.colliders)) {
    releaseHook(hook, 'obstacle'); blocked = true;
  }
  if (blocked) toast('Cabo solto: obstáculo no caminho. Escolha outra ancoragem.', 2);
}
function strikeAvailable(t, blades = player.blades) {
  if (!t.alive) return false;
  t.root.updateWorldMatrix(true, true); t.nape.getWorldPosition(napePosition);
  const origin = player.position.clone().add(new THREE.Vector3(0, 1, 0));
  const offset = napePosition.clone().sub(origin);
  return canStrikeNape(origin.toArray(), napePosition.toArray(), [Math.sin(t.yaw), 0, Math.cos(t.yaw)], blades, t.alive)
    && (offset.lengthSq() < 1 || offset.normalize().dot(forward()) > .25)
    && !segmentObstructed(origin.toArray(), napePosition.toArray(), world.colliders, .05);
}
function attach(side) {
  if (mode !== 'playing') return;
  if (player.gas < 1) { toast('Sem gás. Procure a caixa azul na praça e pressione R.'); return; }
  const h = hooks[side]; if (h.active) return;
  const hit = aimHit(side);
  if (!hit) { toast('Mire em uma fachada, telhado ou muralha a até 90 m.', 1.8); return; }
  h.point.copy(hit.point); h.length = Math.max(3, player.position.distanceTo(h.point) * .65); h.active = true; h.releasedBy = null; h.line.visible = h.tip.visible = true; h.tip.position.copy(h.point); player.gas -= .6; sound(720, .12, 'sawtooth', .025);
}
function attack() {
  if (mode !== 'playing' || bladeStrike.active) return;
  if (player.blades <= 0) { toast('Lâminas esgotadas. Abasteça na caixa azul com R.'); return; }
  const started = beginBladeStrike(bladeStrike, player.blades);
  if (!started.accepted) return;
  bladeStrike = started.state; player.blades -= started.cost;
}
function resolveBladeImpact() {
  sound(530, .12, 'sawtooth', .025);
  let struck = false;
  for (const t of titans) {
    if (!t.alive) continue;
    if (strikeAvailable(t, 1)) { // This swing was already paid for at preparation.
      t.alive = false; t.deathTime = 0; kills++; struck = true; particles(napePosition, 'spark', 12, 12); particles(napePosition, 'blood', 14, 7); sound(85, .3, 'triangle', .15);
      missionEvent({ type: 'defeat', id: t.index });
      break;
    }
  }
  if (!struck) toast('Ataque por trás, na altura da nuca, a menos de 7 m.', 1.5);
}
function damage(amount, direction) {
  if (player.invincible > 0 || mode !== 'playing') return;
  bladeStrike = createBladeStrike();
  player.health = Math.max(0, player.health - amount); player.invincible = 1.8; damageTime = .6; player.velocity.addScaledVector(direction, 15); player.velocity.y = 9; clearHooks(); sound(55, .3, 'sawtooth', .06);
  if (player.health <= 0) finish(false); else toast('Saia do alcance dos braços. Ganhe altura!', 2);
}
function refreshCheckpointButtons() {
  const available = !!checkpoint && !checkpoint.mission.extracted;
  document.body.classList.toggle('has-checkpoint', available);
  $('continue-button').hidden = !available;
  $('checkpoint-button').hidden = !available;
  $('result-checkpoint').hidden = !available || mode === 'won';
  $('save-status').textContent = checkpoint ? `${checkpointPersistent ? 'Checkpoint salvo neste navegador' : 'Checkpoint disponível somente nesta sessão'} · etapa ${missionObjective(checkpoint.mission).order}/4` : 'Checkpoints automáticos ao concluir objetivos';
}
function recordCheckpoint() {
  checkpoint = createCheckpoint(mission, elapsed);
  checkpointPersistent = saveCheckpoint(checkpointStorage, checkpoint);
  refreshCheckpointButtons();
}
function restoreCheckpoint() {
  if (!checkpoint || checkpoint.mission.extracted) return;
  const saved = structuredClone(checkpoint);
  reset(false);
  mission = saved.mission; elapsed = saved.elapsed;
  rescued = mission.rescued; kills = mission.defeated.length;
  player.position.fromArray(checkpointSpawn(mission)); player.velocity.set(0, 0, 0); player.grounded = true; player.invincible = 2;
  yaw = 0; pitch = 0; cameraInitialized = false;
  for (const t of titans) { t.alive = !mission.defeated.includes(t.index); t.root.visible = t.alive; }
  world.civilians.visible = true; world.civilians.position.fromArray(escortPosition(mission.escort));
  toast(`Checkpoint retomado · ${missionObjective(mission).title}`, 5);
  updateHUD();
}
function missionEvent(event) {
  const result = advanceMission(mission, { position: player.position.toArray(), ...event });
  mission = result.state; rescued = mission.rescued; kills = mission.defeated.length;
  if (result.changed) { recordCheckpoint(); sound(780, .2); }
  if (result.message) toast(`${result.message}${result.changed && !mission.extracted ? (checkpointPersistent ? ' · Checkpoint salvo neste navegador.' : ' · Checkpoint apenas nesta sessão.') : ''}`, 5);
  if (mission.extracted) finish(true);
  updateHUD();
}
function interact(type) {
  if (mode !== 'playing') return;
  if (type === 'supply') {
    if (insideSupplyRadius(player.position.toArray(), world.supply.toArray())) { player.gas = player.blades = player.health = 100; sound(600, .2); }
    missionEvent({ type: 'supply' });
  } else if (missionStage(mission) === 'extraction') missionEvent({ type: 'extract' });
  else missionEvent({ type: 'rescue' });
}

function updateCivilians(dt) {
  if (mission.escort && !mission.rescued) {
    const previous = escortPosition(mission.escort);
    const step = stepEscort(mission.escort, dt, player.position.toArray(), titans.filter(t => t.alive).map(t => t.root.position.toArray()));
    mission.escort = step.escort;
    if (step.reason !== escortStatus && step.reason === 'danger') toast('Titã perto do grupo. Afaste a ameaça para liberar a passagem.', 4);
    if (step.reason !== escortStatus && step.reason === 'waiting') toast('Os civis aguardam. Aproxime-se do grupo para continuar.', 4);
    escortStatus = step.reason;
    if (step.reason === 'moving') escortHeading = Math.atan2(step.position[0] - previous[0], step.position[2] - previous[2]);
    world.civilians.position.fromArray(step.position);
    if (step.reason === 'safe') missionEvent({ type: 'escort-arrived' });
    else if (step.reachedWaypoint) recordCheckpoint();
  } else {
    escortStatus = mission.rescued ? 'safe' : 'idle';
    world.civilians.position.fromArray(mission.rescued ? ESCORT_ROUTE.at(-1) : world.rescue.toArray());
  }
  animateCivilians(world.civilianActors, escortStatus === 'moving', elapsed, escortHeading, escortStatus === 'danger');
}

function integratePlayer(dt) {
  validateCables();
  const wasGrounded = player.grounded;
  const dir = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)); const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  const move = new THREE.Vector3();
  if (keys.has('KeyW')) move.add(dir); if (keys.has('KeyS')) move.sub(dir); if (keys.has('KeyD')) move.add(right); if (keys.has('KeyA')) move.sub(right); if (move.lengthSq() > 0) move.normalize();
  const attached = hooks.some(h => h.active), boost = keys.has('Space') && attached && player.gas > 0;
  const acc = new THREE.Vector3(0, -22, 0); acc.addScaledVector(move, wasGrounded ? 55 : 16);
  if (jumpQueued && wasGrounded) { player.velocity.y = 10; player.grounded = false; } jumpQueued = false;
  for (const hook of hooks) {
    if (!hook.active) continue;
    if (player.gas <= 0) { clearHooks(); toast('Gás esgotado. Procure o abastecimento.'); break; }
    hook.length = Math.max(2.5, hook.length - dt * (boost ? 16 : 8));
    acc.add(new THREE.Vector3(...cableAcceleration(player.position.toArray(), player.velocity.toArray(), hook.point.toArray(), hook.length, boost)));
  }
  if (attached) { player.gas = Math.max(0, player.gas - dt * (boost ? 5.5 : 1.4)); if (boost) acc.addScaledVector(forward(), 16); }
  player.velocity.addScaledVector(acc, dt);
  const drag = Math.exp(-(wasGrounded && !attached ? 7 : .28) * dt); player.velocity.x *= drag; player.velocity.z *= drag;
  if (player.velocity.length() > 55) player.velocity.setLength(55);
  const previous = player.position.clone(); player.position.addScaledVector(player.velocity, dt);
  const resolved = resolveMotion(previous.toArray(), player.position.toArray(), player.velocity.toArray(), world.colliders, wasGrounded);
  player.position.fromArray(resolved.position); player.velocity.fromArray(resolved.velocity); player.grounded = resolved.grounded;
  validateCables();
  // The prototype keeps all play inside the authored district.
  player.position.x = clamp(player.position.x, -138, 138); player.position.z = clamp(player.position.z, -151, 127);
  if (player.position.y > 85) { player.position.y = 85; player.velocity.y = Math.min(0, player.velocity.y); }
}
function updateTitans(dt, time, active) {
  for (const t of titans) {
    if (!t.alive) {
      t.telegraph.visible = false;
      t.deathTime += dt; t.root.rotation.x = -Math.min(1.45, t.deathTime * .8);
      if (t.deathTime < 4 && Math.random() < .5) particles(t.root.position.clone().add(new THREE.Vector3(0, 5, 0)), 'steam', 1, 5);
      if (t.deathTime > 5) t.root.visible = false; continue;
    }
    let walking = false;
    if (active) {
      const visible = !segmentObstructed(
        [t.root.position.x, t.height * .55, t.root.position.z],
        [player.position.x, player.position.y + 1, player.position.z], world.colliders, .05);
      const next = stepTrostTitan(t, { position: t.root.position.toArray(), player: player.position.toArray(), height: t.height, index: t.index, visible }, dt);
      t.phase = next.phase; t.attackTimer = next.attackTimer; t.yaw = next.yaw; walking = next.moving;
      t.root.position.fromArray(next.position);
      if (next.hit) damage(35, new THREE.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw)));
    }
    t.root.rotation.y = t.yaw;
    t.telegraph.visible = active && t.phase === 'windup';
    t.telegraph.position.set(t.root.position.x, .12, t.root.position.z); t.telegraph.rotation.y = t.yaw;
    t.telegraph.children[0].material.opacity = .18 + .25 * (1 - t.attackTimer / .9);
    t.legs.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(time * 2.5 + i * Math.PI) * .22 : Math.sin(time + i * 2) * .025; });
    t.arms.forEach((arm, i) => { const pose = t.phase === 'windup' ? -1.9 : t.phase === 'recover' ? -.5 : Math.sin(time * 2.5 + i * Math.PI) * .12; arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, pose, 7, dt); arm.rotation.z = (i === 0 ? .08 : -.08); });
  }
}
function updateCamera(dt, menu = false) {
  if (menu) { camera.position.set(78 + Math.sin(performance.now() * .000035) * 5, 52, 115); camera.lookAt(-13, 18, -42); camera.fov = 58; camera.updateProjectionMatrix(); return; }
  const target = player.position.clone().add(new THREE.Vector3(0, 2.4, 0));
  const direction = forward(); const desired = target.clone().addScaledVector(direction, -8.5); desired.y += 1.4;
  const cameraDirection = desired.clone().sub(target); const length = cameraDirection.length();
  raycaster.set(target, cameraDirection.normalize()); raycaster.far = length;
  const obstruction = raycaster.intersectObjects(world.anchors, false)[0];
  if (obstruction) desired.copy(target).addScaledVector(cameraDirection, Math.max(.8, obstruction.distance - .4));
  desired.y = Math.max(.8, desired.y);
  if (!cameraInitialized) { camera.position.copy(desired); cameraInitialized = true; } else camera.position.lerp(desired, 1 - Math.exp(-12 * dt));
  const actualOffset = camera.position.clone().sub(target);
  raycaster.set(target, actualOffset.clone().normalize()); raycaster.far = actualOffset.length();
  const crossing = raycaster.intersectObjects(world.anchors, false)[0];
  if (crossing) camera.position.copy(target).addScaledVector(actualOffset.normalize(), Math.max(.35, crossing.distance - .35));
  camera.lookAt(target.clone().addScaledVector(direction, 22));
  camera.fov = THREE.MathUtils.damp(camera.fov, 65 + (fovEffect ? Math.min(10, player.velocity.length() * .2) : 0), 4, dt); camera.updateProjectionMatrix();
}
function updateHUD() {
  for (const name of ['gas', 'blades', 'health']) { const key = name === 'blades' ? 'blade' : name; $(`${key}-value`).textContent = `${Math.ceil(player[name])}%`; $(`${key}-bar`).style.width = `${player[name]}%`; }
  $('speed').textContent = Math.round(player.velocity.length() * 3.6); $('altitude').textContent = `${Math.round(player.position.y)} M · ALTITUDE`;
  const objective = missionObjective(mission);
  const bladeLabels = { ready: player.blades > 0 ? 'LÂMINAS PRONTAS' : 'LÂMINAS ESGOTADAS · Reabasteça com R', prepare: 'PREPARANDO CORTE', cut: 'CORTE', recover: 'RECUPERANDO LÂMINAS' };
  $('blade-action').textContent = bladeLabels[bladeStrikePhase(bladeStrike)];
  const threat = titans.filter(t => t.alive && t.phase !== 'walk' && t.root.position.distanceTo(player.position) < 25)
    .sort((a, b) => a.root.position.distanceToSquared(player.position) - b.root.position.distanceToSquared(player.position))[0];
  $('combat-warning').hidden = !threat;
  if (threat) $('combat-warning').textContent = threat.phase === 'windup'
    ? `GOLPE EM ${Math.max(0, threat.attackTimer).toFixed(1)} s · Saia do setor ou ganhe altura`
    : 'TITÃ EM RECUPERAÇÃO · Contorne e alcance a nuca';
  $('objective').textContent = objective.title; $('rescue-status').textContent = objective.detail;
  $('mission-phase').textContent = `ETAPA ${objective.order} / 4 · ${missionStage(mission) === 'complete' ? 'CONCLUÍDA' : 'ROTA DE RETIRADA'}`;
  updateMissionGuide(objective);
  $('escort-status').hidden = !mission.escort && !mission.rescued;
  const escortLabels = { idle: 'Grupo aguardando', moving: 'Civis em movimento', waiting: 'Aguardando sua aproximação', danger: 'Passagem bloqueada por titã', safe: '3 / 3 civis no abrigo' };
  $('escort-status').textContent = `${escortLabels[escortStatus]}${mission.rescued ? '' : ` · ${Math.round(escortProgress(mission.escort) * 100)}% da rota`}`;
  const hits = hooks.map((h, i) => h.active ? { point: h.point, distance: h.point.distanceTo(hookOrigin(h.side)) } : aimHit(i));
  $('reticle').classList.toggle('valid', hits.some(Boolean));
  let hint = hits.some(Boolean) ? 'Q / E · ANCORAGENS INDEPENDENTES' : 'SEM ANCORAGEM';
  hits.forEach((hit, i) => {
    const marker = $(i === 0 ? 'anchor-left' : 'anchor-right');
    marker.hidden = !hit;
    if (!hit) return;
    const screen = hit.point.clone().project(camera);
    marker.hidden = screen.z < -1 || screen.z > 1 || Math.abs(screen.x) > 1 || Math.abs(screen.y) > 1;
    marker.style.left = `${(screen.x + 1) * 50}%`; marker.style.top = `${(1 - screen.y) * 50}%`;
    marker.classList.toggle('attached', hooks[i].active); marker.textContent = `${i === 0 ? 'Q' : 'E'} · ${Math.round(hit.distance)} m`;
  });
  $('nape-marker').hidden = true;
  for (const t of titans) {
    if (!strikeAvailable(t)) continue;
    const screen = napePosition.clone().project(camera);
    if (Math.abs(screen.x) <= 1 && Math.abs(screen.y) <= 1 && screen.z > -1 && screen.z < 1) {
      $('nape-marker').hidden = false; $('nape-marker').style.left = `${(screen.x + 1) * 50}%`; $('nape-marker').style.top = `${(1 - screen.y) * 50}%`;
    }
    hint = 'NUCA EXPOSTA · CLIQUE PARA ATACAR'; break;
  }
  if (insideSupplyRadius(player.position.toArray(), world.supply.toArray())) hint = 'R · REABASTECER EQUIPAMENTO';
  if (!rescued && !mission.escort && player.position.distanceTo(world.rescue) < 9) hint = 'G · RESGATAR CIVIS';
  if (missionStage(mission) === 'extraction' && player.position.distanceTo(world.extraction) < 9) hint = 'G · CONFIRMAR RETIRADA';
  $('target-hint').textContent = hint;
}

$('start-button').addEventListener('click', () => reset()); $('resume-button').addEventListener('click', start); $('restart-button').addEventListener('click', () => reset()); $('retry-button').addEventListener('click', () => reset());
for (const id of ['continue-button', 'checkpoint-button', 'result-checkpoint']) $(id).addEventListener('click', restoreCheckpoint);
refreshCheckpointButtons();
$('settings-button').addEventListener('click', () => { if (mode === 'playing') pause(); $('settings').hidden = false; });
$('close-settings').addEventListener('click', () => { $('settings').hidden = true; });
$('sensitivity').addEventListener('input', e => { sensitivity = Number(e.target.value); });
$('anchor-assist').addEventListener('change', e => { assistedAnchors = e.target.checked; });
$('fov-effect').addEventListener('change', e => { fovEffect = e.target.checked; });
$('audio-enabled').addEventListener('change', e => { soundEnabled = e.target.checked; });
$('quality').addEventListener('change', e => {
  const value = e.target.value; renderer.setPixelRatio(Math.min(devicePixelRatio, value === 'high' ? 1.6 : value === 'medium' ? 1.1 : .8)); renderer.shadowMap.enabled = value !== 'low';
  scene.traverse(object => { if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => { m.needsUpdate = true; }); } });
});
addEventListener('keydown', event => {
  if (event.code === 'Escape') { if (!$('settings').hidden) { $('settings').hidden = true; return; } pause(); return; }
  if (mode !== 'playing') return;
  if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyG'].includes(event.code)) event.preventDefault();
  keys.add(event.code); if (event.repeat) return;
  if (event.code === 'Space') jumpQueued = true;
  if (event.code === 'KeyQ') attach(0); if (event.code === 'KeyE') attach(1); if (event.code === 'KeyR') interact('supply'); if (event.code === 'KeyG') interact('rescue');
});
addEventListener('keyup', event => { keys.delete(event.code); const index = event.code === 'KeyQ' ? 0 : event.code === 'KeyE' ? 1 : -1; if (index >= 0) releaseHook(hooks[index]); });
canvas.addEventListener('mousedown', event => { if (mode !== 'playing') return; if (event.button === 0) attack(); dragging = true; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', event => { if (mode !== 'playing' || (!dragging && document.pointerLockElement !== canvas)) return; yaw += event.movementX * .0022 * sensitivity; pitch = clamp(pitch - event.movementY * .0022 * sensitivity, -.9, 1.1); });
canvas.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && mode === 'playing') pause(); });
addEventListener('blur', pause); document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); pause(); $('fatal-message').textContent = 'O contexto gráfico foi perdido. Recarregue a página e tente a qualidade Desempenho.'; $('fatal').hidden = false; });

let previousTime = performance.now(), uiTimer = 0;
function animate(now) {
  requestAnimationFrame(animate); const dt = Math.min((now - previousTime) / 1000, .05); previousTime = now; const time = now / 1000;
  waypoint.rotation.y = time * .7; world.extractionBeacon.visible = missionStage(mission) === 'extraction';
  world.marker.position.y = 5 + Math.sin(time * 2) * .3; world.marker.rotation.y = time;
  for (const flag of world.flags) { const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 2 + time * 3) * .13 * (p.getX(i) + 1)); p.needsUpdate = true; }
  if (mode === 'menu') { updateCamera(dt, true); updateTitans(dt, time, false); }
  if (mode === 'playing') {
    elapsed += dt; player.invincible = Math.max(0, player.invincible - dt); damageTime = Math.max(0, damageTime - dt);
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))); for (let i = 0; i < steps; i++) integratePlayer(dt / steps);
    updateTitans(dt, time, true);
    if (mode === 'playing') {
      const swing = stepBladeStrike(bladeStrike, dt); bladeStrike = swing.state;
      if (swing.impact) resolveBladeImpact();
      updateCivilians(dt);
    }
    updateCamera(dt);
    cadet.root.position.copy(player.position); cadet.root.rotation.y = Math.PI - yaw;
    const moving = Math.hypot(player.velocity.x, player.velocity.z), attached = hooks.some(h => h.active);
    cadet.legs.forEach((leg, i) => { leg.rotation.x = player.grounded ? Math.sin(time * 13 + i * Math.PI) * Math.min(.6, moving * .08) : -.4 + i * .6; });
    cadet.arms.forEach((arm, i) => {
      const pose = bladeStrikePose(bladeStrike, i ? 1 : -1, attached ? -1.7 : -.3);
      arm.rotation.x = pose.x; arm.rotation.z = pose.z;
      bladeTrails[i].visible = pose.trail > 0; bladeTrails[i].material.opacity = pose.trail;
    });
    const capeVertices = cadet.cape.geometry.attributes.position;
    for (let i = 0; i < capeVertices.count; i++) capeVertices.setZ(i, Math.sin(time * 8 + capeVertices.getY(i) * 4) * .08 - (1 - capeVertices.getY(i)) * Math.min(.5, moving * .02)); capeVertices.needsUpdate = true;
    for (const hook of hooks) if (hook.active) {
      const positions = hook.line.geometry.attributes.position; const origin = hookOrigin(hook.side); positions.setXYZ(0, origin.x, origin.y, origin.z); positions.setXYZ(1, hook.point.x, hook.point.y, hook.point.z); positions.needsUpdate = true;
    }
    if (attached && keys.has('Space')) { hookToneTime -= dt; if (hookToneTime <= 0) { particles(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 'steam', 2, 1); hookToneTime = .09; } }
    toastTime -= dt; if (toastTime <= 0) $('toast').classList.remove('visible'); $('damage-flash').style.opacity = damageTime > 0 ? String(damageTime) : '0';
    uiTimer -= dt; if (uiTimer <= 0) { updateHUD(); uiTimer = .08; }
  }
  if (mode === 'playing' || mode === 'menu') for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i]; effect.life -= dt; effect.mesh.position.addScaledVector(effect.velocity, dt); if (effect.kind !== 'steam') effect.velocity.y -= dt * 12; else effect.mesh.scale.multiplyScalar(1 + dt);
    effect.mesh.material.opacity = Math.max(0, effect.life / effect.maxLife) * (effect.kind === 'steam' ? .3 : 1);
    if (effect.life <= 0) { scene.remove(effect.mesh); effect.mesh.material.dispose(); effects.splice(i, 1); }
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// Read-only diagnostics are available for smoke tests; no teleport or combat cheats ship.
window.__TROST__ = Object.freeze({ snapshot: () => ({ mode, bladeStrike: { ...bladeStrike }, bladePhase: bladeStrikePhase(bladeStrike), elapsed, kills, rescued, mission: structuredClone(mission), stage: missionStage(mission), checkpoint: checkpoint ? structuredClone(checkpoint) : null, checkpointPersistent, escortStatus, civilianPosition: world.civilians.position.toArray(), grounded: player.grounded, yaw, pitch, assistedAnchors, fovEffect, health: player.health, gas: player.gas, blades: player.blades, position: player.position.toArray(), velocity: player.velocity.toArray(), hooks: hooks.map(h => ({ active: h.active, point: h.point.toArray(), releasedBy: h.releasedBy })), titans: titans.map(t => ({ alive: t.alive, phase: t.phase, attackTimer: t.attackTimer, yaw: t.yaw, telegraphVisible: t.telegraph.visible, position: t.root.position.toArray() })), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }) });
