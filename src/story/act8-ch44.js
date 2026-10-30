import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createFieldChapter } from './field-chapter.js';
import { castExtra } from './extras.js';
import { heatDamage, toppled } from './act8-rules.js';
import { CHAPTER_44 } from './act8-scripts.js';

// Chapter 44: the Rumbling reaches Odiha before the seaplane can take off.
// Magath and Shadis blow up the warship. Hange hands command to Armin and
// flies alone at the Colossals: cut both ankles to topple one, and stay off
// their bodies — the steam scalds — until the plane is in the air.
const PLANE = [0, -78], HOLD = 35;

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio, world } = ctx;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1000), new THREE.MeshToonMaterial({ color: '#4f7f9a' })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, .1, -560); ctx.scene.add(sea);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(220, 1, 30), toon('#8d877b')); quay.position.set(0, .5, -40); ctx.scene.add(quay);
    const plane = new THREE.Group(); plane.position.set(PLANE[0], 2, PLANE[1]); ctx.scene.add(plane);
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1, 14, 12), toon('#c9c2b0')); fuselage.rotation.x = Math.PI / 2; plane.add(fuselage);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(22, .3, 2.6), toon('#b8b0a0')); wing.position.y = 1.4; plane.add(wing);
    const ship = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 70), toon('#4a4a4e')); ship.position.set(70, 4, -150); ctx.scene.add(ship);
    const hange = ctx.cast('hange', 'hange', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(hange.rig); pilot.place(0, 0, -20, Math.PI);
    const armin = ctx.cast('armin', 'armin', -4, -30, Math.PI), levi = ctx.cast('levi', 'levi', -6, -30, Math.PI, { pose: 'sit' });
    const magath = castExtra(ctx, 'magath', 66, -130, 0, { y: 9 }), shadis = ctx.cast('shadis', 'shadis', 72, -128, 0, { y: 9 });
    const colossi = [-120, -40, 40, 120].map((x, i) => { const t = ctx.titanForm('colossal'); t.root.scale.setScalar(58); t.root.position.set(x, 0, 320 + (i % 2) * 90); t.root.rotation.y = Math.PI; ctx.scene.add(t.root); world.anchorRoots.push(t.root); return { t, ankles: { left: false, right: false }, fallen: 0, phase: i }; });
    let health = 100, time = 0, felled = 0, launched = false;
    const tmp = new THREE.Vector3();

    const handlers = {
      colossi: () => { stage.setShot([0, 30, -60], [0, 40, 320], 64); },
      'ship-blast': () => {
        ui.flash('#fff2c8', 1); stage.shake(2); audio.play('defeat', 0, 0, 1); magath.rig.root.visible = shadis.rig.root.visible = false;
        stage.particles.burst(ship.position.clone().setY(10), 'dust', 160, 18); stage.particles.burst(ship.position.clone().setY(10), 'spark', 80, 12); ship.rotation.z = .5; ship.position.y = -2;
        stage.setShot([20, 20, -60], [70, 8, -150], 60);
      },
      'hange-burns': () => {
        launched = true; const p = pilot.odm.player.position.clone(); pilot.odm.releaseAll(); hange.pose = 'fall';
        for (let i = 0; i < 6; i++) stage.after(i * .25, () => stage.particles.burst(p.clone().add(new THREE.Vector3(0, i, 0)), 'steam', 60, 10));
        stage.after(1.2, () => { stage.particles.burst(p, 'spark', 40, 6); hange.rig.root.visible = false; });
        stage.setShot([p.x + 18, p.y + 6, p.z - 18], [p.x, p.y, p.z], 55);
      },
    };

    function update(dt, input, control) {
      plane.position.y = launched ? plane.position.y + dt * 6 : 2 + Math.sin(stage.time * 1.4) * .1; if (launched) plane.position.z -= dt * 30;
      // The Colossals walk toward the sea until they fall.
      for (const c of colossi) {
        c.t.animate(stage.time);
        if (c.fallen) { c.fallen = Math.min(1, c.fallen + dt * .4); c.t.root.rotation.x = c.fallen * 1.35; continue; }
        if (ctx.mission === 'hange' || control === 'none') { c.phase += dt * 1.6; c.t.root.position.z -= dt * (ctx.mission === 'hange' ? 3.4 : 1); c.t.legs[0].rotation.x = Math.sin(c.phase) * .35; c.t.legs[1].rotation.x = -Math.sin(c.phase) * .35; }
        if (Math.random() < .3) { c.t.chest.getWorldPosition(tmp); stage.particles.burst(tmp, 'steam', 2, 12); }
      }
      if (control !== 'odm') return null;
      time += dt;
      const r = pilot.step(dt, input), P = r.position;
      for (const c of colossi) {
        if (c.fallen) continue;
        const d = Math.hypot(P.x - c.t.root.position.x, P.z - c.t.root.position.z);
        health -= heatDamage(d, P.y) * dt;
        if (r.strike) c.t.knees.forEach((k, i) => { const side = i ? 'right' : 'left'; if (c.ankles[side]) return; k.getWorldPosition(tmp); if (tmp.distanceTo(P) < r.reach + 1.5) { c.ankles[side] = true; stage.particles.burst(tmp, 'steam', 40, 8); audio.play('punch', 2, 0, .8); ui.toast(`Tornozelo cortado (${side === 'left' ? 'esquerdo' : 'direito'})`, 1); } });
        if (toppled(c.ankles)) { c.fallen = .001; felled++; stage.shake(1.6); ui.toast(`Um Colossal caiu! · ${felled}`, 1.6); }
      }
      if (health <= 0) return 'O vapor queimou Hange antes da hora. Fique nos pés dos Colossais, longe do corpo.';
      if (time >= HOLD) ctx.goals.add('hange');
      return null;
    }

    return {
      script: CHAPTER_44, par: 200,
      start() { stage.setShot([0, 30, -60], [0, 40, 320], 64); },
      handlers, update,
      onControl(mode) { if (mode === 'odm') { colossi.forEach((c, i) => { if (!c.fallen) c.t.root.position.z = Math.min(c.t.root.position.z, 120 + i * 20); }); pilot.place(0, 0, 30, Math.PI); } },
      markerHeight: () => 20,
      status: () => (ctx.control === 'odm' ? `Gás ${Math.round(pilot.odm.player.gas)}% · Corpo ${Math.max(0, Math.round(health))}% · Colossais derrubados ${felled} · Decolagem em ${Math.max(0, Math.ceil(HOLD - time))} s` : ''),
      restore(snapshot) { if (snapshot?.mission === 'hange') { health = 100; time = 0; } },
      challenges: () => (felled >= 3 ? [ctx.data.challenges[0]] : []),
      debug: { ankle(i = 0, side = 0) { const c = colossi.find(c => !c.fallen); if (!c) return; c.t.knees[side].getWorldPosition(tmp); pilot.place(tmp.x, tmp.y, tmp.z + 2); pilot.strikeNow(); } },
      snapshot: () => ({ health: Math.round(health), felled, time: +time.toFixed(1), launched }),
    };
  }, { sky: '#d0c7b6', fog: [200, 1100], world: { forest: false, castle: false, village: false, trees: false, ground: '#9a9080' } });
}
