import * as THREE from 'three';
import { createTrostChapter } from './trost-chapter.js';
import { createFemale } from './female-titan.js';
import { createTitanDuel, titanDuelStep, createClimb, climbStep } from './act3-rules.js';
import { CHAPTER_18 } from './act3-scripts.js';

// Chapter 18: Stohess. Annie refuses to go down the stairs and transforms;
// Eren fights her between the buildings (every building he crashes through
// counts); she runs for the wall and climbs it with hardened fingers until
// Mikasa cuts both hands. She seals herself in crystal and the wall shows a
// titan's face.
const STAIRS = [6, 64], CLIMB_X = 40, WALL_FACE = 194.5, HITS = 4;

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio, THREE: T } = ctx;
    const armin = ctx.cast('armin', 'armin', 4, 40, 0, { override: { outfit: 'survey' } });
    const annie = ctx.cast('annie', 'annie', 2, 58, Math.PI, { override: { outfit: 'commander' } });
    const eren = ctx.cast('eren', 'eren', 5, 66, Math.PI);
    const mikasa = ctx.cast('mikasa', 'mikasa', 8, 65, Math.PI, { blades: true });
    const walker = ctx.useWalker(armin); walker.lookAt(...STAIRS);
    // The stair to the underground passage: a dark opening in the avenue.
    const stairs = new T.Mesh(new T.BoxGeometry(3, .2, 4), new T.MeshBasicMaterial({ color: '#141210' })); stairs.position.set(STAIRS[0], .03, STAIRS[1] + 2); ctx.scene.add(stairs);
    const female = createFemale(stage, { anchorRoots: world.anchorRoots }); female.root.visible = false; female.pose = 'still';
    const pilot = ctx.usePilot(mikasa.rig);
    for (let i = 0; i < 18; i++) ctx.cast(`civil-${i}`, i % 2 ? 'civilian-f' : 'civilian-m', -7 + (i % 6) * 2.6, 20 + Math.floor(i / 6) * 9, (i % 4) * 1.5);
    let duel = createTitanDuel(), wrecked = new Set(), climb = null, regrow = [0, 0], cutHands = new Set(), crystal = null, face = null;
    const tmp = new THREE.Vector3();
    const F = () => female.root.position;

    function duelPose() {
      const B = female.titan, ph = duel.phase; female.resetLimbs();
      if (ph === 'stance') { B.arms.forEach(a => { a.rotation.x = -1.5; }); B.elbows.forEach(e => { e.rotation.x = -1.5; }); }
      if (ph === 'tell') { B.arms.forEach(a => { a.rotation.x = -1.3; }); B.legs[1].rotation.x = .7; B.knees[1].rotation.x = 1; }
      if (ph === 'strike') { B.legs[1].rotation.x = -1.7; }
      if (ph === 'recover') { B.arms.forEach(a => { a.rotation.x = -.2; }); B.chest.rotation.x = .25; }
    }
    // A titan crossing a building's footprint brings it down (counted once).
    function crash(position) {
      world.buildings.forEach((b, i) => {
        if (wrecked.has(i) || Math.abs(position.x - b.x) > b.w / 2 + 2 || Math.abs(position.z - b.z) > b.d / 2 + 2) return;
        wrecked.add(i); stage.particles.burst(new THREE.Vector3(b.x, b.h * .5, b.z), 'dust', 40, 8); stage.shake(.6); audio.play('heavy', 6, 0, .7);
        ui.toast(`Prédio destruído · ${wrecked.size}`, 1.2);
      });
    }

    const handlers = {
      stohess: () => { stage.setShot([10, 3, 50], [3, 2, 58], 50); },
      'annie-transforms': () => {
        ui.flash('#fff7d8', 1); stage.shake(1.4); audio.play('transform', 0, 0, 1);
        annie.rig.root.visible = false; female.root.visible = true; female.place(2, 72, Math.PI); female.pose = 'still';
        stage.particles.burst(new THREE.Vector3(2, 6, 70), 'steam', 120, 12);
        armin.pose = 'fall'; stage.place(armin, 4, 46); eren.rig.root.visible = false; mikasa.rig.root.visible = false;
        stage.setShot([14, 6, 30], [2, 10, 70], 58);
      },
      'eren-rises': () => {
        ui.flash('#fff7d8', 1); audio.play('transform', 0, 0, 1);
        ctx.useTitan([0, 44], 0); ctx.titan.titan.root.rotation.y = 0; ctx.titan.yaw = Math.PI;
        stage.particles.burst(new THREE.Vector3(0, 6, 44), 'steam', 100, 12); duel = createTitanDuel(); duelPose();
        stage.setShot([18, 12, 30], [0, 10, 60], 58);
      },
      'annie-runs': () => {
        female.resetLimbs(); female.pose = 'run'; climb = null;
        stage.setShot([CLIMB_X - 30, 30, 150], [CLIMB_X, 25, 196], 58);
      },
      'annie-falls': () => {
        climb = { ...(climb ?? createClimb()), falling: true };
        stage.setShot([CLIMB_X - 20, 12, 160], [CLIMB_X, 10, 190], 55);
      },
      crystal: () => {
        female.root.visible = false; stage.particles.burst(new THREE.Vector3(CLIMB_X, 3, 186), 'steam', 120, 10);
        annie.rig.root.visible = true; stage.place(annie, CLIMB_X, 186); annie.pose = 'lie';
        crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshToonMaterial({ color: '#cfe8f2', transparent: true, opacity: .7 }));
        crystal.scale.set(1.5, .8, 1); crystal.position.set(CLIMB_X, .9, 186); ctx.scene.add(crystal);
        stage.place(mikasa, CLIMB_X + 3, 183); mikasa.rig.root.visible = true; mikasa.pose = 'grief';
        stage.setShot([CLIMB_X + 5, 3, 178], [CLIMB_X, 1, 186], 48);
      },
      'wall-face': () => {
        face = ctx.titanForm('sorridente'); face.root.scale.setScalar(46); face.root.position.set(CLIMB_X + 6, 0, WALL_FACE + 3.8); face.root.rotation.y = Math.PI; ctx.scene.add(face.root);
        stage.particles.burst(new THREE.Vector3(CLIMB_X + 6, 40, WALL_FACE), 'dust', 40, 6);
        stage.setShot([CLIMB_X - 4, 38, WALL_FACE - 24], [CLIMB_X + 6, 42, WALL_FACE], 50);
      },
    };

    function update(dt, input, control, view) {
      if (control === 'walk') { walker.step(dt, input, 'walk', view.kind === 'line'); return null; }
      if (control === 'titan') {
        const r = ctx.titan.step(dt, input, true), E = ctx.titan.titan.root.position;
        crash(E);
        female.titan.animate(stage.time); female.root.rotation.y = Math.atan2(E.x - F().x, E.z - F().z);
        const d = Math.hypot(E.x - F().x, E.z - F().z);
        if (d > 11) { F().x += (E.x - F().x) / d * 4 * dt; F().z += (E.z - F().z) / d * 4 * dt; crash(F()); }
        const before = duel;
        duel = titanDuelStep(duel, dt, { punch: !!r.punch && d < 17, dodge: input.run, pace: 1.15 });
        if (duel.last === 'landed') { stage.particles.burst(female.point('boca', tmp), 'blood', 30, 5); stage.shake(.6); ui.toast(`Acertou · ${duel.landed} / ${HITS}`, 1.2); }
        if (duel.last === 'blocked') ui.toast('Ela bloqueou com os antebraços endurecidos.', 1.2);
        if (duel.last === 'hit') { ctx.titan.titan.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 40, 6); stage.shake(1); ui.flash('#6a0909', .5); }
        if (before.phase !== duel.phase || duel.last) duelPose();
        if (duel.health <= 0) return 'Annie derrubou Eren no meio da cidade. Soque quando ela recuar e segure correr para desviar.';
        if (duel.landed >= HITS) ctx.goals.add('cidade');
        return null;
      }
      if (female.pose === 'run' && !climb) {
        // She sprints to the wall, crashing through whatever is in the way.
        female.update(dt, { goal: [CLIMB_X, WALL_FACE - 3], speed: 16, aggressive: false }); crash(F());
        if (Math.hypot(F().x - CLIMB_X, F().z - WALL_FACE + 3) < 2) { climb = createClimb(); female.pose = 'still'; female.root.rotation.y = 0; }
      }
      if (climb && !climb.falling) {
        female.titan.animate(stage.time);
        const cut = [];
        if (control === 'odm') {
          const r = pilot.step(dt, input);
          if (r.strike) female.titan.hands.forEach((h, i) => { if (!climb.hands[i ? 'right' : 'left']) return; if (h.getWorldPosition(tmp).distanceTo(r.position) < r.reach + 1.5) { cut.push(i ? 'right' : 'left'); stage.particles.burst(tmp, 'blood', 40, 6); audio.play('punch', 2, 0, .8); } });
        }
        climb = climbStep(climb, control === 'odm' ? dt : 0, { cut });
        cut.forEach(side => { cutHands.add(side); regrow[side === 'left' ? 0 : 1] = 3.2; ui.toast(`Dedos cortados (${side === 'left' ? 'esquerda' : 'direita'})`, 1.4); });
        // A lone cut hand grows back if the other one is not cut in time.
        ['left', 'right'].forEach((side, i) => { if (!climb.hands[side] && (regrow[i] -= dt) <= 0 && !climb.falling) climb = { ...climb, hands: { ...climb.hands, [side]: true } }; });
        F().set(CLIMB_X, climb.y - 6, WALL_FACE - 3);
        female.titan.arms.forEach((a, i) => { a.rotation.set(climb.hands[i ? 'right' : 'left'] ? -2.9 : -.3, 0, 0); });
        if (climb.falling) ctx.goals.add('muralha');
        if (climb.escaped) return 'Annie chegou ao topo da muralha. Corte as duas mãos quase ao mesmo tempo.';
        return null;
      }
      if (climb?.falling && F().y > 0) { F().y = Math.max(0, F().y - dt * 18); female.titan.root.rotation.x = -Math.min(1.4, (climb.y - F().y) * .05); }
      if (control === 'odm') pilot.step(dt, input);
      female.titan.animate(stage.time);
      return null;
    }

    return {
      script: CHAPTER_18, par: 300,
      start() { stage.setShot([10, 3, 50], [3, 2, 58], 50); },
      handlers, update,
      markerHeight: () => 2,
      onControl(mode) { if (mode === 'odm') { mikasa.rig.root.visible = true; pilot.place(CLIMB_X - 10, world.roofAt(CLIMB_X - 10, 170) + .2, 170, Math.PI); } },
      status() {
        if (ctx.control === 'titan') return `Corpo ${Math.max(0, Math.round(duel.health))}% · Socos ${duel.landed} / ${HITS} · Prédios destruídos ${wrecked.size} · Ela: ${{ stance: 'em guarda', tell: 'preparando', strike: 'chutando!', recover: 'recuando' }[duel.phase]}`;
        if (ctx.control === 'odm' && climb) return `Gás ${Math.round(pilot.odm.player.gas)}% · Altura dela ${Math.round(climb.y)} / 50 m · Mãos: ${climb.hands.left ? 'esq.' : '—'} ${climb.hands.right ? 'dir.' : '—'}`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'cidade') { duel = createTitanDuel(); ctx.titan?.place(0, 44); F().set(2, 0, 72); }
        if (snapshot?.mission === 'muralha') { climb = null; female.pose = 'run'; female.resetLimbs(); F().set(CLIMB_X - 20, 0, 150); cutHands.clear(); }
      },
      challenges: () => [wrecked.size < 10 && ctx.goals.has('cidade') ? ctx.data.challenges[0] : null, cutHands.size === 2 ? ctx.data.challenges[1] : null].filter(Boolean),
      debug: {
        cutHand(side) { const i = side === 'left' ? 0 : 1; female.titan.hands[i].getWorldPosition(tmp); pilot.place(tmp.x, tmp.y, tmp.z - 1.5); pilot.strikeNow(); },
        landed() { duel = { ...duel, phase: 'recover', t: 0 }; if (ctx.titan) ctx.titan.punchQueued = true; },
      },
      snapshot: () => ({ duel: { phase: duel.phase, landed: duel.landed, health: duel.health }, wrecked: wrecked.size, climb: climb ? { y: +climb.y.toFixed(1), hands: climb.hands, falling: climb.falling } : null, crystal: !!crystal, face: !!face }),
    };
  }, { breach: false });
}
