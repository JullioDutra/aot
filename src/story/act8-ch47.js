import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createReturnChapter } from './shiganshina-return.js';
import { CHAPTER_47 } from './act8-scripts.js';

// Chapter 47: after the battle. The titans are gone. Mikasa climbs the hill of
// the first chapter to the tree where Eren lies; the envoys leave to talk to
// the world; years pass and the tree grows over the hill.
const TREE = [0, 182], GRAVE = [2.4, 178];

export function createChapter(args) {
  return createReturnChapter(args, ctx => {
    const { stage, world, ui } = ctx;
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 140, 0, { override: { outfit: 'civilian-coat' } });
    const walker = ctx.useWalker(mikasa); walker.lookAt(...TREE);
    const stone = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, .3), toon('#9a948a')); stone.position.set(GRAVE[0], stage.ground(...GRAVE) + .6, GRAVE[1]); ctx.scene.add(stone);
    const envoys = ['armin', 'jean', 'connie', 'annie', 'reiner', 'pieck', 'gabi', 'falco', 'levi'].map((id, i) => ctx.cast(`envoy-${id}`, id, -8 + i * 2, 112, Math.PI, { override: { outfit: id === 'levi' ? 'civilian-coat' : undefined } }));
    stage.show(envoys, false);
    let grown = 0;

    const handlers = {
      hill: () => { stage.setShot([TREE[0] + 14, stage.ground(...TREE) + 6, TREE[1] - 20], [TREE[0], stage.ground(...TREE) + 4, TREE[1]], 52); },
      envoys: () => {
        stage.show(envoys, true); envoys.forEach((a, i) => { if (a.id === 'envoy-levi') a.pose = 'sit'; });
        stage.place(mikasa, GRAVE[0] - 1.2, GRAVE[1] - 1); mikasa.pose = 'sit';
        stage.setShot([0, 4, 100], [0, 2, 112], 50);
      },
      years: () => {
        ui.setFade(1);
        stage.after(1.2, () => { ui.setFade(0); grown = 1; stage.show(envoys, false); stage.setShot([TREE[0] + 26, stage.ground(...TREE) + 14, TREE[1] - 34], [TREE[0], stage.ground(...TREE) + 10, TREE[1]], 56); });
      },
    };

    function update(dt) {
      if (grown && world.tree) { grown = Math.min(2, grown + dt * .4); world.tree.scale.setScalar(grown); }
      return null;
    }

    return {
      script: CHAPTER_47, par: 160,
      start() { stage.setShot([6, stage.ground(0, 140) + 3, 128], [0, stage.ground(0, 150) + 2, 150], 50); },
      handlers, update,
      markerHeight: () => stage.ground(...TREE) + 2,
      snapshot: () => ({ grown: +grown.toFixed(2) }),
    };
  }, { sky: '#d9e2e6', fog: [160, 700] });
}
