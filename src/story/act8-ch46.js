import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createFieldChapter } from './field-chapter.js';
import { createFounder, FOUNDER } from './founder.js';
import { flightStep } from './act8-rules.js';
import { CHAPTER_46 } from './act8-scripts.js';

// Chapter 46: the last crossing. As Falco, now a winged titan, fly Mikasa
// along the Founder without hitting the spine; Zeke steps out and Levi takes
// his head; Mikasa goes into the Attack Titan's mouth to reach Eren.
const GOAL = [0, -160];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio, world } = ctx;
    const founder = createFounder(ctx.scene, world);
    // The Attack Titan's head rises at the front of the spine.
    const head = ctx.titanForm('ataque'); head.root.scale.setScalar(60); head.root.position.set(FOUNDER.head[0], 40, FOUNDER.head[1] - 10); ctx.scene.add(head.root); world.anchorRoots.push(head.root);
    const mouth = new THREE.Vector3();
    const mouthAt = out => { head.head.getWorldPosition(out); return out.add(new THREE.Vector3(0, -60 * .035, 60 * .06)); };
    const eren = ctx.cast('eren', 'eren', 0, 0, 0, { pose: 'carried', override: { outfit: 'civilian-coat', hair: { style: 'long', color: '#35251b' } } });
    // Falco: the Jaw Titan with wings.
    const falco = ctx.titanForm('mandibula'); ctx.scene.add(falco.root);
    const wingMat = new THREE.MeshToonMaterial({ color: '#d8cfb8', side: THREE.DoubleSide });
    const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .5), wingMat); w.position.set(s * .7, .55, -.1); w.rotation.set(-Math.PI / 2, 0, 0); falco.root.add(w); return w; });
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(mikasa.rig); mikasa.rig.root.visible = false;
    const zeke = ctx.cast('zeke', 'zeke', 0, 0, 0); const levi = ctx.cast('levi', 'levi', 0, 0, 0, { blades: true }); stage.show([zeke, levi], false);
    let fly = { yaw: 0, speed: 30, y: 66 }, F = new THREE.Vector3(0, 66, 140), reached = false, cut = false, crashes = 0;
    const tmp = new THREE.Vector3();

    const handlers = {
      'falco-wings': () => { ui.flash('#fff7d8', .8); audio.play('transform', 0, 0, 1); stage.setShot([30, 70, 170], [10, 60, 140], 58); },
      'zeke-out': () => {
        const top = founder.top(-120); stage.show([zeke, levi], true); stage.place(zeke, top.x, top.z); zeke.rig.root.position.y = top.y; stage.place(levi, top.x + 2, top.z + 3); levi.rig.root.position.y = top.y; levi.pose = 'guard'; founder.carry(zeke.rig.root, levi.rig.root);
        stage.setShot([top.x + 8, top.y + 2, top.z + 8], [top.x, top.y + 1, top.z], 48);
      },
      'levi-cut': () => { levi.pose = 'strike'; zeke.rig.root.getWorldPosition(tmp); stage.particles.burst(tmp.setY(tmp.y + 1.6), 'blood', 50, 5); zeke.pose = 'lie'; },
      farewell: () => {
        mouthAt(mouth); stage.particles.burst(mouth, 'steam', 160, 16); ui.flash('#ffffff', .6);
        stage.place(mikasa, mouth.x, mouth.z + 4); mikasa.rig.root.position.y = mouth.y; mikasa.pose = 'grief'; mikasa.rig.root.visible = true; eren.rig.root.visible = false;
        stage.after(1.5, () => { head.root.visible = false; founder.group.visible = false; });
        stage.setShot([mouth.x + 6, mouth.y + 2, mouth.z + 10], [mouth.x, mouth.y, mouth.z + 4], 46);
      },
    };

    function update(dt, input, control) {
      founder.bob(Math.sin(stage.time * .8) * .6); head.animate(stage.time);
      mouthAt(mouth); if (eren.rig.root.visible) eren.rig.root.position.copy(mouth).add(new THREE.Vector3(0, -1, -1));
      wings.forEach((w, i) => { w.rotation.y = Math.sin(stage.time * 6) * .5 * (i ? 1 : -1); });
      if (control === 'fly') {
        fly = flightStep(fly, dt, { turn: input.move[0], pitch: -input.move[1] });
        F.x += Math.sin(fly.yaw) * fly.speed * dt; F.z -= Math.cos(fly.yaw) * fly.speed * dt; F.y = fly.y;
        falco.root.position.copy(F).setY(F.y - 2); falco.root.rotation.set(-.3, Math.atan2(Math.sin(fly.yaw), -Math.cos(fly.yaw)), -input.move[0] * .4);
        const back = new THREE.Vector3(-Math.sin(fly.yaw), 0, Math.cos(fly.yaw));
        stage.setShot(F.clone().addScaledVector(back, 16).add(new THREE.Vector3(0, 6, 0)).toArray(), F.clone().addScaledVector(back, -20).toArray(), 62);
        // The spine and its legs are solid.
        const onSpine = Math.abs(F.x) < 9 && F.z < FOUNDER.from + 5 && F.z > FOUNDER.to - 5 && Math.abs(F.y - FOUNDER.y) < 9;
        if (onSpine) { crashes++; return 'Falco bateu na coluna do Fundador. Suba (W) ou contorne pelos lados.'; }
        if (Math.hypot(F.x - GOAL[0], F.z - GOAL[1]) < 26 && F.y > 40) { reached = true; ctx.goals.add('voo'); }
        return null;
      }
      if (control === 'odm') {
        const r = pilot.step(dt, input);
        if (r.strike && mouth.distanceTo(r.position) < r.reach + 2) { cut = true; ctx.goals.add('boca'); }
      }
      return null;
    }

    return {
      script: CHAPTER_46, par: 200,
      start() { falco.root.scale.setScalar(6); falco.root.position.copy(F); stage.setShot([30, 70, 170], [10, 60, 140], 58); },
      handlers, update,
      playerVector: mode => (mode === 'fly' ? F : null),
      onControl(mode) {
        if (mode === 'odm') { falco.root.visible = false; mikasa.rig.root.visible = true; mouthAt(mouth); pilot.place(mouth.x + 4, mouth.y + 6, mouth.z + 24, 0); }
      },
      markerHeight: () => (ctx.control === 'fly' ? 80 : mouth.y),
      status() {
        if (ctx.control === 'fly') return `Altura ${Math.round(F.y)} m · Velocidade ${Math.round(fly.speed)} · Cabeça do Titã de Ataque a ${Math.round(Math.hypot(F.x - GOAL[0], F.z - GOAL[1]))} m`;
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Boca a ${Math.round(mouth.distanceTo(pilot.odm.player.position))} m`;
        return '';
      },
      restore(snapshot) { if (snapshot?.mission === 'voo') { fly = { yaw: 0, speed: 30, y: 66 }; F.set(0, 66, 140); } },
      debug: { arrive() { F.set(GOAL[0] + 12, 90, GOAL[1] + 10); fly.y = 90; }, mouth() { mouthAt(mouth); pilot.place(mouth.x, mouth.y, mouth.z + 2); pilot.strikeNow(); } },
      snapshot: () => ({ reached, cut, crashes, falco: [Math.round(F.x), Math.round(F.y), Math.round(F.z)] }),
    };
  }, { sky: '#c9a88a', fog: [140, 800], light: ['#ffcf9a', 2], world: { forest: false, castle: false, village: false, trees: false, ground: '#6a5a4a' } });
}
