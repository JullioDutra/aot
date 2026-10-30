import * as THREE from 'three';
import { createTitanForm } from '../titan-forms.js';
import { titanForm, strideTitan } from './kit.js';
import { femaleReaction, napeOpen } from './act3-rules.js';

// The Female Titan (chapters 14–18): she runs toward a goal, reads attackers
// with femaleReaction, covers the nape with a hardened hand, swats what is in
// front and kicks what is at her feet. Chapters drive poses for scripted
// beats (pinned by harpoons, screaming, climbing) through `pose`.
export function createFemale(stage, { anchorRoots = [], height = 14 } = {}) {
  const spec = { ...titanForm('femea'), height };
  const titan = createTitanForm(spec); stage.scene.add(titan.root); anchorRoots.push(titan.root);
  // Hardening: a pale crystal shell over the nape and on the striking fist.
  const crystalMat = new THREE.MeshToonMaterial({ color: '#cfe8f2', transparent: true, opacity: .85 });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(.075, 1), crystalMat); shell.scale.set(1.4, 1, .8); shell.visible = false;
  titan.nape.add(shell);
  const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(.05, 0), crystalMat); fist.visible = false; titan.hands[1].add(fist);
  const tmp = new THREE.Vector3(), rel = new THREE.Vector3();
  const f = {
    titan, root: titan.root, spec, pose: 'run', reaction: 'chase', phase: 0, t: 0, attack: null, cooldown: 1.2, hardened: false, handBusy: false, speed: 13,
    place(x, z, yaw = 0) { titan.root.position.set(x, 0, z); titan.root.rotation.set(0, yaw, 0); },
    // Attacker position in her frame: [right, up, forward].
    relative(point) {
      const p = titan.root.position, y = titan.root.rotation.y;
      rel.set(point.x - p.x, point.y, point.z - p.z);
      return [rel.x * Math.cos(y) - rel.z * Math.sin(y), rel.y, rel.x * Math.sin(y) + rel.z * Math.cos(y)];
    },
    napeOpen: () => napeOpen(f.reaction, f.handBusy),
    napePosition: (out = new THREE.Vector3()) => titan.nape.getWorldPosition(out),
    // Weak points for Levi's rescue, in world space.
    point(id, out = new THREE.Vector3()) {
      if (id.startsWith('braco')) return titan.arms[id === 'braco-e' ? 0 : 1].getWorldPosition(out);
      const H = spec.height, y = titan.root.rotation.y, side = id === 'olho-e' ? -1 : id === 'olho-d' ? 1 : 0;
      titan.head.getWorldPosition(out);
      return out.add(new THREE.Vector3(Math.sin(y) * H * .06 + Math.cos(y) * side * H * .03, id === 'boca' ? -H * .035 : H * .01, Math.cos(y) * H * .06 - Math.sin(y) * side * H * .03));
    },
    // Harpoon cables from the trap's cannons ([x, y, z] each) to her limbs.
    pin(anchors) {
      const parts = [titan.hands[0], titan.hands[1], titan.knees[0], titan.knees[1], titan.chest, titan.neck, titan.elbows[0], titan.elbows[1]];
      f.resetLimbs(); titan.arms.forEach((a, i) => { a.rotation.set(-.4, 0, (i ? -1 : 1) * 1.2); });
      titan.root.updateWorldMatrix(true, true);
      const group = new THREE.Group(); stage.scene.add(group);
      anchors.forEach((a, i) => {
        const end = parts[i % parts.length].getWorldPosition(new THREE.Vector3());
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), end]), new THREE.LineBasicMaterial({ color: '#2b2622' }));
        line.frustumCulled = false; group.add(line);
      });
      f.attack = null; f.pose = 'pinned'; return group;
    },
    resetLimbs() {
      titan.arms.forEach(a => a.rotation.set(0, 0, 0)); titan.elbows.forEach(e => e.rotation.set(0, 0, 0)); titan.legs.forEach(l => l.rotation.set(0, 0, 0)); titan.knees.forEach(k => k.rotation.set(0, 0, 0));
      titan.chest.rotation.set(0, 0, 0); titan.head.rotation.set(0, 0, 0); titan.root.rotation.x = 0; titan.root.position.y = 0;
    },
    // One step of the boss: run toward `goal` (or stand), react to `player`.
    // Returns { hit: 'swat'|'kick'|null, reaction }.
    update(dt, { player = null, goal = null, speed = f.speed, aggressive = true } = {}) {
      f.t += dt; titan.animate(stage.time);
      shell.visible = f.hardened || (f.reaction === 'guard' && !f.handBusy);
      if (f.pose === 'pinned') { titan.arms.forEach((a, i) => { a.rotation.set(-.4, 0, (i ? -1 : 1) * 1.2); }); titan.chest.rotation.x = .1; titan.head.rotation.x = Math.sin(stage.time * 3) * .05; return { hit: null, reaction: 'pinned' }; }
      if (f.pose === 'scream') { titan.head.rotation.x = -.5; titan.arms.forEach((a, i) => { a.rotation.set(-.3, 0, (i ? -1 : 1) * 1.2); }); return { hit: null, reaction: 'scream' }; }
      if (f.pose === 'still') return { hit: null, reaction: 'still' };
      f.cooldown -= dt;
      f.reaction = player ? femaleReaction(f.relative(player), spec.height) : 'chase';
      let hit = null;
      if (f.attack) {
        f.attack.t += dt; const a = f.attack;
        if (a.kind === 'swat') { titan.arms[1].rotation.x = a.t < .55 ? -1.9 * (a.t / .55) : -1.9 + (a.t - .55) * 6; titan.arms[1].rotation.z = a.t < .55 ? -.6 : -.6 + (a.t - .55) * 4; fist.visible = true; }
        else { titan.legs[1].rotation.x = a.t < .45 ? .5 : -1.5; titan.knees[1].rotation.x = a.t < .45 ? 1 : 0; }
        if (!a.resolved && a.t >= .55) { a.resolved = true; if (player && ['swat', 'kick'].includes(femaleReaction(f.relative(player), spec.height))) hit = a.kind; }
        if (a.t > .95) { f.attack = null; f.cooldown = 1.1; fist.visible = false; f.resetLimbs(); }
        return { hit, reaction: f.reaction };
      }
      if (aggressive && (f.reaction === 'swat' || f.reaction === 'kick') && f.cooldown <= 0) {
        f.attack = { kind: f.reaction, t: 0, resolved: false }; stage.audio.play('heavy', 6, 0, .5);
        if (player) titan.root.rotation.y = Math.atan2(player.x - titan.root.position.x, player.z - titan.root.position.z);
        return { hit: null, reaction: f.reaction };
      }
      if (f.reaction === 'guard') { titan.arms[0].rotation.set(-2.7, 0, -.9); titan.elbows[0].rotation.x = -1.7; }
      else if (!f.handBusy) { titan.arms[0].rotation.z *= .8; titan.elbows[0].rotation.x *= .8; }
      if (goal) { f.phase += dt * speed * .55; if (strideTitan(titan, goal, speed, dt, f.phase)) f.pose = 'idle'; if (f.reaction === 'guard') { titan.arms[0].rotation.set(-2.7, 0, -.9); } }
      return { hit, reaction: f.reaction };
    },
    nape: tmp,
  };
  return f;
}
