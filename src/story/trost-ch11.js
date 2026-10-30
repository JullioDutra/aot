import * as THREE from 'three';
import { toon } from '../character-model.js';
import { syncGrade } from './story-rules.js';
import { strideTitan } from './kit.js';
import { createTrostChapter } from './trost-chapter.js';
import { CHAPTER_11 } from './trost-final-scripts.js';

// Chapter 11: retaking the supply depot. Armin lowers the lift with the
// riflemen, the volley blinds seven small titans and seven cadets drop from
// the beams at once. Afterwards, Jean finds Marco.
const DEPOT = [520, 0];
const GALLERY = 6, BEAM = 10.5;
const SPOTS = [[-9, -6], [-5, -9], [0, -10], [5, -9], [9, -6], [-4, -3], [4, -3]];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, horde, ui, audio } = ctx;
    const [DX, DZ] = DEPOT;
    // Depot interior: floor, walls, a gallery along the north wall, the lift and the beams.
    const room = new THREE.Group(); room.position.set(DX, 0, DZ); ctx.scene.add(room);
    const stone = new THREE.MeshToonMaterial({ color: '#7d7466', side: THREE.DoubleSide }), wood = toon('#6b4a32');
    const add = (geo, m, x, y, z) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; room.add(mesh); return mesh; };
    add(new THREE.BoxGeometry(34, .2, 28), toon('#6e6559'), 0, -.1, 0);
    for (const [x, z, w, d] of [[0, -14, 34, .4], [0, 14, 34, .4], [-17, 0, .4, 28], [17, 0, .4, 28]]) add(new THREE.BoxGeometry(w, 16, d), stone, x, 8, z);
    add(new THREE.BoxGeometry(34, .4, 28), stone, 0, 16, 0);
    add(new THREE.BoxGeometry(30, .4, 8), wood, 0, GALLERY - .2, 9);
    for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(30, .5, .5), wood, 0, BEAM, -10 + i * 3.4);
    const lift = add(new THREE.BoxGeometry(7, .4, 7), wood, 0, GALLERY, -.5);
    for (const x of [-3.4, 3.4]) add(new THREE.BoxGeometry(.3, 16, .3), wood, x, 8, -.5);
    const crank = add(new THREE.CylinderGeometry(.5, .5, .3, 10), toon('#4a4642'), 6, GALLERY + 1, 6); crank.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const lamp = new THREE.PointLight('#ffbf7a', 26, 22); lamp.position.set(-12 + i * 8, 12, 0); room.add(lamp); }
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(2, 2.6, 1.2), toon('#5c4a3a'), -14 + i * 1.6, 1.3, 12.8);

    const outfit = { outfit: 'training' };
    const armin = ctx.cast('armin', 'armin', DX - 8, 9, Math.PI, { override: outfit, y: GALLERY });
    const jean = ctx.cast('jean', 'jean', DX + SPOTS[6][0], DZ + SPOTS[6][1], 0, { override: outfit, y: BEAM + .3 });
    const dropIds = ['mikasa', 'annie', 'reiner', 'bertholdt', 'sasha', 'connie'];
    const droppers = dropIds.map((id, i) => ctx.cast(id, id, DX + SPOTS[i][0], DZ + SPOTS[i][1], 0, { override: outfit, y: BEAM + .3 }));
    const marco = ctx.cast('marco', 'marco', DX + 4, 8, Math.PI, { override: outfit, y: GALLERY });
    const riflemen = [];
    for (let i = 0; i < 8; i++) riflemen.push(ctx.cast(`atirador-${i}`, i % 3 ? 'recruit-m' : 'soldier-f', DX - 3 + (i % 4) * 2, -2.2 + Math.floor(i / 4) * 3.4, i < 4 ? Math.PI : 0, { override: outfit, y: GALLERY + .2 }));
    const titans = SPOTS.map(([x, z], i) => horde.spawn(i % 2 ? 'pequeno' : 'nariz', DX + x * 1.3, DZ + z * .4 - 4, { height: 3.4 + (i % 3) * .8, kind: 'idle', yaw: Math.PI, id: `deposito-${i}` }));
    stage.ground = (x, z) => (x > 400 ? GALLERY : world.roofAt(x, z));

    let liftT = 0, signal = null, signalAt = 0, waiting = 0, grade = null, tries = 0, drop = 0, marcoShown = false;
    const tmp = new THREE.Vector3();
    const handlers = {
      depot: () => { ui.setFade(0); stage.focusLight(DX, DZ); ctx.scene.fog.near = 30; ctx.scene.fog.far = 120; stage.setShot([DX - 12, GALLERY + 3.2, 11], [DX + 2, 2, -6], 58); },
      'lift-down': () => { liftT = .001; riflemen.forEach(r => { r.pose = 'reach'; }); stage.setShot([DX + 13, 9, 10], [DX, 3, -3], 58); },
      volley: () => {
        ui.flash('#fff1c8', .8); audio.play('heavy', 2, 0, 1); stage.shake(.5);
        for (const t of titans) { t.titan.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 16, 3); stage.particles.burst(tmp, 'spark', 10, 3); t.titan.head.rotation.x = -.6; }
        stage.setShot([DX + SPOTS[6][0] + 3, BEAM + 2.2, DZ + SPOTS[6][1] + 3], [DX + SPOTS[6][0], 2, DZ + SPOTS[6][1] - 3], 56);
      },
      'two-miss': () => {
        // Sasha and Connie hit the shoulder; Mikasa and Annie finish their titans.
        for (const i of [4, 5]) { droppers[i].pose = 'fall'; stage.place(droppers[i], DX + SPOTS[i][0] + 1.5, DZ + SPOTS[i][1] + 2); droppers[i].rig.root.position.y = 0; }
        stage.after(.8, () => { horde.kill(titans[4]); horde.kill(titans[5]); stage.place(droppers[0], DX + SPOTS[4][0], DZ + SPOTS[4][1] - 1.6); stage.place(droppers[1], DX + SPOTS[5][0], DZ + SPOTS[5][1] - 1.6); droppers[0].pose = droppers[1].pose = 'strike'; droppers[0].rig.root.position.y = droppers[1].rig.root.position.y = 0; });
        stage.setShot([DX + 8, 4, DZ - 2], [DX + 3, 2, DZ - 8], 55);
      },
      resupply: () => { stage.setShot([DX - 10, 3, DZ + 4], [DX - 14, 1.5, DZ + 12.5], 50); droppers.forEach((a, i) => { stage.place(a, DX - 14 + i * 1.6, DZ + 10.5, 0); a.pose = 'reach'; a.rig.root.position.y = 0; }); },
      'marco-found': () => {
        ui.setFade(1); stage.after(.8, () => {
          ctx.scene.fog.near = 180; ctx.scene.fog.far = 640; marcoShown = true;
          const [mx, mz] = [-30, -60]; stage.ground = () => 0;
          stage.place(marco, mx, mz); marco.pose = 'manual'; marco.rig.root.rotation.set(-Math.PI / 2, 0, .4); marco.rig.root.position.y = .2; marco.rig.arms[1].visible = false;
          stage.particles.burst(new THREE.Vector3(mx + .6, .2, mz), 'blood', 14, 1.5);
          const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20), new THREE.MeshBasicMaterial({ color: '#4e0a0b' })); pool.rotation.x = -Math.PI / 2; pool.position.set(mx + .3, .03, mz); ctx.scene.add(pool);
          stage.place(jean, mx + 2.2, mz + 1.6); jean.rig.root.position.y = 0; stage.face(jean, mx, mz); jean.pose = 'grief';
          stage.focusLight(mx, mz); ctx.scene.background.set('#a9a69c'); stage.setShot([mx + 5, 2.4, mz + 5], [mx + .5, .6, mz], 46); ui.setFade(0);
        });
      },
    };

    function update(dt, input, control, view) {
      if (liftT > 0 && liftT < 1) {
        liftT = Math.min(1, liftT + dt / 3); const y = GALLERY - liftT * 3.4; lift.position.y = y;
        riflemen.forEach((r, i) => { r.rig.root.position.y = y + .2; });
        // Titans gather below the lift.
        for (const t of titans) { t.phase += dt * 4; strideTitan(t.titan, [DX + (t.titan.root.position.x - DX) * .6, DZ - .5 + (t.titan.root.position.z - DZ) * .6], 1.4, dt, t.phase); }
      }
      for (const t of titans) if (t.alive) t.titan.animate(stage.time);
      if (drop > 0) {
        drop += dt; const k = Math.min(1, drop / .6);
        [jean, ...droppers.slice(0, 4)].forEach((a, i) => { const s = i === 0 ? SPOTS[6] : SPOTS[i - 1]; a.rig.root.position.y = BEAM + .3 - k * (BEAM - 3.6); a.pose = 'strike'; a.progress = k; });
        if (drop > .6 && drop - dt <= .6) { for (const i of [0, 1, 2, 3, 6]) horde.kill(titans[i]); }
        if (drop > 1.2) drop = 0;
      }
      if (control === 'walk') { ctx.walker.step(dt, input, 'walk', view.kind === 'line'); horde.update(dt, { prey: [], freeze: true }); return null; }
      if (control === 'sync') {
        waiting += dt;
        if (signal === null) { signal = 1.2 + ((tries * 0.37) % 1.4); signalAt = 0; }
        if (!signalAt && waiting >= signal) { signalAt = waiting; ui.toast('AGORA!', .8); ui.flash('#e0b44a', .45); audio.play('warning', 1, 0, .8); }
        if (input.pressed.attack) {
          const offset = signalAt ? waiting - signalAt : -(signal - waiting);
          grade = syncGrade(offset); tries++;
          if (grade === 'falhou') { signal = null; waiting = 0; return offset < 0 ? 'Você caiu antes do sinal: o titã ainda enxergava e virou a cabeça para você.' : 'Você caiu tarde demais: o titã já tinha recuperado a visão.'; }
          drop = .001; ctx.goals.add('sete'); ui.toast(grade === 'perfeito' ? 'Corte perfeito, no mesmo segundo dos outros.' : 'Corte certo, um pouco fora do tempo.', 1.6);
        }
        if (signalAt && waiting - signalAt > 1.4) { signal = null; waiting = 0; tries++; return 'Você hesitou na viga e os titãs recuperaram a visão. Ataque assim que o sinal acender.'; }
        horde.update(dt, { prey: [], freeze: true });
        return null;
      }
      horde.update(dt, { prey: [], freeze: true });
      return null;
    }

    return {
      script: CHAPTER_11, par: 220,
      start() { ui.setFade(1); stage.after(.3, () => ui.setFade(0)); stage.focusLight(DX, DZ); ctx.scene.fog.near = 30; ctx.scene.fog.far = 120; stage.setShot([DX - 12, GALLERY + 3.2, 11], [DX + 2, 2, -6], 58); },
      onControl(mode) {
        if (mode === 'walk') { ctx.useWalker(armin, { bounds: { minX: DX - 14, maxX: DX + 14, minZ: 5.6, maxZ: 12 }, distance: 3.4 }); ctx.walker.lookAt(DX + 6, 6); }
        if (mode === 'sync') { signal = null; waiting = 0; stage.setShot([DX + SPOTS[6][0] - 2.5, BEAM + 2.4, DZ + SPOTS[6][1] + 3.5], [DX + SPOTS[6][0], 2.4, DZ + SPOTS[6][1] - 2], 58); }
      },
      handlers, update,
      markerHeight: () => GALLERY + 2,
      status: () => (ctx.control === 'sync' ? (signalAt ? 'SINAL!' : 'Espere o sinal…') : ''),
      onEvent(event) { if (event.kind === 'interact') { crank.rotation.z += .8; audio.play('block', 1, 0, .5); } },
      restore() { signal = null; waiting = 0; },
      onGoal(id) { if (id === 'sete' && !drop) { drop = .001; grade ??= 'bom'; tries = Math.max(1, tries); } },
      challenges() {
        const done = [];
        if (grade === 'perfeito') done.push(ctx.data.challenges[0]);
        if (grade && tries === 1) done.push(ctx.data.challenges[1]);
        return done;
      },
      debug: { cut() { if (!signalAt) { waiting = signal ?? 1.2; } ctx.goals.add('sete'); drop = .001; grade = 'perfeito'; tries = Math.max(1, tries); } },
      snapshot: () => ({ lift: +liftT.toFixed(2), grade, tries, titansLeft: titans.filter(t => t.alive).length, marcoShown }),
    };
  });
}
