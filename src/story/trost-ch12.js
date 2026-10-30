import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTransformationFx } from '../transformation-fx.js';
import { carrySpeed } from './story-rules.js';
import { strideTitan } from './kit.js';
import { createTrostChapter, odmCombat } from './trost-chapter.js';
import { CHAPTER_12 } from './trost-final-scripts.js';

// Chapter 12: Pyxis's plan, Eren losing control and attacking Mikasa, Armin
// waking him with the blade, the boulder carried to the gate while the elite
// squads die to protect him, Levi's arrival and the military tribunal.
const TOP = 51.4;
const COURT = [520, 0];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, horde, ui, audio, TROST } = ctx;
    const [BX, BZ] = TROST.boulder;
    const GATE = new THREE.Vector3(0, 0, TROST.wallZ + 14);
    const fx = createTransformationFx(ctx.scene, { height: 15, duration: 2.4 }); let fxAt = null;
    const outfit = { outfit: 'training' };
    const pixis = ctx.cast('pixis', 'pixis', -40, TROST.wallZ + 2, 0, { y: TOP });
    const eren = ctx.cast('eren', 'eren', -42, TROST.wallZ + 2.5, 0, { override: outfit, y: TOP });
    const mikasa = ctx.cast('mikasa', 'mikasa', -44, TROST.wallZ + 3, 0, { override: outfit, y: TOP });
    const armin = ctx.cast('armin', 'armin', -38, TROST.wallZ + 3, 0, { override: outfit, y: TOP });
    const elite = [
      ctx.cast('ian', 'soldier-m', -36, TROST.wallZ + 3, 0, { override: { outfit: 'garrison', hair: { style: 'ponytail-low', color: '#4a3424' } }, y: TOP }),
      ctx.cast('rico', 'soldier-f', -34, TROST.wallZ + 3, 0, { override: { outfit: 'garrison', hair: { style: 'bob', color: '#e8e6e0' }, extras: ['glasses'] }, y: TOP }),
      ctx.cast('mitabi', 'soldier-m', -32, TROST.wallZ + 3, 0, { override: { outfit: 'garrison', build: 'broad', hair: { style: 'buzz', color: '#2a2420' } }, y: TOP }),
    ];
    const [ian, rico, mitabi] = elite;
    const soldiers = [];
    for (let i = 0; i < 16; i++) soldiers.push(ctx.cast(`soldado-${i}`, i % 3 ? 'soldier-m' : 'soldier-f', -60 + (i % 8) * 5, TROST.wallZ + 30 + Math.floor(i / 8) * 5, Math.PI, { override: { outfit: 'garrison' } }));
    const pilot = ctx.usePilot(mikasa.rig);
    const titan = ctx.useTitan([BX + 12, BZ + 6], 0); titan.titan.root.visible = false;
    // Two titans kept off stage for the elite soldiers' deaths.
    const killers = [0, 1].map(i => { const t = horde.spawn(i ? 'gordo' : 'barbudo', 0, 0, { height: 9 + i, kind: 'idle', id: `elite-${i}` }); t.titan.root.visible = false; return t; });
    for (let i = 0; i < 6; i++) horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno', 'nariz'][i], -90 + i * 30, TROST.wallZ + 40 + (i % 2) * 30, { height: 6 + (i * 2) % 7, kind: 'idle', id: `pedra-${i}` });

    // Tribunal: a hall with the judge's bench and the post Eren is chained to.
    const court = new THREE.Group(); court.position.set(COURT[0], 0, COURT[1]); ctx.scene.add(court);
    const hall = new THREE.MeshToonMaterial({ color: '#6d5a44', side: THREE.DoubleSide });
    const add = (geo, m, x, y, z) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; court.add(mesh); return mesh; };
    add(new THREE.BoxGeometry(30, .2, 24), toon('#5e4c3a'), 0, -.1, 0);
    for (const [x, z, w, d] of [[0, -12, 30, .4], [0, 12, 30, .4], [-15, 0, .4, 24], [15, 0, .4, 24]]) add(new THREE.BoxGeometry(w, 10, d), hall, x, 5, z);
    add(new THREE.BoxGeometry(30, .4, 24), hall, 0, 10, 0);
    add(new THREE.BoxGeometry(6, 2.6, 1.6), toon('#4a3020'), 0, 1.3, -9); add(new THREE.BoxGeometry(.3, 2.2, .3), toon('#3d3a36'), 0, 1.1, -1);
    for (let i = 0; i < 4; i++) { const lamp = new THREE.PointLight('#ffc27e', 24, 20); lamp.position.set(-10 + i * 7, 7, 0); court.add(lamp); }
    const zackly = ctx.cast('zackly', 'civilian-m', COURT[0], -9.5, 0, { override: { outfit: 'commander', hair: { style: 'buzz', color: '#d6d2c8' }, face: { marks: ['stubble'] } }, y: 1.4 });
    const nile = ctx.cast('nile', 'soldier-m', COURT[0] + 7, -3, -Math.PI / 2, { override: { outfit: 'commander', hair: { style: 'sidepart', color: '#2b2622' }, face: { marks: ['stubble'] } } });
    const levi = ctx.cast('levi', 'levi', COURT[0] - 6, -2, Math.PI / 2, { blades: true });
    const erwin = ctx.cast('erwin', 'erwin', COURT[0] - 8, -3.4, Math.PI / 2);
    const courtCast = [zackly, nile, levi, erwin]; stage.show(courtCast, false);
    const flare = new THREE.Mesh(new THREE.SphereGeometry(.6, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd94a' })); flare.visible = false; ctx.scene.add(flare);
    const redFlare = new THREE.Mesh(new THREE.SphereGeometry(.6, 10, 8), new THREE.MeshBasicMaterial({ color: '#e0402c' })); redFlare.visible = false; ctx.scene.add(redFlare);

    let eliteKills = 0, rage = 0, punchClock = 0, punchAt = null, dodge = 0, slumped = 0, fatigue = 0, escortActive = false, walkPath = null, sealed = false, kicks = 0, ianDone = false, mitabiDone = false, reachedEren = false;
    const tmp = new THREE.Vector3();
    const T = () => titan.titan;
    function grabSoldier(a, killer, message) {
      killer.titan.root.visible = true; killer.titan.root.position.set(a.rig.root.position.x + 4, 0, a.rig.root.position.z + 2); killer.titan.arms[1].rotation.x = -1.8;
      stage.after(.6, () => { killer.titan.hands[1].getWorldPosition(tmp); a.rig.root.position.copy(tmp); a.pose = 'reach'; });
      stage.after(1.5, () => { killer.titan.head.getWorldPosition(tmp); a.rig.root.position.copy(tmp); stage.particles.burst(tmp, 'blood', 80, 6); audio.play('punch', 3, 0, 1); ui.flash('#4e0404', .5); stage.shake(.6); });
      stage.after(1.8, () => { a.rig.root.visible = false; if (message) ui.toast(message, 2.4); });
      stage.setShot([a.rig.root.position.x + 10, 8, a.rig.root.position.z + 12], [a.rig.root.position.x + 2, 5, a.rig.root.position.z], 56);
    }

    const handlers = {
      'pixis-wall': () => { stage.setShot([-35, TOP + 2.6, TROST.wallZ + 9], [-40, TOP + 1.4, TROST.wallZ + 2.4], 50); pixis.pose = 'salute'; soldiers.forEach(s => { s.pose = 'idle'; }); },
      'eren-transforms': () => {
        stage.place(eren, BX + 12, BZ + 6); eren.rig.root.position.y = 0;
        stage.setShot([BX + 40, 14, BZ + 40], [BX + 12, 8, BZ + 6], 58);
        stage.after(.4, () => { fx.start(new THREE.Vector3(BX + 12, 0, BZ + 6), 850); fxAt = stage.time; ui.flash('#fff6dd', .9); audio.play('transform', 4, 0, 1); stage.shake(1.4); });
        stage.after(1.2, () => { eren.rig.root.visible = false; T().root.visible = true; stage.particles.burst(new THREE.Vector3(BX + 12, 8, BZ + 6), 'steam', 60, 8); });
        stage.show([pixis, armin, ...elite], false);
      },
      'eren-loses-control': () => {
        rage = .001; stage.show([armin, ...elite], true); elite.forEach((a, i) => { ctx.onRoof(a, BX + 30 + i * 3, BZ + 26); a.pose = 'idle'; }); ctx.onRoof(armin, BX + 26, BZ + 30);
        pilot.place(BX + 4, 14, BZ + 22, Math.PI); mikasa.rig.root.visible = true; stage.setShot([BX + 20, 16, BZ + 34], [BX + 10, 9, BZ + 10], 58);
      },
      'titan-slumps': () => {
        rage = 0; slumped = .001; pilot.odm.releaseAll(); stage.place(mikasa, BX + 6, BZ + 16); mikasa.rig.root.position.y = 0; mikasa.pose = 'idle';
        redFlare.visible = true; redFlare.position.set(BX + 30, 14, BZ + 26);
        stage.setShot([BX + 20, 6, BZ + 22], [BX + 10, 6, BZ + 6], 55);
      },
      'armin-stabs': () => { T().nape.getWorldPosition(tmp); armin.rig.root.position.copy(tmp).add(new THREE.Vector3(0, .4, -.6)); armin.pose = 'strike'; stage.particles.burst(tmp, 'blood', 30, 3); stage.particles.burst(tmp, 'steam', 20, 3); audio.play('punch', 1, 0, .9); stage.setShot([tmp.x + 3, tmp.y + 1.6, tmp.z - 3], [tmp.x, tmp.y, tmp.z], 50); },
      'eren-wakes': () => {
        slumped = 0; T().root.rotation.set(0, 0, 0); T().root.position.y = 0; armin.rig.root.position.set(BX + 22, 0, BZ + 16);
        world.liftBoulder(); titan.place(BX + 4, BZ + 8, Math.PI); titan.carrying = world.boulder; audio.play('heavy', 3, 0, 1); stage.shake(1.2);
        titan.speedScale = carrySpeed(1, { load: 1 });
        stage.setShot([BX + 26, 18, BZ + 20], [BX, 14, BZ], 60);
        for (const t of horde.list) { t.kind = 'idle'; }
      },
      'ian-falls-back': () => { stage.walkTo(ian, [[T().root.position.x + 6, T().root.position.z + 4]], 8, 'run'); },
      'ian-grabbed': () => { ianDone = true; ian.rig.root.visible = true; ctx.onRoof(ian, T().root.position.x + 10, T().root.position.z + 12); grabSoldier(ian, killers[0], 'Ian Dietrich segurou a linha até o fim.'); },
      'mitabi-grabbed': () => { mitabiDone = true; mitabi.rig.root.visible = true; ctx.onRoof(mitabi, T().root.position.x - 12, T().root.position.z + 10); grabSoldier(mitabi, killers[1], 'Mitabi Jarnach voltou pelo corpo de um companheiro.'); },
      'gate-sealed': () => {
        sealed = true; titan.carrying = null; world.sealGate(); stage.shake(2.6); audio.play('defeat', 4, 0, 1); stage.particles.burst(GATE.clone().setY(6), 'dust', 80, 14);
        T().root.position.set(GATE.x, 0, GATE.z + 6); T().root.rotation.set(.5, Math.PI, 0); T().root.position.y = -1.5; T().arms.forEach(a => { a.rotation.x = .2; }); T().elbows.forEach(e => { e.rotation.x = -.3; });
        flare.visible = true; flare.position.set(-40, TOP + 2, TROST.wallZ + 4);
        stage.setShot([24, 20, TROST.wallZ + 60], [0, 10, TROST.wallZ + 4], 58);
      },
      'levi-arrives': () => {
        levi.rig.root.visible = true; T().nape.getWorldPosition(tmp); levi.rig.root.position.set(tmp.x + 2, tmp.y + 1, tmp.z + 3); levi.pose = 'idle';
        const victims = horde.alive().slice(0, 2); victims.forEach((t, i) => { t.titan.root.visible = true; t.titan.root.position.set(GATE.x - 12 + i * 22, 0, GATE.z + 16); stage.after(.4 + i * .5, () => horde.kill(t)); });
        stage.show([eren], true); eren.rig.root.position.copy(tmp).setY(tmp.y - .5); eren.pose = 'manual'; eren.rig.root.rotation.set(-1.1, 0, 0);
        stage.setShot([tmp.x - 6, tmp.y + 1.4, tmp.z + 8], [tmp.x + 1, tmp.y + .8, tmp.z + 2], 48);
      },
      courtroom: () => {
        ui.setFade(1); stage.after(.8, () => {
          stage.show(courtCast, true); stage.focusLight(COURT[0], COURT[1]); ctx.scene.fog.near = 30; ctx.scene.fog.far = 120; stage.ground = () => 0;
          stage.show([eren, mikasa, armin], true); eren.pose = 'manual'; eren.rig.root.rotation.set(0, Math.PI, 0); stage.place(eren, COURT[0], -.4, Math.PI); applyKneel();
          stage.place(mikasa, COURT[0] - 5, 4, Math.PI); stage.place(armin, COURT[0] - 3.6, 4.5, Math.PI); mikasa.pose = armin.pose = 'idle';
          stage.place(levi, COURT[0] - 6, -2, Math.PI / 2); stage.place(erwin, COURT[0] - 8, -3.4, Math.PI / 2); levi.pose = erwin.pose = 'idle'; zackly.pose = 'bench';
          stage.setShot([COURT[0] + 3, 2.4, 6], [COURT[0], 1.6, -6], 55); ui.setFade(0);
        });
      },
      'levi-kicks': () => {
        stage.place(levi, COURT[0] - 1.2, -.2, Math.PI / 2);
        for (let i = 0; i < 4; i++) stage.after(i * .45, () => { levi.pose = 'punch'; levi.progress = .5; kicks++; eren.rig.root.rotation.z = (i % 2 ? -1 : 1) * .5; stage.particles.burst(eren.rig.head.getWorldPosition(new THREE.Vector3()), 'blood', 8, 2); audio.play('punch', 1, 0, .8); stage.shake(.3); });
        stage.after(2, () => { levi.pose = 'idle'; eren.rig.root.rotation.z = 0; });
        stage.setShot([COURT[0] + 2.4, 1.4, 2.4], [COURT[0] - .6, .9, -.4], 46);
      },
    };
    function applyKneel() { eren.rig.legs.forEach(l => { l.rotation.x = -1.5; }); eren.rig.knees.forEach(k => { k.rotation.x = 1.6; }); eren.rig.root.position.y = -.35; eren.rig.arms.forEach(a => { a.rotation.x = .4; }); }

    function update(dt, input, control, view) {
      if (fxAt !== null) fx.update(stage.time - fxAt);
      if (flare.visible) flare.position.y += dt * 6; if (redFlare.visible) redFlare.position.y += dt * 6;
      if (T().root.visible && control !== 'carry') T().animate(stage.time);
      if (slumped > 0) { slumped = Math.min(1, slumped + dt); T().root.rotation.x = -slumped * .35; T().root.position.y = -slumped * 3; if (Math.random() < .4) stage.particles.burst(T().root.position.clone().setY(9), 'steam', 1, 3); }
      if (control === 'walk') { ctx.walker.step(dt, input, 'walk', view.kind === 'line'); return null; }
      if (control === 'carry') {
        const r = titan.step(dt, input, true); fatigue = Math.min(1, fatigue + dt * .01);
        titan.speedScale = carrySpeed(1, { load: 1, fatigue });
        horde.update(dt, { prey: [], freeze: true });
        // The elite squads fight the titans around the route.
        if (eliteKills < 2 && Math.random() < .008) { const t = horde.alive().find(o => o.titan.root.visible && !killers.includes(o)); if (t) { eliteKills++; horde.kill(t); ui.toast('A guarda de elite derrubou um titã.', 1.2); } }
        const P = T().root.position; if (Math.hypot(P.x + 20, P.z + 160) < 9) ctx.goals.add('pedra');
        return null;
      }
      if (control !== 'odm') { horde.update(dt, { prey: [], freeze: true }); return null; }
      if (ctx.mission === 'descontrole') {
        // Eren's titan hunts Mikasa: turn, wind up, punch where she was.
        const P = pilot.odm.player.position, t = T(); dodge += dt; punchClock += dt;
        const yaw = Math.atan2(P.x - t.root.position.x, P.z - t.root.position.z); t.root.rotation.y += (yaw - t.root.rotation.y) * Math.min(1, dt * 2);
        if (!punchAt && punchClock > 1.6) { punchAt = P.clone(); punchClock = 0; ui.toast('Ele vai socar!', .8); }
        t.arms[1].rotation.x = punchAt ? -1.6 - Math.min(1, punchClock / .8) * .6 : -.3;
        if (punchAt && punchClock > .8) {
          stage.shake(.8); audio.play('heavy', 3, 0, .9); stage.particles.burst(punchAt, 'dust', 20, 6);
          const hit = P.distanceTo(punchAt) < 7 && P.distanceTo(t.root.position) < 22; punchAt = null; punchClock = 0;
          if (hit) return 'O punho de Eren acertou Mikasa. Não fique parada: mude de prédio quando ele erguer o braço.';
        }
        pilot.step(dt, input);
        if (dodge >= 15) ctx.goals.add('descontrole');
        return null;
      }
      if (ctx.mission === 'escolta') {
        // Eren walks with the boulder; titans converge on him and Mikasa cuts them.
        if (!escortActive) {
          escortActive = true; walkPath = [[GATE.x, GATE.z]];
          horde.list.filter(t => t.alive && !killers.includes(t)).slice(0, 4).forEach((t, i) => { t.titan.root.visible = true; t.kind = 'hunt'; t.sight = 200; t.speed = 2.3; t.titan.root.position.set(T().root.position.x + (i % 2 ? 34 : -34), 0, T().root.position.z + 20 + i * 6); });
          pilot.place(T().root.position.x + 10, 18, T().root.position.z + 18, Math.PI);
        }
        const t = T(); t.animate(stage.time);
        if (walkPath?.length && strideTitan(t, walkPath[0], 2.4 * (titan.speedScale || .45) / .45, dt, stage.time * 3)) walkPath.shift();
        t.arms.forEach(a => { a.rotation.x = -2.7; }); t.head.getWorldPosition(tmp); world.boulder.position.copy(tmp).add(new THREE.Vector3(0, 5.5, 0));
        const r = odmCombat(ctx, dt, input, { prey: [{ id: 'eren', position: t.root.position }], grabMessage: 'Um titã pegou Mikasa. Ataque por trás e por cima.' });
        if (r.fail) return r.fail;
        if (r.grabbed?.prey.id === 'eren') { reachedEren = true; return 'Um titã alcançou Eren e a pedra caiu. Corte quem se aproximar dele antes que chegue perto.'; }
        if (!walkPath?.length) ctx.goals.add('escolta');
        return null;
      }
      return null;
    }

    return {
      script: CHAPTER_12, par: 420,
      start() { stage.setShot([-35, TOP + 2.6, TROST.wallZ + 9], [-40, TOP + 1.4, TROST.wallZ + 2.4], 50); },
      onControl(mode) {
        if (mode === 'walk') { stage.place(armin, BX + 2, BZ + 2); armin.rig.root.position.y = 0; ctx.useWalker(armin, { bounds: { minX: BX - 30, maxX: BX + 40, minZ: BZ - 30, maxZ: BZ + 40 } }); ctx.walker.lookAt(-46, -110); }
        if (mode === 'carry') stage.clearShot();
      },
      handlers, update,
      markerHeight: () => (ctx.control === 'carry' ? 20 : 4),
      status() {
        if (ctx.control === 'odm' && ctx.mission === 'descontrole') return `Gás ${Math.round(pilot.odm.player.gas)}% · Aguente ${Math.max(0, Math.ceil(15 - dodge))} s`;
        if (ctx.control === 'carry') { const P = T().root.position; return `Distância ${Math.round(Math.hypot(P.x + 20, P.z + 160))} m · Cansaço ${Math.round(fatigue * 100)}%`; }
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Portão a ${Math.round(T().root.position.distanceTo(GATE))} m · Titãs ${horde.alive().filter(t => t.titan.root.visible && t.kind === 'hunt').length}`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'descontrole') { dodge = 0; punchAt = null; pilot.place(BX + 4, 14, BZ + 22, Math.PI); }
        if (snapshot?.mission === 'escolta') { escortActive = false; reachedEren = false; for (const t of horde.list.filter(o => !killers.includes(o)).slice(0, 4)) if (!t.alive) horde.reset(t); }
      },
      challenges() {
        const done = [];
        if (ctx.goals.has('escolta') && !reachedEren) done.push(ctx.data.challenges[1]);
        return done;
      },
      onGoal(id) { if (id === 'pedra') { titan.place(-20, -160, Math.PI); } if (id === 'escolta') { T().root.position.set(GATE.x, 0, GATE.z + 4); } },
      debug: { carry([x, z]) { titan.place(x, z); } },
      snapshot: () => ({ dodge: +dodge.toFixed(1), slumped: +slumped.toFixed(2), sealed, kicks, ianDone, mitabiDone, titan: T().root.position.toArray().map(v => +v.toFixed(0)), carrying: !!titan.carrying, fatigue: +fatigue.toFixed(2) }),
    };
  });
}
