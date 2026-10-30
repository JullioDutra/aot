import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createFieldChapter } from './field-chapter.js';
import { createGunmen } from './gunmen.js';
import { castExtra } from './extras.js';
import { GUN } from './act5-rules.js';
import { nestDamage } from './act7-rules.js';
import { CHAPTER_35 } from './act7-scripts.js';

// Chapter 35: Fort Slava at night. As Gabi, cross the trenches from cover to
// cover under machine-gun fire and strap grenades to the armored train's
// rails; as Porco's Jaw Titan, bite the machine-gun nests while their fire
// wears you down; then the battleship and the Beast Titan dropping from the
// airship.
const TRAIN_Z = -64, NESTS = [[-30, -30], [26, -36], [-14, -92], [34, -96], [-44, -70], [12, -120]];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio, world } = ctx;
    const sand = toon('#7a6a4a'), steel = toon('#3a3a3c'), rust = toon('#5a3a2a'), group = new THREE.Group(); ctx.scene.add(group); world.anchorRoots.push(group);
    const cover = [];
    const bags = (x, z, w, d = 1.4, h = 1.4) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sand); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; group.add(m); const c = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h }; world.colliders.push(c); cover.push(c); };
    // Zig-zag cover across no man's land toward the rails.
    [[-6, 44, 10], [8, 30, 9], [-10, 16, 10], [6, 2, 12], [-8, -12, 9], [10, -26, 10], [-6, -40, 12], [8, -52, 8]].forEach(([x, z, w]) => bags(x, z, w));
    NESTS.forEach(([x, z]) => { bags(x, z + 2, 6, 1.2, 1.6); });
    // The armored train on its rails and the battleship out at sea.
    for (const x of [-60, -40, -20, 0, 20, 40, 60]) { const car = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 4.2), steel); car.position.set(x, 3, TRAIN_Z - 3); car.castShadow = true; group.add(car); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(200, .2, 3), rust); rail.position.set(0, .1, TRAIN_Z); group.add(rail);
    const ship = new THREE.Group(); ship.position.set(40, 0, -360); ctx.scene.add(ship);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 120), steel); hull.position.y = 4; ship.add(hull);
    for (let i = 0; i < 3; i++) { const tower = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 12), steel); tower.position.set(0, 14, -30 + i * 30); ship.add(tower); const gun = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 18, 10), steel); gun.rotation.x = Math.PI / 2 - .2; gun.position.set(0, 16, -18 + i * 30); ship.add(gun); }
    const gabi = ctx.cast('gabi', 'gabi', 0, 60, Math.PI);
    const walker = ctx.useWalker(gabi, { colliders: world.colliders }); walker.lookAt(0, TRAIN_Z);
    const falco = ctx.cast('falco', 'falco', -3, 64, Math.PI);
    const magath = castExtra(ctx, 'magath', 4, 70, Math.PI);
    const gunmen = createGunmen(stage, { colliders: world.colliders });
    const nests = NESTS.map(([x, z], i) => { const a = ctx.cast(`nest-${i}`, 'soldier-m', x, z, 0, { override: { outfit: 'garrison', hair: { style: 'buzz', color: '#2a2420' } } }); return { x, z, alive: true, gun: gunmen.add(a, i * .3), actor: a }; });
    const beast = ctx.titanForm('bestial'); beast.root.visible = false; ctx.scene.add(beast.root);
    let hitsTaken = 0, health = 100, jaw = null, ruined = 0, drop = 0;
    const target = new THREE.Vector3(), tmp = new THREE.Vector3();

    const handlers = {
      trenches: () => { stage.setShot([10, 6, 76], [0, 2, 20], 58); },
      'train-blows': () => {
        gunmen.hide(); ui.flash('#ffd9a0', 1); stage.shake(1.8); audio.play('defeat', 0, 0, 1);
        group.children.filter(m => Math.abs(m.position.z - (TRAIN_Z - 3)) < .5).forEach((car, i) => { car.rotation.z = (i % 2 ? .4 : -.4); car.position.y = 2; });
        stage.particles.burst(new THREE.Vector3(0, 4, TRAIN_Z), 'dust', 120, 14); stage.particles.burst(new THREE.Vector3(0, 4, TRAIN_Z), 'spark', 60, 10);
        stage.setShot([20, 8, TRAIN_Z + 30], [0, 3, TRAIN_Z], 58);
      },
      'jaw-drops': () => {
        ui.flash('#fff7d8', 1); audio.play('transform', 0, 0, 1); gabi.rig.root.visible = false;
        jaw = ctx.useTitan([0, 30], 0, 'mandibula'); jaw.speedScale = 1.4; jaw.titan.root.rotation.y = Math.PI; jaw.yaw = 0;
        stage.particles.burst(new THREE.Vector3(0, 3, 30), 'steam', 80, 8);
      },
      battleship: () => {
        stage.after(.6, () => { ship.children.forEach(c => { if (c.geometry?.type === 'CylinderGeometry') stage.particles.burst(c.getWorldPosition(tmp), 'spark', 30, 8); }); audio.play('heavy', 0, 0, 1); });
        stage.after(1.4, () => { if (jaw) { jaw.titan.root.rotation.x = -1.3; stage.particles.burst(jaw.titan.root.position.clone().setY(3), 'blood', 60, 6); } });
        stage.setShot([60, 20, -260], [40, 8, -360], 58);
      },
      'beast-drops': () => {
        beast.root.visible = true; beast.root.position.set(40, 160, -360); drop = .001;
        stage.setShot([90, 30, -300], [40, 40, -360], 62);
      },
    };

    function update(dt, input, control, view) {
      if (beast.root.visible) beast.animate(stage.time);
      if (drop > 0) {
        drop += dt; beast.root.position.y = Math.max(10, 160 - drop * drop * 30);
        if (beast.root.position.y === 10 && drop < 9) { drop = 9; ui.flash('#fff2c8', 1); stage.shake(2); ship.rotation.z = .3; ship.position.y = -4; stage.particles.burst(new THREE.Vector3(40, 10, -360), 'steam', 140, 16); stage.particles.burst(new THREE.Vector3(40, 10, -360), 'spark', 80, 12); }
        return null;
      }
      if (control === 'walk') {
        walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
        target.copy(gabi.rig.root.position).setY(1.1);
        const hits = gunmen.update(dt, target);
        if (hits) { hitsTaken += hits; health -= hits * GUN.damage; ui.flash('#6a0909', .7); stage.particles.burst(target, 'blood', 20, 3); ui.toast(`Atingida! Corpo ${Math.max(0, health)}%`, 1.2); }
        if (health <= 0) return 'As metralhadoras pegaram Gabi em campo aberto. Espere a linha vermelha passar atrás dos sacos de areia.';
        return null;
      }
      gunmen.hide();
      if (control === 'titan' && jaw) {
        const r = jaw.step(dt, input, true), P = jaw.titan.root.position;
        health -= nestDamage(nests, [P.x, P.z], dt, r.moved);
        if (r.punch) for (const n of nests) if (n.alive && Math.hypot(n.x - P.x, n.z - P.z) < 9) { n.alive = false; gunmen.kill(n.gun); ruined++; stage.particles.burst(new THREE.Vector3(n.x, 1, n.z), 'blood', 40, 5); stage.particles.burst(new THREE.Vector3(n.x, 1, n.z), 'dust', 30, 5); ui.toast(`Ninho destruído · ${ruined} / 4`, 1.2); break; }
        if (Math.random() < dt * 3) { const n = nests.find(n => n.alive && Math.hypot(n.x - P.x, n.z - P.z) < 60); if (n) stage.particles.burst(new THREE.Vector3(n.x, 1.6, n.z), 'spark', 4, 3); }
        if (health <= 0) return 'As metralhadoras derrubaram o Mandíbula. Continue andando e morda um ninho de cada vez.';
        if (ruined >= 4) ctx.goals.add('mandibula');
      }
      return null;
    }

    return {
      script: CHAPTER_35, par: 220,
      start() { stage.setShot([10, 6, 76], [0, 2, 20], 58); },
      handlers, update,
      onControl(mode) { if (mode === 'titan') health = 100; },
      markerHeight: () => 1.6,
      status() {
        if (ctx.control === 'walk') return `Corpo ${Math.max(0, health)}% · Mirando em você: ${gunmen.list.filter(g => g.state.phase === 'aim').length}`;
        if (ctx.control === 'titan') return `Corpo ${Math.max(0, Math.round(health))}% · Ninhos ${ruined} / 4`;
        return '';
      },
      restore(snapshot) {
        health = 100;
        if (snapshot?.mission === 'gabi') stage.place(gabi, 0, 60);
        if (snapshot?.mission === 'mandibula' && jaw) jaw.place(0, 30);
      },
      challenges: () => (hitsTaken === 0 && ctx.goals.has('mandibula') ? [ctx.data.challenges[0]] : []),
      debug: { bite() { const n = nests.find(n => n.alive); if (n && jaw) { jaw.place(n.x, n.z + 6); jaw.punchQueued = true; } }, exposed() { stage.place(gabi, 0, -20); } },
      snapshot: () => ({ hitsTaken, health: Math.round(health), ruined, drop: drop > 0 }),
    };
  }, { sky: '#2a2124', fog: [50, 420], light: ['#ffb27a', 1.2], hemi: ['#a07a6a', '#2a2020', 1], world: { forest: false, castle: false, village: false, trees: false, ground: '#5a4c3a' } });
}
