import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTrostChapter } from './trost-chapter.js';
import { mouthOpen } from './act5-rules.js';
import { CHAPTER_28 } from './act5-scripts.js';

// Chapter 28: Rod Reiss's titan drags itself to the wall of Orvud. Aim the
// cannons (the heat stops the shots), shove the powder barrels into its mouth
// as it opens, then as Historia find the glowing nape among the falling
// fragments. Kenny hands Levi the box under a tree and dies; Historia is
// crowned.
const FACE_Z = -214, TREE = [23, -62];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio, TROST } = ctx;
    const TOP = TROST.wallHeight + 1.4, Z = TROST.wallZ;
    stage.ground = (x, z) => (Math.abs(z - Z) < 5.5 ? TOP : 0);
    const levi = ctx.cast('levi', 'levi', -20, Z + 1, Math.PI, { blades: true });
    const walker = ctx.useWalker(levi, { bounds: { minX: -40, maxX: 40, minZ: Z - 3, maxZ: Z + 3 } });
    const historia = ctx.cast('historia', 'historia', 6, Z + 2, Math.PI, { blades: true }); historia.rig.root.visible = false;
    const pilot = ctx.usePilot(historia.rig);
    // Rod: a titan so big it crawls, its face rising over the wall, glowing hot.
    const rod = ctx.titanForm('nariz'); rod.root.scale.setScalar(110); rod.root.rotation.set(1.11, 0, 0); rod.root.position.set(0, 0, FACE_Z - 89 - 160); ctx.scene.add(rod.root);
    const heat = new THREE.PointLight('#ff8a3c', 3, 260, 1.2); ctx.scene.add(heat);
    const erenTitan = ctx.titanForm('ataque'); erenTitan.root.visible = false; erenTitan.root.position.set(0, TOP, Z + 2); erenTitan.root.rotation.y = Math.PI; ctx.scene.add(erenTitan.root);
    const powder = toon('#6b4a2c'), barrels = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 12), powder); b.position.set((i - 1) * 3, 0, 0); barrels.add(b); } barrels.visible = false; ctx.scene.add(barrels);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, 7, 8), toon('#5a3f2d')); trunk.position.set(TREE[0], 3.5, TREE[1]); const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 1), toon('#4d6b3a')); crown.position.set(TREE[0], 8, TREE[1]); ctx.scene.add(trunk, crown);
    const kenny = ctx.cast('kenny', 'civilian-m', TREE[0] - .8, TREE[1], -Math.PI / 2, { pose: 'sit', override: { outfit: 'commander', height: 1.92, hair: { style: 'long', color: '#2a2420' }, face: { marks: ['stubble'] }, extras: [] } }); kenny.rig.root.visible = false;
    const crowd = []; let fragments = [], crawl = 0, mouthT = 0, shoved = false, bounces = 0, coronated = false;
    const tmp = new THREE.Vector3();

    function face() { rod.head.getWorldPosition(tmp); return tmp; }
    function fragmentsOut() {
      const center = face().clone(), rock = toon('#8a4a3a'), hot = new THREE.MeshToonMaterial({ color: '#ffd28a', emissive: '#ff7a2a', emissiveIntensity: 1 });
      fragments = Array.from({ length: 16 }, (_, i) => {
        const nape = i === 11, m = new THREE.Mesh(new THREE.DodecahedronGeometry(nape ? 2.2 : 1.5 + (i % 4) * .8, 0), nape ? hot : rock);
        m.position.copy(center).add(new THREE.Vector3((Math.random() - .5) * 10, 0, (Math.random() - .5) * 10)); ctx.scene.add(m);
        const v = new THREE.Vector3((Math.random() - .5) * 26, 14 + Math.random() * 16, 10 + Math.random() * 30); if (nape) v.set(6, 22, 26);
        return { m, v, nape };
      });
      world.anchorRoots.push(...fragments.map(f => f.m));
    }

    const handlers = {
      orvud: () => { stage.setShot([-30, TOP + 12, Z + 30], [0, 30, FACE_Z - 120], 62); },
      volley: () => {
        world.cannons.forEach((c, i) => stage.after(i * .12, () => { c.getWorldPosition(tmp); stage.particles.burst(tmp.setY(TOP + 2), 'dust', 14, 4); stage.particles.burst(tmp, 'spark', 8, 3); audio.play('heavy', 6, 0, .6); }));
        stage.setShot([20, TOP + 6, Z + 10], [0, 40, FACE_Z - 40], 60);
      },
      explosion: () => {
        ui.flash('#fff2c8', 1); stage.shake(2.4); audio.play('defeat', 0, 0, 1);
        stage.particles.burst(face().clone(), 'steam', 200, 20); fragmentsOut(); rod.root.visible = false; heat.intensity = 1; barrels.visible = false;
        stage.setShot([-40, TOP + 30, Z + 40], [0, TOP + 20, FACE_Z], 66);
      },
      'rod-dies': () => { const f = fragments.find(f => f.nape); if (f) { stage.particles.burst(f.m.position, 'steam', 60, 6); f.m.visible = false; } stage.setShot([historia.rig.root.position.x + 6, historia.rig.root.position.y + 3, historia.rig.root.position.z + 8], [historia.rig.root.position.x, historia.rig.root.position.y, historia.rig.root.position.z], 50); },
      'kenny-tree': () => {
        fragments.forEach(f => { f.m.visible = false; }); historia.rig.root.visible = false; stage.ground = () => 0; kenny.rig.root.visible = true;
        stage.place(levi, TREE[0] - 14, TREE[1] - 4); levi.rig.root.visible = true;
        walker.bounds = { minX: -60, maxX: 60, minZ: TREE[1] - 20, maxZ: TREE[1] + 20 }; walker.lookAt(...TREE);
        stage.setShot([TREE[0] - 6, 2, TREE[1] + 6], [TREE[0], 1, TREE[1]], 48);
      },
      'kenny-dies': () => { kenny.pose = 'lie'; stage.setShot([TREE[0] - 3, 1.4, TREE[1] + 3], [TREE[0] - .8, .6, TREE[1]], 44); },
      coronation: () => {
        coronated = true; ui.setFade(1);
        stage.after(.8, () => {
          ui.setFade(0); kenny.rig.root.visible = false; historia.rig.root.visible = true; stage.place(historia, 0, 30, Math.PI); historia.pose = 'idle';
          stage.place(levi, 0, 27.5, 0); levi.pose = 'fall';
          for (let i = 0; i < 18; i++) crowd.push(ctx.cast(`crowd-${i}`, i % 3 ? 'soldier-m' : 'soldier-f', -8 + (i % 6) * 3.2, 18 - Math.floor(i / 6) * 2.4, 0, { pose: 'salute' }));
          stage.setShot([6, 2.6, 22], [0, 1.6, 29], 48);
        });
      },
    };

    function update(dt, input, control, view) {
      // Rod crawls to the wall and props his face on it.
      if (rod.root.visible) {
        crawl = Math.min(1, crawl + dt * (ctx.mission === 'orvud' ? .03 : .2)); rod.root.position.z = FACE_Z - 89 - 160 * (1 - crawl); rod.animate(stage.time);
        heat.position.copy(face()).add(new THREE.Vector3(0, 0, 10)); if (Math.random() < .5) stage.particles.burst(face().clone().add(new THREE.Vector3((Math.random() - .5) * 30, -10, 0)), 'steam', 2, 8);
      }
      if (control === 'walk') { walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line'); return null; }
      if (control === 'lock') {
        mouthT += dt; const open = mouthOpen(mouthT);
        rod.head.rotation.x = open ? -.25 : 0; erenTitan.root.visible = true; barrels.visible = !shoved; barrels.position.copy(erenTitan.root.position).add(new THREE.Vector3(0, 16, -4));
        if (input.pressed.attack && !shoved) {
          if (open) { shoved = true; barrels.visible = false; stage.particles.burst(face().clone(), 'dust', 30, 6); ui.toast('Os barris entraram!', 1.4); ctx.goals.add('barris'); }
          else { bounces++; stage.particles.burst(face().clone(), 'spark', 16, 4); ui.toast('Boca fechada: os barris batem e voltam. Espere ela abrir.', 1.6); }
        }
        return null;
      }
      if (fragments.length) {
        for (const f of fragments) { if (!f.m.visible) continue; f.v.y -= 4 * dt; f.m.position.addScaledVector(f.v, dt); f.v.multiplyScalar(Math.exp(-.6 * dt)); f.m.rotation.x += dt; if (f.m.position.y < 1) { f.m.position.y = 1; f.v.set(0, 0, 0); } }
        if (control === 'odm') {
          const r = pilot.step(dt, input), nape = fragments.find(f => f.nape);
          if (r.strike && nape.m.position.distanceTo(r.position) < r.reach + 1) { ctx.goals.add('rainha'); stage.particles.burst(nape.m.position, 'blood', 40, 5); }
          else if (r.strike) { const near = fragments.find(f => !f.nape && f.m.visible && f.m.position.distanceTo(r.position) < r.reach); if (near) { near.m.visible = false; stage.particles.burst(near.m.position, 'steam', 20, 4); ui.toast('Só pedra quente. Procure o pedaço que brilha.', 1.2); } }
        }
      }
      return null;
    }

    return {
      script: CHAPTER_28, par: 260,
      start() { stage.setShot([-30, TOP + 12, Z + 30], [0, 30, FACE_Z - 120], 62); },
      handlers, update,
      onControl(mode) {
        if (mode === 'lock') stage.setShot([70, TOP + 34, Z + 60], [0, TOP + 4, Z - 14], 58);
        if (mode === 'odm') { historia.rig.root.visible = true; levi.rig.root.visible = false; pilot.place(4, TOP + .2, Z + 2, Math.PI); pilot.yaw = Math.PI; }
      },
      markerHeight: () => (ctx.mission === 'kenny' ? 1.5 : TOP + 1),
      status() {
        if (ctx.control === 'lock') return mouthOpen(mouthT) ? 'A boca está ABERTA' : 'Boca fechada… espere';
        if (ctx.control === 'odm') { const n = fragments.find(f => f.nape); return `Gás ${Math.round(pilot.odm.player.gas)}% · Nuca a ${Math.round(n.m.position.distanceTo(pilot.odm.player.position))} m`; }
        return '';
      },
      restore(snapshot) { if (snapshot?.mission === 'barris') { shoved = false; mouthT = 0; } },
      challenges: () => (ctx.goals.has('barris') && bounces === 0 ? [ctx.data.challenges[0]] : []),
      debug: { shove() { mouthT = .2; }, nape() { const n = fragments.find(f => f.nape); pilot.place(n.m.position.x, n.m.position.y, n.m.position.z + 2); pilot.strikeNow(); } },
      snapshot: () => ({ crawl: +crawl.toFixed(2), shoved, bounces, fragments: fragments.length, coronated }),
    };
  }, { breach: false });
}
