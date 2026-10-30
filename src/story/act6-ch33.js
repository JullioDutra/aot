import * as THREE from 'three';
import { createTrostChapter } from './trost-chapter.js';
import { createGrip, gripStep } from './act6-rules.js';
import { CHAPTER_33 } from './act6-scripts.js';

// Chapter 33: Armin's plan. Watch the Colossal burn its own body into steam
// and grow thinner; as Armin, hold on to its teeth through the heat to keep
// Bertholdt's attention; as Eren, burst out of the hardened decoy and cut the
// nape to pull Bertholdt out.
const COLOSSAL = [0, -150], WATCH = 10;

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio } = ctx;
    const armin = ctx.cast('armin', 'armin', 0, 0, 0, { blades: true });
    const eren = ctx.cast('eren', 'eren', 0, 0, 0, { blades: true }); eren.rig.root.visible = false;
    let pilot = ctx.usePilot(armin.rig); pilot.place(COLOSSAL[0] + 30, 0, COLOSSAL[1] + 50, -.55);
    const colossal = ctx.titanForm('colossal'); colossal.root.position.set(COLOSSAL[0], 0, COLOSSAL[1]); ctx.scene.add(colossal.root); world.anchorRoots.push(colossal.root);
    const decoy = ctx.titanForm('ataque'); decoy.root.position.set(COLOSSAL[0] + 22, 0, COLOSSAL[1] + 14); decoy.root.rotation.set(-1.4, .6, 0); ctx.scene.add(decoy.root);
    const bertholdt = ctx.cast('bertholdt', 'bertholdt', 0, 0, 0, { pose: 'carried' }); bertholdt.rig.root.visible = false;
    let watched = 0, thin = 0, grip = createGrip(), cut = false;
    const tmp = new THREE.Vector3();

    const handlers = {
      'colossal-burns': () => { stage.setShot([COLOSSAL[0] + 60, 30, COLOSSAL[1] + 80], [COLOSSAL[0], 40, COLOSSAL[1]], 60); },
      'armin-holds': () => {
        colossal.head.getWorldPosition(tmp); pilot.odm.releaseAll(); armin.pose = 'reach'; stage.scene.add(armin.rig.root); armin.rig.root.position.copy(tmp).add(new THREE.Vector3(0, -2, 5)); armin.rig.root.rotation.y = Math.PI;
        stage.setShot([tmp.x + 12, tmp.y + 2, tmp.z + 16], [tmp.x, tmp.y - 2, tmp.z + 4], 52);
      },
      'eren-bursts': () => {
        armin.pose = 'lie'; armin.rig.root.rotation.x = -.4; decoy.root.visible = true;
        stage.particles.burst(decoy.root.position.clone().setY(3), 'steam', 80, 8);
        eren.rig.root.visible = true; pilot = ctx.usePilot(eren.rig); pilot.place(decoy.root.position.x, 1, decoy.root.position.z, Math.atan2(COLOSSAL[0] - decoy.root.position.x, -(COLOSSAL[1] - decoy.root.position.z)));
        stage.setShot([decoy.root.position.x + 14, 8, decoy.root.position.z + 14], [decoy.root.position.x, 3, decoy.root.position.z], 52);
      },
      'bertholdt-pulled': () => {
        colossal.nape.getWorldPosition(tmp); bertholdt.rig.root.visible = true; bertholdt.rig.root.position.copy(tmp).add(new THREE.Vector3(1, -1, -1)); eren.rig.root.position.copy(tmp).add(new THREE.Vector3(-1, 0, -2));
        stage.particles.burst(tmp, 'steam', 80, 8); stage.particles.burst(tmp, 'blood', 30, 4);
        stage.setShot([tmp.x + 8, tmp.y + 2, tmp.z - 10], [tmp.x, tmp.y, tmp.z], 50);
      },
    };

    function update(dt, input, control) {
      colossal.animate(stage.time);
      // Burning steam thins the Colossal down to a skeleton.
      if (ctx.mission !== 'vapor' || control === 'odm') thin = Math.min(.55, thin + dt * .012);
      colossal.root.scale.set(colossal.spec.height * (1 - thin * .8), colossal.spec.height * (1 - thin * .25), colossal.spec.height * (1 - thin * .8));
      if (Math.random() < .7) { colossal.chest.getWorldPosition(tmp); stage.particles.burst(tmp.add(new THREE.Vector3((Math.random() - .5) * 20, (Math.random() - .5) * 20, 0)), 'steam', 3, 10); }
      if (control === 'odm' && ctx.mission === 'vapor') {
        const r = pilot.step(dt, input); const d = Math.hypot(r.position.x - COLOSSAL[0], r.position.z - COLOSSAL[1]);
        if (d >= 30 && d <= 70) watched += dt;
        if (watched >= WATCH) ctx.goals.add('vapor');
        return null;
      }
      if (control === 'lock') {
        grip = gripStep(grip, dt, !!input.pressed.attack);
        armin.rig.root.position.y += Math.sin(stage.time * 12) * .01;
        if (input.pressed.attack) stage.shake(.15);
        if (grip.fell) return 'Armin soltou. Aperte sem parar: cada aperto firma os dedos contra o calor.';
        if (grip.held) ctx.goals.add('segurar');
        return null;
      }
      if (control === 'odm' && ctx.mission === 'emboscada') {
        const r = pilot.step(dt, input); colossal.nape.getWorldPosition(tmp);
        if (r.strike && tmp.distanceTo(r.position) < r.reach + 1.5) { cut = true; ctx.goals.add('emboscada'); }
      }
      return null;
    }

    return {
      script: CHAPTER_33, par: 220,
      start() { stage.setShot([COLOSSAL[0] + 60, 30, COLOSSAL[1] + 80], [COLOSSAL[0], 40, COLOSSAL[1]], 60); },
      handlers, update,
      markerHeight: () => 30,
      status() {
        if (ctx.control === 'odm' && ctx.mission === 'vapor') { const p = pilot.odm.player.position, d = Math.round(Math.hypot(p.x - COLOSSAL[0], p.z - COLOSSAL[1])); return `Gás ${Math.round(pilot.odm.player.gas)}% · Distância ${d} m${d < 30 ? ' (quente demais)' : d > 70 ? ' (longe demais)' : ''} · Observado ${Math.floor(watched)} / ${WATCH} s`; }
        if (ctx.control === 'lock') return `Pegada ${Math.round(grip.grip * 100)}% · Aguente ${Math.max(0, Math.ceil(18 - grip.time))} s`;
        if (ctx.control === 'odm') { colossal.nape.getWorldPosition(tmp); return `Gás ${Math.round(pilot.odm.player.gas)}% · Nuca a ${Math.round(tmp.distanceTo(pilot.odm.player.position))} m`; }
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'vapor') { watched = 0; pilot.place(COLOSSAL[0] + 30, 0, COLOSSAL[1] + 50, -.55); }
        if (snapshot?.mission === 'segurar') grip = createGrip();
      },
      debug: { nape() { colossal.nape.getWorldPosition(tmp); pilot.place(tmp.x, tmp.y, tmp.z - 2); pilot.strikeNow(); } },
      snapshot: () => ({ watched: +watched.toFixed(1), thin: +thin.toFixed(2), grip: { grip: +grip.grip.toFixed(2), held: grip.held, time: +grip.time.toFixed(1) }, cut }),
    };
  }, { breach: false });
}
