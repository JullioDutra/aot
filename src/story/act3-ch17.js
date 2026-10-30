import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { castExtra } from './extras.js';
import { createTitanDuel, titanDuelStep, rescueCut, RESCUE_ORDER } from './act3-rules.js';
import { CHAPTER_17 } from './act3-scripts.js';
import { createBossThreat } from './boss-threat.js';

// Chapter 17: Levi's squad flies back toward the horses and dies to the
// Female Titan one by one. Eren transforms and loses the duel; she carries
// him off in her mouth. As Levi, cut her eyes, shoulders and mouth to get
// him back while Mikasa draws her attention.
const END_Z = -520, DUEL_HITS = 3, ESCAPE_Z = -730;

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio } = ctx;
    const eren = ctx.cast('eren', 'eren', 0, 0, 0, { blades: true });
    let pilot = ctx.usePilot(eren.rig); pilot.place(0, 0, -370, 0);
    const squad = ['petra', 'oluo', 'eld', 'gunther'].map((id, i) => castExtra(ctx, id, (i % 2 ? 3 : -3), -385 - i * 4, Math.PI, { pose: 'odm', blades: true }));
    const [petra, oluo, eld, gunther] = squad;
    squad.forEach((a, i) => { a.rig.root.position.y = 16 + i; a.fly = { speed: 15, goal: [(i % 2 ? 4 : -4), 15 + (i % 2) * 3, END_Z - i * 5] }; });
    const annie = ctx.cast('annie', 'annie', 0, 0, 0, { pose: 'odm', blades: true }); annie.rig.root.visible = false;
    const levi = ctx.cast('levi', 'levi', 0, 0, 0, { blades: true }); levi.rig.root.visible = false;
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { pose: 'odm', blades: true }); mikasa.rig.root.visible = false;
    const female = ctx.useFemale(); female.root.visible = false;
    const threat = createBossThreat(stage, female.titan, 'female', { track: false, blind: () => cuts.includes('olho-e') && cuts.includes('olho-d'), disarmed: () => cuts.includes('braco-e') && cuts.includes('braco-d') });
    let duel = createTitanDuel(), carried = false, cuts = [], rescueTime = 0, mikasaHit = false, fleeing = false, flight = 0;
    const tmp = new THREE.Vector3(), up = new THREE.Vector3();

    // Squad members fly in straight lines between scripted marks.
    function fly(dt) {
      for (const a of squad) {
        if (!a.fly) continue;
        const p = a.rig.root.position, [gx, gy, gz] = a.fly.goal, d = Math.hypot(gx - p.x, gy - p.y, gz - p.z);
        if (d < .5) continue;
        const step = Math.min(d, a.fly.speed * dt); p.x += (gx - p.x) / d * step; p.y += (gy - p.y) / d * step + Math.sin(stage.time * 3 + p.x) * .02; p.z += (gz - p.z) / d * step;
        a.rig.root.rotation.y = Math.atan2(gx - p.x, gz - p.z); a.pose = 'odm';
      }
    }
    const dead = (a, y = 0, pose = 'lie') => { a.fly = null; a.rig.root.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 50, 6); a.rig.root.position.y = y; a.pose = pose; audio.play('punch', 3, 0, .8); };
    const F = () => female.root.position;

    // The duel: her stance drives the pose; Eren's punches only land as she recovers.
    function duelPose() {
      const T = female.titan, ph = duel.phase;
      female.resetLimbs();
      if (ph === 'stance') { T.arms.forEach(a => { a.rotation.x = -1.5; }); T.elbows.forEach(e => { e.rotation.x = -1.5; }); }
      if (ph === 'tell') { T.arms.forEach(a => { a.rotation.x = -1.3; }); T.legs[1].rotation.x = .7; T.knees[1].rotation.x = 1; }
      if (ph === 'strike') { T.legs[1].rotation.x = -1.7; T.arms[0].rotation.x = -1; }
      if (ph === 'recover') { T.arms.forEach(a => { a.rotation.x = -.2; }); T.chest.rotation.x = .25; T.head.rotation.x = .3; }
    }

    const handlers = {
      'squad-flight': () => { stage.setShot([6, 20, -360], [0, 16, -400], 58); },
      'gunther-cut': () => {
        const g = gunther.rig.root.position; annie.rig.root.visible = true; annie.rig.root.position.set(g.x + 6, g.y + 4, g.z + 8);
        stage.after(.6, () => { annie.rig.root.position.set(g.x - 8, g.y - 2, g.z - 10); dead(gunther, 10, 'fall'); gunther.rig.root.position.x = 9; });
        stage.after(1.6, () => {
          annie.rig.root.visible = false; ui.flash('#fff7d8', 1); stage.shake(1.2); audio.play('transform', 0, 0, 1);
          female.root.visible = true; female.place(0, -480, Math.PI); female.pose = 'still'; stage.particles.burst(new THREE.Vector3(0, 8, -480), 'steam', 90, 10);
        });
        stage.setShot([10, 18, -500], [0, 12, -510], 55);
      },
      blinded: () => {
        female.place(0, END_Z + 2, Math.PI); female.pose = 'still'; female.resetLimbs();
        eld.fly = { speed: 30, goal: [-6, 12, END_Z - 2] }; petra.fly = { speed: 30, goal: [6, 12, END_Z - 2] }; oluo.fly = { speed: 30, goal: [0, 6, END_Z - 6] };
        stage.after(.8, () => { for (const id of ['olho-e', 'olho-d']) stage.particles.burst(female.point(id, tmp), 'blood', 30, 4); female.titan.root.position.y = -4; female.titan.chest.rotation.x = .5; female.titan.arms.forEach(a => { a.rotation.set(-2.8, 0, 0); }); female.hardened = true; });
        stage.setShot([14, 10, END_Z + 16], [0, 8, END_Z], 55);
      },
      'eld-bitten': () => {
        female.titan.root.position.y = 0; female.titan.chest.rotation.x = 0; female.resetLimbs(); female.titan.head.rotation.x = -.3;
        eld.rig.root.position.set(-1, 13, END_Z - 3); eld.fly = null;
        stage.after(.7, () => { dead(eld, 0); eld.rig.root.position.set(-3, 0, END_Z - 6); });
        stage.setShot([-10, 14, END_Z - 14], [0, 12, END_Z], 50);
      },
      'petra-crushed': () => {
        const trunk = ctx.world.nearestTrunk(14, END_Z - 20); petra.fly = null; petra.rig.root.position.set(trunk.x - trunk.radius - .3, 3, trunk.z);
        female.place(trunk.x - 14, trunk.z, Math.PI / 2); female.titan.legs[1].rotation.x = -1.5;
        stage.after(.6, () => { dead(petra, 2.2, 'fall'); petra.rig.root.rotation.z = 1.2; stage.shake(.8); });
        stage.setShot([trunk.x + 4, 7, trunk.z + 20], [trunk.x - 5, 4, trunk.z], 52);
      },
      'oluo-struck': () => {
        female.resetLimbs(); female.place(4, END_Z - 10, Math.PI); female.hardened = true;
        female.napePosition(tmp); oluo.fly = null; oluo.rig.root.position.copy(tmp).add(new THREE.Vector3(0, 1, 1.5)); oluo.pose = 'strike';
        stage.after(.4, () => { stage.particles.burst(tmp, 'spark', 30, 6); audio.play('dodge', 2, 0, .9); });
        stage.after(1.1, () => { female.attack = { kind: 'swat', t: .4, resolved: true }; dead(oluo, 0); oluo.rig.root.position.set(14, 0, END_Z - 18); });
        stage.setShot([10, 16, END_Z + 6], [4, 13, END_Z - 10], 52);
      },
      'eren-transforms': () => {
        ui.flash('#fff7d8', 1); stage.shake(1.4); audio.play('transform', 0, 0, 1);
        const p = pilot.odm.player.position; eren.rig.root.visible = false; pilot.odm.releaseAll();
        const titan = ctx.useTitan([p.x, p.z + 6], Math.PI); titan.titan.root.rotation.y = Math.PI; titan.yaw = 0;
        female.attack = null; female.hardened = false; female.place(p.x, p.z - 14, 0); female.pose = 'still'; duel = createTitanDuel();
        stage.particles.burst(new THREE.Vector3(p.x, 8, p.z + 6), 'steam', 90, 10);
      },
      'eren-loses': () => {
        const T = ctx.titan.titan; female.resetLimbs(); female.titan.legs[1].rotation.x = -1.8; female.hardened = true;
        stage.after(.6, () => { T.head.getWorldPosition(tmp); T.head.visible = false; stage.particles.burst(tmp, 'blood', 80, 8); stage.particles.burst(tmp, 'steam', 60, 8); stage.shake(1.2); });
        stage.after(1.6, () => { female.titan.chest.rotation.x = .9; female.titan.head.rotation.x = .6; T.root.rotation.x = -.5; });
        stage.after(2.8, () => { carried = true; female.resetLimbs(); T.root.rotation.x = -1.3; fleeing = true; });
        stage.setShot([F().x + 18, 14, F().z + 10], [F().x, 10, F().z], 55);
      },
      'levi-joins': () => {
        levi.rig.root.visible = true; pilot = ctx.usePilot(levi.rig, { gas: 100 }); pilot.gasRate = .7;
        pilot.place(F().x + 6, 22, F().z + 30, 0); mikasa.rig.root.visible = true;
        stage.setShot([F().x + 10, 24, F().z + 36], [F().x, 10, F().z], 55);
      },
      'eren-freed': () => {
        fleeing = false; female.pose = 'still'; female.titan.root.rotation.x = -.4; female.titan.arms.forEach(a => { a.rotation.set(0, 0, 0); });
        female.point('boca', tmp); stage.particles.burst(tmp, 'blood', 40, 5); stage.particles.burst(tmp, 'steam', 40, 6);
        eren.rig.root.visible = true; eren.pose = 'carried'; levi.pose = 'idle'; carried = false;
        stage.setShot([tmp.x + 8, tmp.y + 2, tmp.z + 8], [tmp.x, tmp.y - 2, tmp.z], 50);
        stage.after(.2, () => { eren.rig.root.position.copy(tmp).add(new THREE.Vector3(2, -1, 3)); levi.rig.root.position.copy(tmp).add(new THREE.Vector3(3, 0, 3)); });
      },
    };

    function update(dt, input, control) {
      fly(dt);
      if (female.root.visible && female.pose !== 'still' && !fleeing) female.update(dt);
      else female.titan.animate(stage.time);
      if (control === 'odm' && ctx.mission === 'esquadrao') {
        const r = pilot.step(dt, input);
        if (r.position.z <= END_Z + 20) ctx.goals.add('voo');
        return null;
      }
      if (control === 'titan') {
        const r = ctx.titan.step(dt, input, true), E = ctx.titan.titan.root.position;
        female.root.rotation.y = Math.atan2(E.x - F().x, E.z - F().z);
        const d = Math.hypot(E.x - F().x, E.z - F().z);
        if (d > 11) { F().x += (E.x - F().x) / d * 4 * dt; F().z += (E.z - F().z) / d * 4 * dt; }
        const before = duel;
        duel = titanDuelStep(duel, dt, { punch: !!r.punch && d < 17, dodge: input.run });
        if (duel.last === 'landed') { female.napePosition(tmp); stage.particles.burst(female.point('boca', tmp), 'blood', 30, 5); stage.shake(.6); ui.toast(`Acertou · ${duel.landed} / ${DUEL_HITS}`, 1.2); }
        if (duel.last === 'blocked') { ui.toast('Antebraços endurecidos: espere ela recuar.', 1.4); stage.particles.burst(female.point('olho-e', tmp), 'spark', 16, 4); }
        if (duel.last === 'dodged') ui.toast('Desviou!', .8);
        if (duel.last === 'hit') { ctx.titan.titan.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 40, 6); stage.shake(1); ui.flash('#6a0909', .5); }
        if (before.phase !== duel.phase || duel.last) duelPose();
        if (duel.health <= 0) return 'Ela leu cada golpe. Espere o recuo dela para socar e desvie correndo quando ela chutar.';
        if (duel.landed >= DUEL_HITS) ctx.goals.add('duelo');
        return null;
      }
      if (fleeing) {
        // She runs for the edge of the forest with Eren in her mouth.
        female.phase += dt * 6; female.root.rotation.y = Math.PI;
        const speed = cuts.includes('olho-e') && cuts.includes('olho-d') ? 4 : 9;
        F().z -= speed * dt; const s = Math.sin(female.phase); female.titan.legs[0].rotation.x = s * .5; female.titan.legs[1].rotation.x = -s * .5;
        if (cuts.includes('braco-e')) female.titan.arms[0].rotation.x = .2; if (cuts.includes('braco-d')) female.titan.arms[1].rotation.x = .2;
        mikasa.rig.root.position.set(F().x + Math.sin(stage.time) * 10, 16 + Math.sin(stage.time * 2) * 3, F().z + 8); mikasa.rig.root.rotation.y = Math.PI;
      }
      if (control === 'odm' && ctx.mission === 'resgate') {
        const r = pilot.step(dt, input); rescueTime += dt;
        threat.update(dt, pilot);
        if (pilot.odm.player.health <= 0) return 'A Titã Fêmea derrubou Levi. Corte os olhos primeiro: cega, ela não acerta mais.';
        if (r.strike) {
          // The blade meets the nearest weak point; out of order it glances off.
          const near = RESCUE_ORDER.filter(id => !cuts.includes(id)).map(id => ({ id, d: female.point(id, tmp).distanceTo(r.position) })).sort((a, b) => a.d - b.d)[0];
          if (near && near.d <= r.reach) {
            const result = rescueCut(cuts, near.id); female.point(near.id, tmp);
            if (result.ok) { cuts = result.done; stage.particles.burst(tmp, 'blood', 40, 6); audio.play('punch', 2, 0, .8); ui.toast(`Corte · ${cuts.length} / ${RESCUE_ORDER.length}`, 1.2); }
            else { stage.particles.burst(tmp, 'spark', 12, 3); ui.toast(`A lâmina resvala: ${result.reason}.`, 1.4); }
          }
        }
        if (!mikasaHit && rescueTime > 45) { mikasaHit = true; ui.toast('Mikasa chegou perto demais e levou um golpe!', 2.4); mikasa.rig.root.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 30, 5); }
        if (cuts.includes('boca')) ctx.goals.add('resgate');
        if (F().z < ESCAPE_Z) return 'Ela saiu da floresta com Eren. Corte primeiro os olhos para que ela pare de correr.';
      }
      return null;
    }

    return {
      script: CHAPTER_17, par: 320,
      start() { stage.setShot([6, 20, -360], [0, 16, -400], 58); },
      handlers, update,
      markerHeight: () => 14,
      status() {
        if (ctx.control === 'titan') return `Corpo ${Math.max(0, Math.round(duel.health))}% · Socos ${duel.landed} / ${DUEL_HITS} · Ela: ${{ stance: 'em guarda', tell: 'preparando', strike: 'chutando!', recover: 'recuando' }[duel.phase]}`;
        if (ctx.control === 'odm' && ctx.mission === 'resgate') return `Gás ${Math.round(pilot.odm.player.gas)}% · Vida ${Math.max(0, Math.round(pilot.odm.player.health))}% · Próximo corte: ${RESCUE_ORDER.find(id => !cuts.includes(id)) ?? '—'} · Borda da floresta: ${Math.max(0, Math.round(F().z - ESCAPE_Z))} m`;
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}%`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'esquadrao') pilot.place(0, 0, -370, 0);
        if (snapshot?.mission === 'duelo') { duel = createTitanDuel(); if (ctx.titan) { ctx.titan.titan.head.visible = true; ctx.titan.titan.root.rotation.x = 0; } }
        if (snapshot?.mission === 'resgate') { threat.reset(); pilot.odm.player.health = 100; cuts = []; rescueTime = 0; fleeing = true; female.place(0, -560, Math.PI); pilot.place(6, 22, -530, 0); }
      },
      challenges: () => (ctx.goals.has('resgate') && !mikasaHit ? [ctx.data.challenges[0]] : []),
      debug: {
        cut(id) { female.point(id, tmp); pilot.place(tmp.x, tmp.y - .4, tmp.z + .6); pilot.strikeNow(); },
        landed() { duel = { ...duel, phase: 'recover', t: 0 }; if (ctx.titan) ctx.titan.punchQueued = true; },
      },
      snapshot: () => ({ duel: { phase: duel.phase, landed: duel.landed, health: duel.health }, boss: threat.snapshot(), health: pilot.odm.player.health, cuts: [...cuts], carried, mikasaHit, female: [Math.round(F().x), Math.round(F().z)], squad: squad.map(a => a.pose) }),
    };
  }, { sky: '#aebcaa', fog: [70, 420] });
}
