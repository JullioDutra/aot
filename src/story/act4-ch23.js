import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { CHAPTER_23 } from './act4-scripts.js';

// Chapter 23: the chase at dusk. Erwin leads the cavalry — and the titans
// behind it — straight at the Armored Titan, who carries Eren and Bertholdt
// on his back. A titan takes Erwin's arm. Then, as Mikasa, reach the
// Armored's back and cut Eren loose while Armin shakes Bertholdt.
const ARMORED_SPEED = 7.5, EXTRACT_TIME = 40;

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, horde, ui, audio } = ctx;
    const jean = ctx.cast('jean', 'jean', 0, 0, 0);
    const rider = ctx.useRider(jean, '#6b4a33'); rider.place(6, 240, 0);
    const erwin = ctx.mount(ctx.cast('erwin', 'erwin', 0, 230), 0, 230, '#2f241c');
    const cavalry = ['mikasa', 'armin', 'hannes', 'connie', 'sasha'].map((id, i) => { const m = ctx.mount(ctx.cast(`${id}-m`, id, -8 + i * 4, 246), -8 + i * 4, 246 + (i % 2) * 4, ['#5a3f2c', '#7a5a3f', '#4a3428', '#6b4a33', '#5a3f2c'][i]); m.slot = () => [erwin.horse.root.position.x - 8 + i * 4, erwin.horse.root.position.z + 10 + (i % 2) * 5]; return m; });
    const armored = ctx.titanForm('blindado'); armored.root.position.set(0, 0, 20); armored.root.rotation.y = Math.PI; ctx.scene.add(armored.root); ctx.world.anchorRoots.push(armored.root);
    // Eren and Bertholdt strapped to his back.
    const eren = ctx.cast('eren', 'eren', 0, 0, 0), bertholdt = ctx.cast('bertholdt', 'bertholdt', 0, 0, 0);
    eren.pose = 'carried'; bertholdt.pose = 'sit';
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { blades: true }); mikasa.rig.root.visible = false;
    const pilot = ctx.usePilot(mikasa.rig);
    for (let i = 0; i < 12; i++) horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][i % 5], -60 + (i % 6) * 24, 300 - Math.floor(i / 6) * 20, { height: 7 + (i * 3) % 8, sight: 400, speed: 6 + (i % 3) });
    let charge = false, extractTime = 0, freed = false, armless = false, phase = 0;
    const tmp = new THREE.Vector3(), back = new THREE.Vector3();

    // Eren and Bertholdt ride between his shoulder blades.
    function strap() {
      armored.chest.localToWorld(back.set(0, .12, -.08));
      eren.rig.root.position.copy(back).add(new THREE.Vector3(.6, 0, 0)); bertholdt.rig.root.position.copy(back).add(new THREE.Vector3(-.8, .2, 0));
      eren.rig.root.rotation.y = bertholdt.rig.root.rotation.y = armored.root.rotation.y;
    }
    function run(dt, speed) {
      phase += dt * 5; armored.root.position.z -= speed * dt;
      const s = Math.sin(phase); armored.legs[0].rotation.x = s * .5; armored.legs[1].rotation.x = -s * .5; armored.arms[0].rotation.x = -s * .3; armored.arms[1].rotation.x = s * .3;
    }

    const handlers = {
      'chase-dusk': () => { strap(); stage.setShot([20, 8, 250], [0, 10, 40], 55); charge = true; },
      'erwin-arm': () => {
        const p = erwin.horse.root.position, t = horde.alive()[0];
        if (t) { t.titan.root.position.set(p.x + 4, 0, p.z - 2); t.titan.root.rotation.y = Math.atan2(p.x - t.titan.root.position.x, p.z - t.titan.root.position.z); t.titan.arms[1].rotation.x = -1.4; t.kind = 'idle'; }
        stage.after(.7, () => { armless = true; erwin.actor.rig.root.getWorldPosition(tmp); tmp.y += 1.4; stage.particles.burst(tmp, 'blood', 60, 6); audio.play('punch', 1, 0, 1); });
        stage.setShot([p.x - 8, 4, p.z + 8], [p.x, 2.5, p.z], 50);
      },
      'eren-free': () => {
        freed = true; eren.pose = 'carried'; mikasa.rig.root.visible = true;
        const p = pilot.odm.player.position; eren.rig.root.position.copy(p).add(new THREE.Vector3(1, 0, 0)); stage.particles.burst(back, 'blood', 20, 3);
        stage.setShot([p.x + 8, p.y + 3, p.z + 8], [p.x, p.y, p.z], 50);
      },
    };

    function update(dt, input, control) {
      armored.animate(stage.time);
      if (!freed) strap();
      if (charge && ctx.mission === 'carga') {
        run(dt, ARMORED_SPEED);
        erwin.goal = [armored.root.position.x + 4, armored.root.position.z + 18]; erwin.speed = 16;
        const prey = [{ id: 'player', position: rider.position.clone().setY(2.2) }, { id: 'armored', position: armored.root.position }];
        const result = horde.update(dt, { prey, freeze: control !== 'ride' });
        if (control !== 'ride') { rider.step(dt, { ...input, move: [0, -.8], look: [0, 0] }); return null; }
        const r = rider.step(dt, input);
        if (result.grabbed?.prey.id === 'player') { ui.flash('#6a0909', .7); return 'Um titã agarrou Jean. Siga o comandante de perto: ele abre o caminho.'; }
        if (r.position.distanceTo(armored.root.position) < 40) ctx.goals.add('carga');
        if (r.position.distanceTo(erwin.horse.root.position) > 70) return 'Você ficou para trás da carga. Os titãs cercaram quem estava sozinho.';
        return null;
      }
      if (ctx.mission === 'extracao') {
        run(dt, control === 'odm' ? ARMORED_SPEED * .6 : 0);
        // The titans Erwin brought pile onto the Armored and slow him down.
        horde.update(dt, { prey: [{ id: 'armored', position: armored.root.position }] });
        if (control !== 'odm') return null;
        const r = pilot.step(dt, input); extractTime += dt;
        eren.rig.root.getWorldPosition(tmp);
        if (r.strike && tmp.distanceTo(r.position) < r.reach) ctx.goals.add('extracao');
        else if (tmp.distanceTo(r.position) < 3.5) ctx.goals.add('extracao');
      }
      return null;
    }

    return {
      script: CHAPTER_23, par: 220,
      start() { strap(); stage.setShot([20, 8, 250], [0, 10, 40], 55); },
      handlers, update,
      onControl(mode) { if (mode === 'odm') { mikasa.rig.root.visible = true; const A = armored.root.position; pilot.place(A.x + 10, 0, A.z + 26, Math.PI); pilot.yaw = 0; } },
      markerHeight: () => 12,
      status() {
        if (ctx.control === 'ride') return `Blindado a ${Math.round(rider.position.distanceTo(armored.root.position))} m · Erwin a ${Math.round(rider.position.distanceTo(erwin.horse.root.position))} m`;
        if (ctx.control === 'odm') { eren.rig.root.getWorldPosition(tmp); return `Gás ${Math.round(pilot.odm.player.gas)}% · Eren a ${Math.round(tmp.distanceTo(pilot.odm.player.position))} m · ${Math.floor(extractTime)} s`; }
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'carga') { armored.root.position.set(0, 0, 20); rider.place(6, 240, 0); erwin.horse.root.position.set(0, 0, 230); horde.list.forEach(t => horde.reset(t)); }
        if (snapshot?.mission === 'extracao') extractTime = 0;
      },
      challenges: () => (ctx.goals.has('extracao') && extractTime < EXTRACT_TIME ? [ctx.data.challenges[0]] : []),
      debug: { autopilot(on = true) { rider.auto = on ? () => [erwin.horse.root.position.x + 3, erwin.horse.root.position.z + 6] : null; }, reach() { eren.rig.root.getWorldPosition(tmp); pilot.place(tmp.x + 1, tmp.y, tmp.z + 1); pilot.strikeNow(); } },
      snapshot: () => ({ armless, freed, extractTime: +extractTime.toFixed(1), armored: Math.round(armored.root.position.z), rider: Math.round(rider.position.z) }),
    };
  }, { sky: '#d6a77c', fog: [120, 600], light: ['#ffbf86', 2.2], hemi: ['#f0cba8', '#5a4a3a', 1.4], world: { wall: true, castle: false } });
}
