import * as THREE from 'three';
import { CHARACTER_SPECS } from '../character-specs.js';
import { createCharacter } from '../character-model.js';
import { characterPose, applyPose } from '../character-animation.js';
import { TITAN_FORMS, createTitanForm } from '../titan-forms.js';
import { canStrikeNape } from '../mechanics.js';
import { createParticles } from './props.js';
import { createOdm } from './odm-controller.js';
import { moveWithCollisions } from './shiganshina-world.js';
import { titanIntent, titanSpeed, grabReach } from './story-rules.js';

// Building blocks shared by the story chapters from 3 on: lights and camera
// shots, actors that walk scripted paths, a walking player, an ODM pilot with
// blades, a horde of pure titans and a titan the player can steer.
// Camera convention for every controller: forward = (sin yaw, 0, -cos yaw).
export const titanForm = id => TITAN_FORMS.find(t => t.id === id);
const forwardOf = yaw => new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));

export function createStage({ scene, camera, ui, audio, sky = '#c9d6d2', fog = [140, 520], sun = [-90, 140, 60], shadow = 150, hemi = ['#eef4f0', '#7c7558', 1.7], light = ['#ffe6bd', 2.6] }) {
  scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, fog[0], fog[1]);
  const hemisphere = new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]); scene.add(hemisphere);
  const sunLight = new THREE.DirectionalLight(light[0], light[1]); sunLight.position.set(...sun); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048); Object.assign(sunLight.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 600 }); scene.add(sunLight, sunLight.target);
  const particles = createParticles(scene, 700);
  const actors = new Map(), timeline = [];
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
  const stage = {
    scene, camera, ui, audio, particles, actors, sun: sunLight, hemisphere, time: 0, shot: null, shakeAmount: 0, ground: () => 0,
    after(seconds, fn) { timeline.push({ at: stage.time + seconds, fn }); },
    setShot(position, target, fov = 55) { stage.shot = { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), fov }; },
    clearShot() { stage.shot = null; },
    shake(amount) { stage.shakeAmount = Math.max(stage.shakeAmount, amount); },
    // Moves the sun's shadow box with the action.
    focusLight(x, z) { sunLight.target.position.set(x, 0, z); sunLight.position.set(x + sun[0], sun[1], z + sun[2]); },
    actor(id, spec, x, z, yaw = 0, options = {}) {
      const base = typeof spec === 'string' ? CHARACTER_SPECS[spec] : spec;
      const o = options.override ?? {};
      const rig = createCharacter({ ...base, ...o, hair: { ...base.hair, ...o.hair }, face: { ...base.face, ...o.face } }, options);
      rig.root.position.set(x, options.y ?? stage.ground(x, z), z); rig.root.rotation.y = yaw; scene.add(rig.root);
      const a = { id, rig, pose: options.pose ?? 'idle', speed: 1, path: null, t: Math.random() * 3, progress: 0, onArrive: null, follow: null };
      actors.set(id, a); return a;
    },
    walkTo(a, points, speed = 1.4, pose = 'walk', onArrive = null) { a.path = points.map(p => [...p]); a.speed = speed; a.pose = pose; a.onArrive = onArrive; },
    face(a, x, z) { a.rig.root.rotation.y = Math.atan2(x - a.rig.root.position.x, z - a.rig.root.position.z); },
    place(a, x, z, yaw) { a.path = null; a.rig.root.position.set(x, stage.ground(x, z), z); if (yaw !== undefined) a.rig.root.rotation.y = yaw; },
    show(list, visible = true) { for (const a of list) a.rig.root.visible = visible; },
    tick(dt) {
      stage.time += dt;
      for (let i = timeline.length - 1; i >= 0; i--) if (stage.time >= timeline[i].at) { const { fn } = timeline[i]; timeline.splice(i, 1); fn(); }
      for (const a of actors.values()) animate(a, dt);
      particles.update(dt);
    },
    clearTimeline() { timeline.length = 0; },
    // desired: { position, target } from the active controller; a shot wins.
    frame(dt, desired, fov = 55) {
      const goal = stage.shot ?? desired;
      if (goal) { camPos.copy(goal.position); camTarget.copy(goal.target); }
      const wantedFov = stage.shot?.fov ?? fov;
      if (Math.abs(camera.fov - wantedFov) > .3) { camera.fov = wantedFov; camera.updateProjectionMatrix(); }
      camera.position.lerp(camPos, stage.shot ? 1 : Math.min(1, dt * 9));
      if (stage.shakeAmount > 0) { stage.shakeAmount = Math.max(0, stage.shakeAmount - dt * 1.5); camera.position.x += (Math.random() - .5) * stage.shakeAmount * .6; camera.position.y += (Math.random() - .5) * stage.shakeAmount * .6; }
      camera.lookAt(camTarget);
    },
  };
  function animate(a, dt) {
    a.t += dt;
    if (a.follow && !a.path) {
      // Followers keep a slot behind their leader.
      const lead = a.follow.rig.root.position, p = a.rig.root.position, d = Math.hypot(lead.x - p.x, lead.z - p.z);
      if (d > (a.followGap ?? 2.4)) { const step = Math.min(d - 1.6, (a.followSpeed ?? 5) * dt * Math.min(1.8, d / 3)); p.x += (lead.x - p.x) / d * step; p.z += (lead.z - p.z) / d * step; p.y = stage.ground(p.x, p.z); a.rig.root.rotation.y = Math.atan2(lead.x - p.x, lead.z - p.z); a.pose = d > 5 ? 'run' : 'walk'; }
      else if (a.pose === 'walk' || a.pose === 'run') a.pose = 'idle';
    }
    if (a.path?.length) {
      const [tx, tz] = a.path[0], p = a.rig.root.position, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < .3) { a.path.shift(); if (!a.path.length) { a.path = null; if (a.pose === 'walk' || a.pose === 'run') a.pose = 'idle'; a.onArrive?.(a); } }
      else { const step = Math.min(d, a.speed * dt); p.x += dx / d * step; p.z += dz / d * step; a.rig.root.rotation.y = Math.atan2(dx, dz); p.y = stage.ground(p.x, p.z); }
    }
    if (a.pose !== 'manual') applyPose(a.rig, characterPose(a.pose, a.t, { speed: a.pose === 'run' || a.pose === 'walk' ? a.speed / 3 : 1, progress: a.progress }));
  }
  return stage;
}

// Third-person walking for a ground actor (children, cadets indoors).
export function createWalker(stage, a, { colliders = [], bounds = { minX: -1e4, maxX: 1e4, minZ: -1e4, maxZ: 1e4 }, speeds = [3.1, 5.6], distance = 4.4 } = {}) {
  const w = {
    yaw: 0, pitch: .2, moved: false, ran: false, colliders, bounds,
    step(dt, input, mode, talking) {
      w.yaw += input.look[0]; w.pitch = Math.max(-.2, Math.min(.9, w.pitch + input.look[1]));
      w.moved = false;
      if ((mode !== 'walk' && mode !== 'run') || talking) { if (a.pose === 'walk' || a.pose === 'run') a.pose = 'idle'; return false; }
      const f = forwardOf(w.yaw), r = new THREE.Vector3(Math.cos(w.yaw), 0, Math.sin(w.yaw));
      const mx = r.x * input.move[0] - f.x * input.move[1], mz = r.z * input.move[0] - f.z * input.move[1];
      const amount = Math.hypot(mx, mz);
      if (amount > .05) {
        const running = mode === 'run' || input.run; if (input.run && mode === 'walk') w.ran = true;
        const speed = running ? speeds[1] : speeds[0], p = a.rig.root.position;
        const [x, z] = moveWithCollisions([p.x, p.z], [mx * speed * dt, mz * speed * dt], .35, w.colliders, w.bounds);
        p.set(x, stage.ground(x, z), z); a.rig.root.rotation.y = Math.atan2(mx, mz); a.pose = running ? 'run' : 'walk'; a.path = null; w.moved = true;
      } else if (a.pose === 'walk' || a.pose === 'run') a.pose = 'idle';
      return w.moved;
    },
    view() {
      const p = a.rig.root.position, f = forwardOf(w.yaw);
      return { position: new THREE.Vector3(p.x - f.x * Math.cos(w.pitch) * distance, p.y + 1.2 + Math.sin(w.pitch) * distance, p.z - f.z * Math.cos(w.pitch) * distance), target: new THREE.Vector3(p.x, p.y + 1.1, p.z) };
    },
    lookAt(x, z) { const p = a.rig.root.position; w.yaw = Math.atan2(x - p.x, -(z - p.z)); },
  };
  return w;
}

// ODM flight with blades for a rig. Mirrors chapter 32: cables on Q/E or the
// triggers, gas on Space, cut on click; the camera trails the flight.
export function createOdmPilot(stage, rig, { colliders = [], anchorRoots = [], bounds = 320, gas = 100 } = {}) {
  const odm = createOdm({ scene: stage.scene, camera: stage.camera, colliders, anchorRoots, gas, bounds });
  const pilot = {
    odm, rig, yaw: 0, pitch: .1, cooldown: 0, pending: false, gasRate: 1, lastStrike: -1,
    place(x, y, z, yaw) { odm.releaseAll(); odm.player.position.set(x, y, z); odm.player.velocity.set(0, 0, 0); if (yaw !== undefined) pilot.yaw = yaw; rig.root.position.set(x, y, z); },
    step(dt, input) {
      pilot.yaw += input.look[0]; pilot.pitch = Math.max(-.85, Math.min(1.05, pilot.pitch - input.look[1]));
      for (const side of [-1, 1]) {
        const key = side < 0 ? 'left' : 'right';
        if (input.pressed[key] || (input.held[key] && !input.previous[key])) if (!odm.attach(side, pilot.yaw)) stage.ui.toast('Sem ancoragem: mire em um prédio, árvore ou titã.', 1.1);
        if (!input.held[key]) odm.release(side);
      }
      const before = odm.player.gas;
      odm.step(dt, { move: input.move, boost: input.held.jump, jump: input.pressed.jump, yaw: pilot.yaw, pitch: pilot.pitch });
      if (pilot.gasRate !== 1) odm.player.gas = Math.max(0, before - (before - odm.player.gas) * pilot.gasRate);
      const P = odm.player.position, speed = odm.player.velocity.length();
      rig.root.position.copy(P); if (speed > .5) rig.root.rotation.y = Math.atan2(odm.player.velocity.x, odm.player.velocity.z);
      pilot.cooldown -= dt;
      const striking = pilot.cooldown > .25;
      applyPose(rig, characterPose(striking ? 'strike' : odm.player.grounded ? (speed > 1 ? 'run' : 'idle') : 'odm', stage.time, { progress: 1 - (pilot.cooldown - .25) / .35, speed: 1.5 }));
      const strike = (input.pressed.attack || pilot.pending) && pilot.cooldown <= 0 && odm.player.blades > 0; pilot.pending = false;
      if (strike) { pilot.cooldown = .6; pilot.lastStrike = stage.time; stage.audio.play('dodge', 1, 0, .6); }
      return { strike, reach: speed > 24 ? 9 : 6.5, speed, position: P };
    },
    view() {
      const P = odm.player.position, d = 6.5, f = forwardOf(pilot.yaw);
      const floor = odm.player.grounded && P.y > 2 ? P.y + 3.4 : .6;
      const position = new THREE.Vector3(P.x - f.x * Math.cos(pilot.pitch) * d, Math.max(floor, P.y + 2.4 - Math.sin(pilot.pitch) * d), P.z - f.z * Math.cos(pilot.pitch) * d);
      const target = new THREE.Vector3(P.x, P.y + 1.4, P.z).addScaledVector(f, 20).add(new THREE.Vector3(0, Math.sin(pilot.pitch) * 10, 0));
      return { position, target };
    },
    fov() { return 58 + Math.min(14, odm.player.velocity.length() * .3); },
    strikeNow() { pilot.cooldown = 0; pilot.pending = true; },
  };
  return pilot;
}

// Moves a titan one step toward [x, z] with a stride cycle. Returns true on arrival.
export function strideTitan(t, target, speed, dt, phase) {
  const p = t.root.position, dx = target[0] - p.x, dz = target[1] - p.z, d = Math.hypot(dx, dz);
  if (d < .5) return true;
  const step = Math.min(d, speed * dt); p.x += dx / d * step; p.z += dz / d * step;
  t.root.rotation.y = Math.atan2(dx, dz);
  const s = Math.sin(phase); t.legs[0].rotation.x = s * .45; t.legs[1].rotation.x = -s * .45; t.knees[0].rotation.x = Math.max(0, -s) * .6; t.knees[1].rotation.x = Math.max(0, s) * .6;
  t.arms[0].rotation.x = -s * .3; t.arms[1].rotation.x = s * .3;
  return false;
}

// Pure titans that hunt the nearest prey. Cut napes kill them; the chapter
// decides what a grab means (failure, a scripted death, a rescue).
export function createHorde(stage, { anchorRoots = [] } = {}) {
  const list = [], tmp = new THREE.Vector3();
  const horde = {
    list,
    spawn(formId, x, z, { height, kind = 'hunt', yaw = 0, speed, sight = 70, id } = {}) {
      const spec = { ...titanForm(formId) }; if (height) spec.height = height; spec.id = id ?? `${spec.id}-${list.length}`;
      const titan = createTitanForm(spec); titan.root.position.set(x, 0, z); titan.root.rotation.y = yaw; stage.scene.add(titan.root); anchorRoots.push(titan.root);
      const t = { titan, alive: true, death: 0, kind, speed: speed ?? titanSpeed(spec.height, kind === 'abnormal' ? 'abnormal' : 'pure'), sight, phase: Math.random() * 6, grab: 0, route: null, home: [x, z] };
      list.push(t); return t;
    },
    alive: () => list.filter(t => t.alive),
    kill(t) {
      if (!t.alive) return; t.alive = false; t.titan.nape.getWorldPosition(tmp);
      stage.particles.burst(tmp, 'blood', 34, 5); stage.particles.burst(tmp, 'steam', 16, 4); stage.audio.play('punch', 2, 0, .8);
    },
    nape(t, out = new THREE.Vector3()) { return t.titan.nape.getWorldPosition(out); },
    reset(t, x, z) { t.alive = true; t.death = 0; t.grab = 0; t.titan.root.visible = true; t.titan.root.rotation.set(0, 0, 0); t.titan.root.position.set(x ?? t.home[0], 0, z ?? t.home[1]); },
    // prey: [{ id, position: Vector3 }]; cut: { position, reach } when the player swings.
    update(dt, { prey = [], cut = null, freeze = false } = {}) {
      const killed = []; let grabbed = null;
      for (const t of list) {
        const T = t.titan;
        if (!t.alive) {
          t.death += dt; T.root.rotation.x = -Math.min(1.45, t.death * .9);
          if (t.death < 3 && Math.random() < .4) stage.particles.burst(T.root.position.clone().setY(T.spec.height * .5), 'steam', 1, 4);
          if (t.death > 5) T.root.visible = false; continue;
        }
        if (!T.root.visible) continue;
        T.animate(stage.time + t.phase);
        if (cut) {
          T.nape.getWorldPosition(tmp); const yaw = T.root.rotation.y, fwd = [Math.sin(yaw), 0, Math.cos(yaw)];
          if (canStrikeNape(cut.position.clone().setY(cut.position.y + 1).toArray(), tmp.toArray(), fwd, 100, true) || cut.position.distanceTo(tmp) < cut.reach * .55) { horde.kill(t); killed.push(t); continue; }
        }
        if (freeze || t.kind === 'idle') continue;
        t.phase += dt * t.speed * 1.2;
        if (t.route?.length) { if (strideTitan(T, t.route[0], t.speed, dt, t.phase)) t.route.shift(); continue; }
        const intent = titanIntent({ position: T.root.position.toArray(), height: T.spec.height, kind: t.kind }, prey.map(p => ({ position: p.position.toArray() })), t.sight);
        if (intent.target === null) continue;
        const target = prey[intent.target].position;
        if (intent.grab) {
          t.grab += dt; T.arms[1].rotation.x = -1.6; T.chest.rotation.x = .4;
          if (t.grab > .45) { grabbed = { titan: t, prey: prey[intent.target] }; t.grab = 0; }
        } else { t.grab = 0; T.chest.rotation.x = 0; strideTitan(T, [target.x, target.z], t.speed, dt, t.phase); }
        // Heads follow the prey.
        T.head.rotation.y = Math.max(-.8, Math.min(.8, Math.atan2(target.x - T.root.position.x, target.z - T.root.position.z) - T.root.rotation.y)) * .5;
      }
      return { killed, grabbed };
    },
    reachOf: t => grabReach(t.titan.spec.height),
  };
  return horde;
}

// A titan steered by the player (Eren): heavy steps, punches that crush pure
// titans, and the option to carry something with both arms.
export function createTitanPilot(stage, formId = 'ataque', { start = [0, 0], yaw = 0 } = {}) {
  const titan = createTitanForm(titanForm(formId)); titan.root.position.set(start[0], 0, start[1]); stage.scene.add(titan.root);
  const H = titan.spec.height;
  const pilot = {
    titan, yaw, pitch: .25, cooldown: 0, phase: 0, carrying: null, speedScale: 1, punchQueued: false,
    place(x, z, y) { titan.root.position.set(x, 0, z); if (y !== undefined) pilot.yaw = y; },
    step(dt, input, enabled = true) {
      pilot.yaw += input.look[0]; pilot.pitch = Math.max(-.1, Math.min(.8, pilot.pitch - input.look[1]));
      titan.animate(stage.time);
      let punch = null;
      if (!enabled) return { punch, moved: false };
      const f = forwardOf(pilot.yaw), r = new THREE.Vector3(Math.cos(pilot.yaw), 0, Math.sin(pilot.yaw));
      const move = new THREE.Vector3().addScaledVector(r, input.move[0]).addScaledVector(f, -input.move[1]);
      const moving = move.lengthSq() > .01;
      if (moving) {
        move.normalize(); pilot.phase += dt * (pilot.carrying ? 3 : 5);
        const speed = (input.run ? 11 : 7) * pilot.speedScale;
        titan.root.position.addScaledVector(move, speed * dt); titan.root.rotation.y = Math.atan2(move.x, move.z);
        const s = Math.sin(pilot.phase); titan.legs[0].rotation.x = s * .5; titan.legs[1].rotation.x = -s * .5; titan.knees[0].rotation.x = Math.max(0, -s) * .7; titan.knees[1].rotation.x = Math.max(0, s) * .7;
        if (Math.abs(s) > .98 && Math.random() < .5) { stage.shake(.25); stage.particles.burst(titan.root.position.clone().setY(.3), 'dust', 4, 3); }
      }
      pilot.cooldown -= dt;
      if (pilot.carrying) {
        // Both arms up, holding the load above the head.
        titan.arms.forEach(a => { a.rotation.x = -2.7; }); titan.elbows.forEach(e => { e.rotation.x = -.5; });
        const head = new THREE.Vector3(); titan.head.getWorldPosition(head); pilot.carrying.position.copy(head).add(new THREE.Vector3(0, H * .32, 0));
      } else if ((input.pressed.attack || pilot.punchQueued) && pilot.cooldown <= 0) {
        pilot.punchQueued = false; pilot.cooldown = .8; stage.audio.play('heavy', 4, 0, .8);
        const fwd = new THREE.Vector3(Math.sin(titan.root.rotation.y), 0, Math.cos(titan.root.rotation.y));
        punch = { position: titan.root.position.clone().addScaledVector(fwd, H * .45).setY(H * .6), radius: H * .5 };
      }
      if (!pilot.carrying) {
        const k = Math.max(0, pilot.cooldown - .4) / .4;
        titan.arms[1].rotation.x = k > 0 ? -1.6 + (1 - k) * .2 : titan.arms[1].rotation.x * .9; titan.elbows[1].rotation.x = k > 0 ? -.2 : -.6;
      }
      return { punch, moved: moving };
    },
    view() {
      const P = titan.root.position, f = forwardOf(pilot.yaw), d = H * 1.6;
      return { position: new THREE.Vector3(P.x - f.x * Math.cos(pilot.pitch) * d, H * .9 + Math.sin(pilot.pitch) * d, P.z - f.z * Math.cos(pilot.pitch) * d), target: new THREE.Vector3(P.x, H * .75, P.z).addScaledVector(f, H) };
    },
  };
  return pilot;
}
