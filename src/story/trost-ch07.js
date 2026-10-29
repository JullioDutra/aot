import * as THREE from 'three';
import { toon } from '../character-model.js';
import { strideTitan } from './kit.js';
import { createTrostChapter, odmCombat } from './trost-chapter.js';
import { CHAPTER_7 } from './trost-scripts.js';

// Chapter 7: squad 34 on the rooftops. Thomas is taken by an abnormal, Eren
// loses a leg, the squad is torn apart and Eren is swallowed saving Armin.
let PATH = [[14, 24, 66], [-4, 24, 40], [-20, 22, 10], [-26, 24, -24], [-12, 22, -58]];
const ROOF = { x: -30, z: -60, w: 12, d: 10, h: 11 };
const MOUTH = new THREE.Vector3(ROOF.x - .5, 0, ROOF.z + ROOF.d / 2 + 2.6);

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, horde, ui, audio } = ctx;
    // A low house in the cross street where Armin freezes.
    const house = new THREE.Mesh(new THREE.BoxGeometry(ROOF.w, ROOF.h, ROOF.d), toon('#ddd2bc')); house.position.set(ROOF.x, ROOF.h / 2, ROOF.z); house.castShadow = house.receiveShadow = true; ctx.scene.add(house);
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(ROOF.w + .6, .4, ROOF.d + .6), toon('#8a4a36')); roofMesh.position.set(ROOF.x, ROOF.h + .2, ROOF.z); ctx.scene.add(roofMesh);
    world.colliders.push({ minX: ROOF.x - ROOF.w / 2, maxX: ROOF.x + ROOF.w / 2, minZ: ROOF.z - ROOF.d / 2, maxZ: ROOF.z + ROOF.d / 2, top: ROOF.h + .4, tag: 'armin-roof' });
    world.anchorRoots.push(house);
    stage.ground = (x, z) => world.roofAt(x, z);

    const outfit = { outfit: 'training' };
    // Squad 34 gathers on the roof nearest to the start of the route.
    const startRoof = world.buildings.reduce((best, b) => (Math.hypot(b.x - 14, b.z - 66) < Math.hypot(best.x - 14, best.z - 66) ? b : best));
    PATH[0] = [startRoof.x, startRoof.h + 8, startRoof.z];
    const eren = ctx.cast('eren', 'eren', startRoof.x, startRoof.z - 3, Math.PI, { override: outfit });
    const thomas = ctx.cast('thomas', 'recruit-m', startRoof.x, startRoof.z + 1, Math.PI, { override: { ...outfit, hair: { style: 'short', color: '#c9a35a' } } });
    const squad = [ctx.cast('armin', 'armin', startRoof.x - 2, startRoof.z + 3, Math.PI, { override: outfit }), ctx.cast('mina', 'soldier-f', startRoof.x + 2, startRoof.z + 3, Math.PI, { override: { ...outfit, hair: { style: 'ponytail-low', color: '#2a2220' } } }), ctx.cast('nack', 'recruit-m', startRoof.x - 3, startRoof.z + 4.5, Math.PI, { override: outfit }), ctx.cast('milieus', 'recruit-m', startRoof.x + 3, startRoof.z + 4.5, Math.PI, { override: { ...outfit, hair: { style: 'middlepart', color: '#222' } } })];
    const [armin, mina] = squad;
    const offsets = [[-3, -1, 4], [3, 0, 4], [-6, 1, 7], [6, -1, 7]];
    const pilot = ctx.usePilot(eren.rig);
    for (const [id, x, z, h] of [['nariz', 30, 20, 7], ['gordo', -40, 30, 8], ['cabeludo', 6, -10, 10], ['pequeno', -14, 50, 4], ['barbudo', 20, -30, 9], ['nariz', -50, -10, 7]]) horde.spawn(id, x, z, { height: h, sight: 38 });
    const abnormal = horde.spawn('anormal', -60, -48, { kind: 'idle', height: 14, id: 'anormal-thomas' });
    const biter = horde.spawn('nariz', -36, -34, { kind: 'idle', height: 9, id: 'mordida' });
    const bearded = horde.spawn('barbudo', MOUTH.x, MOUTH.z + 3.4, { kind: 'idle', height: 12, yaw: Math.PI, id: 'barbudo-armin' });
    for (const t of [abnormal, biter, bearded]) t.titan.root.visible = false;
    const eaters = [horde.spawn('gordo', -44, -66, { kind: 'idle', height: 8, id: 'come-mina' }), horde.spawn('cabeludo', -16, -70, { kind: 'idle', height: 10, id: 'come-nack' })];
    eaters.forEach(t => { t.titan.root.visible = false; });

    let leg = 0, lead = 0, lost = 0, legLost = false, swallowed = 0, grabbedArmin = 0, chased = false, followSquad = true;
    const tmp = new THREE.Vector3();
    const pathPoint = (t, out) => { const k = Math.min(PATH.length - 1.001, t), i = Math.floor(k), f = k - i, a = PATH[i], b = PATH[i + 1]; return out.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - Math.sin(f * Math.PI) * 9, a[2] + (b[2] - a[2]) * f); };
    function flyer(a, position, heading) { a.rig.root.position.copy(position); a.rig.root.rotation.y = heading; a.pose = 'odm'; }

    function placeSquadOnRoof() {
      squad.forEach((a, i) => { if (!a.rig.root.visible) return; ctx.onRoof(a, ROOF.x - 3 + i * 1.6, ROOF.z - 2 + (i % 2), Math.PI); a.pose = 'idle'; });
    }
    const handlers = {
      'vanguard-brief': () => { stage.setShot([startRoof.x + 6, startRoof.h + 3, startRoof.z - 8], [startRoof.x, startRoof.h + 1, startRoof.z], 52); [thomas, ...squad].forEach(a => { a.rig.root.position.y = world.roofAt(a.rig.root.position.x, a.rig.root.position.z); }); },
      'abnormal-strike': () => {
        followSquad = false; abnormal.titan.root.visible = true; pathPoint(PATH.length - 1, tmp); thomas.rig.root.position.copy(tmp);
        abnormal.titan.root.position.set(tmp.x + 12, 0, tmp.z - 2); leg = .001;
        stage.setShot([tmp.x + 20, 34, tmp.z + 26], [tmp.x - 6, 12, tmp.z - 2], 55);
        stage.after(.9, () => { thomas.pose = 'carried'; audio.play('punch', 4, 0, 1); });
        stage.after(2.2, () => { thomas.rig.root.visible = false; abnormal.titan.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 50, 5); stage.shake(.6); });
        pilot.odm.releaseAll(); eren.rig.root.visible = true; placeSquadOnRoof(); ctx.onRoof(eren, ROOF.x + 3, ROOF.z + 1, Math.PI);
      },
      'eren-chases': () => { chased = true; eren.pose = 'odm'; stage.walkTo(eren, [[ROOF.x - 6, ROOF.z - 20]], 14, 'odm'); },
      'eren-holds': () => { eren.pose = 'idle'; },
      'leg-bitten': () => {
        biter.titan.root.visible = true; biter.titan.root.position.set(ROOF.x - 2, 0, ROOF.z - 10); eren.path = null;
        eren.rig.root.position.set(ROOF.x - 2, 8, ROOF.z - 8); eren.pose = 'fall'; legLost = true;
        stage.particles.burst(eren.rig.root.position.clone(), 'blood', 60, 6); audio.play('punch', 2, 0, 1); ui.flash('#5e0606', .7); stage.shake(1);
        eren.rig.legs[0].visible = false;
        stage.after(.9, () => { ctx.onRoof(eren, ROOF.x + 2, ROOF.z + 1, -Math.PI / 2); eren.pose = 'manual'; eren.rig.root.rotation.set(-Math.PI / 2, 0, 0); eren.rig.root.position.y += .3; });
        stage.setShot([ROOF.x + 8, ROOF.h + 5, ROOF.z + 8], [ROOF.x - 2, ROOF.h - 2, ROOF.z - 6], 56);
      },
      'squad-falls': () => {
        const [m, gordo] = [mina, eaters[0]]; gordo.titan.root.visible = true; eaters[1].titan.root.visible = true;
        m.rig.root.position.set(-42, 7, -64); m.pose = 'fall'; stage.walkTo(m, [[-43, -65.5]], 4, 'fall');
        stage.after(1.2, () => { gordo.titan.head.getWorldPosition(tmp); m.rig.root.position.copy(tmp); stage.particles.burst(tmp, 'blood', 70, 6); audio.play('punch', 3, 0, 1); stage.shake(.5); });
        stage.after(1.6, () => { m.rig.root.visible = false; });
        for (const [i, a] of [[1, squad[2]], [2, squad[3]]]) stage.after(1.2 + i * .6, () => { eaters[1].titan.head.getWorldPosition(tmp); a.rig.root.position.copy(tmp); stage.particles.burst(tmp, 'blood', 40, 5); stage.after(.3, () => { a.rig.root.visible = false; }); });
        stage.setShot([-30, 22, -46], [-38, 4, -66], 60);
      },
      'armin-grabbed': () => {
        bearded.titan.root.visible = true; bearded.titan.root.position.set(MOUTH.x, 0, MOUTH.z + 3.2); bearded.titan.root.rotation.y = Math.PI; grabbedArmin = .001;
        stage.setShot([ROOF.x + 9, ROOF.h + 4, ROOF.z - 4], [MOUTH.x, ROOF.h, MOUTH.z], 52);
      },
      'armin-thrown': () => {
        grabbedArmin = 0; ctx.onRoof(armin, ROOF.x - 3, ROOF.z - 1, 0); armin.pose = 'grief'; audio.play('block', 2, 0, 1);
        ctx.player.rig.arms[1].rotation.x = -2.8; stage.setShot([ROOF.x - 6, ROOF.h + 3, ROOF.z - 3], [MOUTH.x, ROOF.h + 1, MOUTH.z], 50);
      },
      'eren-swallowed': () => {
        swallowed = .001; stage.after(.8, () => { bearded.titan.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 80, 6); ui.flash('#4e0404', .8); audio.play('defeat', 2, 0, 1); stage.shake(1); });
        stage.after(1.1, () => { eren.rig.root.visible = false; });
      },
      'fade-black': () => ui.setFade(1),
    };

    function update(dt, input, control, view) {
      // Squad 34 flies the path ahead of the player.
      if (followSquad && control === 'odm') {
        lead = Math.min(PATH.length - 1, lead + dt * .14); pathPoint(lead, tmp);
        flyer(thomas, tmp, Math.PI + .5);
        squad.forEach((a, i) => { flyer(a, tmp.clone().add(new THREE.Vector3(...offsets[i])), Math.PI + .5); });
      }
      if (leg > 0) {
        // The abnormal leaps from the street and closes on Thomas mid-air.
        leg += dt; const t = abnormal.titan; pathPoint(PATH.length - 1, tmp);
        t.root.position.lerp(new THREE.Vector3(tmp.x - 2, Math.max(0, Math.sin(Math.min(1, leg / 1) * Math.PI) * 10), tmp.z), Math.min(1, dt * 3));
        t.arms[1].rotation.x = -2.4; t.chest.rotation.x = .3; t.animate(stage.time);
        if (leg > .9 && thomas.rig.root.visible) { t.hands[1].getWorldPosition(tmp); thomas.rig.root.position.copy(tmp); }
        if (leg > 3) { leg = 0; t.route = [[-80, -90]]; t.kind = 'hunt'; }
      }
      if (grabbedArmin > 0) {
        grabbedArmin += dt; const t = bearded.titan; t.arms[1].rotation.x = -1.4 - Math.min(1, grabbedArmin) * 1.2; t.chest.rotation.x = .25;
        t.head.getWorldPosition(tmp); armin.rig.root.position.copy(tmp).add(new THREE.Vector3(0, -.9, -.6)); armin.pose = 'reach';
      }
      if (swallowed > 0) { swallowed += dt; bearded.titan.head.rotation.x = Math.sin(Math.min(1, swallowed) * Math.PI) * -.4; }
      if (control === 'walk') {
        // Eren drags himself with one leg: slow, on the roof only.
        ctx.walker.step(dt, input, 'walk', view.kind === 'line');
        eren.pose = 'manual'; eren.rig.root.rotation.x = -.9; eren.rig.root.position.y = ROOF.h + .5;
        return null;
      }
      if (control !== 'odm') { horde.update(dt, { prey: [], freeze: true }); return null; }
      const r = odmCombat(ctx, dt, input, { grabMessage: 'Um titã alcançou você entre os telhados. Fique alto e siga a formação.' });
      if (r.fail) return r.fail;
      const near = r.position.distanceTo(thomas.rig.root.position) < 42;
      lost = near ? Math.max(0, lost - dt) : lost + dt;
      if (lost > 6) return 'Você se separou do esquadrão. Siga o marcador de Thomas pelos telhados.';
      if (lead >= PATH.length - 1.01 && near) ctx.goals.add('formacao');
      return null;
    }

    return {
      script: CHAPTER_7, par: 260,
      start() { pilot.place(startRoof.x, startRoof.h + .1, startRoof.z - 3, Math.PI * .85); stage.setShot([startRoof.x + 6, startRoof.h + 3, startRoof.z - 8], [startRoof.x, startRoof.h + 1, startRoof.z], 52); },
      onControl(mode) {
        if (mode === 'walk') {
          ctx.useWalker(eren, { bounds: { minX: ROOF.x - ROOF.w / 2 + .5, maxX: ROOF.x + ROOF.w / 2 - .5, minZ: ROOF.z - ROOF.d / 2 + .5, maxZ: ROOF.z + ROOF.d / 2 - .2 }, speeds: [1.1, 1.4], distance: 3.4 });
          ctx.walker.lookAt(MOUTH.x, MOUTH.z);
        }
      },
      handlers, update,
      markerHeight: () => (ctx.control === 'odm' ? thomas.rig.root.position.y + 3 : ROOF.h + 1.5),
      status: () => (ctx.control === 'odm' ? `Gás ${Math.round(pilot.odm.player.gas)}% · Distância de Thomas ${Math.round(pilot.odm.player.position.distanceTo(thomas.rig.root.position))} m` : ''),
      onEvent(event) { if (event.kind === 'interact') { audio.play('block', 1, 0, .6); eren.rig.root.position.x += (MOUTH.x - eren.rig.root.position.x) * .08; } },
      restore(snapshot) { if (snapshot?.mission === 'formacao') { lead = 0; lost = 0; pilot.place(startRoof.x, startRoof.h + .1, startRoof.z - 3, Math.PI * .85); } },
      challenges: () => (ctx.goals.has('formacao') && !chased ? [ctx.data.challenges[0]] : ctx.goals.has('formacao') ? [ctx.data.challenges[0]] : []),
      snapshot: () => ({ abnormal: [abnormal.alive, abnormal.titan.root.visible, ...abnormal.titan.root.position.toArray().map(v => +v.toFixed(1))], lead: +lead.toFixed(2), lost: +lost.toFixed(1), thomas: thomas.rig.root.visible, mina: mina.rig.root.visible, legLost, erenVisible: eren.rig.root.visible, armin: armin.rig.root.position.toArray().map(v => +v.toFixed(1)) }),
    };
  });
}
