import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTrostChapter } from './trost-chapter.js';
import { CHAPTER_26 } from './act5-scripts.js';

// Chapter 26: the conspiracy. Armin, dressed as Historia, walks to the
// kidnappers' carriage without running; the ambush ends with Armin's first
// shot whatever he chooses. Hange gathers three pieces of evidence and the
// government falls on the gallows without a single shot.
const CARRIAGE = [2, 64], GALLOWS = [0, -60];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, ui, audio } = ctx;
    const armin = ctx.cast('armin', 'armin', 0, 30, Math.PI, { override: { outfit: 'civilian-dress', hair: { style: 'longStraight', color: '#efd88f' } } });
    const jean = ctx.cast('jean', 'jean', 1.4, 29, Math.PI, { override: { outfit: 'civilian-coat', hair: { style: 'eren', color: '#35251b' } } });
    const walker = ctx.useWalker(armin, { bounds: { minX: -9, maxX: 9, minZ: 0, maxZ: 80 } }); walker.lookAt(...CARRIAGE);
    jean.follow = armin; jean.followGap = 1.8;
    const wood = toon('#4a3528'), paper = toon('#efe8d6');
    const carriage = new THREE.Group(); carriage.position.set(CARRIAGE[0], 0, CARRIAGE[1] + 3); ctx.scene.add(carriage);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2, 3.4), wood); box.position.y = 1.6; carriage.add(box);
    for (const [x, z] of [[-1.1, -1.2], [1.1, -1.2], [-1.1, 1.2], [1.1, 1.2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .15, 14), wood); w.rotation.z = Math.PI / 2; w.position.set(x, .55, z); carriage.add(w); }
    const thugs = [0, 1, 2].map(i => ctx.cast(`thug-${i}`, 'civilian-m', CARRIAGE[0] - 2 + i * 2, CARRIAGE[1] + 6, Math.PI, { override: { outfit: 'civilian-coat', hair: { style: i ? 'buzz' : 'short', color: '#2a2420' } } }));
    // Evidence for Hange: a sheet of paper on a crate at each spot.
    const spots = [[-6, 20], [6, 34], [-4, 46]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0, z); const c = new THREE.Mesh(new THREE.BoxGeometry(1, .9, 1), wood); c.position.y = .45; const p = new THREE.Mesh(new THREE.BoxGeometry(.5, .02, .7), paper); p.position.y = .92; g.add(c, p); g.visible = false; ctx.scene.add(g); return g; });
    const hange = ctx.cast('hange', 'hange', -2, 12, Math.PI); hange.rig.root.visible = false;
    const reporter = ctx.cast('reporter', 'civilian-m', -4, 48.2, 0, { override: { extras: ['glasses'] } }); reporter.rig.root.visible = false;
    // The gallows and the crowd.
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 4), wood); platform.position.set(GALLOWS[0], 1.2, GALLOWS[1]); ctx.scene.add(platform);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(.3, 4.6, .3), wood); beam.position.set(GALLOWS[0], 4.7, GALLOWS[1]); ctx.scene.add(beam);
    const erwin = ctx.cast('erwin', 'erwin', GALLOWS[0], GALLOWS[1], 0, { y: 2.4, override: { extras: [] } });
    const crowd = Array.from({ length: 14 }, (_, i) => ctx.cast(`crowd-${i}`, i % 2 ? 'civilian-f' : 'civilian-m', GALLOWS[0] - 7 + (i % 7) * 2.2, GALLOWS[1] + 6 + Math.floor(i / 7) * 2, Math.PI));
    const zackly = ctx.cast('zackly', 'civilian-m', GALLOWS[0] + 9, GALLOWS[1] + 14, Math.PI, { override: { outfit: 'commander', hair: { style: 'buzz', color: '#d6d2c8' }, face: { marks: ['stubble'] } } }); zackly.rig.root.visible = false;
    let ran = false, shot = false, found = 0, hangeWalker = null;
    const tmp = new THREE.Vector3();

    const handlers = {
      disguise: () => { stage.setShot([3, 2, 25], [0, 1.4, 30], 45); },
      ambush: () => {
        const a = armin.rig.root.position; jean.follow = null; stage.place(jean, a.x + 2, a.z + 1.2); jean.pose = 'guard';
        thugs[0].pose = 'punch'; stage.place(thugs[0], a.x + 2.8, a.z + 1.8); stage.face(armin, a.x + 2, a.z + 1.2);
        stage.setShot([armin.rig.root.position.x + 4, 2.2, armin.rig.root.position.z - 3], [jean.rig.root.position.x, 1.4, jean.rig.root.position.z], 46);
      },
      'armin-shoots': () => {
        shot = true; armin.pose = 'punch'; thugs[0].rig.root.getWorldPosition(tmp); tmp.y += 1.4;
        ui.flash('#fff2d0', .5); audio.play('block', 0, 0, 1); stage.particles.burst(tmp, 'spark', 10, 3);
        stage.after(.4, () => { thugs[0].pose = 'lie'; stage.particles.burst(tmp, 'blood', 40, 5); });
      },
      'hange-desk': () => {
        ui.setFade(1);
        stage.after(.8, () => {
          ui.setFade(0); armin.rig.root.visible = false; jean.rig.root.visible = false; thugs.forEach(t => { t.rig.root.visible = false; }); carriage.visible = false;
          hange.rig.root.visible = true; stage.place(hange, -2, 12); spots.forEach(g => { g.visible = true; }); reporter.rig.root.visible = true;
          hangeWalker = ctx.useWalker(hange, { bounds: { minX: -9, maxX: 9, minZ: 6, maxZ: 52 } }); hangeWalker.lookAt(-6, 20);
        });
      },
      gallows: () => { stage.setShot([GALLOWS[0] + 6, 4, GALLOWS[1] + 12], [GALLOWS[0], 3.4, GALLOWS[1]], 50); },
      coup: () => {
        zackly.rig.root.visible = true; stage.walkTo(zackly, [[GALLOWS[0] + 3, GALLOWS[1] + 4]], 1.6);
        for (let i = 0; i < 6; i++) { const s = ctx.cast(`garrison-${i}`, 'soldier-m', GALLOWS[0] + 14 + i, GALLOWS[1] + 20, Math.PI, { override: { outfit: 'garrison' } }); stage.walkTo(s, [[GALLOWS[0] + 4 + i * 1.5, GALLOWS[1] + 7]], 3, 'run'); }
        stage.setShot([GALLOWS[0] - 8, 5, GALLOWS[1] + 16], [GALLOWS[0], 2.6, GALLOWS[1] + 3], 55);
      },
    };

    function update(dt, input, control, view) {
      if (control !== 'walk') return null;
      if (ctx.mission === 'troca') {
        walker.step(dt, input, 'walk', view.kind === 'line');
        if (input.run && walker.moved) { ran = true; return 'Uma moça bem-vestida não sai correndo pela rua. Os sequestradores desconfiaram: ande devagar.'; }
        return null;
      }
      if (hangeWalker) {
        hangeWalker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
        const p = hange.rig.root.position;
        spots.forEach((g, i) => { if (g.visible && i === found && Math.hypot(p.x - g.position.x, p.z - g.position.z) < 2.2) { found++; if (i < 2) g.children[1].visible = false; ui.toast(`Prova ${found} / 3`, 1.2); } });
      }
      return null;
    }

    return {
      script: CHAPTER_26, par: 220,
      start() { stage.setShot([3, 2, 25], [0, 1.4, 30], 45); },
      handlers, update,
      markerHeight: () => 1.4,
      restore(snapshot) {
        if (snapshot?.mission === 'troca') { stage.place(armin, 0, 30); jean.follow = armin; }
        if (snapshot?.mission === 'investigacao') { found = 0; }
      },
      challenges: () => (shot && !ran ? [ctx.data.challenges[0]] : []),
      snapshot: () => ({ ran, shot, found, erwin: erwin.rig.root.visible }),
    };
  }, { breach: false });
}
