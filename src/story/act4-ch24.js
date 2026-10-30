import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { CHAPTER_24 } from './act4-scripts.js';

// Chapter 24: the scream. Eren, tied and drained, cannot transform; Hannes
// fights the smiling titan and is eaten in front of him. Eren punches the
// titan's hand and screams: every titan around turns on the smiling titan and
// on the Armored. Ymir leaves with Reiner. Then ride back to the wall.
const SPOT = [0, 246];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, horde, ui, audio, FIELD } = ctx;
    const eren = ctx.cast('eren', 'eren', SPOT[0], SPOT[1], 0, { pose: 'sit' });
    const mikasa = ctx.cast('mikasa', 'mikasa', SPOT[0] - 1.4, SPOT[1] + .6, 0, { pose: 'lie' });
    const hannes = ctx.cast('hannes', 'hannes', SPOT[0] + 10, SPOT[1] + 6, Math.PI, { blades: true });
    const walker = ctx.useWalker(eren, { bounds: { minX: SPOT[0] - 3, maxX: SPOT[0] + 6, minZ: SPOT[1] - 3, maxZ: SPOT[1] + 6 } });
    const smiling = ctx.titanForm('sorridente'); smiling.root.position.set(SPOT[0] + 26, 0, SPOT[1] - 30); ctx.scene.add(smiling.root); ctx.world.anchorRoots.push(smiling.root);
    const armored = ctx.titanForm('blindado'); armored.root.position.set(SPOT[0] - 70, 0, SPOT[1] - 60); ctx.scene.add(armored.root);
    const ymir = ctx.titanForm('mandibula'); ymir.root.position.set(SPOT[0] - 60, 0, SPOT[1] - 50); ctx.scene.add(ymir.root);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][i % 5], SPOT[0] + Math.cos(a) * 60, SPOT[1] - 40 + Math.sin(a) * 50, { height: 7 + (i * 3) % 7, kind: 'idle', sight: 200 }); }
    let swarm = false, approach = 0, dinaDown = 0, phase = 0, hits = 0;
    const tmp = new THREE.Vector3();

    function walkSmiling(dt, target, speed) {
      const p = smiling.root.position, dx = target[0] - p.x, dz = target[1] - p.z, d = Math.hypot(dx, dz);
      smiling.root.rotation.y = Math.atan2(dx, dz); if (d < 1) return true;
      phase += dt * 4; p.x += dx / d * speed * dt; p.z += dz / d * speed * dt;
      smiling.legs[0].rotation.x = Math.sin(phase) * .4; smiling.legs[1].rotation.x = -Math.sin(phase) * .4; return false;
    }

    const handlers = {
      'field-chaos': () => { stage.setShot([SPOT[0] + 6, 3, SPOT[1] + 8], [SPOT[0], 1, SPOT[1]], 48); },
      'smiling-titan': () => { stage.setShot([SPOT[0] - 6, 4, SPOT[1] + 10], [smiling.root.position.x, 9, smiling.root.position.z], 52); approach = 1; },
      'hannes-fights': () => {
        hannes.pose = 'odm'; hannes.rig.root.position.set(SPOT[0] + 14, 9, SPOT[1] - 12);
        stage.after(1, () => { smiling.arms[1].rotation.x = -1.5; });
        stage.after(1.6, () => { smiling.hands[1].getWorldPosition(tmp); hannes.rig.root.position.copy(tmp); hannes.pose = 'carried'; });
        stage.after(2.6, () => { smiling.head.getWorldPosition(tmp); hannes.rig.root.position.copy(tmp); stage.particles.burst(tmp, 'blood', 70, 6); audio.play('punch', 1, 0, 1); });
        stage.after(3.1, () => { hannes.rig.root.visible = false; smiling.arms[1].rotation.x = 0; });
        stage.setShot([SPOT[0] + 4, 3, SPOT[1] + 6], [smiling.root.position.x, 10, smiling.root.position.z], 55);
      },
      scream: () => {
        swarm = true; eren.pose = 'punch'; stage.shake(1.6); ui.flash('#e9f2ff', .9); audio.play('transform', 0, 0, 1);
        horde.list.forEach(t => { t.kind = 'hunt'; t.speed = 9; t.sight = 400; });
        stage.after(2.4, () => { dinaDown = .001; });
        stage.setShot([SPOT[0] + 14, 10, SPOT[1] + 14], [smiling.root.position.x, 6, smiling.root.position.z], 60);
      },
      'ymir-leaves': () => { stage.setShot([armored.root.position.x + 24, 12, armored.root.position.z + 24], [armored.root.position.x, 8, armored.root.position.z], 55); },
    };

    function update(dt, input, control, view) {
      smiling.animate(stage.time); armored.animate(stage.time); ymir.animate(stage.time);
      if (approach && !swarm) walkSmiling(dt, [SPOT[0] + 5, SPOT[1] - 6], 3);
      if (dinaDown > 0) { dinaDown = Math.min(1, dinaDown + dt * .5); smiling.root.rotation.x = -dinaDown * 1.4; if (Math.random() < .5) stage.particles.burst(smiling.root.position.clone().setY(6), 'blood', 3, 4); }
      if (swarm) {
        // The scream turns them: half on the smiling titan, half on the Armored.
        const prey = [{ id: 'dina', position: smiling.root.position }, { id: 'armored', position: armored.root.position }];
        horde.update(dt, { prey });
        armored.root.position.x -= dt * 3; ymir.root.position.x -= dt * 3;
      } else horde.update(dt, { freeze: true });
      if (control === 'walk') {
        walker.step(dt, input, 'walk', view.kind === 'line');
        if (input.interact) { hits++; smiling.hands[1].getWorldPosition(tmp); stage.particles.burst(eren.rig.root.position.clone().setY(1.4), 'spark', 8, 2); }
        smiling.arms[1].rotation.x = -.9; smiling.chest.rotation.x = .6;
        return null;
      }
      if (control === 'ride' && ctx.rider) {
        const r = ctx.rider.step(dt, input);
        if (Math.hypot(r.position.x, r.position.z - (FIELD.wallZ - 18)) < 14) ctx.goals.add('fuga');
      }
      return null;
    }

    return {
      script: CHAPTER_24, par: 200,
      start() { stage.setShot([SPOT[0] + 6, 3, SPOT[1] + 8], [SPOT[0], 1, SPOT[1]], 48); },
      handlers, update,
      onControl(mode) {
        if (mode === 'ride' && !ctx.rider) {
          // Mikasa carries Eren on her horse back to the wall.
          const rider = ctx.useRider(eren, '#5a3f2c'); rider.place(SPOT[0], SPOT[1] + 2, Math.PI);
          mikasa.rig.root.visible = false;
        }
      },
      status() {
        if (ctx.control === 'ride' && ctx.rider) return `Muralha a ${Math.round(Math.hypot(ctx.rider.position.x, ctx.rider.position.z - (FIELD.wallZ - 18)))} m`;
        return '';
      },
      debug: { autopilot(on = true) { if (ctx.rider) ctx.rider.auto = on ? () => [0, FIELD.wallZ - 18] : null; } },
      snapshot: () => ({ hannes: hannes.rig.root.visible, swarm, dinaDown: +dinaDown.toFixed(2), hits, riding: !!ctx.rider }),
    };
  }, { sky: '#d6a77c', fog: [120, 600], light: ['#ffbf86', 2.2], hemi: ['#f0cba8', '#5a4a3a', 1.4], world: { wall: true, castle: false } });
}
