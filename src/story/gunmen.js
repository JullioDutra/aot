import * as THREE from 'three';
import { GUN, createGunman, gunStep, lineOfSight } from './act5-rules.js';

// The anti-personnel squad: soldiers with ODM pistols-shotguns posted on
// roofs or pillars. Each aims with a visible red line, fires and reloads;
// buildings in the way block the shot (act5-rules).
export function createGunmen(stage, { colliders = [] } = {}) {
  const list = [], from = new THREE.Vector3();
  const lineMat = new THREE.LineBasicMaterial({ color: '#ff3b2f', transparent: true, opacity: .8 });
  return {
    list,
    add(actor, delay = 0) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat); line.frustumCulled = false; line.visible = false; stage.scene.add(line);
      const g = { actor, state: createGunman(delay), line, alive: true }; list.push(g); actor.pose = 'idle'; return g;
    },
    // target: Vector3 (chest height). Returns the number of shots that landed.
    update(dt, target, { active = true } = {}) {
      let hits = 0;
      for (const g of list) {
        if (!g.alive || !g.actor.rig.root.visible || !active) { g.line.visible = false; continue; }
        g.actor.rig.root.getWorldPosition(from); from.y += 1.4;
        const inRange = from.distanceTo(target) <= GUN.range;
        const visible = lineOfSight(from.toArray(), target.toArray(), colliders);
        g.state = gunStep(g.state, dt, { inRange, visible });
        g.actor.rig.root.rotation.y = Math.atan2(target.x - from.x, target.z - from.z);
        g.line.visible = g.state.phase === 'aim';
        if (g.line.visible) { g.line.geometry.setFromPoints([from, target]); g.line.material.opacity = .3 + .6 * (g.state.t / GUN.aim); }
        if (g.state.fired) { stage.particles.burst(from, 'spark', 12, 3); stage.audio.play('block', 4, 0, .7); if (g.state.hit) hits++; }
        g.actor.pose = g.state.phase === 'aim' ? 'punch' : 'idle';
      }
      return hits;
    },
    kill(g) { g.alive = false; g.line.visible = false; g.actor.pose = 'lie'; },
    hide() { for (const g of list) g.line.visible = false; },
  };
}
