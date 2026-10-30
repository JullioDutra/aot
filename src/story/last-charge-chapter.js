import * as THREE from 'three';
import { CHARACTER_SPECS } from '../character-specs.js';
import { createCharacter, toon, outlineMaterial } from '../character-model.js';
import { characterPose, applyPose } from '../character-animation.js';
import { TITAN_FORMS, createTitanForm } from '../titan-forms.js';
import { canStrikeNape } from '../mechanics.js';
import { createParticles, createHorse } from './props.js';
import { createOdm } from './odm-controller.js';
import { flightPace } from './movement.js';
import { LAST_CHARGE } from './last-charge-script.js';
import { beastZones, barrageTargets, BEAST_ORDER } from './last-charge-rules.js';

// Chapter 32: the suicide charge and Levi against the Beast Titan.
const form = id => TITAN_FORMS.find(t => t.id === id);
const BEAST_POS = new THREE.Vector3(0, 0, -262);

export function createChapter({ scene, camera, ui, audio, data }) {
  document.body.classList.add('combat-chapter');
  scene.background = new THREE.Color('#b9bdb4'); scene.fog = new THREE.Fog('#b9bdb4', 90, 420);
  scene.add(new THREE.HemisphereLight('#e7ebe4', '#6f6550', 1.5));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.2); sun.position.set(60, 120, 80); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 200, bottom: -200, far: 450 }); sun.target.position.set(0, 0, -120); scene.add(sun, sun.target);
  const particles = createParticles(scene, 800);
  const line = outlineMaterial(.05);

  // ── Terrain: a long field inside the wall, low houses on both sides ────
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 600), toon('#a49a74')); ground.rotation.x = -Math.PI / 2; ground.position.z = -130; ground.receiveShadow = true; scene.add(ground);
  const colliders = [], anchorRoots = [];
  const housesGroup = new THREE.Group(); scene.add(housesGroup); anchorRoots.push(housesGroup);
  const plaster = [toon('#e3d8c2'), toon('#d8cbb1'), toon('#ece4d4')], roofMat = [toon('#8f4a37'), toon('#7e5a45')];
  let seed = 11; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function house(x, z, w, d, h) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plaster[Math.floor(rand() * 3)]); body.position.set(x, h / 2, z); body.castShadow = body.receiveShadow = true; housesGroup.add(body); body.add(new THREE.Mesh(body.geometry, line));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * .75, 3, 4), roofMat[Math.floor(rand() * 2)]); roof.position.set(x, h + 1.5, z); roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); roof.castShadow = true; housesGroup.add(roof);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h });
  }
  for (let z = 50; z > -300; z -= 16) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = side * (58 + i * 14 + rand() * 4); if (rand() < .2) continue; house(x, z + rand() * 4, 9 + rand() * 3, 10, 5 + Math.floor(rand() * 3) * 2);
  }
  for (let i = 0; i < 8; i++) house(-30 + i * 9, 34 + (i % 2) * 6, 8, 9, 7);
  // Smoke columns from the burning district behind the wall.
  const smoke = []; for (let i = 0; i < 6; i++) smoke.push(new THREE.Vector3(-120 + i * 50, 0, 120 + (i % 2) * 40));

  // ── Actors ──────────────────────────────────────────────────────────────
  const erwin = createCharacter(CHARACTER_SPECS.erwin), levi = createCharacter(CHARACTER_SPECS.levi, { blades: true });
  const floch = createCharacter({ ...CHARACTER_SPECS['recruit-m'], id: 'floch', hair: { style: 'middlepart', color: '#3b2c22' } });
  const marlo = createCharacter({ ...CHARACTER_SPECS['soldier-m'], id: 'marlo', hair: { style: 'bowl', color: '#2a2420' } });
  scene.add(erwin.root, levi.root);
  const riders = [];
  function mount(rig, x, z, color) { const horse = createHorse(color); horse.root.position.set(x, 0, z); scene.add(horse.root); horse.saddle.add(rig.root); rig.root.position.set(0, -.95, 0); const r = { rig, horse, alive: true, offset: [x, z], fall: 0 }; riders.push(r); return r; }
  const playerRider = mount(marlo, 6, 20, '#5a3f2c');
  const flochRider = mount(floch, 10, 22, '#6b4a33');
  const erwinRider = mount(createCharacter(CHARACTER_SPECS.erwin), 0, 10, '#2f241c');
  erwin.root.visible = false;
  for (let i = 0; i < 18; i++) mount(createCharacter(CHARACTER_SPECS[i % 3 ? 'soldier-m' : 'soldier-f']), -24 + (i % 6) * 9 + (i % 2) * 2, 18 + Math.floor(i / 6) * 7, ['#6b4a33', '#5a3f2c', '#7a5a3f'][i % 3]);
  const beast = createTitanForm(form('bestial')); beast.root.position.copy(BEAST_POS); beast.root.rotation.y = 0; scene.add(beast.root); anchorRoots.push(beast.root);
  const cart = createTitanForm(form('carroca')); cart.root.visible = false; scene.add(cart.root);
  const zeke = createCharacter(CHARACTER_SPECS.zeke); zeke.root.visible = false; scene.add(zeke.root);
  const pureIds = ['barbudo', 'nariz', 'cabeludo', 'gordo', 'anormal', 'pequeno', 'sorridente'];
  const lineTitans = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11, x = 74 - t * 52 + Math.sin(i * 1.3) * 5, z = -36 - t * 196;
    const spec = { ...form(pureIds[i % pureIds.length]) }; spec.height = 7 + (i * 5) % 9; spec.id = `${spec.id}-${i}`;
    const titan = createTitanForm(spec); titan.root.position.set(x, 0, z); titan.root.rotation.y = Math.PI * .1; scene.add(titan.root); anchorRoots.push(titan.root);
    lineTitans.push({ titan, alive: true, death: 0, home: new THREE.Vector3(x, 0, z) });
  }

  // ── State ───────────────────────────────────────────────────────────────
  const odm = createOdm({ scene, camera, colliders, anchorRoots, bounds: 320, pace: flightPace('levi') });
  let control = 'none', time = 0, yaw = Math.PI, pitch = .1, shake = 0, shot = null, goals = new Set();
  let charge = null, beastState = null, flaresTimed = 0, kills = 0, bossTime = 0, gasAtBeast = 0, strikeCooldown = 0, mission = null, zekePulled = false, cartRun = 0, pendingStrike = false;
  const rocks = [], flares = [], timeline = [];
  const after = (s, fn) => timeline.push({ at: time + s, fn });
  const setShot = (pos, target, fov = 55) => { shot = { position: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), fov }; };
  const clearShot = () => { shot = null; camera.fov = 58; camera.updateProjectionMatrix(); };
  const rockMaterial = toon('#7d7466'), shadowMaterial = new THREE.MeshBasicMaterial({ color: '#1b1612', transparent: true, opacity: .45, depthWrite: false });
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0), shadowGeometry = new THREE.CircleGeometry(1, 16);

  function resetCharge() {
    for (const r of riders) { r.alive = true; r.fall = 0; r.horse.root.visible = true; r.horse.root.position.set(r.offset[0], 0, r.offset[1]); r.horse.root.rotation.set(0, Math.PI, 0); r.rig.root.position.set(0, -.95, 0); r.rig.root.rotation.set(0, 0, 0); if (r.rig.root.parent !== r.horse.saddle) r.horse.saddle.add(r.rig.root); }
    for (const rock of rocks) { scene.remove(rock.mesh, rock.shadow); } rocks.length = 0;
    charge = { t: 0, next: 2.2, windup: 0, barrages: 0, erwinDown: false, flared: false };
  }
  function resetOdm(snapshot) {
    odm.releaseAll(); odm.player.position.set(46, 0, -22); odm.player.velocity.set(0, 0, 0); odm.player.gas = snapshot?.gas ?? 100; odm.player.health = 100; odm.player.blades = 100;
    lineTitans.forEach((t, i) => { const alive = snapshot ? snapshot.alive[i] : true; t.alive = alive; t.titan.root.visible = alive; t.titan.root.position.copy(t.home); t.titan.root.rotation.set(0, Math.PI * .1, 0); });
    kills = lineTitans.filter(t => !t.alive).length;
    beastState = { cut: new Set(snapshot?.cut ?? []), swat: 0, cooldown: 2, down: 0 };
    beast.root.position.copy(BEAST_POS); beast.root.rotation.set(0, 0, 0); beast.chest.rotation.set(.35, 0, 0);
    levi.root.visible = true; yaw = Math.atan2(BEAST_POS.x - 46, -(BEAST_POS.z + 22)) + .25; pitch = .12;
  }
  resetCharge();
  levi.root.position.set(10, 9, 32); erwin.root.position.set(12, 9, 31); erwin.root.visible = true; levi.root.rotation.y = Math.PI / 2; erwin.root.rotation.y = -Math.PI / 2;

  // ── Events ──────────────────────────────────────────────────────────────
  const handlers = {
    council: () => { setShot([6, 10.2, 28], [11, 9.8, 31.5], 45); },
    speech: () => { erwin.root.visible = false; levi.root.visible = false; setShot([0, 4, -6], [0, 2.5, 14], 55); after(9, () => setShot([14, 3, 6], [0, 2.6, 12], 50)); },
    'marlo-hit': () => {
      const p = playerRider.horse.root.position.clone();
      dropRock(p.clone(), 0); after(.75, () => { ui.flash('#6a0909', .85); shake = 2; audio.play('defeat', 0, 0, 1); particles.burst(p.clone().setY(1.5), 'blood', 60, 6); fallRider(playerRider); ui.setFade(1); });
      after(2.4, () => ui.setFade(0));
    },
    'levi-launch': () => { resetOdm(); clearShot(); setShot([40, 3, -8], [52, 8, -60], 55); after(1.5, clearShot); },
    'zeke-pulled': () => {
      zekePulled = true; const nape = new THREE.Vector3(); beast.nape.getWorldPosition(nape);
      particles.burst(nape, 'steam', 60, 8); particles.burst(nape, 'blood', 40, 5); zeke.root.visible = true; zeke.root.position.copy(nape).setY(0); zeke.root.position.x += 2;
      setShot([nape.x + 8, 3, nape.z + 10], [nape.x + 2, 1, nape.z], 45);
    },
    'cart-rescue': () => {
      cart.root.visible = true; cart.root.position.set(BEAST_POS.x - 40, 0, BEAST_POS.z + 6); cartRun = .001;
      setShot([BEAST_POS.x + 14, 4, BEAST_POS.z + 20], [BEAST_POS.x - 10, 2, BEAST_POS.z], 55);
    },
    aftermath: () => { setShot([20, 14, -60], [0, 0, -140], 60); ui.setFade(.4); },
  };
  function fallRider(r) { if (!r.alive) return; r.alive = false; r.fall = .001; particles.burst(r.horse.root.position.clone().setY(1.5), 'blood', 18, 4); }
  function dropRock(target, delay = 0) {
    const mesh = new THREE.Mesh(rockGeometry, rockMaterial); const size = .7 + Math.random() * 1.1; mesh.scale.setScalar(size); mesh.castShadow = true; mesh.visible = false; scene.add(mesh);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone()); shadow.rotation.x = -Math.PI / 2; shadow.position.copy(target).setY(.06); shadow.scale.setScalar(size * 2.2); scene.add(shadow);
    rocks.push({ mesh, shadow, from: BEAST_POS.clone().add(new THREE.Vector3(6, 22, 0)), to: target.clone(), t: -delay, flight: .75, size });
  }

  // ── Per-frame ───────────────────────────────────────────────────────────
  const tmp = new THREE.Vector3(), camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
  function updateCharge(dt, input) {
    charge.t += dt;
    const p = playerRider.horse.root.position;
    p.z -= 10 * dt; p.x = Math.max(-42, Math.min(42, p.x + input.move[0] * 7 * dt));
    for (const r of riders) if (r !== playerRider && r.alive) { const h = r.horse.root.position; h.z -= (r === erwinRider ? 10.4 : 9.6 + (r.offset[0] % 3) * .2) * dt; }
    // Barrage cycle: windup (arm raised), release, impacts.
    charge.next -= dt;
    if (charge.windup > 0) {
      charge.windup -= dt; beast.arms[1].rotation.x = -2.6;
      if (input.pressed.attack && !charge.flared) { charge.flared = true; fireFlare(p); flaresTimed++; }
      if (charge.windup <= 0) {
        beast.arms[1].rotation.x = .6; audio.play('heavy', 40, 0, 1);
        const living = riders.filter(r => r.alive).map(r => [r.horse.root.position.x, r.horse.root.position.z]);
        for (const [x, z] of barrageTargets({ seed: charge.barrages * 97 + 3, player: [p.x + 0, p.z - 7], riders: living, flared: charge.flared, count: 26 })) dropRock(new THREE.Vector3(x, 0, z), Math.random() * .35);
        charge.barrages++; charge.next = 3.4;
      }
    } else if (charge.next <= 0) { charge.windup = 1.4; charge.flared = false; ui.toast(`O Bestial está arremessando! ${input.keyLabel('attack')}: sinalizador`, 1.3); }
    else if (input.pressed.attack) fireFlare(p);
    // Erwin is hit at the head of the charge: a fixed event.
    if (!charge.erwinDown && charge.t > 9) {
      charge.erwinDown = true; const e = erwinRider.horse.root.position.clone();
      dropRock(e.clone(), 0); after(.75, () => { fallRider(erwinRider); ui.toast('Erwin caiu! A carga continua.', 2.6); audio.play('punch', 20, 0, 1); });
    }
    if (p.z < -158 || charge.barrages >= 5) goals.add('carga');
    return null;
  }
  function fireFlare(from) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 6), new THREE.MeshBasicMaterial({ color: '#d84a32' }));
    mesh.position.copy(from).setY(3); scene.add(mesh); flares.push({ mesh, v: new THREE.Vector3(0, 26, -14), life: 2.2 }); audio.play('dodge', 2, 0, .7);
  }
  function updateRocks(dt) {
    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i]; r.t += dt; if (r.t < 0) continue;
      const k = Math.min(1, r.t / r.flight); r.mesh.visible = true; r.mesh.position.lerpVectors(r.from, r.to, k); r.mesh.position.y += Math.sin(k * Math.PI) * 18; r.mesh.rotation.x += dt * 6;
      r.shadow.material.opacity = .2 + k * .45;
      if (k >= 1) {
        particles.burst(r.to.clone().setY(.5), 'dust', 6, 4);
        for (const rider of riders) if (rider.alive && rider.horse.root.position.distanceTo(r.to) < 2.3 + r.size && rider !== playerRider) fallRider(rider);
        if (control === 'ride' && playerRider.alive && playerRider.horse.root.position.distanceTo(r.to) < 1.9 + r.size * .6) { scene.remove(r.mesh, r.shadow); rocks.splice(i, 1); return 'Um fragmento de pedra atingiu você. Dispare sinalizadores durante o arremesso e desvie das sombras.'; }
        scene.remove(r.mesh, r.shadow); rocks.splice(i, 1);
      }
    }
    for (let i = flares.length - 1; i >= 0; i--) { const f = flares[i]; f.life -= dt; f.v.y -= 9 * dt; f.mesh.position.addScaledVector(f.v, dt); particles.burst(f.mesh.position, 'steam', 1, .5); if (f.life <= 0) { scene.remove(f.mesh); flares.splice(i, 1); } }
    return null;
  }

  function updateOdm(dt, input) {
    yaw += input.look[0]; pitch = Math.max(-.85, Math.min(1.05, pitch - input.look[1]));
    if (input.pressed.left || (input.held.left && !input.previous.left)) { if (!odm.attach(-1, yaw, input.touch ? 2 : 1)) ui.toast('Sem ancoragem: mire em uma casa ou em um titã.', 1.2); }
    if (input.pressed.right || (input.held.right && !input.previous.right)) { if (!odm.attach(1, yaw, input.touch ? 2 : 1)) ui.toast('Sem ancoragem: mire em uma casa ou em um titã.', 1.2); }
    if (!input.held.left) odm.release(-1); if (!input.held.right) odm.release(1);
    odm.step(dt, { move: input.move, boost: input.held.jump, jump: input.pressed.jump, yaw, pitch });
    const P = odm.player.position, speed = odm.player.velocity.length();
    levi.root.position.copy(P); levi.root.rotation.y = Math.atan2(odm.player.velocity.x, odm.player.velocity.z) || levi.root.rotation.y;
    strikeCooldown -= dt;
    const striking = strikeCooldown > .25;
    applyPose(levi, characterPose(striking ? 'strike' : odm.player.grounded ? (speed > 1 ? 'run' : 'idle') : 'odm', time, { progress: 1 - (strikeCooldown - .25) / .35, speed: 1.5 }));
    const strike = (input.pressed.attack || pendingStrike) && strikeCooldown <= 0; pendingStrike = false;
    if (strike) { strikeCooldown = .6; audio.play('dodge', 1, 0, .6); }
    const reach = speed > 24 ? 9 : 6.5;
    // Line titans: they hold position by the Beast's will but follow Levi with their heads.
    for (const t of lineTitans) {
      if (!t.alive) { t.death += dt; t.titan.root.rotation.x = -Math.min(1.5, t.death * .9); if (t.death < 3 && Math.random() < .4) particles.burst(t.titan.root.position.clone().setY(t.titan.spec.height * .5), 'steam', 1, 4); if (t.death > 4) t.titan.root.visible = false; continue; }
      t.titan.animate(time); const dx = P.x - t.titan.root.position.x, dz = P.z - t.titan.root.position.z;
      t.titan.head.rotation.y = Math.max(-1, Math.min(1, Math.atan2(dx, dz) - t.titan.root.rotation.y)) * .8;
      if (strike) {
        t.titan.nape.getWorldPosition(tmp); const fwd = [Math.sin(t.titan.root.rotation.y), 0, Math.cos(t.titan.root.rotation.y)];
        if (canStrikeNape(P.clone().setY(P.y + 1).toArray(), tmp.toArray(), fwd, odm.player.blades, true) || P.distanceTo(tmp) < reach * .55) {
          t.alive = false; kills++; particles.burst(tmp, 'blood', 30, 5); particles.burst(tmp, 'steam', 14, 4); odm.player.blades = Math.max(0, odm.player.blades - 4);
          ui.toast(`Nuca cortada · ${kills} / ${lineTitans.length}`, 1.2); audio.play('punch', 2, 0, .8); for (const h of odm.hooks) if (h.active && !t.titan.root.visible) odm.releaseAll();
        }
      }
    }
    if (mission === 'linha' && Math.hypot(P.x - BEAST_POS.x, P.z - BEAST_POS.z) < 36) { goals.add('linha'); gasAtBeast = odm.player.gas; }
    if (mission === 'bestial') return updateBeast(dt, strike, reach);
    return null;
  }

  function updateBeast(dt, strike, reach) {
    bossTime += dt; const P = odm.player.position, s = beastState;
    const zones = beastZones(beast);
    if (strike) for (const zone of zones) {
      if (s.cut.has(zone.id) || zone.id === 'nuca') continue;
      if (P.distanceTo(zone.position) < reach) {
        s.cut.add(zone.id); particles.burst(zone.position, 'blood', 40, 6); particles.burst(zone.position, 'steam', 10, 3); audio.play('punch', 3, 0, 1); shake = .5;
        ui.toast({ 'braco-esq': 'Braço esquerdo cortado', 'braco-dir': 'Braço direito cortado', olhos: 'Olhos cortados: ele não vê mais', 'perna-esq': 'Tendão esquerdo cortado', 'perna-dir': 'Tendão direito cortado' }[zone.id], 1.4);
      }
    }
    const armsOff = s.cut.has('braco-esq') && s.cut.has('braco-dir'), blind = s.cut.has('olhos'), legsOff = s.cut.has('perna-esq') && s.cut.has('perna-dir');
    if (s.cut.has('braco-esq')) { beast.arms[0].rotation.x = .3; beast.elbows[0].rotation.x = .8; }
    if (s.cut.has('braco-dir')) { beast.arms[1].rotation.x = .3; beast.elbows[1].rotation.x = .8; }
    if (legsOff) { s.down = Math.min(1, s.down + dt * .8); beast.root.position.y = -s.down * 3.6; beast.chest.rotation.x = .35 + s.down * .55; beast.knees.forEach(k => { k.rotation.x = s.down * 1.4; }); }
    // Swat: telegraphed raise, then a sweep in front of the Beast.
    if (!armsOff && !legsOff) {
      s.cooldown -= dt;
      const toLevi = new THREE.Vector3(P.x - beast.root.position.x, 0, P.z - beast.root.position.z), dist = toLevi.length();
      if (!blind) beast.root.rotation.y += (Math.atan2(toLevi.x, toLevi.z) - beast.root.rotation.y) * Math.min(1, dt * 1.2);
      if (s.swat > 0) {
        s.swat -= dt; const arm = s.cut.has('braco-dir') ? 0 : 1; beast.arms[arm].rotation.x = s.swat > .35 ? -2.4 : .4;
        if (s.swat <= .35 && !s.hit) {
          s.hit = true; beast.hands[arm].getWorldPosition(tmp);
          if (P.distanceTo(tmp) < 9 || (dist < 12 && !blind)) { odm.player.health -= 40; odm.player.velocity.add(toLevi.normalize().multiplyScalar(22)).setY(8); odm.releaseAll(); ui.flash('#7a1010', .5); audio.play('heavy', 0, 0, 1); shake = 1; }
        }
      } else if (s.cooldown <= 0 && dist < 22) { s.swat = 1.15; s.hit = false; s.cooldown = blind ? 3.6 : 2.2; ui.toast('O Bestial vai golpear: saia da frente!', .9); }
    }
    if (odm.player.health <= 0) return 'Levi foi atingido pelo braço do Bestial. Corte os braços primeiro e não fique na frente dele.';
    if (strike && armsOff && blind && legsOff) {
      beast.nape.getWorldPosition(tmp);
      if (P.distanceTo(tmp) < reach + 1) goals.add('bestial');
    }
    return null;
  }

  function update(dt, input, mode, view) {
    time += dt; mission = view.mission?.id ?? mission;
    for (let i = timeline.length - 1; i >= 0; i--) if (time >= timeline[i].at) { const { fn } = timeline[i]; timeline.splice(i, 1); fn(); }
    if (mode !== control) { control = mode; if (mode === 'ride') { clearShot(); resetCharge(); } if (mode === 'odm') clearShot(); }
    let fail = null;
    if (control === 'ride') fail = updateCharge(dt, input);
    if (control === 'odm') fail = updateOdm(dt, input);
    fail = updateRocks(dt) ?? fail;
    // Riders and horses.
    for (const r of riders) {
      r.horse.animate(time, r.alive && control === 'ride' ? 1 : 0); applyPose(r.rig, characterPose(r.fall ? 'fall' : 'ride', time + r.offset[0]));
      if (r.fall) { r.fall += dt; r.horse.root.rotation.z = Math.min(1.5, r.fall * 2.4); r.horse.root.position.y = -Math.min(.7, r.fall); }
    }
    beast.animate(time); if (!beastState || control !== 'odm') beast.arms[1].rotation.x = charge?.windup > 0 ? -2.6 : beast.arms[1].rotation.x;
    if (cartRun > 0) {
      cartRun += dt; const c = cart.root.position; c.x += 22 * dt * (cartRun < 1.4 ? 1 : -1); cart.root.rotation.y = cartRun < 1.4 ? Math.PI / 2 : -Math.PI / 2;
      if (cartRun > 1.3 && zeke.root.visible) { zeke.root.visible = false; particles.burst(c.clone().setY(2), 'dust', 20, 5); }
      cart.legs.forEach((l, i) => { l.rotation.x = Math.sin(time * 14 + i * 2) * .7; });
    }
    if (zekePulled) { beast.root.position.y -= dt * .6; if (Math.random() < .5) particles.burst(BEAST_POS.clone().setY(8 + Math.random() * 6), 'steam', 2, 6); }
    for (const s of smoke) if (Math.random() < .3) particles.burst(s.clone().setY(10 + Math.random() * 30), 'steam', 1, 2);
    particles.update(dt);
    updateCamera(dt);
    return fail ? { fail } : null;
  }

  function updateCamera(dt) {
    if (shot) { camPos.copy(shot.position); camTarget.copy(shot.target); if (camera.fov !== shot.fov) { camera.fov = shot.fov; camera.updateProjectionMatrix(); } }
    else if (control === 'ride') { const p = playerRider.horse.root.position; camTarget.set(p.x * .6, 6, p.z - 60); camPos.set(p.x, 4.6, p.z + 7.5); }
    else if (control === 'odm') {
      const P = odm.player.position, d = 6.5;
      camTarget.set(P.x, P.y + 1.4, P.z);
      camPos.set(P.x - Math.sin(yaw) * Math.cos(pitch) * d, Math.max(.6, P.y + 2.4 - Math.sin(pitch) * d), P.z + Math.cos(yaw) * Math.cos(pitch) * d);
      const fast = odm.player.velocity.length(); const fov = 58 + Math.min(14, fast * .3); if (Math.abs(camera.fov - fov) > .5) { camera.fov = fov; camera.updateProjectionMatrix(); }
    }
    camera.position.lerp(camPos, shot ? 1 : Math.min(1, dt * 10));
    if (shake > 0) { shake = Math.max(0, shake - dt * 1.6); camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake; }
    camera.lookAt(control === 'odm' && !shot ? camTarget.clone().add(new THREE.Vector3(Math.sin(yaw) * 20, Math.sin(pitch) * 10, -Math.cos(yaw) * 20)) : camTarget);
  }
  setShot([6, 10.2, 28], [11, 9.8, 31.5], 45); updateCamera(1);
  applyPose(levi, characterPose('idle', 0)); applyPose(erwin, characterPose('idle', 0));

  return {
    script: LAST_CHARGE, par: 300, wantsPointerLock: true,
    playerPosition: () => control === 'odm' ? [odm.player.position.x, odm.player.position.z] : [playerRider.horse.root.position.x, playerRider.horse.root.position.z],
    markerHeight: () => 12,
    goals: () => goals,
    status() {
      if (control === 'ride') return `Recrutas de pé: ${riders.filter(r => r.alive).length} · Arremessos: ${charge?.barrages ?? 0}`;
      if (control === 'odm') {
        const base = `Gás ${Math.round(odm.player.gas)}% · Vida ${Math.max(0, Math.round(odm.player.health))}% · Nucas ${kills}`;
        if (mission !== 'bestial' || !beastState) return base;
        const missing = BEAST_ORDER.filter(id => !beastState.cut.has(id)).map(id => ({ 'braco-esq': 'braço esq.', 'braco-dir': 'braço dir.', olhos: 'olhos', 'perna-esq': 'perna esq.', 'perna-dir': 'perna dir.' }[id]));
        return `${base} · Falta: ${missing.length ? missing.join(', ') : 'NUCA'}`;
      }
      return '';
    },
    onStoryEvent(event) {
      if (event.kind === 'event') handlers[event.id]?.(event);
      if (event.kind === 'choice') ui.toast(event.reflection, 3.5);
      if (event.kind === 'mission' && event.id === 'bestial') bossTime = 0;
    },
    update,
    checkpoint: () => ({ mission, gas: odm.player.gas, alive: lineTitans.map(t => t.alive), cut: beastState ? [...beastState.cut] : [] }),
    restore(snapshot) {
      clearShot(); goals = new Set([...goals].filter(g => g !== snapshot?.mission));
      if (control === 'ride' || snapshot?.mission === 'carga') resetCharge();
      if (control === 'odm' || ['linha', 'bestial'].includes(snapshot?.mission)) resetOdm(snapshot);
    },
    challengesDone() {
      const done = [];
      if (gasAtBeast > 60) done.push(data.challenges[0]);
      if (goals.has('bestial') && bossTime < 20) done.push(data.challenges[1]);
      if (flaresTimed >= 3) done.push(data.challenges[2]);
      return done;
    },
    onKey() {},
    snapshot: () => ({ control, goals: [...goals], riders: riders.filter(r => r.alive).length, barrages: charge?.barrages ?? 0, kills, gas: Math.round(odm.player.gas), health: odm.player.health, cut: beastState ? [...beastState.cut] : [], zekePulled, levi: odm.player.position.toArray().map(v => +v.toFixed(1)), hooks: odm.hooks.map(h => h.active) }),
    // Test hooks: place Levi next to a Beast zone or complete a goal, so browser
    // tests verify the rules without flying for minutes.
    debug: {
      place(where) { const zone = beastZones(beast).find(z => z.id === where); if (!zone) return false; odm.releaseAll(); odm.player.position.copy(zone.position).add(new THREE.Vector3(0, 0, 2)); odm.player.velocity.set(0, 0, 0); return true; },
      goal(id) { goals.add(id); if (id === 'linha') gasAtBeast = odm.player.gas; },
      strike() { strikeCooldown = 0; pendingStrike = true; },
    },
  };
}
