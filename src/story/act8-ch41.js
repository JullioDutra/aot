import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTrostChapter } from './trost-chapter.js';
import { castExtra } from './extras.js';
import { CHAPTER_41 } from './act8-scripts.js';

// Chapter 41: Zeke's scream turns everyone who drank the wine — Colt holding
// Falco, Commander Pyxis among them. Porco gives himself to Falco. Then the
// Paths: an endless night of sand and light where Eren and Zeke walk through
// Grisha's memories, and Eren frees Ymir. The Rumbling begins.
const MEMORIES = [[0, -30], [24, -60]], TREE = [0, -110];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio, scene } = ctx;
    const soldiers = Array.from({ length: 10 }, (_, i) => ctx.cast(`drinker-${i}`, i % 2 ? 'soldier-m' : 'soldier-f', -14 + (i % 5) * 7, 40 + Math.floor(i / 5) * 8, Math.PI, { override: { outfit: 'garrison' } }));
    const pixis = ctx.cast('pixis', 'pixis', 8, 30, Math.PI);
    const colt = castExtra(ctx, 'colt', -4, 24, 0), falco = ctx.cast('falco', 'falco', -3.2, 24.6, Math.PI), porco = castExtra(ctx, 'porco', 6, 18, 0, { pose: 'lie' });
    const eren = ctx.cast('eren', 'eren', 0, 0, Math.PI, { override: { hair: { style: 'long', color: '#35251b' } } }); eren.rig.root.visible = false;
    const zeke = ctx.cast('zeke', 'zeke', 0, 0, Math.PI); zeke.rig.root.visible = false;
    const titans = [];
    // The Paths: sand, a starry dark and the tree of light.
    const paths = new THREE.Group(); paths.visible = false; scene.add(paths);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), toon('#e8e2cf')); sand.rotation.x = -Math.PI / 2; sand.position.y = .05; paths.add(sand);
    const lightMat = new THREE.MeshBasicMaterial({ color: '#d9ecff' });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 60, 10), lightMat); trunk.position.set(TREE[0], 30, TREE[1] - 30); paths.add(trunk);
    for (let i = 0; i < 40; i++) { const a = i * 2.4, h = 40 + (i % 9) * 18, branch = new THREE.Mesh(new THREE.CylinderGeometry(.15, .4, 60, 5), lightMat); branch.position.set(TREE[0] + Math.cos(a) * 20, h, TREE[1] - 30 + Math.sin(a) * 20); branch.rotation.set(Math.sin(a) * .9, 0, Math.cos(a) * .9); paths.add(branch); }
    const grisha = ctx.cast('grisha', 'grisha', MEMORIES[0][0] + 2, MEMORIES[0][1] - 3, 0); const reissFamily = [0, 1, 2].map(i => ctx.cast(`reiss-${i}`, i ? 'civilian-f' : 'civilian-m', MEMORIES[0][0] - 3 + i * 2, MEMORIES[0][1] - 8, 0, { override: { hair: { style: i === 2 ? 'longStraight' : 'sidepart', color: '#e0c98a' } } }));
    const erenTeen = ctx.cast('eren-memory', 'eren', MEMORIES[1][0], MEMORIES[1][1] - 3, 0, { override: { hair: { style: 'long', color: '#35251b' } } });
    const ymir = ctx.cast('ymir-fritz', 'civilian-f', TREE[0], TREE[1], Math.PI, { pose: 'sit', override: { height: 1.3, age: 'child', hair: { style: 'longStraight', color: '#e8d9a8' } } });
    stage.show([grisha, ...reissFamily, erenTeen, ymir], false);
    const colossi = [];
    let walker = null, inPaths = false;

    function turn(a, form, height) {
      const p = a.rig.root.position; a.rig.root.visible = false; ui.flash('#fff7d8', .3); stage.particles.burst(new THREE.Vector3(p.x, 3, p.z), 'steam', 40, 6);
      const t = ctx.titanForm(form); t.root.scale.setScalar(height); t.root.position.set(p.x, 0, p.z); t.root.rotation.y = Math.random() * 6; scene.add(t.root); titans.push(t); return t;
    }

    const handlers = {
      scream: () => {
        stage.shake(1.6); audio.play('transform', 0, 0, 1);
        soldiers.forEach((s, i) => stage.after(.18 * i, () => turn(s, ['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][i % 5], 6 + i % 6)));
        stage.after(1.2, () => turn(pixis, 'barbudo', 9)); stage.after(1.6, () => { turn(colt, 'cabeludo', 8); turn(falco, 'pequeno', 5); });
        stage.setShot([20, 12, 0], [0, 4, 30], 58);
      },
      'porco-gives': () => {
        const t = titans.at(-1); stage.place(porco, t.root.position.x + 3, t.root.position.z); porco.rig.root.visible = true; porco.pose = 'reach';
        stage.after(1.4, () => { porco.rig.root.visible = false; stage.particles.burst(t.root.position.clone().setY(3), 'steam', 50, 6); const jaw = ctx.titanForm('mandibula'); jaw.root.position.copy(t.root.position); scene.add(jaw.root); t.root.visible = false; });
        stage.setShot([t.root.position.x + 8, 4, t.root.position.z + 8], [t.root.position.x, 2, t.root.position.z], 50);
      },
      paths: () => {
        inPaths = true; world.group.visible = false; titans.forEach(t => { t.root.visible = false; }); stage.show([...soldiers, pixis, colt, falco, porco], false);
        scene.background.set('#0d1530'); scene.fog.color.set('#0d1530'); scene.fog.near = 60; scene.fog.far = 420; stage.hemisphere.color.set('#9fb8ff'); stage.sun.intensity = .6;
        paths.visible = true; stage.show([grisha, ...reissFamily, erenTeen, ymir], true);
        eren.rig.root.visible = true; zeke.rig.root.visible = true; stage.place(eren, 0, 10, Math.PI); stage.place(zeke, 2, 12, Math.PI); zeke.follow = eren; zeke.followGap = 2.4;
        walker = ctx.useWalker(eren, { bounds: { minX: -60, maxX: 60, minZ: -140, maxZ: 20 } }); walker.lookAt(...MEMORIES[0]);
        stage.setShot([6, 3, 18], [0, 2, 0], 52);
      },
      rumbling: () => {
        stage.shake(2.4); audio.play('defeat', 0, 0, 1); ui.flash('#fff2c8', .8);
        for (let i = 0; i < 9; i++) { const c = ctx.titanForm('colossal'); c.root.scale.setScalar(55); c.root.position.set(-200 + i * 50, -40, -320); scene.add(c.root); colossi.push(c); }
        stage.setShot([0, 12, 0], [0, 40, -320], 64);
      },
    };

    function update(dt, input, control, view) {
      titans.forEach(t => t.animate(stage.time));
      colossi.forEach(c => { c.root.position.y = Math.min(0, c.root.position.y + dt * 12); c.animate(stage.time); });
      if (control === 'walk' && walker) walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
      return null;
    }

    return {
      script: CHAPTER_41, par: 240,
      start() { stage.setShot([20, 12, 0], [0, 4, 30], 58); },
      handlers, update,
      markerHeight: () => 2,
      snapshot: () => ({ inPaths, titans: titans.length, colossi: colossi.length }),
    };
  }, { breach: false, sky: '#1d2534', fog: [80, 520], light: ['#9fb4d8', 1.2], hemi: ['#7f93b8', '#2a2a30', 1] });
}
