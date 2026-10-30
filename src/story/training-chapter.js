import * as THREE from 'three';
import { toon } from '../character-model.js';
import { characterPose, applyPose } from '../character-animation.js';
import { createTrainingGrounds, RIG, RING, COURSE, HALL, FOREST_START } from './training-world.js';
import { createStage, createWalker, createOdmPilot } from './kit.js';
import { createBalance, balanceStep, createDuel, duelStep, cutScore, rivalScore, rankFor, passesHoop, trainingGas, TRAINING_GAS } from './story-rules.js';
import { ACT1_SCRIPTS } from './act1-scripts.js';

// Chapters 4 and 5: the 104th Training Corps. Chapter 4 teaches the systems
// as story (balance rig with the broken belt, first cables, hand-to-hand with
// Reiner and Annie); chapter 5 is the forest exercise against Jean and the
// graduation night.
const RIVAL_TIME = 80;

export function createChapter({ scene, camera, number, ui, audio, data }) {
  document.body.classList.add('combat-chapter');
  const stage = createStage({ scene, camera, ui, audio, sky: '#c6d5d8', fog: [160, 620], sun: [-80, 150, 70] });
  const world = createTrainingGrounds(scene);
  const day = { sky: new THREE.Color('#c6d5d8'), hemi: 1.7 }, night = { sky: new THREE.Color('#1b2533'), hemi: .45 };
  function setSky(look) { scene.background.copy(look.sky); scene.fog.color.copy(look.sky); stage.hemisphere.intensity = look.hemi; stage.sun.intensity = look === night ? .25 : 2.6; }

  // ── Cast ──────────────────────────────────────────────────────────────
  // Gear is issued after the first day: chapter 4 opens without it.
  const cadet = (id, spec, x, z, yaw = Math.PI, override = {}) => stage.actor(id, spec, x, z, yaw, { gear: number === 5 || id === 'eren', override: { outfit: 'training', ...override } });
  const eren = cadet('eren', 'eren', 0, 26);
  const named = ['mikasa', 'armin', 'jean', 'sasha', 'connie', 'reiner', 'bertholdt', 'annie', 'historia', 'ymir', 'marco'];
  const cast = Object.fromEntries(named.map((id, i) => [id, cadet(id, id, -12 + (i % 6) * 4, 30 + Math.floor(i / 6) * 4)]));
  const thomas = cadet('thomas', 'recruit-m', 14, 30, Math.PI, { hair: { style: 'short', color: '#c9a35a' } });
  const extras = [];
  for (let i = 0; i < 12; i++) extras.push(cadet(`recruta-${i}`, i % 3 ? 'recruit-m' : 'soldier-f', -12 + (i % 6) * 4, 38 + Math.floor(i / 6) * 4));
  const shadis = stage.actor('shadis', 'shadis', 0, 20, 0);
  const knife = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, .5), toon('#8a6a45')); knife.visible = false; scene.add(knife);
  const torches = [];
  for (let i = 0; i < 6; i++) { const light = new THREE.PointLight('#ffad5c', 0, 22); light.position.set(-15 + i * 6, 3, 18); scene.add(light); torches.push(light); }

  // ── Controllers ───────────────────────────────────────────────────────
  const walker = createWalker(stage, eren, { colliders: world.hallColliders, bounds: world.hallBounds, distance: 2.6 });
  const pilot = createOdmPilot(stage, eren.rig, { colliders: world.colliders, anchorRoots: world.anchorRoots, bounds: 600 });
  pilot.gasRate = TRAINING_GAS.rate;
  let control = 'none', goals = new Set(), mission = null;
  let balance = null, faulty = true, balanceHold = 0, balanceWorst = 0, retryTimer = 0;
  let duel = null, opponent = null, duelHits = 0, annieClock = 0, takedown = 0;
  let hoop = 0, score = 0, cuts = 0, hiddenCut = 0, rivalClock = 0, rotaClock = 0, jeanPath = 0;

  function lineUp() {
    const rows = [eren, ...Object.values(cast), thomas, ...extras];
    rows.forEach((a, i) => { stage.place(a, -14 + (i % 8) * 4, 26 + Math.floor(i / 8) * 4, Math.PI); a.pose = 'salute'; });
    stage.place(shadis, 0, 20, 0);
  }
  function hang(tilt, flipped = false) {
    eren.pose = 'manual'; applyPose(eren.rig, characterPose('idle', stage.time));
    eren.rig.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * .9; });
    eren.rig.root.position.set(RIG[0] + Math.sin(tilt) * .6, flipped ? 2.9 : 1.1, RIG[1]); eren.rig.root.rotation.set(0, Math.PI, flipped ? Math.PI : tilt * 1.3);
    world.ropes.forEach((r, i) => { r.scale.y = 2.2; r.position.set(RIG[0] + (i ? .5 : -.5) + Math.sin(tilt) * .3, 3.7, RIG[1]); r.rotation.z = -tilt * .3; });
  }
  function startDuel(who) {
    opponent = cast[who]; duel = createDuel(); annieClock = 0; takedown = 0;
    stage.place(eren, RING[0] - 1.4, RING[1], Math.PI / 2); stage.place(opponent, RING[0] + 1.4, RING[1], -Math.PI / 2); eren.pose = opponent.pose = 'guard';
    knife.visible = who === 'reiner';
  }

  // ── Events ────────────────────────────────────────────────────────────
  const handlers = {
    ceremony: () => { lineUp(); stage.setShot([10, 2.4, 14], [-2, 1.7, 28], 52); stage.walkTo(shadis, [[-8, 22], [6, 22]], 1.4); stage.after(2.2, () => stage.setShot([-5, 1.9, 23.5], [-10, 1.6, 27], 45)); },
    'sasha-potato': () => { const s = cast.sasha.rig.root.position; cast.sasha.pose = 'reach'; stage.place(shadis, s.x, s.z - 1.3, 0); stage.setShot([s.x + 2.4, 1.8, s.z - 2.6], [s.x, 1.5, s.z], 45); },
    'eren-row': () => { cast.sasha.pose = 'run'; stage.walkTo(cast.sasha, [[40, 0], [40, 60], [-30, 100]], 4, 'run'); const p = eren.rig.root.position; stage.setShot([p.x - 2.5, 1.8, p.z - 2.4], [p.x + 1, 1.5, p.z + 1], 48); },
    'balance-rig': () => { for (const a of Object.values(cast)) a.pose = 'idle'; hang(0); stage.place(shadis, RIG[0] + 4, RIG[1] - 3, -Math.PI / 4); stage.place(cast.jean, RIG[0] - 5, RIG[1] - 2, Math.PI / 4); stage.setShot([RIG[0] + 1, 2.4, RIG[1] - 6.5], [RIG[0], 1.6, RIG[1]], 50); },
    'upside-down': () => { hang(0, true); stage.setShot([RIG[0] - 3, 2.2, RIG[1] - 5], [RIG[0], 2.2, RIG[1]], 48); },
    'night-advice': () => {
      ui.setFade(1);
      stage.after(.6, () => {
        setSky(night); torches.forEach(t => { t.intensity = 14; }); eren.pose = 'idle'; eren.rig.root.rotation.set(0, 0, 0);
        stage.place(eren, -20, 52, 0); stage.place(cast.reiner, -21.5, 54.5, Math.PI * .8); stage.place(cast.bertholdt, -18.6, 54.6, -Math.PI * .8);
        torches[0].position.set(-20, 3, 56); stage.setShot([-23, 2, 49], [-19.5, 1.6, 54], 50); ui.setFade(0);
      });
    },
    'second-try': () => { setSky(day); torches.forEach(t => { t.intensity = 0; }); stage.place(thomas, RIG[0] + 3, RIG[1] - 2, 0); faulty = false; hang(0); stage.setShot([RIG[0] + 1, 2.4, RIG[1] - 6.5], [RIG[0], 1.6, RIG[1]], 50); },
    'course-brief': () => { eren.rig.root.rotation.set(0, 0, 0); eren.pose = 'manual'; pilot.place(48, 0, -6, Math.PI / 2); stage.place(shadis, 46, -10, Math.PI / 2); stage.setShot([44, 4, -2], [70, 9, -10], 55); },
    sparring: () => { stage.clearShot(); startDuel('reiner'); },
    'annie-turn': () => { knife.visible = false; stage.place(cast.reiner, RING[0] + 3, RING[1] + 2.5); stage.place(cast.annie, RING[0] + 6, RING[1] - 3); stage.walkTo(cast.annie, [[RING[0] + 1.4, RING[1]]], 2, 'walk'); cast.reiner.pose = 'idle'; stage.setShot([RING[0], 2.4, RING[1] - 6], [RING[0] + 2, 1.2, RING[1]], 50); },
    'annie-flip': () => {
      // Annie throws Reiner over her hip just as she did with Eren.
      stage.place(cast.reiner, RING[0] + 2.4, RING[1] - 1.2); cast.reiner.pose = 'manual'; cast.reiner.rig.root.rotation.set(-Math.PI / 2, 0, 0); cast.reiner.rig.root.position.y = .3;
      audio.play('punch', 2, 0, .9); stage.shake(.5); stage.setShot([RING[0] - 2, 2, RING[1] - 5], [RING[0] + 1.5, .8, RING[1]], 46);
    },
    'forest-brief': () => {
      setSky(day); pilot.place(FOREST_START[0], 0, FOREST_START[1] + 6, 0);
      [cast.jean, cast.mikasa, cast.armin, cast.sasha, cast.connie, cast.reiner, cast.annie, cast.marco].forEach((a, i) => { stage.place(a, -14 + i * 3.6 + (i > 3 ? 4 : 0), FOREST_START[1] + 8, Math.PI); a.pose = 'idle'; });
      stage.place(shadis, 0, FOREST_START[1] + 2, Math.PI); stage.setShot([6, 3, FOREST_START[1] + 16], [0, 8, FOREST_START[1] - 30], 58);
    },
    graduation: () => {
      ui.setFade(1);
      stage.after(.8, () => {
        setSky(night); torches.forEach((t, i) => { t.intensity = 16; t.position.set(-15 + i * 6, 3, 18); }); lineUp(); eren.rig.root.rotation.set(0, Math.PI, 0); eren.pose = 'salute';
        stage.setShot([0, 3.2, 12], [0, 2, 30], 55); ui.setFade(0);
      });
    },
    'mess-hall': () => {
      ui.setFade(1);
      stage.after(.6, () => {
        stage.focusLight(HALL[0], 0); stage.hemisphere.intensity = .9;
        const seat = (a, x, z, yaw) => { stage.place(a, HALL[0] + x, z, yaw); a.rig.root.position.y = .45; a.pose = 'bench'; };
        seat(cast.jean, -8.7, -2, Math.PI / 2); seat(cast.marco, -8.7, 0, Math.PI / 2);
        seat(cast.sasha, -1.7, -1, Math.PI / 2); seat(cast.connie, 1.7, -1, -Math.PI / 2);
        seat(cast.reiner, 5.3, -3, Math.PI / 2); seat(cast.bertholdt, 8.7, -3, -Math.PI / 2);
        seat(cast.annie, 8.7, 1.5, -Math.PI / 2); seat(cast.historia, -5.3, 1.5, -Math.PI / 2); seat(cast.ymir, -5.3, 3, -Math.PI / 2);
        stage.place(cast.mikasa, HALL[0] - 1, 8, Math.PI); stage.place(cast.armin, HALL[0] + 1, 8.4, Math.PI); cast.mikasa.pose = cast.armin.pose = 'idle';
        extras.forEach((a, i) => seat(a, [-8.7, -5.3, 5.3, 8.7][i % 4], -4.5 + Math.floor(i / 4) * 2.2, i % 2 ? Math.PI / 2 : -Math.PI / 2));
        eren.rig.root.rotation.set(0, 0, 0); stage.place(eren, HALL[0], 8.4, Math.PI); eren.pose = 'idle'; walker.lookAt(HALL[0], 0);
        stage.clearShot(); ui.setFade(0);
      });
    },
    'eren-speech': () => { const p = eren.rig.root.position; eren.pose = 'idle'; stage.setShot([p.x + 2.4, 1.9, p.z - 3], [p.x, 1.5, p.z], 46); },
    'night-sky': () => { stage.setShot([HALL[0], 30, 40], [HALL[0], 60, -100], 60); setSky(night); ui.setFade(.5); },
  };

  // ── Per-frame ─────────────────────────────────────────────────────────
  const nape = new THREE.Vector3(), offset = new THREE.Vector3();
  function updateBalance(dt, input) {
    if (retryTimer > 0) { retryTimer -= dt; hang(0, true); if (retryTimer <= 0) { balance = createBalance(); balanceHold = 0; ui.toast('De novo. Firme os pés.', 1.4); } return; }
    balance ??= createBalance();
    balance = balanceStep(balance, input.move[0], dt, { faulty });
    hang(balance.tilt, balance.fallen);
    if (balance.fallen) {
      if (faulty) { goals.add('equilibrio-1'); return; }
      retryTimer = 1.4; balanceWorst = 1; ui.flash('#3a0d0d', .3); audio.play('block', 1, 0, .6); return;
    }
    balanceHold += dt; balanceWorst = Math.max(balanceWorst, Math.abs(balance.tilt));
    if (!faulty && balanceHold >= 6) goals.add('equilibrio');
  }
  function updateDuel(dt, input) {
    if (!duel || takedown) {
      if (takedown) { takedown += dt; eren.pose = 'manual'; eren.rig.root.rotation.set(-Math.PI / 2, Math.PI / 2, 0); eren.rig.root.position.y = .3; if (takedown > 1.2) goals.add('annie'); }
      return;
    }
    const counter = !!(input.interact || input.pressed.attack);
    const annie = opponent === cast.annie;
    annieClock += dt;
    if (annie && (counter || annieClock > 4.5)) {
      // Annie reads the counter and sweeps Eren's legs: the drill is lost by design.
      takedown = .001; opponent.pose = 'punch'; opponent.progress = .5; audio.play('punch', 1, 0, 1); stage.shake(.6); ui.flash('#ffffff', .3); return;
    }
    duel = duelStep(duel, dt * (annie ? 1.4 : 1), counter);
    opponent.pose = duel.phase === 'tell' ? 'guard' : duel.phase === 'strike' ? 'punch' : 'guard';
    opponent.progress = duel.phase === 'strike' ? duel.t / .3 : 0;
    if (duel.phase === 'tell') opponent.rig.root.position.x = RING[0] + 1.4 + Math.sin(stage.time * 14) * .03;
    eren.pose = counter ? 'punch' : 'guard'; eren.progress = .5;
    if (duel.last === 'disarm') { ui.toast(`Desarmado! (${duel.wins} / 3)`, 1.1); audio.play('block', 1, 0, .8); knife.position.set(RING[0] + .5, 2, RING[1] + .6); }
    if (duel.last === 'hit') { duelHits++; ui.flash('#7a1010', .35); audio.play('punch', 1, 0, .7); ui.toast('Golpe recebido. Espere ele se comprometer.', 1.2); }
    if (duel.last === 'whiff') ui.toast('Cedo demais: ele viu você vindo.', 1);
    if (knife.visible && duel.last !== 'disarm') opponent.rig.hands[1].getWorldPosition(knife.position);
    if (duel.wins >= 3) goals.add('reiner');
  }
  function updateOdm(dt, input) {
    const r = pilot.step(dt, input);
    const P = r.position, odm = pilot.odm;
    // Practice tanks: half the field drain, refilled whenever the cadet stands free on the ground.
    const before = odm.player.gas;
    odm.player.gas = trainingGas(odm.player.gas, dt, { grounded: odm.player.grounded, attached: odm.hooks.some(h => h.active) });
    if (before < 20 && odm.player.gas >= 20 && odm.player.grounded) ui.toast('Cilindros de treino recarregando no chão.', 1.4);
    if (number === 4) {
      if (hoop < COURSE.length && passesHoop(P.toArray(), COURSE[hoop])) {
        world.hoops[hoop].material = toon('#6fae5c'); hoop++; audio.play('block', 1, 0, .5);
        ui.toast(hoop < COURSE.length ? `Arco ${hoop} / ${COURSE.length}` : 'Circuito completo!', 1.2);
        if (hoop < COURSE.length) world.hoops[hoop].material = toon('#e0b44a'); else goals.add('cabos');
      }
      return null;
    }
    // Forest: wooden napes, Jean and the clock.
    if (mission === 'rota' || mission === 'rival') rotaClock += dt;
    if (r.strike) for (const t of world.targets) {
      if (t.cut) continue;
      t.napeMesh.getWorldPosition(nape); const d = P.distanceTo(nape);
      if (d > r.reach * .7) continue;
      offset.subVectors(P, nape); const fwd = new THREE.Vector3(Math.sin(t.group.rotation.y), 0, Math.cos(t.group.rotation.y));
      if (offset.x * fwd.x + offset.z * fwd.z > .8) { ui.toast('Corte raso no pescoço: não conta. Ataque por trás.', 1.2); break; }
      t.cut = true; cuts++; if (t.hidden) hiddenCut++;
      const points = cutScore(r.speed, t.hidden); score += points;
      t.napeMesh.material = toon('#5d5148'); t.head.rotation.x = .5; stage.particles.burst(nape, 'dust', 14, 4); audio.play('punch', 1, 0, .7);
      ui.toast(`${t.hidden ? 'Alvo escondido! ' : ''}+${points} · ${score} pontos`, 1.2);
      break;
    }
    if (mission === 'rota' && cuts >= 5) goals.add('rota');
    if (mission === 'rival') {
      rivalClock += dt;
      if (rivalClock >= RIVAL_TIME) {
        if (score > rivalScore(rotaClock)) goals.add('rival');
        else return `O sino tocou e Jean terminou na frente (${rivalScore(rotaClock)} contra ${score}). Cortes rápidos por trás valem mais.`;
      }
    }
    // Jean flies a loop through the trees ahead of the player.
    const j = cast.jean; jeanPath += dt * .06;
    const jz = FOREST_START[1] - 40 - (jeanPath % 1) * 380, jx = Math.sin(jeanPath * 9) * 40;
    j.rig.root.position.set(jx, 10 + Math.sin(jeanPath * 23) * 4, jz); j.rig.root.rotation.y = Math.PI; j.pose = 'odm';
    return null;
  }

  function update(dt, input, mode, view) {
    stage.tick(dt);
    mission = view.mission?.id ?? mission;
    if (mode !== control) { control = mode; if (mode === 'odm' || mode === 'walk') stage.clearShot(); if (mode === 'balance') { balance = createBalance(); balanceHold = 0; } }
    const talking = view.kind === 'line' || view.kind === 'choice';
    let fail = null, desired = null, fov = 55;
    if (control === 'walk' || control === 'none') { walker.step(dt, input, control, talking); desired = walker.view(); }
    else if (control === 'balance') updateBalance(dt, input);
    else if (control === 'duel') { updateDuel(dt, input); stage.setShot([RING[0], 2.1, RING[1] - 5.2], [RING[0], 1.2, RING[1]], 50); }
    else if (control === 'odm') { fail = updateOdm(dt, input); desired = pilot.view(); fov = pilot.fov(); const P = pilot.odm.player.position; stage.focusLight(P.x, P.z); }
    world.flag.rotation.y = Math.sin(stage.time * 2) * .2;
    stage.frame(dt, desired, fov);
    return fail ? { fail } : null;
  }

  // Opening state per chapter.
  if (number === 4) { lineUp(); stage.setShot([10, 2.4, 14], [-2, 1.7, 28], 52); }
  else { pilot.place(FOREST_START[0], 0, FOREST_START[1] + 6, 0); stage.focusLight(0, FOREST_START[1] - 60); stage.setShot([6, 3, FOREST_START[1] + 16], [0, 8, FOREST_START[1] - 30], 58); }
  stage.frame(1, null);

  return {
    script: ACT1_SCRIPTS[number], par: number === 4 ? 420 : 360, wantsPointerLock: true,
    playerPosition: () => (control === 'odm' ? [pilot.odm.player.position.x, pilot.odm.player.position.z] : [eren.rig.root.position.x, eren.rig.root.position.z]),
    markerHeight: () => (control === 'odm' ? 10 : 2.4),
    goals: () => goals,
    status() {
      if (control === 'balance') return balance ? `Inclinação ${Math.round(Math.abs(balance.tilt) * 100)}%${faulty ? '' : ` · ${Math.min(6, balanceHold).toFixed(1)} / 6 s`}` : '';
      if (control === 'duel' && duel) return opponent === cast.annie ? 'Annie' : `Desarmes ${duel.wins} / 3 · Golpes recebidos ${duelHits}`;
      if (control === 'odm' && number === 4) return `Gás ${Math.round(pilot.odm.player.gas)}% · Arcos ${hoop} / ${COURSE.length}`;
      if (control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Você ${score} · Jean ${rivalScore(rotaClock)}${mission === 'rival' ? ` · Sino em ${Math.max(0, Math.ceil(RIVAL_TIME - rivalClock))} s` : ''}`;
      return '';
    },
    onStoryEvent(event) {
      if (event.kind === 'event') handlers[event.id]?.(event);
      if (event.kind === 'choice') { ui.toast(event.reflection, 3.5); const x = HALL[0] + ({ jean: -7, sasha: 0, reiner: 7 }[event.option] ?? 0); stage.setShot([x + 3.2, 2.3, 3.4], [x, 1, -2], 48); }
      if (event.kind === 'mission' && event.id === 'rival') rivalClock = 0;
    },
    update,
    checkpoint: next => ({ mission: next?.id ?? mission, hoop, score, cuts, rotaClock }),
    restore(snapshot) {
      stage.clearShot(); goals = new Set([...goals].filter(g => !g.startsWith(snapshot?.mission ?? '·')));
      if (control === 'odm' && number === 5) { pilot.place(FOREST_START[0], 0, FOREST_START[1] + 6, 0); pilot.odm.player.gas = 100; score = snapshot?.score ?? 0; cuts = snapshot?.cuts ?? 0; rotaClock = snapshot?.rotaClock ?? 0; rivalClock = 0; }
    },
    challengesDone() {
      const done = [];
      if (number === 4 && goals.has('equilibrio') && balanceWorst < .5) done.push(data.challenges[0]);
      if (number === 4 && goals.has('reiner') && duelHits === 0) done.push(data.challenges[1]);
      if (number === 5 && rankFor(score) <= 10) done.push(data.challenges[0]);
      if (number === 5 && hiddenCut === world.targets.filter(t => t.hidden).length) done.push(data.challenges[1]);
      return done;
    },
    debug: {
      teleport([x, z]) { if (control === 'odm') pilot.place(x, 4, z); else stage.place(eren, x, z); },
      gas(value) { pilot.odm.player.gas = value; },
      fly([x, y, z]) { pilot.place(x, y, z); },
      goal(id) { goals.add(id); },
      // Puts the cadet behind the next uncut target, for browser tests.
      behindTarget() { const t = world.targets.find(o => !o.cut); if (!t) return false; t.napeMesh.getWorldPosition(nape); const back = new THREE.Vector3(-Math.sin(t.group.rotation.y), 0, -Math.cos(t.group.rotation.y)).multiplyScalar(2.5); pilot.place(nape.x + back.x, nape.y - 1, nape.z + back.z); pilot.strikeNow(); return true; },
    },
    snapshot: () => ({ control, mission, tilt: balance ? +balance.tilt.toFixed(2) : null, fallen: !!balance?.fallen, wins: duel?.wins ?? 0, duelHits, hoop, score, cuts, gas: Math.round(pilot.odm.player.gas), jean: rivalScore(rotaClock), player: (control === 'odm' ? pilot.odm.player.position : eren.rig.root.position).toArray().map(v => +v.toFixed(1)) }),
  };
}
