import * as THREE from 'three';
import { CHARACTER_SPECS } from '../character-specs.js';
import { createCharacter, toon } from '../character-model.js';
import { characterPose, applyPose } from '../character-animation.js';
import { TITAN_FORMS, createTitanForm } from '../titan-forms.js';
import { createTransformationFx } from '../transformation-fx.js';
import { createShiganshina, moveWithCollisions } from './shiganshina-world.js';
import { SCRIPTS, LANDMARKS } from './shiganshina-script.js';
import { createParticles, createHorse } from './props.js';

// Chapters 1–2: one district, two scripts. The adapter owns the world, the
// actors, the player (Eren at ten) and every scripted event.
const titanSpec = id => TITAN_FORMS.find(t => t.id === id);

export function createChapter({ scene, camera, number, ui, audio, data }) {
  scene.background = new THREE.Color('#c9d6d2'); scene.fog = new THREE.Fog('#c9d6d2', 140, 520);
  scene.add(new THREE.HemisphereLight('#eef4f0', '#7c7558', 1.7));
  const sun = new THREE.DirectionalLight('#ffe6bd', 2.6); sun.position.set(-90, 140, 60); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, far: 420 }); scene.add(sun); scene.add(sun.target);
  const world = createShiganshina(scene);
  const particles = createParticles(scene);
  const fx = createTransformationFx(scene, { height: 60, duration: 2.4 });

  // ── Actors ────────────────────────────────────────────────────────────
  const actors = new Map();
  function actor(id, specId, x, z, yaw = 0, options = {}) {
    const rig = createCharacter({ ...CHARACTER_SPECS[specId], ...(options.override ?? {}) }, options);
    rig.root.position.set(x, world.groundHeight(x, z), z); rig.root.rotation.y = yaw; scene.add(rig.root);
    const a = { id, rig, pose: options.pose ?? 'idle', speed: 1, path: null, visible: true, t: Math.random() * 3 };
    actors.set(id, a); return a;
  }
  const player = actor('eren', 'eren-child', 0, 179, Math.PI);
  const mikasa = actor('mikasa', 'mikasa-child', 1.6, 177.5, Math.PI);
  const armin = actor('armin', 'armin-child', -33, -30, 0);
  const hannes = actor('hannes', 'hannes', 9, 101.8, 0, { blades: false });
  const guards = [actor('guarda-1', 'soldier-m', 7.2, 104.3, Math.PI * .8, { override: { outfit: 'garrison' } }), actor('guarda-2', 'soldier-m', 10.8, 104.4, -Math.PI * .8, { override: { outfit: 'garrison' } })];
  const carla = actor('carla', 'carla', 26, 21.5, 0);
  const grisha = actor('grisha', 'grisha', 22.5, 21.5, 0);
  const civilians = [];
  for (let i = 0; i < 16; i++) {
    const a = actor(`civil-${i}`, i % 2 ? 'civilian-f' : 'civilian-m', -16 + (i % 6) * 6 + Math.sin(i) * 2, 40 + Math.floor(i / 6) * 9, i);
    civilians.push(a);
  }
  const mother = actor('mae', 'civilian-f', 9, 46, -Math.PI / 2);
  const bullies = [0, 1, 2].map(i => actor(`valentao-${i}`, 'civilian-m', -36 + i * 1.5, -33 - (i % 2), 0, { override: { height: 1.38, age: 'child', outfit: 'child-shirt' } }));
  for (const b of bullies) b.rig.root.visible = false;
  const procession = [];
  for (let i = 0; i < 6; i++) {
    const horse = createHorse(i === 0 ? '#3b2c22' : ['#6b4a33', '#5a3f2c', '#7a5a3f'][i % 3]); scene.add(horse.root);
    const rider = createCharacter(i === 0 ? { ...CHARACTER_SPECS.shadis, outfit: 'survey' } : CHARACTER_SPECS[i % 2 ? 'soldier-m' : 'soldier-f']);
    horse.saddle.add(rider.root); rider.root.position.set(0, -.95, 0);
    horse.root.visible = false; procession.push({ horse, rider, offset: i * 7 });
  }
  const trapped = [[-3, -2], [8, 4], [14, 9], [-4, 8]].map(([x, z], i) => ({ ...actor(`preso-${i}`, i % 2 ? 'civilian-m' : 'civilian-f', x, z, 0, { pose: 'reach' }), freed: false }));
  for (const t of trapped) t.rig.root.visible = false;

  // ── Titans ────────────────────────────────────────────────────────────
  const colossal = createTitanForm(titanSpec('colossal')); colossal.root.position.set(0, -62, -136); colossal.root.visible = false; scene.add(colossal.root);
  const smiling = createTitanForm(titanSpec('sorridente')); smiling.root.visible = false; scene.add(smiling.root);
  const pures = ['barbudo', 'nariz', 'cabeludo', 'pequeno', 'gordo'].map((id, i) => { const t = createTitanForm(titanSpec(id)); t.root.visible = false; scene.add(t.root); return { titan: t, route: [[[-8, -100], [-8, -60], [-40, -50], [-60, -10]], [[6, -100], [6, -40], [50, -40], [70, 10]], [[0, -100], [0, -70], [-30, -70]], [[-4, -105], [20, -80], [24, -60]], [[3, -108], [3, -88]]][i], leg: 0, speed: [1.6, 2.6, 1.3, 3.4, 1][i] }; });

  // ── State ─────────────────────────────────────────────────────────────
  const challenges = new Set(); const visited = new Set(); let ran = false, lostMikasa = false;
  let yaw = Math.PI, pitch = .18, shake = 0, shot = null, time = 0, debris = [], carried = false, panic = false, smilingPath = null, grabbedCarla = 0, devoured = false;
  const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
  const timeline = [];
  const after = (seconds, fn) => timeline.push({ at: time + seconds, fn });
  // Shot heights are relative to the terrain, so hill scenes stay above ground.
  const lift = ([x, y, z]) => new THREE.Vector3(x, y + world.groundHeight(x, z), z);
  function setShot(position, target, fov = 55) { shot = { position: lift(position), target: lift(target), fov }; }
  const clearShot = () => { shot = null; camera.fov = 55; camera.updateProjectionMatrix(); };
  function walkTo(a, points, speed = 1.4, pose = 'walk') { a.path = points.map(p => [...p]); a.speed = speed; a.pose = pose; }

  function face(a, x, z) { a.rig.root.rotation.y = Math.atan2(x - a.rig.root.position.x, z - a.rig.root.position.z); }

  // Chapter 2 starts at the canal in the afternoon.
  if (number === 2) {
    player.rig.root.position.set(-31, 0, -30.5); mikasa.rig.root.position.set(-29.5, 0, -31); armin.rig.root.position.set(-33, 0, -30.2);
    for (const a of [player, mikasa, armin]) face(a, 0, -60);
    carla.rig.root.visible = grisha.rig.root.visible = false; hannes.rig.root.position.set(9, 0, 101.8);
    yaw = 0; time = 0;
  }
  sun.position.set(number === 2 ? -120 : -90, number === 2 ? 95 : 140, 60);

  // ── Events ────────────────────────────────────────────────────────────
  const handlers = {
    'tree-dawn': () => { ui.setFade(1); after(.2, () => ui.setFade(0)); player.pose = 'grief'; setShot([7, 2.6, 171], [0, 5, 182], 50); after(3.3, () => { player.pose = 'idle'; clearShot(); }); },
    'guard-drinking': () => { setShot([3, 3.2, 96], [9, 1.5, 103]); face(player, 9, 102); face(hannes, player.rig.root.position.x, player.rig.root.position.z); after(10, clearShot); },
    bell: () => { world.bellMesh.userData.ring = 3; audio.play('warning', 10, 0, .6); },
    'survey-return': () => {
      for (const p of procession) { p.horse.root.visible = true; p.horse.root.position.set(0, 0, 8 - p.offset); p.horse.root.rotation.y = 0; }
      setShot([12, 3.5, 56], [0, 2, 24], 50); mother.pose = 'reach';
      after(14, clearShot);
    },
    'mikasa-pulls': () => { walkTo(mikasa, [[player.rig.root.position.x + .8, player.rig.root.position.z + .5]], 3, 'run'); },
    'home-interior': () => { setShot([20, 3, 9], [24, 1.4, 20]); face(player, carla.rig.root.position.x, carla.rig.root.position.z); after(16, clearShot); },
    bullies: () => { for (const b of bullies) { b.rig.root.visible = true; face(b, -33, -30); } armin.pose = 'grief'; setShot([-28, 3, -38], [-34, 1, -30]); },
    'bullies-flee': () => { for (const [i, b] of bullies.entries()) walkTo(b, [[-40 + i * 3, -70], [-30, -100]], 4, 'run'); armin.pose = 'idle'; after(1.4, clearShot); },
    'sky-silence': () => { setShot([-30, 2, -20], [0, 60, -118], 60); ui.setFade(.6); },
    'canal-afternoon': () => { ui.setFade(1); after(.1, () => ui.setFade(0)); setShot([-27, 2.4, -36], [-32, 1.2, -30]); after(1.4, () => setShot([-30, 1.8, -31], [-8, 30, -118], 60)); },
    'lightning-over-wall': () => {
      setShot([-30, 1.8, -31], [-6, 38, -118], 62); fx.start(new THREE.Vector3(0, 0, -132), 845);
      after(.55, () => { ui.flash('#fff8dd', .9); audio.play('transform', 30, 0, 1); shake = 1.2; });
    },
    quake: () => { shake = 1.5; audio.play('heavy', 20, 0, 1); },
    'colossal-appears': () => { colossal.root.visible = true; colossal.root.position.y = -62; setShot([-30, 1.8, -31], [-2, 48, -118], 56); },
    'gate-kick': () => {
      shake = 2.2; audio.play('defeat', 10, 0, 1); world.breakOuterGate();
      const targets = [world.yeager, ...world.houses.filter(h => h.z < 20 && h.z > -100 && Math.abs(h.x) < 70).slice(0, 9)];
      debris = targets.map((house, i) => {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6 + (i % 3), 0), toon('#8d8273')); rock.castShadow = true; scene.add(rock);
        return { rock, from: new THREE.Vector3(0, 12, -118), to: new THREE.Vector3(house.x, 2, house.z), t: -i * .08, house };
      });
      setShot([-30, 2, -31], [-4, 28, -105], 62);
    },
    'titans-enter': () => {
      clearShot();
      for (const p of pures) { p.titan.root.visible = true; p.titan.root.position.set(p.route[0][0], 0, p.route[0][1]); p.leg = 0; }
      after(4, () => { particles.burst(new THREE.Vector3(0, 55, -132), 'steam', 40, 12); colossal.root.visible = false; });
    },
    panic: () => {
      panic = true;
      for (const [i, c] of civilians.entries()) { c.rig.root.position.set(-30 + (i % 8) * 8, 0, -60 + Math.floor(i / 8) * 25); walkTo(c, [[c.rig.root.position.x * .3, 30], [0, 100]], 3.6 + (i % 3) * .5, 'run'); }
      for (const t of trapped) { t.rig.root.visible = true; t.pose = 'reach'; }
    },
    'house-collapsed': () => {
      setShot([22, 3.8, 9], [28, .6, 14]);
      carla.rig.root.visible = true; carla.rig.root.position.set(27.5, .25, 14.2); carla.rig.root.rotation.set(-Math.PI / 2 + .25, .2, 0); carla.pose = 'reach';
      mikasa.rig.root.position.set(25.2, 0, 12.2); face(mikasa, 27, 14); mikasa.pose = 'reach';
      player.rig.root.position.set(25.5, 0, 10.5); face(player, 27, 14);
      after(1.5, clearShot);
    },
    'beam-stuck': () => { if (world.yeager.beam) world.yeager.beam.rotation.z = .25; audio.play('heavy', 2, 0, .8); },
    'smiling-approach': () => {
      smiling.root.visible = true; smiling.root.position.set(4, 0, -4); smilingPath = [[4, 6], [16, 8], [24, 9]];
      setShot([26, 2, 12], [8, 10, -20], 52); after(2.3, clearShot);
    },
    'hannes-arrives': () => { hannes.rig.root.position.set(16, 0, 20); face(hannes, 27, 14); particles.burst(new THREE.Vector3(16, 1, 20), 'dust', 8, 3); hannes.pose = 'idle'; },
    'hannes-charge': () => { walkTo(hannes, [[13, 8]], 5, 'run'); },
    'hannes-turns': () => { walkTo(hannes, [[23, 12]], 6, 'run'); },
    'hannes-grabs': () => {
      carried = true; hannes.rig.root.position.set(24, 0, 11.5);
      walkTo(hannes, [[8, 14], [6, 40], [5, 90]], 5.2, 'run'); mikasa.pose = 'carried'; player.pose = 'carried';
    },
    'smiling-lifts': () => {
      // The titan reaches the rubble even if the walk was interrupted.
      if (smilingPath?.length) { smiling.root.position.set(24, 0, 9); smilingPath = null; }
      face({ rig: { root: smiling.root } }, 27.5, 14); grabbedCarla = .001;
    },
    'carla-devoured': () => {
      after(.9, () => {
        devoured = true; carla.rig.root.visible = false;
        const mouth = new THREE.Vector3(); smiling.head.getWorldPosition(mouth);
        particles.burst(mouth, 'blood', 70, 6); ui.flash('#5a0505', .55); audio.play('punch', 8, 0, 1); shake = .6;
      });
    },
    'fade-black': () => { ui.setFade(1); },
  };

  // ── Per-frame ─────────────────────────────────────────────────────────
  const tmp = new THREE.Vector3();
  function animateActor(a, dt) {
    a.t += dt;
    if (a.path?.length) {
      const [tx, tz] = a.path[0], p = a.rig.root.position, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < .3) { a.path.shift(); if (!a.path.length) a.pose = a === mikasa && carried ? 'carried' : 'idle'; }
      else { const step = Math.min(d, a.speed * dt); p.x += dx / d * step; p.z += dz / d * step; a.rig.root.rotation.y = Math.atan2(dx, dz); p.y = world.groundHeight(p.x, p.z); }
    }
    applyPose(a.rig, characterPose(a.pose, a.t, { speed: a.speed / 3 }));
  }
  function walkTitan(t, target, speed, dt, phase) {
    const p = t.root.position, dx = target[0] - p.x, dz = target[1] - p.z, d = Math.hypot(dx, dz);
    if (d < .5) return true;
    const step = Math.min(d, speed * dt); p.x += dx / d * step; p.z += dz / d * step;
    t.root.rotation.y = Math.atan2(dx, dz);
    const s = Math.sin(phase); t.legs[0].rotation.x = s * .45; t.legs[1].rotation.x = -s * .45; t.knees[0].rotation.x = Math.max(0, -s) * .6; t.knees[1].rotation.x = Math.max(0, s) * .6;
    t.arms[0].rotation.x = -s * .3; t.arms[1].rotation.x = s * .3;
    return false;
  }

  function update(dt, input, control, view) {
    time += dt;
    for (let i = timeline.length - 1; i >= 0; i--) if (time >= timeline[i].at) { const { fn } = timeline[i]; timeline.splice(i, 1); fn(); }
    // Player movement relative to the camera.
    yaw -= input.look[0]; pitch = Math.max(-.2, Math.min(.9, pitch + input.look[1]));
    const p = player.rig.root.position;
    let moving = false;
    if ((control === 'walk' || control === 'run') && view.kind !== 'line' && view.kind !== 'choice') {
      const forward = [Math.sin(yaw), Math.cos(yaw)], right = [-Math.cos(yaw), Math.sin(yaw)];
      const mx = right[0] * input.move[0] - forward[0] * input.move[1], mz = right[1] * input.move[0] - forward[1] * input.move[1];
      const amount = Math.hypot(mx, mz);
      if (amount > .05) {
        const running = control === 'run' || input.run; if (input.run && control === 'walk') ran = true;
        const speed = running ? 5.6 : 3.1;
        const [x, z] = moveWithCollisions([p.x, p.z], [mx * speed * dt, mz * speed * dt], .35, world.colliders);
        p.set(x, world.groundHeight(x, z), z); player.rig.root.rotation.y = Math.atan2(mx, mz); player.pose = running ? 'run' : 'walk'; moving = true;
      }
    }
    if (!moving && ['walk', 'run'].includes(player.pose) && !player.path) player.pose = 'idle';
    if (carried) {
      // Eren under Hannes's arm, facing back toward the house.
      hannes.rig.hands[0].getWorldPosition(tmp); p.copy(tmp).add(new THREE.Vector3(.2, -.75, 0)); player.rig.root.rotation.y = hannes.rig.root.rotation.y + Math.PI;
      hannes.rig.hands[1].getWorldPosition(tmp); mikasa.rig.root.position.copy(tmp).add(new THREE.Vector3(-.2, -.75, 0)); mikasa.rig.root.rotation.y = hannes.rig.root.rotation.y + Math.PI; mikasa.path = null;
    }
    // Mikasa follows while the player walks.
    if (!carried && (control === 'walk' || control === 'run') && !mikasa.path) {
      const m = mikasa.rig.root.position, d = Math.hypot(p.x - m.x, p.z - m.z);
      if (d > 2.2) { const step = Math.min(d - 1.8, (control === 'run' ? 5.4 : 3.2) * dt * Math.min(1.6, d / 3)); m.x += (p.x - m.x) / d * step; m.z += (p.z - m.z) / d * step; m.y = world.groundHeight(m.x, m.z); mikasa.rig.root.rotation.y = Math.atan2(p.x - m.x, p.z - m.z); mikasa.pose = control === 'run' ? 'run' : 'walk'; }
      else if (mikasa.pose !== 'reach') mikasa.pose = 'idle';
      if (d > 25 && number === 2) lostMikasa = true;
    }
    for (const a of actors.values()) animateActor(a, dt);
    for (const pr of procession) if (pr.horse.root.visible) {
      const h = pr.horse.root.position; h.z = Math.min(h.z + dt * 3.2, 70 - pr.offset); pr.horse.animate(time, h.z < 70 - pr.offset - .1 ? .6 : 0);
      applyPose(pr.rider, characterPose('ride', time));
    }
    if (world.bellMesh.userData.ring > 0) { world.bellMesh.userData.ring -= dt; world.bellMesh.rotation.z = Math.sin(time * 9) * .35 * Math.min(1, world.bellMesh.userData.ring); }
    // Colossal rises above the wall; steam pours from its body.
    if (colossal.root.visible) {
      colossal.root.position.y = Math.min(-1.5, colossal.root.position.y + dt * 14);
      colossal.arms.forEach((a, i) => { a.rotation.x = -2.6; a.rotation.z = (i ? -1 : 1) * .35; }); colossal.elbows.forEach(e => { e.rotation.x = -.9; });
      if (Math.random() < .6) particles.burst(new THREE.Vector3((Math.random() - .5) * 30, 46 + Math.random() * 10, -128), 'steam', 1, 4);
      colossal.animate(time);
    }
    // Debris arcs from the broken gate and flattens houses.
    for (const d of debris) {
      if (d.done) continue; d.t += dt / 1.7; if (d.t < 0) continue;
      const t = Math.min(1, d.t); d.rock.position.lerpVectors(d.from, d.to, t); d.rock.position.y += Math.sin(t * Math.PI) * 45; d.rock.rotation.x += dt * 4;
      if (t >= 1) { d.done = true; world.collapse(d.house); particles.burst(d.to, 'dust', 26, 7); shake = Math.max(shake, .7); audio.play('heavy', 15, 0, .7); }
    }
    for (const t of pures) if (t.titan.root.visible) {
      t.leg += dt * t.speed * 1.4;
      if (t.route.length > 1 && walkTitan(t.titan, t.route[1], t.speed, dt, t.leg)) t.route.shift();
      t.titan.animate(time);
      if (panic) for (const c of civilians) if (c.rig.root.visible && c.rig.root.position.distanceTo(t.titan.root.position) < t.titan.spec.height * .35) {
        c.rig.root.visible = false; const at = c.rig.root.position.clone().setY(t.titan.spec.height * .7); particles.burst(at, 'blood', 24, 4); audio.play('punch', 25, 0, .5);
      }
    }
    if (smiling.root.visible) {
      smiling.animate(time);
      if (smilingPath?.length) { if (walkTitan(smiling, smilingPath[0], 4.6, dt, time * 4)) smilingPath.shift(); }
      if (grabbedCarla > 0 && !devoured) {
        grabbedCarla = Math.min(1, grabbedCarla + dt / 2.6);
        // Bend, reach the rubble, lift to the mouth.
        smiling.chest.rotation.x = Math.sin(Math.min(1, grabbedCarla * 2) * Math.PI) * .9; smiling.arms[1].rotation.x = -1.4 - grabbedCarla * 1.1; smiling.elbows[1].rotation.x = -grabbedCarla * 1.6;
        if (grabbedCarla > .35) { smiling.hands[1].getWorldPosition(tmp); carla.rig.root.position.copy(tmp); carla.rig.root.rotation.set(0, 0, .2); carla.pose = 'reach'; }
      }
      if (devoured) { smiling.head.rotation.x = Math.sin(time * 7) * .1; }
    }
    // Trapped civilians on the run home (challenge).
    for (const t of trapped) if (!t.freed && t.rig.root.visible && input.interact && Math.hypot(t.rig.root.position.x - p.x, t.rig.root.position.z - p.z) < 2.5) {
      t.freed = true; walkTo(t, [[t.rig.root.position.x, 60], [0, 100]], 3.8, 'run'); ui.toast('Você ajudou alguém a se soltar.', 1.6);
    }
    // Landmarks (challenge in chapter 1).
    for (const l of LANDMARKS) if (!visited.has(l.id) && Math.hypot(l.position[0] - p.x, l.position[1] - p.z) < 6) { visited.add(l.id); ui.toast(`Marco da infância: ${l.name} (${visited.size}/3)`, 2); }
    // Danger during the run home: a titan within reach grabs Eren.
    if (number === 2 && control === 'run') for (const t of pures) if (t.titan.root.visible && Math.hypot(t.titan.root.position.x - p.x, t.titan.root.position.z - p.z) < t.titan.spec.height * .45) {
      particles.burst(p.clone().setY(1), 'blood', 20, 3); return { fail: 'Um titã agarrou Eren no meio da rua. Desvie da avenida e use as ruelas.' };
    }
    particles.update(dt); fx.update(time - (fx.startedAt ?? time));
    updateCamera(dt);
    return null;
  }
  const origFxStart = fx.start; fx.start = (position, seed) => { fx.startedAt = time; origFxStart(position, seed); };

  function updateCamera(dt) {
    const p = player.rig.root.position;
    if (shot) { camPos.copy(shot.position); camTarget.copy(shot.target); if (camera.fov !== shot.fov) { camera.fov = shot.fov; camera.updateProjectionMatrix(); } }
    else if (carried) { camTarget.set(27, 6, 10); camPos.copy(p).add(new THREE.Vector3(0, 1.8, 0)).add(new THREE.Vector3(Math.sin(hannes.rig.root.rotation.y) * 2.4, 0, Math.cos(hannes.rig.root.rotation.y) * 2.4)); }
    else {
      const distance = 4.4;
      camTarget.set(p.x, p.y + 1.1, p.z);
      camPos.set(p.x - Math.sin(yaw) * Math.cos(pitch) * distance, p.y + 1.1 + Math.sin(pitch) * distance, p.z - Math.cos(yaw) * Math.cos(pitch) * distance);
    }
    camera.position.lerp(camPos, shot ? 1 : Math.min(1, dt * 8));
    if (shake > 0) { shake = Math.max(0, shake - dt * 1.4); camera.position.x += (Math.random() - .5) * shake * .6; camera.position.y += (Math.random() - .5) * shake * .6; }
    camera.lookAt(camTarget);
  }

  updateCamera(1);
  return {
    script: SCRIPTS[number], par: number === 1 ? 480 : 300, wantsPointerLock: false,
    playerPosition: () => [player.rig.root.position.x, player.rig.root.position.z],
    markerHeight: ([x, z]) => world.groundHeight(x, z) + 2.4,
    onStoryEvent(event) {
      if (event.kind === 'event') handlers[event.id]?.(event);
      if (event.kind === 'control' && event.mode !== 'carried') carried = false;
      if (event.kind === 'interact') { if (world.yeager.beam) world.yeager.beam.rotation.z = .25 - Math.min(.18, event.presses * .025); audio.play('block', 2, 0, .5); player.pose = 'reach'; }
      if (event.kind === 'choice') ui.toast(event.reflection, 4);
    },
    update,
    checkpoint: () => ({ player: player.rig.root.position.toArray(), pures: pures.map(t => ({ pos: t.titan.root.position.toArray(), route: t.route.map(r => [...r]), visible: t.titan.root.visible })) }),
    restore(snapshot) {
      if (!snapshot) return;
      player.rig.root.position.fromArray(snapshot.player); mikasa.rig.root.position.fromArray(snapshot.player).add(new THREE.Vector3(1.4, 0, 0));
      snapshot.pures.forEach((s, i) => { pures[i].titan.root.position.fromArray(s.pos); pures[i].route = s.route.map(r => [...r]); pures[i].titan.root.visible = s.visible; });
      clearShot();
    },
    challengesDone() {
      const done = [];
      if (number === 1 && visited.size === 3) done.push(data.challenges[0]);
      if (number === 1 && !ran) done.push(data.challenges[1]);
      if (number === 2 && trapped.filter(t => t.freed).length >= 4) done.push(data.challenges[0]);
      if (number === 2 && !lostMikasa) done.push(data.challenges[1]);
      return done;
    },
    // Test hook: browser tests jump to objectives instead of walking for minutes.
    debug: { teleport([x, z]) { player.rig.root.position.set(x, world.groundHeight(x, z), z); } },
    snapshot: () => ({ player: player.rig.root.position.toArray().map(v => +v.toFixed(2)), control: carried ? 'carried' : 'free', colossal: colossal.root.visible ? +colossal.root.position.y.toFixed(1) : null, collapsed: world.houses.filter(h => h.collapsed).length, carlaVisible: carla.rig.root.visible, devoured, landmarks: [...visited], freed: trapped.filter(t => t.freed).length, titans: pures.filter(t => t.titan.root.visible).length }),
  };
}
