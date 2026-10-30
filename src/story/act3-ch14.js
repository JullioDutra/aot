import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { CHAPTER_14 } from './act3-scripts.js';

// Chapter 14: the Female Titan crosses the right wing. As Armin on horseback,
// ride close enough to see how she deals with soldiers — she checks faces,
// covers the nape, swats whoever comes from the front — without getting in
// her reach. Then, as Jean near the abandoned village, keep her busy.
const START = [420, -150], PATTERNS = ['rosto', 'nuca', 'golpe'];
const NAMES = { rosto: 'olha o rosto de quem pega', nuca: 'cobre a nuca com a mão', golpe: 'golpeia quem vem pela frente' };
const DISTRACT = 20;

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio, FIELD } = ctx;
    const armin = ctx.cast('armin', 'armin', 0, 0, 0);
    const rider = ctx.useRider(armin, '#7a5a3f'); rider.place(...START, -Math.PI / 2);
    const female = ctx.useFemale(); female.place(START[0] + 120, START[1] + 30, -Math.PI / 2);
    const jean = ctx.cast('jean', 'jean', 0, 0, 0); jean.rig.root.visible = false;
    const reiner = ctx.cast('reiner', 'reiner', 0, 0, 0); reiner.rig.root.visible = false;
    const pilot = ctx.usePilot(jean.rig);
    // Soldiers of the right wing that try their luck against her.
    const victims = [0, 1, 2, 3].map(i => ctx.cast(`soldier-${i}`, i % 2 ? 'soldier-f' : 'soldier-m', 0, 0, 0, { pose: 'odm' }));
    victims.forEach(v => { v.rig.root.visible = false; });
    const wing = [0, 1, 2].map(i => ctx.mount(ctx.cast(`wing-${i}`, 'soldier-m', START[0] - 20 - i * 14, START[1] + 20 + i * 10), START[0] - 20 - i * 14, START[1] + 20 + i * 10, '#6b4a33'));
    wing.forEach((m, i) => { m.slot = () => [rider.position.x - 18 - i * 12, rider.position.z + 22 + i * 9]; });
    let held = null, t = 0, wait = 3, pattern = null, cycle = 0, seen = new Set(), far = 0, retries = 0, near = 0, distract = 0, thrown = false;
    const tmp = new THREE.Vector3(), head = new THREE.Vector3();

    function startPattern(kind) {
      const v = victims[cycle % victims.length]; cycle++;
      pattern = { kind, t: 0, victim: v, resolved: false };
      v.rig.root.visible = true; v.pose = 'odm';
    }
    // Scripted encounters, posed in her frame each frame.
    function playPattern(dt) {
      const p = pattern, f = female, T = f.titan, H = f.spec.height, y = T.root.rotation.y, o = T.root.position;
      const at = (right, up, fwd) => p.victim.rig.root.position.set(o.x + Math.cos(y) * right + Math.sin(y) * fwd, up, o.z - Math.sin(y) * right + Math.cos(y) * fwd);
      p.t += dt;
      if (p.kind === 'rosto') { // grab, lift to her eyes, look, drop
        const k = Math.min(1, p.t / 1.2); T.arms[1].rotation.x = -1.3 - k * .5; T.elbows[1].rotation.x = -k * 1.2;
        T.hands[1].getWorldPosition(tmp); p.victim.rig.root.position.copy(tmp); p.victim.pose = 'carried'; T.head.rotation.x = .25 * k;
      } else if (p.kind === 'nuca') { // a soldier dives at the nape; the hand is already there
        const k = Math.min(1, p.t / 1.4); at(H * .1, H * (1.2 - k * .3), -H * (.9 - k * .6)); f.hardened = true;
        T.arms[0].rotation.set(-2.7, 0, -.9); T.elbows[0].rotation.x = -1.7;
      } else { // two soldiers from the front, one sweep
        const k = Math.min(1, p.t / 1.4); at(-H * .1, H * .7, H * (1.3 - k * .6)); T.arms[1].rotation.x = k < .7 ? -1.9 * k / .7 : -1.9 + (k - .7) * 5; T.arms[1].rotation.z = -.6;
      }
      if (!p.resolved && p.t > 1.5) {
        p.resolved = true; p.victim.rig.root.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 40, 6); audio.play('punch', 4, 0, .8);
        const d = rider.position.distanceTo(o);
        if (d >= 15 && d <= 70) { seen.add(p.kind); ui.toast(`Padrão observado: ela ${NAMES[p.kind]} · ${seen.size} / 3`, 2.6); }
        else ui.toast(d < 15 ? 'Perto demais para entender alguma coisa!' : 'Longe demais: você não viu o que aconteceu.', 2);
      }
      if (p.t > 2.2) { p.victim.rig.root.visible = false; f.hardened = false; f.resetLimbs(); pattern = null; }
    }

    const handlers = {
      'female-appears': () => { stage.setShot([START[0] - 10, 5, START[1] - 14], [female.root.position.x, 9, female.root.position.z], 55); },
      'armin-thrown': () => {
        thrown = true; const p = rider.position.clone();
        female.root.position.set(p.x + 12, 0, p.z + 6); female.root.rotation.y = Math.atan2(p.x - female.root.position.x, p.z - female.root.position.z);
        female.attack = { kind: 'swat', t: 0, resolved: true };
        stage.after(.6, () => { stage.scene.add(armin.rig.root); armin.rig.root.position.set(p.x - 3, 0, p.z); armin.pose = 'lie'; rider.speed = 0; rider.horse.root.visible = false; stage.shake(.7); stage.particles.burst(p.clone().setY(1), 'dust', 30, 5); });
        stage.setShot([p.x - 14, 6, p.z - 16], [p.x + 4, 6, p.z + 2], 55);
      },
      hood: () => {
        const p = armin.rig.root.position; female.attack = null; female.resetLimbs(); female.pose = 'still';
        female.root.position.set(p.x + 5, 0, p.z + 2); female.root.rotation.y = Math.atan2(p.x - female.root.position.x, p.z - female.root.position.z);
        female.titan.chest.rotation.x = .9; female.titan.head.rotation.x = .5; armin.pose = 'sit';
        stage.setShot([p.x - 4, 2.2, p.z - 5], [p.x + 2, 4, p.z + 1], 50);
      },
      'jean-reiner': () => {
        ui.setFade(1);
        stage.after(.8, () => {
          ui.setFade(0); const [vx, vz] = FIELD.village;
          female.pose = 'run'; female.resetLimbs(); female.place(vx + 96, vz + 10, -Math.PI / 2);
          stage.place(armin, vx + 58, vz + 4); armin.pose = 'idle';
          jean.rig.root.visible = true; pilot.place(vx + 70, 0, vz + 22, -Math.PI / 2);
          reiner.rig.root.visible = true; stage.place(reiner, vx + 62, vz + 8); reiner.pose = 'idle';
          stage.setShot([vx + 78, 9, vz + 55], [vx + 90, 8, vz + 10], 55);
        });
      },
      'reiner-grabbed': () => {
        female.pose = 'still'; female.resetLimbs(); reiner.rig.root.visible = true; reiner.pose = 'carried'; held = reiner;
        stage.setShot([female.root.position.x - 18, 10, female.root.position.z - 18], [female.root.position.x, 9, female.root.position.z], 55);
        female.titan.arms[1].rotation.x = -1.2; female.titan.elbows[1].rotation.x = -.6;
      },
      'reiner-free': () => {
        female.titan.hands[1].getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 50, 7); stage.particles.burst(tmp, 'steam', 20, 4);
        held = null; stage.place(reiner, tmp.x - 4, tmp.z); reiner.pose = 'idle'; female.resetLimbs();
      },
      'female-leaves': () => {
        female.pose = 'run'; female.titan.head.rotation.y = .6; stage.after(1, () => { female.titan.head.rotation.y = 0; });
        stage.setShot([female.root.position.x - 20, 6, female.root.position.z - 24], [0, 10, -330], 58);
      },
    };

    function update(dt, input, control) {
      const F = female.root.position;
      if (control === 'ride') {
        const r = rider.step(dt, input);
        t += dt;
        // She runs alongside, a little behind and to the side of the wing.
        const goal = [r.position.x - 22, r.position.z + 26];
        female.update(dt, { goal, speed: Math.min(19, 8 + Math.max(0, F.distanceTo(r.position) - 20) * .4), aggressive: false });
        if (!pattern && (wait -= dt) <= 0) { startPattern(PATTERNS.find(k => !seen.has(k)) ?? 'golpe'); wait = 6; }
        if (pattern) playPattern(dt);
        const d = Math.hypot(F.x - r.position.x, F.z - r.position.z);
        near = d < 9 ? near + dt : 0;
        if (near > .6) { ui.flash('#6a0909', .6); return 'Você chegou ao alcance da mão dela. Observe de 15 a 70 m.'; }
        far = d > 140 ? far + dt : 0;
        if (far > 6) return 'Você a perdeu de vista. Sem observar, ninguém sabe o que ela quer.';
        if (seen.size >= 3 && !pattern) ctx.goals.add('padroes');
        return null;
      }
      if (control === 'odm') {
        const r = pilot.step(dt, input);
        female.titan.head.getWorldPosition(head);
        const out = female.update(dt, { player: r.position, goal: [armin.rig.root.position.x + 8, armin.rig.root.position.z], speed: 3 });
        if (out.hit) { stage.particles.burst(r.position.clone().setY(r.position.y + 1), 'blood', 30, 4); ui.flash('#6a0909', .8); return out.hit === 'swat' ? 'Ela varreu Jean do ar. Fique ao lado ou atrás da cabeça, nunca na frente das mãos.' : 'Um chute pegou Jean no chão. Mantenha-se no alto.'; }
        if (r.position.distanceTo(head) < 30 && r.position.y > 4) { distract += dt; if (Math.floor(distract) !== Math.floor(distract - dt)) ui.toast(`Ela está olhando para você · ${Math.floor(distract)} / ${DISTRACT} s`, 1); }
        if (distract >= DISTRACT) ctx.goals.add('distrair');
        return null;
      }
      if (!thrown && ctx.mission === 'alerta') { rider.step(dt, { ...input, move: [0, -.7], look: [0, 0] }, true); female.update(dt, { goal: [rider.position.x + 30, rider.position.z + 26], speed: 14, aggressive: false }); }
      else if (female.pose === 'run' && ctx.mission === 'jean' && ctx.goals.has('distrair')) female.update(dt, { goal: [0, -340], speed: 15, aggressive: false });
      else female.titan.animate(stage.time);
      if (held) { female.titan.hands[1].getWorldPosition(tmp); held.rig.root.position.copy(tmp).setY(tmp.y - 1.2); }
      return null;
    }

    return {
      script: CHAPTER_14, par: 260,
      start() { stage.setShot([START[0] - 10, 5, START[1] - 14], [START[0] + 120, 9, START[1] + 30], 55); },
      handlers, update,
      markerHeight: () => 12,
      status() {
        if (ctx.control === 'ride') { const d = Math.round(Math.hypot(female.root.position.x - rider.position.x, female.root.position.z - rider.position.z)); return `Distância ${d} m${d < 15 ? ' (perto demais)' : d > 70 ? ' (longe demais)' : ''} · Padrões ${seen.size} / 3`; }
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Distração ${Math.floor(distract)} / ${DISTRACT} s`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'alerta') { retries++; t = 0; wait = 3; far = near = 0; pattern = null; victims.forEach(v => { v.rig.root.visible = false; }); rider.place(...START, -Math.PI / 2); female.resetLimbs(); female.place(START[0] + 120, START[1] + 30, -Math.PI / 2); }
        if (snapshot?.mission === 'jean') { distract = 0; const [vx, vz] = FIELD.village; female.attack = null; female.resetLimbs(); female.pose = 'run'; female.place(vx + 96, vz + 10, -Math.PI / 2); pilot.place(vx + 70, 0, vz + 22, -Math.PI / 2); }
      },
      challenges: () => (seen.size >= 3 && retries === 0 ? [ctx.data.challenges[0]] : []),
      debug: { pattern(kind) { startPattern(kind); } },
      snapshot: () => ({ seen: [...seen], distract: +distract.toFixed(1), female: [Math.round(female.root.position.x), Math.round(female.root.position.z)], rider: [Math.round(rider.position.x), Math.round(rider.position.z)], thrown, reaction: female.reaction }),
    };
  });
}
