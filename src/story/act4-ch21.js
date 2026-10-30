import * as THREE from 'three';
import { createTrostChapter } from './trost-chapter.js';
import { CHAPTER_21 } from './act4-scripts.js';

// Chapter 21: on top of the wall, Reiner tells Eren — like someone talking
// about the weather — that he is the Armored Titan and Bertholdt the
// Colossal. Mikasa strikes first; both transform; Eren bites his hand on the
// wall and charges, and his punch does nothing against the armor.
export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, ui, audio, TROST } = ctx;
    const TOP = TROST.wallHeight + 1.4, Z = TROST.wallZ;
    stage.ground = (x, z) => (Math.abs(z - Z) < 5.5 ? TOP : 0);
    const eren = ctx.cast('eren', 'eren', 4, Z, Math.PI / 2);
    const reiner = ctx.cast('reiner', 'reiner', 9, Z + 1, -Math.PI / 2, { override: { extras: [] } });
    const bertholdt = ctx.cast('bertholdt', 'bertholdt', 10, Z - 1.5, -Math.PI / 2);
    const mikasa = ctx.cast('mikasa', 'mikasa', -2, Z + 1, Math.PI / 2, { blades: true });
    const others = ['armin', 'hannes', 'ymir', 'historia'].map((id, i) => ctx.cast(id, id, -10 - i * 2.4, Z + (i % 2 ? 1.5 : -1), Math.PI / 2));
    const walker = ctx.useWalker(eren, { bounds: { minX: -30, maxX: 30, minZ: Z - 3.5, maxZ: Z + 3.5 } });
    const armored = ctx.titanForm('blindado'); armored.root.visible = false; ctx.scene.add(armored.root); ctx.world.anchorRoots.push(armored.root);
    const colossal = ctx.titanForm('colossal'); colossal.root.visible = false; ctx.scene.add(colossal.root);
    let punched = false, recoil = 0;
    const tmp = new THREE.Vector3();

    const handlers = {
      'wall-top': () => { stage.setShot([6, TOP + 2.2, Z + 7], [8, TOP + 1.4, Z], 45); },
      'mikasa-strikes': () => {
        stage.walkTo(mikasa, [[7, Z + .6]], 9, 'run'); mikasa.pose = 'strike';
        stage.after(.5, () => { reiner.rig.root.getWorldPosition(tmp); tmp.y += 1.4; stage.particles.burst(tmp, 'blood', 40, 5); stage.particles.burst(bertholdt.rig.root.position.clone().setY(TOP + 1.3), 'blood', 30, 4); reiner.pose = 'guard'; bertholdt.pose = 'fall'; audio.play('punch', 1, 0, .9); });
        stage.setShot([2, TOP + 2, Z + 6], [8, TOP + 1.3, Z], 50);
      },
      'they-transform': () => {
        ui.flash('#fff7d8', 1); stage.shake(1.6); audio.play('transform', 0, 0, 1);
        reiner.rig.root.visible = false; bertholdt.rig.root.visible = false; eren.pose = 'fall';
        armored.root.visible = true; armored.root.position.set(14, 0, Z + 22); armored.root.rotation.y = -Math.PI * .8;
        colossal.root.visible = true; colossal.root.position.set(18, 0, Z - 30); colossal.root.rotation.y = 0;
        stage.particles.burst(new THREE.Vector3(14, 8, Z + 22), 'steam', 90, 10); stage.particles.burst(new THREE.Vector3(18, 40, Z - 20), 'steam', 120, 14);
        stage.setShot([-30, TOP + 10, Z + 40], [10, 30, Z], 62);
      },
      'eren-transforms': () => {
        ui.flash('#fff7d8', 1); audio.play('transform', 0, 0, 1); eren.rig.root.visible = false;
        ctx.useTitan([2, Z + 40], Math.PI); ctx.titan.titan.root.rotation.y = Math.PI; ctx.titan.yaw = 0;
        stage.particles.burst(new THREE.Vector3(2, 6, Z + 40), 'steam', 100, 12);
      },
      'armored-answers': () => {
        const E = ctx.titan.titan.root.position; armored.root.rotation.y = Math.atan2(E.x - armored.root.position.x, E.z - armored.root.position.z);
        armored.arms[1].rotation.x = -1.6; recoil = 1; stage.shake(1); audio.play('heavy', 2, 0, 1);
        stage.setShot([E.x + 18, 12, E.z + 10], [armored.root.position.x, 9, armored.root.position.z], 55);
      },
    };

    function update(dt, input, control, view) {
      armored.animate(stage.time); colossal.animate(stage.time);
      if (control === 'walk') { walker.step(dt, input, 'walk', view.kind === 'line'); return null; }
      if (control === 'titan') {
        const r = ctx.titan.step(dt, input, true), E = ctx.titan.titan.root.position, A = armored.root.position;
        armored.root.rotation.y = Math.atan2(E.x - A.x, E.z - A.z);
        if (r.punch && Math.hypot(E.x - A.x, E.z - A.z) < 13) { punched = true; armored.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'spark', 30, 6); audio.play('block', 1, 0, 1); ctx.goals.add('investida'); }
        return null;
      }
      if (recoil > 0 && ctx.titan) { recoil = Math.max(0, recoil - dt); ctx.titan.titan.root.rotation.x = -recoil * .3; if (!recoil) armored.arms[1].rotation.x = 0; }
      return null;
    }

    return {
      script: CHAPTER_21, par: 180,
      start() { stage.setShot([6, TOP + 2.2, Z + 7], [8, TOP + 1.4, Z], 45); },
      handlers, update,
      markerHeight: () => TOP + 1,
      status: () => (ctx.control === 'titan' ? `Blindado a ${Math.round(Math.hypot(ctx.titan.titan.root.position.x - armored.root.position.x, ctx.titan.titan.root.position.z - armored.root.position.z))} m` : ''),
      restore(snapshot) { if (snapshot?.mission === 'revelacao' && ctx.titan) ctx.titan.place(2, Z + 40); },
      debug: { charge() { const A = armored.root.position; ctx.titan.place(A.x, A.z + 10); ctx.titan.punchQueued = true; } },
      snapshot: () => ({ punched, armored: armored.root.visible, colossal: colossal.root.visible }),
    };
  }, { breach: false });
}
