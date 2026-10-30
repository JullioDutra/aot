import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createHorse } from './props.js';
import { createFieldChapter } from './field-chapter.js';
import { castExtra } from './extras.js';
import { CHAPTER_42 } from './act8-scripts.js';

// Chapter 42: the alliance around a campfire. Old enemies share the stew;
// Yelena needles each one with their crimes; Jean faces Reiner — the punch
// comes either way. Then gather the gear and lead it to the horses.
const FIRE = [0, 10], WAGON = [8, 14], HORSES = [-14, 24];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio } = ctx;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.7, 1.6, 8), new THREE.MeshBasicMaterial({ color: '#ffb23a' })); flame.position.set(FIRE[0], .8, FIRE[1]); ctx.scene.add(flame);
    const light = new THREE.PointLight('#ff9a3a', 3, 26, 1.4); light.position.set(FIRE[0], 2, FIRE[1]); ctx.scene.add(light);
    const logs = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, .3, 10), toon('#4a3020')); logs.position.set(FIRE[0], .15, FIRE[1]); ctx.scene.add(logs);
    const circle = ['jean', 'reiner', 'mikasa', 'armin', 'connie', 'annie', 'pieck', 'falco', 'gabi', 'hange'];
    const seated = circle.map((id, i) => { const a = i / circle.length * Math.PI * 2, x = FIRE[0] + Math.cos(a) * 3.6, z = FIRE[1] + Math.sin(a) * 3.6; return ctx.cast(id, id, x, z, Math.atan2(FIRE[0] - x, FIRE[1] - z), { pose: 'sit' }); });
    const [jean, reiner] = seated;
    const extras = ['yelena', 'magath', 'onyankopon'].map((id, i) => castExtra(ctx, id, FIRE[0] + 6 + i * 1.6, FIRE[1] - 4, -Math.PI / 2));
    const levi = ctx.cast('levi', 'levi', FIRE[0] - 6, FIRE[1] - 3, Math.PI / 2, { pose: 'lie' });
    const wagon = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 4), toon('#5b3f2b')); wagon.position.set(WAGON[0] + 2, .9, WAGON[1]); ctx.scene.add(wagon);
    const gear = new THREE.Mesh(new THREE.BoxGeometry(.8, .5, .6), toon('#7d7d80')); gear.position.set(WAGON[0] + 1, 1.8, WAGON[1]); ctx.scene.add(gear);
    [0, 1, 2].forEach(i => { const h = createHorse(['#6b4a33', '#5a3f2c', '#7a5a3f'][i]); h.root.position.set(HORSES[0] - i * 2.4, 0, HORSES[1] + i); ctx.scene.add(h.root); });
    let walker = null, carrying = false, punched = 0;

    const handlers = {
      campfire: () => { stage.setShot([FIRE[0] + 7, 2.6, FIRE[1] + 7], [FIRE[0], 1, FIRE[1]], 50); },
      punch: () => {
        punched++; jean.pose = 'punch'; reiner.pose = 'fall'; stage.face(jean, reiner.rig.root.position.x, reiner.rig.root.position.z);
        stage.particles.burst(reiner.rig.root.position.clone().setY(1.2), 'blood', 12, 3); audio.play('punch', 0, 0, 1); stage.shake(.4);
        stage.after(1.2, () => { jean.pose = 'sit'; reiner.pose = 'sit'; });
        stage.setShot([jean.rig.root.position.x + 3, 1.8, jean.rig.root.position.z + 3], [reiner.rig.root.position.x, 1, reiner.rig.root.position.z], 46);
      },
    };

    function update(dt, input, control, view) {
      flame.scale.set(1 + Math.sin(stage.time * 9) * .12, 1 + Math.sin(stage.time * 13) * .2, 1); light.intensity = 2.6 + Math.sin(stage.time * 11) * .4;
      if (control === 'walk') {
        if (!walker) { jean.pose = 'idle'; walker = ctx.useWalker(jean); walker.lookAt(...WAGON); }
        walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
        if (carrying) jean.rig.hands[1].getWorldPosition(gear.position);
      }
      return null;
    }

    return {
      script: CHAPTER_42, par: 160,
      start() { stage.setShot([FIRE[0] + 7, 2.6, FIRE[1] + 7], [FIRE[0], 1, FIRE[1]], 50); },
      handlers, update,
      onEvent(event) { if (event.kind === 'interact' && event.id === 'equipamento') { carrying = true; ui.toast('Equipamento nas mãos.', 1.2); } if (event.kind === 'objective-complete' && event.id === 'cavalos') { carrying = false; gear.position.set(HORSES[0], 1.6, HORSES[1]); } },
      markerHeight: () => 1.4,
      snapshot: () => ({ punched, carrying }),
    };
  }, { sky: '#151c28', fog: [30, 220], light: ['#9fb4d8', .7], hemi: ['#5f6f90', '#1a1a20', .8] });
}
