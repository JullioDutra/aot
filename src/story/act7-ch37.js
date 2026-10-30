import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTrostChapter } from './trost-chapter.js';
import { castExtra } from './extras.js';
import { SPIKE, spikePhase, spikeHits, onCord, CRYSTAL_HITS } from './act7-rules.js';
import { CHAPTER_37 } from './act7-scripts.js';

// Chapter 37: the declaration. Eren talks with Reiner in the cellar under the
// stage while Willy Tybur declares war above them; Eren transforms through
// the stage and takes Willy. The War Hammer Titan raises spikes from the
// ground — its user is not in the nape but in a crystal at the end of a
// flesh cord. Follow the cord and break the crystal.
const STAGE = [0, 64], HAMMER = [16, 96], CRYSTAL = [-34, 134];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, ui, audio, world } = ctx;
    const wood = toon('#6b4a32'), dark = new THREE.MeshToonMaterial({ color: '#2a2420', side: THREE.DoubleSide });
    // The stage, hollow underneath: the cellar where Eren waits.
    const platform = new THREE.Group(); platform.position.set(STAGE[0], 0, STAGE[1]); ctx.scene.add(platform);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(16, .4, 10), wood); deck.position.y = 4; platform.add(deck);
    for (const [x, z, w, d] of [[0, -5, 16, .3], [0, 5, 16, .3], [-8, 0, .3, 10], [8, 0, .3, 10]]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), dark); wall.position.set(x, 2, z); platform.add(wall); }
    const lamp = new THREE.PointLight('#ffcf8a', 1.2, 12, 1.5); lamp.position.set(STAGE[0], 3, STAGE[1]); ctx.scene.add(lamp);
    const willy = castExtra(ctx, 'willy', STAGE[0], STAGE[1] - 2, 0, { y: 4.2 });
    const eren = ctx.cast('eren', 'eren', STAGE[0] - 2, STAGE[1] + 1, Math.PI / 2, { pose: 'bench', override: { outfit: 'civilian-coat', hair: { style: 'long', color: '#35251b' } } });
    const reiner = ctx.cast('reiner', 'reiner', STAGE[0] + 1.2, STAGE[1] + 1, -Math.PI / 2, { pose: 'bench', override: { outfit: 'marley', extras: ['armband'] } });
    const falco = ctx.cast('falco', 'falco', STAGE[0] + 2.4, STAGE[1] + 2.4, -Math.PI / 2);
    eren.rig.root.position.y = reiner.rig.root.position.y = .5;
    for (const a of [eren, reiner]) { const crate = new THREE.Mesh(new THREE.BoxGeometry(.8, .5, .8), wood); crate.position.set(a.rig.root.position.x, .25, a.rig.root.position.z); platform.parent.add(crate); a.crate = crate; }
    const crowd = Array.from({ length: 24 }, (_, i) => ctx.cast(`crowd-${i}`, i % 3 ? 'civilian-m' : 'civilian-f', -8 + (i % 8) * 2.2, STAGE[1] - 12 - Math.floor(i / 8) * 2.4, 0, { override: { outfit: i % 4 ? 'civilian-coat' : 'marley' } }));
    const hammer = ctx.titanForm('martelo'); hammer.root.visible = false; hammer.root.position.set(HAMMER[0], 0, HAMMER[1]); ctx.scene.add(hammer.root);
    // The flesh cord, half buried, from the War Hammer's heel to the crystal.
    const cordMat = new THREE.MeshToonMaterial({ color: '#7a2a2a' }), cordLen = Math.hypot(CRYSTAL[0] - HAMMER[0], CRYSTAL[1] - HAMMER[1]);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, cordLen, 8), cordMat); cord.rotation.set(Math.PI / 2, 0, 0); cord.rotation.order = 'YXZ'; cord.rotation.y = Math.atan2(CRYSTAL[0] - HAMMER[0], CRYSTAL[1] - HAMMER[1]); cord.position.set((HAMMER[0] + CRYSTAL[0]) / 2, .05, (HAMMER[1] + CRYSTAL[1]) / 2); cord.visible = false; ctx.scene.add(cord);
    const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 1), new THREE.MeshToonMaterial({ color: '#d7f0f8', emissive: '#4a8aa0', emissiveIntensity: .5, transparent: true, opacity: .85 })); crystal.position.set(CRYSTAL[0], 2.4, CRYSTAL[1]); crystal.visible = false; ctx.scene.add(crystal);
    const lara = castExtra(ctx, 'lara', CRYSTAL[0], CRYSTAL[1], 0, { pose: 'lie' }); lara.rig.root.visible = false;
    const ring = new THREE.Mesh(new THREE.RingGeometry(SPIKE.radius - .6, SPIKE.radius, 32), new THREE.MeshBasicMaterial({ color: '#e04030', transparent: true, opacity: .8, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.visible = false; ctx.scene.add(ring);
    const spikeMesh = new THREE.Mesh(new THREE.ConeGeometry(2.4, 14, 6), new THREE.MeshToonMaterial({ color: '#e9e4d6' })); spikeMesh.visible = false; ctx.scene.add(spikeMesh);
    let fight = 0, health = 100, cracks = 0, found = null, spike = null, phaseWas = 'rest', willyTaken = false;
    const tmp = new THREE.Vector3();

    const handlers = {
      cellar: () => { stage.setShot([STAGE[0] - 4.5, 2.2, STAGE[1] + 3.6], [STAGE[0], 1.2, STAGE[1] + 1], 50); },
      'through-stage': () => {
        ui.flash('#fff7d8', 1); stage.shake(2); audio.play('transform', 0, 0, 1);
        platform.visible = false; [eren, reiner, falco].forEach(a => { a.rig.root.visible = false; if (a.crate) a.crate.visible = false; }); lamp.intensity = 0;
        stage.particles.burst(new THREE.Vector3(STAGE[0], 4, STAGE[1]), 'dust', 120, 14); stage.particles.burst(new THREE.Vector3(STAGE[0], 6, STAGE[1]), 'steam', 100, 12);
        const titan = ctx.useTitan([STAGE[0], STAGE[1] + 10], 0); titan.titan.root.rotation.y = Math.PI; titan.yaw = 0;
        willy.rig.root.position.set(STAGE[0], 0, STAGE[1] - 4); willy.pose = 'fall';
        crowd.forEach((c, i) => stage.walkTo(c, [[c.rig.root.position.x + (i % 2 ? -14 : 14), c.rig.root.position.z - 30]], 5, 'run'));
        stage.setShot([STAGE[0] + 22, 10, STAGE[1] - 26], [STAGE[0], 9, STAGE[1] + 4], 58);
      },
      'willy-eaten': () => { willy.rig.root.visible = false; ctx.titan.titan.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 60, 6); },
      'war-hammer': () => {
        hammer.root.visible = true; crystal.visible = true; world.anchorRoots.push(hammer.root);
        ctx.titan.yaw = Math.PI; ctx.titan.titan.root.rotation.y = 0;
        stage.particles.burst(new THREE.Vector3(HAMMER[0], 6, HAMMER[1]), 'steam', 100, 10);
        stage.setShot([HAMMER[0] - 30, 14, HAMMER[1] - 30], [HAMMER[0], 10, HAMMER[1]], 58);
      },
      'lara-eaten': () => { crystal.visible = false; lara.rig.root.visible = true; stage.particles.burst(crystal.position, 'spark', 60, 8); hammer.root.rotation.x = -1.2; ctx.titan.place(CRYSTAL[0], CRYSTAL[1] - 6); stage.setShot([CRYSTAL[0] + 18, 10, CRYSTAL[1] - 18], [CRYSTAL[0], 4, CRYSTAL[1]], 55); },
    };

    function update(dt, input, control) {
      if (hammer.root.visible) { hammer.animate(stage.time); hammer.arms[1].rotation.x = -1 - Math.sin(stage.time * 2) * .4; }
      if (control !== 'titan') { ring.visible = spikeMesh.visible = false; return null; }
      const r = ctx.titan.step(dt, input, true), E = ctx.titan.titan.root.position;
      if (ctx.mission === 'palco') {
        if (r.punch && willy.rig.root.position.distanceTo(tmp.set(E.x, 0, E.z)) < 14) { willyTaken = true; ctx.goals.add('palco'); }
        return null;
      }
      fight += dt;
      // Spikes: the ring marks where Eren stood when the warning began.
      const phase = spikePhase(fight);
      if (phase === 'warning' && phaseWas !== 'warning') { spike = [E.x, E.z]; ring.position.set(E.x, .1, E.z); }
      ring.visible = phase === 'warning'; spikeMesh.visible = phase === 'strike';
      if (phase === 'strike' && phaseWas === 'warning') { spikeMesh.position.set(spike[0], 7, spike[1]); audio.play('block', 2, 0, 1); if (spikeHits(spike, [E.x, E.z])) { health -= SPIKE.damage; ui.flash('#6a0909', .6); stage.particles.burst(E.clone().setY(4), 'blood', 30, 5); } }
      phaseWas = phase;
      if (!found && onCord([E.x, E.z], HAMMER, CRYSTAL)) { found = fight; cord.visible = true; ui.toast('Um cabo de carne sob o chão… ele vai até um cristal!', 2.4); }
      if (r.punch && Math.hypot(E.x - CRYSTAL[0], E.z - CRYSTAL[1]) < 10) { cracks++; stage.particles.burst(crystal.position, 'spark', 30, 6); stage.shake(.6); crystal.scale.setScalar(1 - cracks * .12); ui.toast(`Cristal trincado · ${cracks} / ${CRYSTAL_HITS}`, 1.2); }
      if (health <= 0) return 'Os espinhos do Martelo atravessaram Eren. Saia do círculo vermelho e procure de onde vem o poder dele.';
      if (cracks >= CRYSTAL_HITS) ctx.goals.add('martelo');
      return null;
    }

    return {
      script: CHAPTER_37, par: 240,
      start() { stage.setShot([STAGE[0] - 4.5, 2.2, STAGE[1] + 3.6], [STAGE[0], 1.2, STAGE[1] + 1], 50); },
      handlers, update,
      status() {
        if (ctx.control !== 'titan') return '';
        if (ctx.mission === 'palco') return 'Willy está no chão do palco';
        return `Corpo ${Math.max(0, health)}% · ${found ? `Cabo encontrado · cristal trincado ${cracks} / ${CRYSTAL_HITS}` : 'Procure o que liga o Martelo à usuária'}${spikePhase(fight) === 'warning' ? ' · SAIA DO CÍRCULO' : ''}`;
      },
      restore(snapshot) { if (snapshot?.mission === 'martelo') { health = 100; cracks = 0; fight = 0; crystal.scale.setScalar(1); ctx.titan?.place(STAGE[0], STAGE[1] + 10); } },
      challenges: () => (found !== null && found < 60 && ctx.goals.has('martelo') ? [ctx.data.challenges[0]] : []),
      debug: { cord() { ctx.titan.place((HAMMER[0] + CRYSTAL[0]) / 2, (HAMMER[1] + CRYSTAL[1]) / 2); }, crystal() { ctx.titan.place(CRYSTAL[0], CRYSTAL[1] - 6); ctx.titan.punchQueued = true; }, willy() { const w = willy.rig.root.position; ctx.titan.place(w.x, w.z + 6); ctx.titan.punchQueued = true; } },
      snapshot: () => ({ health, cracks, found: found !== null, willyTaken }),
    };
  }, { breach: false });
}
