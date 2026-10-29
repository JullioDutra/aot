import * as THREE from 'three';
import { toon } from '../character-model.js';
import { strideTitan } from './kit.js';
import { createTrostChapter, odmCombat } from './trost-chapter.js';
import { CHAPTER_8 } from './trost-scripts.js';

// Chapter 8: Mikasa at the jammed inner gate, the night in the mountain cabin
// and her charge across the rooftops until the gas runs out.
const CABIN = [-520, 0];
const ALLEY = [5, 112];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, horde, ui, audio, TROST } = ctx;
    const mikasa = ctx.cast('mikasa', 'mikasa', 12, 120, Math.PI, { override: { outfit: 'training' } });
    const armin = ctx.cast('armin', 'armin', -20, 60, 0, { override: { outfit: 'training' } });
    const pilot = ctx.usePilot(mikasa.rig);
    // Inner gate: the merchant's cart blocks the passage and the crowd presses.
    const cart = new THREE.Group(); cart.position.set(0, 0, 188); ctx.scene.add(cart);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 4), toon('#7a5638')); crate.position.y = 2; crate.castShadow = true; cart.add(crate);
    for (const s of [-1, 1]) for (const z of [-1.5, 1.5]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .3, 12), toon('#4a3020')); wheel.rotation.z = Math.PI / 2; wheel.position.set(s * 3.6, 1, z); cart.add(wheel); }
    const merchant = ctx.cast('mercador', 'civilian-m', 4, 184, Math.PI, { override: { build: 'broad', hair: { style: 'short', color: '#6b5a48' } } });
    const crowd = [];
    for (let i = 0; i < 22; i++) crowd.push(ctx.cast(`civil-${i}`, i % 2 ? 'civilian-f' : 'civilian-m', -7 + (i % 6) * 2.6, 172 - Math.floor(i / 6) * 2.4, 0, { pose: 'reach' }));
    const girl = ctx.cast('menina', 'civilian-f', -2, 176, 0, { override: { height: 1.25, age: 'child', outfit: 'child-dress' } });
    const abnormal = horde.spawn('anormal', 0, 40, { kind: 'idle', height: 14, id: 'anormal-portao' });

    // Flashback cabin far from the city.
    const cabin = new THREE.Group(); cabin.position.set(CABIN[0], 0, CABIN[1]); ctx.scene.add(cabin);
    const woodIn = new THREE.MeshToonMaterial({ color: '#6b4c33', side: THREE.DoubleSide });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, .2, 12), toon('#5d4330')); floor.position.y = -.1; cabin.add(floor);
    for (const [x, z, w, d] of [[0, -6, 16, .3], [0, 6, 16, .3], [-8, 0, .3, 12], [8, 0, .3, 12]]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), woodIn); wall.position.set(x, 2, z); wall.castShadow = true; cabin.add(wall); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(16, .3, 12), woodIn); roof.position.y = 4.1; roof.castShadow = true; cabin.add(roof);
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, .9, 1.2), toon('#4e3524')); table.position.set(-3, .45, -2); cabin.add(table);
    const lamp = new THREE.PointLight('#ffb05a', 22, 16); lamp.position.set(-2, 3.2, 0); cabin.add(lamp);
    const knife = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, .35), toon('#c9c9c9')); knife.position.set(CABIN[0] + 8 - .4, .05, 3); ctx.scene.add(knife);
    const child = ctx.cast('mikasa-crianca', 'mikasa-child', CABIN[0] - 2, -1, Math.PI / 2);
    const mother = ctx.cast('mae', 'civilian-f', CABIN[0] - 3.5, -1.2, Math.PI / 2, { override: { hair: { style: 'bob', color: '#141317' }, face: { eyes: 'calm', iris: '#4a4a55' } } });
    const father = ctx.cast('pai', 'civilian-m', CABIN[0] + 1, -3, 0, { override: { hair: { style: 'short', color: '#3a2a20' } } });
    const traffickers = [0, 1, 2].map(i => ctx.cast(`traficante-${i}`, 'civilian-m', CABIN[0] + 12 + i * 1.5, 1 + i, -Math.PI / 2, { override: { outfit: 'civilian-coat', build: 'broad', hair: { style: i ? 'buzz' : 'spiky', color: '#2b2622' }, face: { marks: ['stubble'] } } }));
    const erenChild = ctx.cast('eren-crianca', 'eren-child', CABIN[0] + 14, 0, -Math.PI / 2);
    const flashback = [child, mother, father, ...traffickers, erenChild];
    stage.show(flashback, false);

    let charge = null, lute = 0, swings = 0, killsAtLute = 0, gasAtEnd = null, strangling = 0, tmp = new THREE.Vector3();
    const handlers = {
      'gate-queue': () => { stage.setShot([14, 6, 160], [0, 3, 186], 52); merchant.pose = 'reach'; },
      merchant: () => {
        pilot.odm.releaseAll(); stage.place(mikasa, 2, 181, 0); mikasa.rig.root.position.y = 0; stage.face(mikasa, merchant.rig.root.position.x, merchant.rig.root.position.z); stage.face(merchant, 2, 181); mikasa.pose = 'idle';
        stage.setShot([-2, 2.2, 179], [3.5, 1.6, 183], 46);
        stage.after(3, () => { stage.walkTo(merchant, [[8, 196]], 2, 'walk'); cart.position.z = 194; crowd.forEach((c, i) => stage.walkTo(c, [[c.rig.root.position.x * .5, 199]], 2.4 + (i % 3) * .3, 'run')); });
      },
      flashback: () => {
        ui.setFade(1); stage.after(.8, () => {
          stage.show(flashback, true); stage.show([erenChild, ...traffickers], false); stage.focusLight(CABIN[0], CABIN[1]);
          ctx.scene.background.set('#4a3a2c'); ctx.scene.fog.near = 20; ctx.scene.fog.far = 90;
          mother.pose = 'bench'; mother.rig.root.position.y = .45; child.pose = 'idle';
          stage.setShot([CABIN[0] - 7, 2.2, 4], [CABIN[0] - 2.6, 1, -1], 50); ui.setFade(0);
        });
      },
      traffickers: () => {
        stage.show(traffickers, true); traffickers.forEach(t => { stage.place(t, CABIN[0] + 7, 2.5); });
        stage.walkTo(traffickers[0], [[CABIN[0] + 2, -2.2]], 3, 'run');
        stage.after(.7, () => { tmp.set(CABIN[0] + 1, 1.3, -3); stage.particles.burst(tmp, 'blood', 50, 4); father.pose = 'manual'; father.rig.root.rotation.set(-Math.PI / 2, 0, 0); father.rig.root.position.y = .25; audio.play('punch', 2, 0, 1); });
        stage.after(1.4, () => { tmp.set(CABIN[0] - 3.5, 1.2, -1.2); stage.particles.burst(tmp, 'blood', 60, 4); mother.pose = 'manual'; mother.rig.root.rotation.set(-Math.PI / 2, 0, .3); mother.rig.root.position.y = .25; ui.flash('#4e0404', .6); audio.play('punch', 1, 0, 1); });
        stage.setShot([CABIN[0] - 6, 2, 3], [CABIN[0] - 1, 1, -2], 52);
      },
      'eren-arrives': () => {
        // Months later, in the traffickers' hut: Eren kills two of them; the third strangles him.
        stage.show([father, mother], false); stage.show([erenChild], true);
        stage.place(child, CABIN[0] + 5, -3, -Math.PI / 2); child.pose = 'grief';
        stage.place(traffickers[0], CABIN[0] + 2, 0); stage.place(traffickers[1], CABIN[0] + 3, 2);
        stage.place(erenChild, CABIN[0] + 7, 0, -Math.PI / 2);
        stage.after(.5, () => { stage.particles.burst(new THREE.Vector3(CABIN[0] + 2, 1.3, 0), 'blood', 40, 4); traffickers[0].pose = 'manual'; traffickers[0].rig.root.rotation.set(-Math.PI / 2, 0, 0); traffickers[0].rig.root.position.y = .25; });
        stage.after(1.1, () => { stage.particles.burst(new THREE.Vector3(CABIN[0] + 3, 1.3, 2), 'blood', 40, 4); traffickers[1].pose = 'manual'; traffickers[1].rig.root.rotation.set(-Math.PI / 2, 0, 1); traffickers[1].rig.root.position.y = .25; });
        stage.after(1.6, () => { stage.place(traffickers[2], CABIN[0] + 6.4, .4, -Math.PI / 2); traffickers[2].pose = 'reach'; strangling = 1; });
        stage.setShot([CABIN[0] + 2, 2.2, 5], [CABIN[0] + 5, 1, 0], 52);
      },
      'mikasa-awakens': () => {
        strangling = 0; knife.visible = false; ui.flash('#ffffff', .4); audio.play('punch', 1, 0, 1);
        stage.particles.burst(traffickers[2].rig.root.position.clone().setY(1.2), 'blood', 70, 5); traffickers[2].pose = 'manual'; traffickers[2].rig.root.rotation.set(-Math.PI / 2, 0, 0); traffickers[2].rig.root.position.y = .25;
        stage.place(erenChild, CABIN[0] + 4.4, 2, Math.PI); erenChild.pose = 'idle'; stage.face(child, erenChild.rig.root.position.x, erenChild.rig.root.position.z); child.pose = 'idle';
        stage.setShot([CABIN[0] + 2.4, 1.5, 4.5], [CABIN[0] + 4, 1, 2], 44);
      },
      'present-day': () => {
        ui.setFade(1); stage.after(.7, () => {
          stage.show(flashback, false); ctx.scene.background.set('#c8d3d4'); ctx.scene.fog.near = 180; ctx.scene.fog.far = 640;
          pilot.place(-18, world.roofAt(-18, 64) + .1, 64, Math.PI); ctx.onRoof(armin, -20, 60, 0); armin.pose = 'grief';
          for (const [id, x, z, h] of [['nariz', 20, 110, 7], ['gordo', -30, 120, 8], ['cabeludo', 40, 80, 10], ['barbudo', -10, 140, 11], ['pequeno', 26, 140, 4], ['nariz', -40, 90, 7], ['gordo', 50, 130, 8], ['cabeludo', 0, 100, 10]]) horde.spawn(id, x, z, { height: h, sight: 50 });
          stage.setShot([-14, world.roofAt(-18, 64) + 3, 58], [-19, world.roofAt(-20, 60) + 1, 61], 50); ui.setFade(0);
        });
      },
      'gas-out': () => {
        gasAtEnd = pilot.odm.player.gas; pilot.odm.releaseAll(); pilot.odm.player.gas = 0;
        stage.place(mikasa, ALLEY[0], ALLEY[1], Math.PI); mikasa.rig.root.position.y = 0; mikasa.pose = 'grief';
        stage.particles.burst(new THREE.Vector3(ALLEY[0], .5, ALLEY[1]), 'dust', 20, 3); audio.play('heavy', 2, 0, .8);
        stage.setShot([ALLEY[0] + 4, 2, ALLEY[1] - 5], [ALLEY[0], 1, ALLEY[1]], 50);
      },
      'titan-approaches': () => {
        const t = horde.spawn('cabeludo', ALLEY[0], ALLEY[1] - 26, { kind: 'idle', height: 10, id: 'beco' }); t.route = [[ALLEY[0], ALLEY[1] - 8]]; t.kind = 'route';
        charge = t; stage.setShot([ALLEY[0] - 3, 1.4, ALLEY[1] + 4], [ALLEY[0], 7, ALLEY[1] - 14], 58);
      },
      'unknown-punch': () => {
        const eren = ctx.titanForm('ataque'); eren.root.position.set(ALLEY[0] - 3, 0, ALLEY[1] - 17); eren.root.rotation.y = 0; ctx.scene.add(eren.root);
        eren.arms[1].rotation.x = -1.6; stage.after(.6, () => { if (charge) { horde.kill(charge); charge.titan.head.visible = false; } stage.shake(1.4); audio.play('heavy', 2, 0, 1); });
        stage.setShot([ALLEY[0] + 3, 1.4, ALLEY[1] + 6], [ALLEY[0] - 2, 9, ALLEY[1] - 12], 62);
        ctx.unknown = eren;
      },
    };

    function update(dt, input, control, view) {
      if (strangling) { traffickers[2].rig.hands[0].getWorldPosition(tmp); erenChild.rig.root.position.set(tmp.x - .3, Math.max(0, tmp.y - 1.3), tmp.z); erenChild.pose = 'reach'; }
      if (ctx.unknown) ctx.unknown.animate(stage.time);
      if (charge?.route?.length && charge.alive) { charge.phase += dt * 3; if (strideTitan(charge.titan, charge.route[0], 2.4, dt, charge.phase)) charge.route.shift(); }
      if (control === 'walk') { ctx.walker.step(dt, input, 'walk', view.kind === 'line'); return null; }
      if (control !== 'odm') { horde.update(dt, { prey: [], freeze: true }); return null; }
      if (ctx.mission === 'portao') {
        // The abnormal sprints up the avenue toward the queue.
        const t = abnormal.titan; if (abnormal.alive) { abnormal.phase += dt * 10; strideTitan(t, [0, 175], 7.5, dt, abnormal.phase); t.chest.rotation.x = .5; }
        const r = odmCombat(ctx, dt, input, {});
        if (r.fail) return r.fail;
        if (!abnormal.alive) ctx.goals.add('portao');
        else if (t.root.position.z > 165) return 'O anormal alcançou a fila do portão. Corte a nuca antes que ele chegue lá: ele não para para olhar você.';
        return null;
      }
      if (ctx.mission === 'lute') {
        lute += dt; pilot.gasRate = 2.6;
        const r = odmCombat(ctx, dt, input, { grabMessage: 'Um titã agarrou Mikasa. Sem gás para fugir, cada corte precisa contar.' });
        if (r.fail) return r.fail;
        if (r.strike) swings++;
        if (horde.list.filter(t => !t.alive && t !== abnormal).length - killsAtLute >= 5 || pilot.odm.player.gas <= 0) ctx.goals.add('lute');
        return null;
      }
      return null;
    }

    return {
      script: CHAPTER_8, par: 300,
      start() { pilot.place(12, world.roofAt(12, 120) + .1, 120, 0); stage.setShot([14, 6, 160], [0, 3, 186], 52); },
      onControl(mode) {
        if (mode === 'walk') { ctx.useWalker(child, { bounds: { minX: CABIN[0] - 7.5, maxX: CABIN[0] + 7.5, minZ: -5.5, maxZ: 5.5 }, distance: 3 }); ctx.walker.lookAt(knife.position.x, knife.position.z); child.pose = 'idle'; }
        if (mode === 'odm' && ctx.mission === 'lute') { killsAtLute = horde.list.filter(t => !t.alive && t !== abnormal).length; swings = 0; }
      },
      handlers, update,
      status: () => (ctx.control === 'odm' ? `Gás ${Math.round(pilot.odm.player.gas)}%${ctx.mission === 'portao' ? ` · Anormal a ${Math.max(0, Math.round(165 - abnormal.titan.root.position.z))} m da fila` : ` · Titãs ${horde.list.filter(t => !t.alive && t !== abnormal).length - killsAtLute} / 5`}` : ''),
      onEvent(event) { if (event.kind === 'interact') { knife.position.copy(child.rig.root.position).setY(.9); } },
      onGoal(id) { if (id === 'portao' && abnormal.alive) horde.kill(abnormal); },
      restore(snapshot) {
        if (snapshot?.mission === 'portao') { horde.reset(abnormal, 0, 40); pilot.place(12, world.roofAt(12, 120) + .1, 120, 0); }
        if (snapshot?.mission === 'lute') { pilot.place(-18, world.roofAt(-18, 64) + .1, 64, Math.PI); pilot.odm.player.gas = 100; for (const t of horde.list) if (t !== abnormal && !t.alive) horde.reset(t); killsAtLute = 0; }
      },
      challenges() {
        const done = [];
        if (swings && swings <= 5 && ctx.goals.has('lute')) done.push(ctx.data.challenges[0]);
        if (gasAtEnd !== null && gasAtEnd > 10) done.push(ctx.data.challenges[1]);
        return done;
      },
      debug: { abnormal() { horde.nape(abnormal, tmp); pilot.place(tmp.x, tmp.y, tmp.z - 2); pilot.strikeNow(); } },
      snapshot: () => ({ abnormalAlive: abnormal.alive, abnormalZ: +abnormal.titan.root.position.z.toFixed(1), swings, gasAtEnd, unknown: !!ctx.unknown }),
    };
  });
}
