import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTrostChapter } from './trost-chapter.js';
import { CHAPTER_36 } from './act7-scripts.js';

// Chapter 36: Liberio, the internment zone (the walled city stands in for
// it). As Falco, walk through the market with Gabi and hear what people say,
// carry letters to the wounded soldier "Kruger" and listen to Reiner
// remember the warrior candidates and the island.
const TALKS = [
  { at: [-6, 18], who: 'Vendedora', text: 'Braçadeira no braço esquerdo, menina. Se um soldado vir sem ela, é a cadeia.' },
  { at: [6, 28], who: 'Velho', text: 'Os guerreiros voltaram. Quando eles ganham, a gente come um pouco melhor.' },
  { at: [-5, 38], who: 'Mãe', text: 'Dizem que na ilha vivem demônios. Que bom que eles nunca vão chegar aqui.' },
];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, ui } = ctx;
    const falco = ctx.cast('falco', 'falco', 0, 4, Math.PI);
    const gabi = ctx.cast('gabi', 'gabi', 1.6, 2, Math.PI); gabi.follow = falco; gabi.followGap = 1.8;
    const walker = ctx.useWalker(falco, { bounds: { minX: -9, maxX: 9, minZ: -10, maxZ: 110 } }); walker.lookAt(0, 40);
    const cloth = [toon('#b04a3a'), toon('#3a6a8a'), toon('#c9a24a')], wood = toon('#6b4a32');
    TALKS.forEach((t, i) => {
      const stall = new THREE.Group(); stall.position.set(t.at[0] + Math.sign(t.at[0]) * 2.4, 0, t.at[1]); ctx.scene.add(stall);
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, .9, 1.4), wood); table.position.y = .45; stall.add(table);
      const awning = new THREE.Mesh(new THREE.BoxGeometry(2.8, .1, 1.8), cloth[i]); awning.position.y = 2.4; awning.rotation.z = .1; stall.add(awning);
      ctx.cast(`vendor-${i}`, i % 2 ? 'civilian-m' : 'civilian-f', t.at[0] + Math.sign(t.at[0]) * 3.6, t.at[1], -Math.sign(t.at[0]) * Math.PI / 2, { override: { extras: ['armband'] } });
    });
    for (let i = 0; i < 10; i++) ctx.cast(`crowd-${i}`, i % 2 ? 'civilian-f' : 'civilian-m', (i % 2 ? -1 : 1) * (3 + (i % 3)), 10 + i * 6, i, { override: { extras: ['armband'] } });
    const kruger = ctx.cast('kruger', 'eren', -2.6, 92, Math.PI / 2, { pose: 'bench', override: { outfit: 'civilian-coat', hair: { style: 'long', color: '#35251b' }, face: { brows: 'flat', mouth: 'flat', marks: ['stubble'] } } });
    kruger.rig.root.position.y = .5;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(.8, .5, 2.4), wood); bench.position.set(-2.8, .25, 92); ctx.scene.add(bench);
    const reiner = ctx.cast('reiner', 'reiner', 4, 96, -Math.PI / 2, { override: { outfit: 'marley', extras: ['armband'] } });
    // The warrior candidates as children, for the flashback.
    const kids = ['reiner', 'annie', 'bertholdt', 'porco', 'marcel', 'pieck'].map((id, i) => ctx.cast(`kid-${id}`, id === 'porco' || id === 'marcel' ? 'recruit-m' : id, -6 + i * 2.4, 70, Math.PI, { override: { height: 1.25, age: 'child', outfit: 'marley', extras: ['armband'] } }));
    stage.show(kids, false);
    const heard = new Set();
    let sky = null;

    const handlers = {
      liberio: () => { stage.setShot([4, 2.4, -2], [0, 1.6, 6], 50); },
      flashback: () => {
        sky = stage.scene.background.clone(); stage.scene.background.set('#c9b58e'); stage.scene.fog.color.set('#c9b58e'); stage.hemisphere.color.set('#f0dcb0');
        stage.show(kids, true); stage.show([reiner, falco, gabi, kruger], false);
        stage.setShot([0, 2, 62], [0, 1, 70], 48);
      },
      present: () => {
        stage.scene.background.copy(sky); stage.scene.fog.color.copy(sky); stage.hemisphere.color.set('#eef4f0');
        stage.show(kids, false); stage.show([reiner, falco, gabi, kruger], true); stage.place(falco, 2, 95); stage.face(reiner, 2, 95);
        stage.setShot([7, 2, 100], [3, 1.5, 95], 46);
      },
    };

    function update(dt, input, control, view) {
      if (control !== 'walk') return null;
      walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
      const p = falco.rig.root.position;
      TALKS.forEach((t, i) => { if (!heard.has(i) && Math.hypot(p.x - t.at[0], p.z - t.at[1]) < 7) { heard.add(i); ui.toast(`${t.who}: “${t.text}”`, 4); } });
      return null;
    }

    return {
      script: CHAPTER_36, par: 200,
      start() { stage.setShot([4, 2.4, -2], [0, 1.6, 6], 50); },
      handlers, update,
      markerHeight: () => 1.6,
      status: () => (ctx.mission === 'bairro' ? `Conversas ouvidas ${heard.size} / ${TALKS.length}` : ''),
      challenges: () => (heard.size === TALKS.length ? [ctx.data.challenges[0]] : []),
      debug: { listen() { TALKS.forEach((t, i) => heard.add(i)); } },
      snapshot: () => ({ heard: heard.size }),
    };
  }, { breach: false });
}
