import * as THREE from 'three';
import { toon, outlineMaterial } from '../character-model.js';

// Shared props for story chapters: a pooled particle system (steam, dust,
// blood, sparks) and a procedural horse with a gallop cycle.
const KINDS = {
  steam: { color: '#eeeee6', life: 2.2, size: [.6, 1.6], gravity: -1.2, opacity: .35, grow: 1.8 },
  dust: { color: '#b6a98e', life: 1.6, size: [.5, 1.4], gravity: -.4, opacity: .5, grow: 1.4 },
  blood: { color: '#7c0f12', life: 1.4, size: [.08, .22], gravity: 9.8, opacity: .95, grow: 0 },
  spark: { color: '#ffe3a0', life: .5, size: [.05, .12], gravity: 4, opacity: 1, grow: 0 },
};

export function createParticles(scene, capacity = 600) {
  const geometry = new THREE.SphereGeometry(1, 6, 4);
  const pool = [];
  for (let i = 0; i < capacity; i++) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    mesh.visible = false; scene.add(mesh); pool.push({ mesh, velocity: new THREE.Vector3(), life: 0, max: 1, kind: null, size: 1 });
  }
  let cursor = 0;
  return {
    burst(position, kind, count = 10, strength = 4) {
      const spec = KINDS[kind] ?? KINDS.dust;
      for (let i = 0; i < count; i++) {
        const p = pool[cursor]; cursor = (cursor + 1) % capacity;
        p.kind = spec; p.life = p.max = spec.life * (.7 + Math.random() * .6); p.size = spec.size[0] + Math.random() * (spec.size[1] - spec.size[0]);
        p.mesh.position.copy(position); p.mesh.visible = true; p.mesh.material.color.set(spec.color); p.mesh.material.opacity = spec.opacity;
        p.velocity.set((Math.random() - .5) * strength, Math.random() * strength * (kind === 'blood' ? .9 : .6), (Math.random() - .5) * strength);
      }
    },
    update(dt) {
      for (const p of pool) {
        if (!p.mesh.visible) continue;
        p.life -= dt; if (p.life <= 0) { p.mesh.visible = false; continue; }
        p.velocity.y -= p.kind.gravity * dt; p.mesh.position.addScaledVector(p.velocity, dt);
        if (p.mesh.position.y < .03 && p.kind.gravity > 0) { p.mesh.position.y = .03; p.velocity.set(0, 0, 0); }
        const t = 1 - p.life / p.max;
        p.mesh.scale.setScalar(p.size * (1 + p.kind.grow * t));
        p.mesh.material.opacity = p.kind.opacity * (1 - t * t);
      }
    },
    active: () => pool.filter(p => p.mesh.visible).length,
  };
}

export function createHorse(color = '#6b4a33') {
  const coat = toon(color), mane = toon('#2a1e17'), hoof = toon('#2b2622'), leather = toon('#4a3020');
  const line = outlineMaterial(.012);
  const root = new THREE.Group(); root.userData.mount = true;
  const body = new THREE.Group(); body.position.y = 1.45; root.add(body);
  // Only large parts get an outline: a full charge has twenty horses on screen.
  const add = (parent, geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1], outlined = false) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.rotation.set(...rotation); mesh.scale.set(...scale);
    mesh.castShadow = true; parent.add(mesh); if (outlined) mesh.add(new THREE.Mesh(geometry, line)); return mesh;
  };
  add(body, new THREE.CapsuleGeometry(.42, 1.3, 6, 12), coat, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, .95], true);
  const neck = new THREE.Group(); neck.position.set(0, .25, .8); neck.rotation.x = -.75; body.add(neck);
  add(neck, new THREE.CapsuleGeometry(.2, .7, 6, 10), coat, [0, .45, 0]);
  add(neck, new THREE.BoxGeometry(.08, .75, .2), mane, [0, .45, -.18]);
  const head = new THREE.Group(); head.position.set(0, .95, 0); head.rotation.x = 1.55; neck.add(head);
  add(head, new THREE.CapsuleGeometry(.14, .5, 6, 10), coat, [0, .2, 0], [0, 0, 0], [1, 1, 1.15]);
  for (const s of [-1, 1]) add(head, new THREE.ConeGeometry(.05, .16, 5), coat, [s * .08, -.02, -.12], [-.3, 0, 0]);
  const tail = add(body, new THREE.ConeGeometry(.1, .9, 6), mane, [0, .05, -1.05], [-2.4, 0, 0]);
  const saddle = new THREE.Group(); saddle.position.set(0, .48, .05); body.add(saddle);
  add(saddle, new THREE.BoxGeometry(.5, .08, .6), leather, [0, 0, 0]);
  const legs = [];
  for (const [x, z] of [[-.22, .6], [.22, .6], [-.22, -.6], [.22, -.6]]) {
    const hip = new THREE.Group(); hip.position.set(x, -.2, z); body.add(hip);
    add(hip, new THREE.CapsuleGeometry(.1, .55, 4, 8), coat, [0, -.35, 0]);
    const knee = new THREE.Group(); knee.position.y = -.7; hip.add(knee);
    add(knee, new THREE.CapsuleGeometry(.065, .45, 4, 8), coat, [0, -.25, 0]);
    add(knee, new THREE.CylinderGeometry(.08, .09, .1, 8), hoof, [0, -.55, 0]);
    legs.push({ hip, knee, front: z > 0 });
  }
  return {
    root, saddle, body, legs,
    animate(time, gallop = 1) {
      const f = 10 * (gallop > 0 ? 1 : 0);
      legs.forEach((leg, i) => {
        const phase = time * f + (leg.front ? 0 : Math.PI * .6) + (i % 2) * .5;
        leg.hip.rotation.x = Math.sin(phase) * .6 * gallop; leg.knee.rotation.x = Math.max(0, Math.sin(phase + 1)) * .9 * gallop;
      });
      body.position.y = 1.45 + Math.abs(Math.sin(time * f)) * .12 * gallop; body.rotation.x = Math.sin(time * f) * .05 * gallop;
      neck.rotation.x = -.75 + Math.sin(time * f + .5) * .12 * gallop; tail.rotation.x = -2.4 + Math.sin(time * 3) * .1;
    },
  };
}
