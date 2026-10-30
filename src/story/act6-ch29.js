import * as THREE from 'three';
import { createHorse } from './props.js';
import { createReturnChapter } from './shiganshina-return.js';
import { noiseStep, tooLoud } from './act6-rules.js';
import { createHardening, hardenStep } from './act5-rules.js';
import { CHAPTER_29 } from './act6-scripts.js';

// Chapter 29: back to Shiganshina at night. Lead the horse through the empty
// district to the outer gate without running — titans sleep in the streets
// and noise wakes them. Eren hardens the broken gate shut; then the streets
// of the prologue: the bell, the bridge, the fishing boat.
const GATE = [0, -116];

export function createChapter(args) {
  return createReturnChapter(args, ctx => {
    const { stage, ui, audio, world } = ctx;
    const eren = ctx.cast('eren', 'eren', 0, 104, Math.PI);
    const walker = ctx.useWalker(eren); walker.lookAt(0, 0);
    const horse = createHorse('#5a3f2c'); ctx.scene.add(horse.root); horse.root.position.set(1.5, 0, 106);
    const squad = ['mikasa', 'armin', 'levi', 'hange'].map((id, i) => ctx.cast(id, id, -2 + i * 1.5, 108 + i, Math.PI));
    squad.forEach((a, i) => { a.follow = i ? squad[i - 1] : eren; a.followGap = 2.6; a.followSpeed = 4; });
    const sleepers = [[-30, 40], [28, -10], [-18, -60], [40, 70], [6, 20]].map(([x, z], i) => { const t = ctx.titanForm(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][i]); t.root.scale.setScalar(7 + i); t.root.position.set(x, 0, z); t.root.rotation.set(-Math.PI / 2, i, 0); ctx.scene.add(t.root); return t; });
    const crystal = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 6), new THREE.MeshToonMaterial({ color: '#cfe8f2', emissive: '#3a6a80', emissiveIntensity: .4, transparent: true, opacity: .85 }));
    crystal.position.set(GATE[0], 9, GATE[1]); crystal.scale.set(1, .02, 1); crystal.visible = false; ctx.scene.add(crystal);
    const titan = ctx.titanForm('ataque'); titan.root.visible = false; titan.root.position.set(GATE[0], 0, GATE[1] + 9); ctx.scene.add(titan.root);
    let noise = 0, loudest = 0, hard = createHardening(), found = new Set();

    const handlers = {
      'night-march': () => { stage.setShot([6, 4, 96], [0, 2, 106], 52); },
      'eren-gate': () => {
        ui.flash('#fff7d8', 1); audio.play('transform', 0, 0, 1); eren.rig.root.visible = false; horse.root.visible = false;
        titan.root.visible = true; titan.arms.forEach(a => { a.rotation.x = -2.6; }); crystal.visible = true;
        stage.particles.burst(new THREE.Vector3(GATE[0], 6, GATE[1] + 9), 'steam', 100, 10);
        stage.setShot([GATE[0] + 26, 14, GATE[1] + 40], [GATE[0], 9, GATE[1]], 58);
      },
      'gate-sealed': () => {
        crystal.scale.y = 1; titan.root.visible = false; eren.rig.root.visible = true; stage.place(eren, GATE[0] + 3, GATE[1] + 14, Math.PI);
        stage.particles.burst(new THREE.Vector3(GATE[0], 10, GATE[1] + 4), 'steam', 60, 8);
      },
    };

    function update(dt, input, control) {
      // The horse trails Eren on its rein.
      if (horse.root.visible) {
        const p = eren.rig.root.position, h = horse.root.position, d = Math.hypot(p.x - h.x, p.z - h.z);
        if (d > 2.6) { h.x += (p.x - h.x) / d * (d - 2.6); h.z += (p.z - h.z) / d * (d - 2.6); horse.root.rotation.y = Math.atan2(p.x - h.x, p.z - h.z); }
        horse.animate(stage.time, walker.moved ? (input.run ? .8 : .25) : 0);
      }
      sleepers.forEach((t, i) => { t.chest.scale.y = 1 + Math.sin(stage.time * .8 + i) * .03; });
      if (control === 'walk' && ctx.mission === 'marcha') {
        noise = noiseStep(noise, dt, !walker.moved ? 'still' : input.run ? 'run' : 'walk'); loudest = Math.max(loudest, noise);
        if (tooLoud(noise)) { sleepers.forEach(t => { t.head.rotation.x = -.5; }); return 'Os titãs acordaram com o barulho dos cascos. Puxe o cavalo andando, sem correr.'; }
        return null;
      }
      if (control === 'lock') {
        hard = hardenStep(hard, dt, !!input.pressed.attack);
        crystal.scale.y = Math.max(.02, hard.crystal); crystal.position.y = 9 * crystal.scale.y;
        if (input.pressed.attack) stage.shake(.2);
        if (hard.crushed) return 'O endurecimento não segurou e Eren desabou. Aperte sem parar até o cristal fechar o portão.';
        if (hard.held) ctx.goals.add('portao');
        return null;
      }
      return null;
    }

    return {
      script: CHAPTER_29, par: 260,
      start() { stage.setShot([6, 4, 96], [0, 2, 106], 52); },
      handlers, update,
      onEvent(event) { const l = world.landmarks.find(l => l.id === event.id); if (event.kind === 'objective-complete' && l && !found.has(l.id)) { found.add(l.id); ui.toast(`Você reconheceu ${l.name}`, 2); } },
      status() {
        if (ctx.control === 'walk' && ctx.mission === 'marcha') return `Barulho ${Math.round(noise * 100)}%${noise > .6 ? ' · ALTO' : ''}`;
        if (ctx.control === 'lock') return `Cristal ${Math.round(hard.crystal * 100)}% · Forças de Eren ${Math.round((1 - hard.ceiling) * 100)}%`;
        if (ctx.mission === 'casa') return `Marcos ${found.size} / 3`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'marcha') { noise = 0; stage.place(eren, 0, 104); horse.root.position.set(1.5, 0, 106); sleepers.forEach(t => { t.head.rotation.x = 0; }); }
        if (snapshot?.mission === 'portao') hard = createHardening();
      },
      challenges: () => (found.size === 3 ? [ctx.data.challenges[0]] : []),
      snapshot: () => ({ noise: +noise.toFixed(2), loudest: +loudest.toFixed(2), hard: { crystal: +hard.crystal.toFixed(2), held: hard.held }, found: [...found] }),
    };
  }, { sky: '#151c28', fog: [40, 280], light: ['#9fb4d8', 1], hemi: ['#7f93b8', '#2a2a30', .9] });
}
