import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTrostChapter } from './trost-chapter.js';
import { createGunmen } from './gunmen.js';
import { GUN } from './act5-rules.js';
import { CHAPTER_25 } from './act5-scripts.js';

// Chapter 25: hunted in the city. Kenny walks into the bar; Levi leaves by the
// back door a moment before the shotgun blast, then flees over the roofs
// while the anti-personnel squad aims: a red line warns of each shot and a
// building in the way blocks it.
const BAR = [0, 120], WAGON = [0, -40];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio } = ctx;
    // The bar: four walls with a front and a back door on the avenue.
    const wood = toon('#6b4a32'), plaster = toon('#d9ccb0'), room = new THREE.Group(); ctx.scene.add(room);
    const walls = [];
    const wall = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), plaster); m.position.set(BAR[0] + x, 2, BAR[1] + z); m.castShadow = m.receiveShadow = true; room.add(m); walls.push({ minX: BAR[0] + x - w / 2, maxX: BAR[0] + x + w / 2, minZ: BAR[1] + z - d / 2, maxZ: BAR[1] + z + d / 2, top: 4 }); };
    wall(-5, 0, .4, 12); wall(5, 0, .4, 12); wall(-3.2, -6, 3.6, .4); wall(3.2, -6, 3.6, .4); wall(-3, 6, 4, .4); wall(3, 6, 4, .4);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.4, .3, 12.4), wood); roof.position.set(BAR[0], 4.1, BAR[1]); room.add(roof);
    for (const [x, z] of [[-2.5, -2], [2.5, -2], [-2.5, 2.4], [2.5, 2.4]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.6, .9, 1.2), wood); t.position.set(BAR[0] + x, .45, BAR[1] + z); room.add(t); walls.push({ minX: BAR[0] + x - .8, maxX: BAR[0] + x + .8, minZ: BAR[1] + z - .6, maxZ: BAR[1] + z + .6, top: .9 }); }
    // The bar blocks cables, flight and shots like any other building.
    world.colliders.push(...walls); world.anchorRoots.push(room);
    const levi = ctx.cast('levi', 'levi', BAR[0] + 1.2, BAR[1] - 1, Math.PI, { blades: true, pose: 'bench' });
    const barman = ctx.cast('barman', 'civilian-m', BAR[0] - 3.6, BAR[1] + 3.6, Math.PI / 2);
    const kenny = ctx.cast('kenny', 'civilian-m', BAR[0], BAR[1] - 12, 0, { override: { outfit: 'commander', height: 1.92, hair: { style: 'long', color: '#2a2420' }, face: { marks: ['stubble'], eyes: 'narrow', brows: 'flat' }, extras: [] } });
    const walker = ctx.useWalker(levi, { colliders: walls, bounds: { minX: BAR[0] - 4.6, maxX: BAR[0] + 4.6, minZ: BAR[1] - 5.6, maxZ: BAR[1] + 7 } });
    const pilot = ctx.usePilot(levi.rig); pilot.gasRate = .7;
    // Squad posted on roofs along the escape route.
    const gunmen = createGunmen(stage, { colliders: world.colliders });
    const posts = world.buildings.filter(b => Math.abs(b.x) < 60 && b.z < 100 && b.z > -30).sort((a, b) => b.z - a.z).filter((_, i) => i % 3 === 0).slice(0, 9);
    posts.forEach((b, i) => { const a = ctx.cast(`squad-${i}`, 'soldier-m', b.x, b.z, 0, { override: { outfit: 'commander', hair: { style: 'short', color: '#1d1a18' } }, y: b.h, blades: true }); a.rig.root.visible = false; gunmen.add(a, i * .37); });
    let health = 100, hitsTaken = 0, out = false;
    const target = new THREE.Vector3(), tmp = new THREE.Vector3();

    const handlers = {
      bar: () => { stage.setShot([BAR[0] + 3, 2.4, BAR[1] - 4.5], [BAR[0], 1.4, BAR[1]], 50); },
      'kenny-enters': () => { stage.walkTo(kenny, [[BAR[0], BAR[1] - 6.5]], 1.6); stage.setShot([BAR[0] - 3, 2.2, BAR[1] + 2], [BAR[0], 1.6, BAR[1] - 6], 50); levi.pose = 'idle'; },
      blast: () => {
        out = true; kenny.pose = 'punch'; tmp.set(BAR[0], 1.3, BAR[1] - 2); stage.particles.burst(tmp, 'spark', 40, 6); stage.particles.burst(tmp, 'dust', 40, 6); stage.shake(1); audio.play('heavy', 0, 0, 1); ui.flash('#fff2d0', .6);
        barman.pose = 'lie'; stage.particles.burst(barman.rig.root.position.clone().setY(1), 'blood', 30, 4);
        room.visible = true; stage.setShot([BAR[0] + 6, 3, BAR[1] + 14], [BAR[0], 2, BAR[1] + 6], 55);
      },
      wagon: () => { stage.setShot([WAGON[0] + 8, 4, WAGON[1] + 10], [WAGON[0], 1.5, WAGON[1]], 52); },
    };

    function update(dt, input, control, view) {
      if (control === 'walk') { walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line'); return null; }
      if (control === 'odm') {
        const r = pilot.step(dt, input);
        target.copy(r.position).setY(r.position.y + 1);
        const hits = gunmen.update(dt, target);
        if (hits) { health -= hits * GUN.damage; hitsTaken += hits; ui.flash('#6a0909', .7); stage.particles.burst(target, 'blood', 24, 4); ui.toast(`Atingido! Corpo ${Math.max(0, health)}%`, 1.4); }
        if (health <= 0) return 'As escopetas pegaram Levi em campo aberto. Quando a linha vermelha aparecer, ponha um prédio no meio.';
        if (Math.hypot(r.position.x - WAGON[0], r.position.z - WAGON[1]) < 10) ctx.goals.add('telhados');
        return null;
      }
      gunmen.hide();
      return null;
    }

    return {
      script: CHAPTER_25, par: 160,
      start() { stage.setShot([BAR[0] + 3, 2.4, BAR[1] - 4.5], [BAR[0], 1.4, BAR[1]], 50); },
      handlers, update,
      onControl(mode) {
        if (mode === 'odm') { gunmen.list.forEach(g => { g.actor.rig.root.visible = true; }); pilot.place(BAR[0], 0, BAR[1] + 9, 0); }
      },
      markerHeight: () => (ctx.control === 'odm' ? 6 : 1.4),
      status: () => (ctx.control === 'odm' ? `Gás ${Math.round(pilot.odm.player.gas)}% · Corpo ${Math.max(0, health)}% · Mirando: ${gunmen.list.filter(g => g.state.phase === 'aim').length}` : ''),
      restore(snapshot) { if (snapshot?.mission === 'telhados') { health = 100; pilot.place(BAR[0], 0, BAR[1] + 9, 0); } },
      challenges: () => (ctx.goals.has('telhados') && hitsTaken === 0 ? [ctx.data.challenges[0]] : []),
      debug: { exposed() { const g = gunmen.list[0]; g.actor.rig.root.getWorldPosition(tmp); pilot.place(tmp.x + 3, tmp.y + 1, tmp.z + 3); } },
      snapshot: () => ({ health, hitsTaken, out, aiming: gunmen.list.filter(g => g.state.phase === 'aim').length, shots: gunmen.list.reduce((n, g) => n + g.state.shots, 0) }),
    };
  }, { breach: false });
}
