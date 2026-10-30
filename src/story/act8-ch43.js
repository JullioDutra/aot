import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createFieldChapter } from './field-chapter.js';
import { standHeight } from '../collision.js';
import { createGunmen } from './gunmen.js';
import { castExtra } from './extras.js';
import { strikeOutcome } from './act8-rules.js';
import { CHAPTER_43 } from './act8-scripts.js';

// Chapter 43: the port of Odiha. The Yeagerists hold the docks and fire on
// the alliance. Coming at them from behind, the blade only knocks the rifle
// away; from the front it kills. Then keep them off the seaplane's hull until
// Mikasa shoots Floch at the water's edge.
const PLANE = [0, -78], ALLY = [0, 16];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio, world } = ctx;
    const concrete = toon('#8d877b'), wood = toon('#6b5038'), port = new THREE.Group(); ctx.scene.add(port); world.anchorRoots.push(port);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1000), new THREE.MeshToonMaterial({ color: '#4f7f9a' })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, .1, -560); ctx.scene.add(sea);
    const box = (m, x, y, z, w, h, d, solid = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; port.add(b); if (solid) world.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: y + h / 2 }); return b; };
    box(concrete, 0, .5, -40, 220, 1, 30, false);
    for (const x of [-40, 0, 40]) box(wood, x, .6, -80, 8, .4, 60, false);
    // The quay (top 1 m) and the piers (0.8 m) are walked on: they set the
    // ground height and the pilot lands on them, without walling walkers off.
    const decks = [{ minX: -110, maxX: 110, minZ: -55, maxZ: -25, top: 1 }, ...[-40, 0, 40].map(x => ({ minX: x - 4, maxX: x + 4, minZ: -110, maxZ: -50, top: .8 }))];
    stage.ground = (x, z) => standHeight(decks, x, z);
    [[-60, 0], [-24, 4], [24, 2], [62, -2]].forEach(([x, z]) => box(concrete, x, 7, z, 22, 14, 16));
    // The seaplane moored at the end of the middle pier.
    const plane = new THREE.Group(); plane.position.set(PLANE[0], 2, PLANE[1]); ctx.scene.add(plane);
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1, 14, 12), toon('#c9c2b0')); fuselage.rotation.x = Math.PI / 2; plane.add(fuselage);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(22, .3, 2.6), toon('#b8b0a0')); wing.position.y = 1.4; plane.add(wing);
    for (const s of [-1, 1]) { const flt = new THREE.Mesh(new THREE.BoxGeometry(1, .8, 6), toon('#8a8478')); flt.position.set(s * 4, -1.6, 0); plane.add(flt); }
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(mikasa.rig, { colliders: [...world.colliders, ...decks] }); pilot.place(ALLY[0] + 6, stage.ground(ALLY[0] + 6, ALLY[1] - 4), ALLY[1] - 4, Math.PI * .9);
    const allies = ['armin', 'jean', 'connie', 'hange'].map((id, i) => ctx.cast(id, id, ALLY[0] + i * 2, ALLY[1] + (i % 2) * 2, Math.PI));
    const gunmen = createGunmen(stage, { colliders: world.colliders });
    const posts = [[-50, -12], [-14, -18], [10, -20], [36, -14], [58, -24], [-34, -30], [20, -34]];
    const yeagerists = posts.map(([x, z], i) => { const a = ctx.cast(`yeagerist-${i}`, 'soldier-m', x, z, 0, { override: { hair: { style: i % 2 ? 'buzz' : 'short', color: '#2a2420' }, extras: ['armband'] } }); return gunmen.add(a, 2 + i * .9); });
    const floch = castExtra(ctx, 'floch', PLANE[0] + 3, PLANE[1] + 10, Math.PI); floch.rig.root.visible = false;
    const runners = [];
    let allyHits = 0, disarmed = 0, killed = 0, reached = false;
    const allyTarget = new THREE.Vector3(ALLY[0], 1.4, ALLY[1]), tmp = new THREE.Vector3();

    function neutralize(r) {
      for (const g of gunmen.list) {
        if (!g.alive) continue; g.actor.rig.root.getWorldPosition(tmp); if (tmp.distanceTo(r.position) > r.reach) continue;
        const outcome = strikeOutcome(g.actor.rig.root.rotation.y, [tmp.x, tmp.z], [r.position.x, r.position.z]);
        gunmen.kill(g); if (outcome === 'disarm') { disarmed++; g.actor.pose = 'sit'; ui.toast(`Desarmado · ${disarmed + killed}`, 1); } else { killed++; stage.particles.burst(tmp.setY(tmp.y + 1), 'blood', 30, 4); ui.toast(`Morto · ${disarmed + killed}`, 1); }
        return true;
      }
      return false;
    }

    const handlers = {
      harbor: () => { stage.setShot([ALLY[0] + 14, 6, ALLY[1] + 14], [0, 4, -40], 58); },
      floch: () => {
        floch.rig.root.visible = true; floch.pose = 'reach'; stage.place(floch, PLANE[0] + 2, PLANE[1] + 7);
        stage.after(1, () => { ui.flash('#ffffff', .5); audio.play('block', 0, 0, 1); floch.pose = 'lie'; stage.particles.burst(floch.rig.root.position.clone().setY(1), 'blood', 40, 5); });
        stage.setShot([PLANE[0] + 8, 3, PLANE[1] + 16], [PLANE[0] + 2, 1, PLANE[1] + 7], 50);
      },
    };

    function update(dt, input, control) {
      plane.position.y = 2 + Math.sin(stage.time * 1.4) * .1;
      if (control !== 'odm') { gunmen.hide(); return null; }
      const r = pilot.step(dt, input);
      if (ctx.mission === 'cais') {
        // They fire at the alliance on the quay, so their backs are open.
        const hits = gunmen.update(dt, allyTarget); if (hits) { allyHits += hits; ui.toast(`Um aliado foi atingido · ${allyHits} / 10`, 1.2); }
        if (r.strike) neutralize(r);
        if (allyHits >= 10) return 'Os Yeageristas acertaram a aliança no cais. Chegue por trás de quem está mirando.';
        if (disarmed + killed >= 5) ctx.goals.add('cais');
        return null;
      }
      if (ctx.mission === 'aviao') {
        // Yeagerists run for the hull with knives.
        if (runners.length < 4 && Math.random() < dt * .9) { const a = ctx.cast(`runner-${runners.length}`, 'soldier-m', -70 + runners.length * 45, 10, 0, { override: { extras: ['armband'] } }); stage.walkTo(a, [[PLANE[0], PLANE[1] + 8]], 4.2, 'run'); runners.push({ a, down: false }); }
        for (const run of runners) {
          if (run.down) continue; const p = run.a.rig.root.position;
          if (r.strike && p.distanceTo(r.position) < r.reach + 1) { run.down = true; run.a.path = null; const outcome = strikeOutcome(run.a.rig.root.rotation.y, [p.x, p.z], [r.position.x, r.position.z]); if (outcome === 'disarm') { disarmed++; run.a.pose = 'sit'; } else { killed++; run.a.pose = 'lie'; stage.particles.burst(p.clone().setY(1), 'blood', 30, 4); } continue; }
          if (Math.hypot(p.x - PLANE[0], p.z - PLANE[1] - 8) < 1.5) { reached = true; return 'Um Yeagerista chegou ao casco do hidroavião. Pegue quem corre pelo píer antes do fim.'; }
        }
        if (runners.length === 4 && runners.every(r => r.down)) ctx.goals.add('aviao');
      }
      return null;
    }

    return {
      script: CHAPTER_43, par: 220,
      start() { stage.setShot([ALLY[0] + 14, 6, ALLY[1] + 14], [0, 4, -40], 58); },
      handlers, update,
      markerHeight: () => 6,
      status() {
        if (ctx.control !== 'odm') return '';
        if (ctx.mission === 'cais') return `Gás ${Math.round(pilot.odm.player.gas)}% · Neutralizados ${disarmed + killed} / 5 (desarmados ${disarmed}) · Aliados atingidos ${allyHits} / 10`;
        return `Gás ${Math.round(pilot.odm.player.gas)}% · Corredores detidos ${runners.filter(r => r.down).length} / 4`;
      },
      restore(snapshot) {
        if (snapshot?.mission === 'cais') { allyHits = 0; pilot.place(ALLY[0] + 6, stage.ground(ALLY[0] + 6, ALLY[1] - 4), ALLY[1] - 4, Math.PI * .9); }
        if (snapshot?.mission === 'aviao') { runners.forEach(r => { r.a.rig.root.visible = false; }); runners.length = 0; reached = false; }
      },
      challenges: () => (ctx.goals.has('aviao') && killed === 0 ? [ctx.data.challenges[0]] : []),
      debug: {
        behind() { const g = gunmen.list.find(g => g.alive); if (!g) return; g.actor.rig.root.getWorldPosition(tmp); const y = g.actor.rig.root.rotation.y; pilot.place(tmp.x - Math.sin(y) * 1.5, tmp.y, tmp.z - Math.cos(y) * 1.5); pilot.strikeNow(); },
        runner() { const run = runners.find(r => !r.down); if (!run) return; const p = run.a.rig.root.position, y = run.a.rig.root.rotation.y; pilot.place(p.x - Math.sin(y) * 1.5, p.y, p.z - Math.cos(y) * 1.5); pilot.strikeNow(); },
      },
      snapshot: () => ({ allyHits, disarmed, killed, runners: runners.length, stopped: runners.filter(r => r.down).length, reached }),
    };
  }, { sky: '#c9d6dc', fog: [160, 900], world: { forest: false, castle: false, village: false, trees: false, ground: '#9a9080' } });
}
