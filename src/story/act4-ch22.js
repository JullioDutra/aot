import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { createArmoredDuel, armoredStep, createArmlock, armlockStep } from './act4-rules.js';
import { CHAPTER_22 } from './act4-scripts.js';

// Chapter 22: Eren against the Armored Titan at the foot of the wall. Annie's
// technique: sidestep the charge and take him down; punches only clang on the
// armor. Mikasa cuts behind the knees, Eren locks the arm and pulls at the
// nape until Reiner roars and the Colossal falls on top of them.
const ARENA = [0, 250], TAKEDOWNS = 2;

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio, FIELD } = ctx;
    const titan = ctx.useTitan([ARENA[0], ARENA[1] - 20], 0); titan.titan.root.rotation.y = Math.PI; titan.yaw = 0;
    const armored = ctx.titanForm('blindado'); armored.root.position.set(ARENA[0], 0, ARENA[1] - 44); ctx.scene.add(armored.root); ctx.world.anchorRoots.push(armored.root);
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { blades: true }); mikasa.rig.root.visible = false;
    const pilot = ctx.usePilot(mikasa.rig);
    const colossal = ctx.titanForm('colossal'); colossal.root.visible = false; ctx.scene.add(colossal.root);
    for (let i = 0; i < 3; i++) ctx.cast(`watch-${i}`, ['armin', 'hange', 'jean'][i], 26 + i * 2, FIELD.wallZ - 5, Math.PI, { y: FIELD.wallHeight + 1.4 });
    let duel = createArmoredDuel(), lock = createArmlock(), knees = new Set(), fall = 0, phase = 0, down = 0;
    const tmp = new THREE.Vector3(), A = armored.root.position;

    function armoredPose() {
      const T = armored, ph = duel.phase;
      T.arms.forEach(a => a.rotation.set(0, 0, 0)); T.legs.forEach(l => l.rotation.set(0, 0, 0)); T.chest.rotation.x = 0;
      if (ph === 'stance') T.arms.forEach(a => { a.rotation.x = -1.2; });
      if (ph === 'tell') { T.chest.rotation.x = .5; T.arms.forEach(a => { a.rotation.x = -.6; }); }
      if (ph === 'charge') { T.chest.rotation.x = .7; T.arms.forEach(a => { a.rotation.x = -1.4; }); }
      if (ph === 'overextended') { T.chest.rotation.x = .9; T.legs[0].rotation.x = -.6; }
    }

    const handlers = {
      'duel-field': () => { armoredPose(); stage.setShot([ARENA[0] + 30, 12, ARENA[1] - 20], [ARENA[0], 9, ARENA[1] - 34], 58); },
      armlock: () => {
        lock = createArmlock(); A.set(ARENA[0], 0, ARENA[1] - 30); armored.root.rotation.set(.9, 0, 0);
        titan.place(ARENA[0], ARENA[1] - 24); titan.titan.root.rotation.y = Math.PI; titan.titan.arms.forEach(a => { a.rotation.x = -1.3; });
        stage.setShot([ARENA[0] + 20, 10, ARENA[1] - 16], [ARENA[0], 5, ARENA[1] - 28], 55);
      },
      'reiner-roars': () => { armored.head.rotation.x = -.6; stage.shake(1.4); audio.play('defeat', 0, 0, 1); },
      'colossal-falls': () => {
        colossal.root.visible = true; colossal.root.position.set(A.x + 4, 140, A.z - 6); fall = .001;
        stage.setShot([ARENA[0] + 60, 30, ARENA[1] + 20], [ARENA[0], 50, ARENA[1] - 30], 65);
      },
    };

    function update(dt, input, control) {
      armored.animate(stage.time);
      if (fall > 0) {
        fall += dt; colossal.root.position.y = Math.max(0, 140 - fall * fall * 40);
        if (colossal.root.position.y === 0 && fall < 9) { fall = 9; stage.shake(2); ui.flash('#fffbe8', 1); stage.particles.burst(new THREE.Vector3(A.x, 10, A.z), 'steam', 160, 16); titan.titan.root.visible = false; }
        return null;
      }
      if (control === 'titan') {
        const r = titan.step(dt, input, true), E = titan.titan.root.position;
        const d = Math.hypot(E.x - A.x, E.z - A.z), yaw = Math.atan2(E.x - A.x, E.z - A.z);
        armored.root.rotation.y = yaw;
        // He charges straight ahead; between charges he closes the distance.
        if (duel.phase === 'charge') { A.x += Math.sin(yaw) * 16 * dt; A.z += Math.cos(yaw) * 16 * dt; }
        else if (d > 14) { phase += dt * 5; A.x += Math.sin(yaw) * 4 * dt; A.z += Math.cos(yaw) * 4 * dt; armored.legs[0].rotation.x = Math.sin(phase) * .4; armored.legs[1].rotation.x = -Math.sin(phase) * .4; }
        const before = duel;
        duel = armoredStep(duel, dt, { punch: !!r.punch && d < 15, dodge: input.run, grab: input.interact && d < 18 });
        if (duel.last === 'clang') { armored.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'spark', 24, 5); audio.play('block', 1, 0, 1); ui.toast('A armadura não sente o soco. Saia da investida e agarre.', 1.6); }
        if (duel.last === 'sidestep') ui.toast('Desviou! Agarre agora.', 1);
        if (duel.last === 'takedown') { down = 1.4; stage.shake(1.2); stage.particles.burst(A.clone().setY(1), 'dust', 50, 8); audio.play('heavy', 0, 0, 1); ui.toast(`Derrubada · ${duel.takedowns} / ${TAKEDOWNS}`, 1.4); }
        if (duel.last === 'hit') { titan.titan.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 40, 6); stage.shake(1); ui.flash('#6a0909', .5); }
        if (before.phase !== duel.phase) armoredPose();
        if (down > 0) { down -= dt; armored.root.rotation.x = Math.min(1.3, (1.4 - down) * 3) * (down > .3 ? 1 : down / .3); }
        if (duel.health <= 0) return 'As investidas do Blindado quebraram o titã de Eren. Segure correr quando ele baixar o ombro.';
        if (duel.takedowns >= TAKEDOWNS && down <= 0) ctx.goals.add('tecnica');
        return null;
      }
      if (control === 'odm') {
        const r = pilot.step(dt, input);
        armored.root.rotation.x = 0; armored.root.rotation.y = Math.atan2(titan.titan.root.position.x - A.x, titan.titan.root.position.z - A.z);
        if (r.strike) armored.knees.forEach((k, i) => {
          if (knees.has(i)) return; k.getWorldPosition(tmp);
          if (tmp.distanceTo(r.position) > r.reach) return;
          const rel = [0, 0, Math.sin(armored.root.rotation.y) * (r.position.x - A.x) + Math.cos(armored.root.rotation.y) * (r.position.z - A.z)];
          if (rel[2] > 0) { stage.particles.burst(tmp, 'spark', 16, 4); ui.toast('Pela frente é armadura. Corte por trás do joelho.', 1.4); return; }
          knees.add(i); stage.particles.burst(tmp, 'blood', 40, 6); audio.play('punch', 2, 0, .8); ui.toast(`Joelho cortado · ${knees.size} / 2`, 1.2);
        });
        if (knees.size === 2) { armored.knees.forEach(k => { k.rotation.x = .9; }); A.y = -3; ctx.goals.add('juntas'); }
        return null;
      }
      if (control === 'lock') {
        lock = armlockStep(lock, dt, !!input.pressed.attack);
        titan.titan.arms[1].rotation.x = -1.3 - lock.progress * .9; armored.head.rotation.x = lock.progress * .5;
        if (input.pressed.attack) stage.shake(.2);
        if (lock.screamed) return 'Reiner teve tempo de gritar. Aperte sem parar até a nuca ceder.';
        if (lock.torn) { armored.nape.getWorldPosition(tmp); stage.particles.burst(tmp, 'steam', 40, 6); stage.particles.burst(tmp, 'blood', 30, 5); ctx.goals.add('chave'); }
        return null;
      }
      return null;
    }

    return {
      script: CHAPTER_22, par: 260,
      start() { stage.setShot([ARENA[0] + 30, 12, ARENA[1] - 20], [ARENA[0], 9, ARENA[1] - 34], 58); },
      handlers, update,
      onControl(mode) {
        if (mode === 'odm') { mikasa.rig.root.visible = true; pilot.place(A.x - 12, 0, A.z - 18, Math.atan2(12, -18)); }
      },
      status() {
        if (ctx.control === 'titan') return `Corpo ${Math.max(0, duel.health)}% · Derrubadas ${duel.takedowns} / ${TAKEDOWNS} · Socos na armadura ${duel.clangs} · Ele: ${{ stance: 'em guarda', tell: 'baixando o ombro', charge: 'INVESTINDO', recover: 'se recompondo', overextended: 'desequilibrado!' }[duel.phase]}`;
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Joelhos ${knees.size} / 2`;
        if (ctx.control === 'lock') return `Chave ${Math.round(lock.progress * 100)}% · Grito em ${Math.max(0, lock.left).toFixed(1)} s`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'tecnica') { duel = createArmoredDuel(); A.set(ARENA[0], 0, ARENA[1] - 44); armored.root.rotation.set(0, 0, 0); titan.place(ARENA[0], ARENA[1] - 20); armoredPose(); }
        if (snapshot?.mission === 'juntas') { knees.clear(); armored.knees.forEach(k => { k.rotation.x = 0; }); A.y = 0; }
        if (snapshot?.mission === 'chave') lock = createArmlock();
      },
      challenges: () => (ctx.goals.has('tecnica') && duel.clangs === 0 ? [ctx.data.challenges[0]] : []),
      debug: {
        takedown() { duel = { ...duel, phase: 'overextended', t: 0 }; titan.place(A.x, A.z + 10); },
        knee(i) { armored.knees[i].getWorldPosition(tmp); const y = armored.root.rotation.y; pilot.place(tmp.x - Math.sin(y) * 1.5, tmp.y, tmp.z - Math.cos(y) * 1.5); pilot.strikeNow(); },
      },
      snapshot: () => ({ duel: { phase: duel.phase, takedowns: duel.takedowns, clangs: duel.clangs, health: duel.health }, knees: knees.size, lock: { progress: +lock.progress.toFixed(2), torn: lock.torn, screamed: lock.screamed }, colossal: colossal.root.visible }),
    };
  }, { world: { wall: true, castle: false, forest: false } });
}
