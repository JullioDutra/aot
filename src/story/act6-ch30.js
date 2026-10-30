import * as THREE from 'three';
import { createHorse } from './props.js';
import { createTrostChapter } from './trost-chapter.js';
import { rockPlan, ROCKS } from './act6-rules.js';
import { CHAPTER_30 } from './act6-scripts.js';

// Chapter 30: the trap at dawn (the city stands in for Shiganshina). As Armin,
// find the cracked stones where Reiner hid inside the wall; then the Beast's
// rocks rain on the horses: lead each herd behind the houses before the
// shadow of a rock becomes the rock.
const CRACK = [30, 18, -194.6], HOLD = 30;
const HERDS = [[-4, 112], [5, 124], [-5, 136], [4, 148], [-4, 160], [5, 172]];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio } = ctx;
    const armin = ctx.cast('armin', 'armin', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(armin.rig); pilot.place(20, 0, -150, 0);
    const crack = new THREE.Mesh(new THREE.CircleGeometry(4, 7), new THREE.MeshBasicMaterial({ color: '#2a2622' })); crack.position.set(...CRACK); crack.rotation.y = 0; ctx.scene.add(crack);
    const armored = ctx.titanForm('blindado'); armored.root.visible = false; ctx.scene.add(armored.root);
    // Herds of three horses on the avenue, each with a cover spot by a house.
    const cover = HERDS.map(([x, z]) => { const b = world.buildings.filter(b => Math.abs(b.z - z) < 14).sort((a, c) => Math.abs(a.x) - Math.abs(c.x))[0]; return b ? [b.x - Math.sign(b.x) * (b.w / 2 + 2.5), b.z] : [x * 3, z]; });
    const herds = HERDS.map(([x, z], i) => ({ horses: [0, 1, 2].map(k => { const h = createHorse(['#6b4a33', '#5a3f2c', '#7a5a3f'][k]); h.root.position.set(x + k * 1.6 - 1.6, 0, z + (k % 2) * 1.4); h.root.rotation.y = Math.PI; ctx.scene.add(h.root); return h; }), home: [x, z], cover: cover[i], safe: false, lost: false, moving: 0 }));
    const shadowMat = new THREE.MeshBasicMaterial({ color: '#1b1612', transparent: true, opacity: .5, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .05; shadow.visible = false; ctx.scene.add(shadow);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), new THREE.MeshToonMaterial({ color: '#7d7466' })); rock.visible = false; ctx.scene.add(rock);
    let walker = null, t = 0, lastRock = -1, crackHit = false;
    const tmp = new THREE.Vector3();

    function herdCenter(h) { return h.horses[1].root.position; }

    const handlers = {
      search: () => { stage.setShot([10, 20, -150], [CRACK[0], CRACK[1], CRACK[2]], 55); },
      'reiner-out': () => {
        ui.flash('#fff7d8', 1); stage.shake(1.6); audio.play('transform', 0, 0, 1); crack.visible = false;
        armored.root.visible = true; armored.root.position.set(CRACK[0], 0, -184); armored.root.rotation.y = 0;
        stage.particles.burst(new THREE.Vector3(...CRACK), 'dust', 80, 10); stage.particles.burst(new THREE.Vector3(CRACK[0], 8, -184), 'steam', 80, 10);
        stage.setShot([CRACK[0] - 20, 12, -150], [CRACK[0], 10, -184], 58);
      },
      'beast-wall': () => {
        armored.root.visible = false; pilot.odm.releaseAll(); armin.rig.root.visible = true;
        stage.place(armin, 0, 100); walker = ctx.useWalker(armin, { colliders: world.colliders }); walker.lookAt(0, 140);
        stage.setShot([14, 14, 96], [0, 2, 140], 58);
      },
    };

    function update(dt, input, control, view) {
      armored.animate(stage.time);
      if (control === 'odm') {
        const r = pilot.step(dt, input);
        if (r.strike && tmp.set(...CRACK).distanceTo(r.position) < r.reach + 1) { crackHit = true; stage.particles.burst(tmp, 'dust', 30, 5); ctx.goals.add('muralha'); }
        return null;
      }
      if (control === 'walk' && walker) {
        walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
        t += dt;
        const p = armin.rig.root.position;
        if (input.interact) { const h = herds.find(h => !h.safe && !h.lost && herdCenter(h).distanceTo(tmp.set(p.x, 0, p.z)) < 5); if (h) { h.safe = true; h.moving = 1; ui.toast('Rebanho levado para trás das casas.', 1.2); } }
        for (const h of herds) if (h.moving > 0) { h.moving = Math.max(0, h.moving - dt * .7); h.horses.forEach((horse, k) => { horse.root.position.x += (h.cover[0] + k * 1.2 - horse.root.position.x) * Math.min(1, dt * 2.5); horse.root.position.z += (h.cover[1] + (k % 2) - horse.root.position.z) * Math.min(1, dt * 2.5); horse.animate(stage.time, .8); }); }
        // The rock: a shadow first, then the impact.
        const plan = rockPlan(herds.length, t), target = herds[plan.herd];
        if (plan.warning && !target.lost) { const c = target.safe ? target.cover : target.home; shadow.visible = true; shadow.position.set(c[0], .05, c[1]); shadow.scale.setScalar(.4 + (t % ROCKS.every) / ROCKS.warning); }
        else shadow.visible = false;
        if (Math.floor(t / ROCKS.every) !== lastRock && t % ROCKS.every >= ROCKS.warning) {
          lastRock = Math.floor(t / ROCKS.every);
          const c = target.safe ? target.cover : target.home; rock.visible = true; rock.position.set(c[0], 1.5, c[1]); stage.shake(.9); audio.play('heavy', 6, 0, 1); stage.particles.burst(rock.position, 'dust', 50, 8);
          if (!target.safe && !target.lost) { target.lost = true; target.horses.forEach(h => { h.root.rotation.z = 1.4; stage.particles.burst(h.root.position.clone().setY(1), 'blood', 20, 4); }); ui.toast('Uma pedra caiu sobre um rebanho!', 1.6); }
          if (Math.hypot(p.x - c[0], p.z - c[1]) < 4.5) { ui.flash('#6a0909', .8); return 'A pedra caiu em cima de Armin. Saia da sombra antes do impacto.'; }
        }
        if (t >= HOLD) ctx.goals.add('cerco');
        return null;
      }
      return null;
    }

    return {
      script: CHAPTER_30, par: 200,
      start() { stage.setShot([10, 20, -150], [CRACK[0], CRACK[1], CRACK[2]], 55); },
      handlers, update,
      markerHeight: () => (ctx.control === 'odm' ? CRACK[1] : 2),
      status() {
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Parede trincada a ${Math.round(tmp.set(...CRACK).distanceTo(pilot.odm.player.position))} m`;
        if (ctx.control === 'walk') return `Resistir ${Math.floor(t)} / ${HOLD} s · Rebanhos salvos ${herds.filter(h => h.safe).length} · Perdidos ${herds.filter(h => h.lost).length}`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'muralha') pilot.place(20, 0, -150, 0);
        if (snapshot?.mission === 'cerco') { t = 0; lastRock = -1; herds.forEach(h => { h.safe = h.lost = false; h.moving = 0; h.horses.forEach((horse, k) => { horse.root.rotation.z = 0; horse.root.position.set(h.home[0] + k * 1.6 - 1.6, 0, h.home[1] + (k % 2) * 1.4); }); }); if (walker) stage.place(armin, 0, 100); }
      },
      challenges: () => (ctx.goals.has('cerco') && herds.filter(h => h.lost).length < herds.length / 2 ? [ctx.data.challenges[0]] : []),
      debug: { crack() { pilot.place(CRACK[0], CRACK[1], CRACK[2] + 3); pilot.strikeNow(); }, herd() { const h = herds.find(h => !h.safe && !h.lost); if (h) { stage.place(armin, herdCenter(h).x + 1.5, herdCenter(h).z); } } },
      snapshot: () => ({ crackHit, t: +t.toFixed(1), safe: herds.filter(h => h.safe).length, lost: herds.filter(h => h.lost).length }),
    };
  }, { breach: false });
}
