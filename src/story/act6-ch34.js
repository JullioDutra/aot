import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createReturnChapter } from './shiganshina-return.js';
import { castExtra } from './extras.js';
import { CHAPTER_34 } from './act6-scripts.js';

// Chapter 34: one dose of serum between Erwin and Armin — whatever Levi leans
// toward, he lets Erwin rest and Armin inherits the Colossal. In the ruins of
// the Yeager house, the key opens the drawer and Grisha's books show the
// world. A year later, they walk into the sea.
const STREET = [8, 30], BEACH = { minX: 560, maxX: 680, minZ: -20, maxZ: 40 };

export function createChapter(args) {
  return createReturnChapter(args, ctx => {
    const { stage, ui, audio, world } = ctx;
    world.collapse(world.yeager);
    const levi = ctx.cast('levi', 'levi', STREET[0], STREET[1], 0);
    const erwin = ctx.cast('erwin', 'erwin', STREET[0] - 2, STREET[1] + 2, 0, { pose: 'lie' });
    const armin = ctx.cast('armin', 'armin', STREET[0] + 2.4, STREET[1] + 2, 0, { pose: 'lie', override: { skin: '#5a3a2e' } });
    const eren = ctx.cast('eren', 'eren', STREET[0] + 3, STREET[1] - 1.5, -Math.PI / 2);
    const mikasa = ctx.cast('mikasa', 'mikasa', STREET[0] + 4.5, STREET[1] - 2, -Math.PI / 2, { blades: true });
    const floch = castExtra(ctx, 'floch', STREET[0] - 3, STREET[1] - 2, Math.PI / 2);
    const colossal = ctx.titanForm('colossal'); colossal.root.visible = false; colossal.root.position.set(-40, 0, -40); ctx.scene.add(colossal.root);
    // Desk and books in the cellar under the ruins.
    const wood = toon('#5b3f2b'), desk = new THREE.Group(); desk.position.set(26, 0, 18); ctx.scene.add(desk);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, .1, 1), wood); top.position.y = .9; desk.add(top);
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.4, .08, .55), toon(['#7a2f22', '#2f4a6a', '#3d5a35'][i])); b.position.set(-.5 + i * .5, 1, 0); b.visible = false; desk.add(b); }
    // The sea, far from the walls.
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(160, 70), toon('#d9c99a')); sand.rotation.x = -Math.PI / 2; sand.position.set(620, .02, 0); ctx.scene.add(sand);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 260), new THREE.MeshToonMaterial({ color: '#4f8fae', transparent: true, opacity: .92 })); sea.rotation.x = -Math.PI / 2; sea.position.set(620, .05, 160); ctx.scene.add(sea);
    let walker = null, opened = false, atSea = false;

    const handlers = {
      rooftop: () => { stage.setShot([STREET[0] + 1, 2.4, STREET[1] - 7], [STREET[0], .8, STREET[1] + 1], 48); },
      'armin-injected': () => {
        ui.flash('#fff7d8', 1); audio.play('transform', 0, 0, 1); armin.rig.root.visible = false; colossal.root.visible = true;
        stage.particles.burst(new THREE.Vector3(-40, 30, -40), 'steam', 140, 16);
        stage.after(2.6, () => { colossal.root.visible = false; armin.rig.root.visible = true; armin.pose = 'sit'; erwin.pose = 'lie'; });
        stage.setShot([STREET[0] + 10, 6, STREET[1] + 12], [-40, 30, -40], 60);
      },
      house: () => {
        [levi, erwin, floch].forEach(a => { a.rig.root.visible = false; });
        stage.place(eren, 14, 22); stage.place(mikasa, 12, 24); stage.place(armin, 13, 26); armin.pose = 'idle';
        mikasa.follow = eren; armin.follow = mikasa; walker = ctx.useWalker(eren); walker.lookAt(24, 16);
        stage.setShot([18, 4, 30], [28, 1.5, 16], 52);
      },
      books: () => { opened = true; desk.children.forEach(c => { c.visible = true; }); eren.pose = 'reach'; stage.setShot([24, 2.2, 21], [26, 1, 18], 44); },
      sea: () => {
        ui.setFade(1);
        stage.after(.8, () => {
          ui.setFade(0); stage.scene.background.set('#bcd6e2'); stage.scene.fog.color.set('#bcd6e2'); atSea = true;
          stage.place(eren, 620, -10, 0); eren.pose = 'idle'; walker.bounds = BEACH; walker.lookAt(620, 40);
          [mikasa, armin].forEach((a, i) => { a.follow = null; stage.place(a, 616 + i * 3, -6, 0); });
          ['jean', 'connie', 'sasha', 'hange', 'levi2'].forEach((id, i) => ctx.cast(`sea-${id}`, id === 'levi2' ? 'levi' : id, 606 + i * 4, -14, 0));
          stage.setShot([628, 3, -18], [620, 1.4, 20], 55);
        });
      },
    };

    return {
      script: CHAPTER_34, par: 220,
      start() { stage.setShot([STREET[0] + 1, 2.4, STREET[1] - 7], [STREET[0], .8, STREET[1] + 1], 48); },
      handlers,
      update(dt, input, control) { if (colossal.root.visible) colossal.animate(stage.time); sea.position.y = .05 + Math.sin(stage.time) * .04; return null; },
      onEvent(event) { if (event.kind === 'interact' && event.id === 'gaveta') { eren.pose = 'reach'; audio.play('block', 1, 0, .4); } },
      markerHeight: () => 1.4,
      snapshot: () => ({ opened, atSea, armin: armin.pose }),
    };
  });
}
