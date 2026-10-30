import * as THREE from 'three';
import { toon } from '../character-model.js';

// The Founding Titan of the Rumbling (chapters 45 and 46): a skeletal spine
// walking high above the ground, ribs hanging from it, flesh clinging between
// the bones. Bones are tagged 'bone' (cables hold) and flesh 'flesh' (cables
// tear away). Every vertebra is a collider to stand on.
export const FOUNDER = Object.freeze({ y: 70, from: 60, to: -200, radius: 5, head: [0, -214] });

export function createFounder(scene, world) {
  const group = new THREE.Group(); scene.add(group); world.anchorRoots.push(group);
  const bone = toon('#e8e0cc'), flesh = toon('#9a4a48');
  const tagged = (mesh, tag) => { mesh.userData.tag = tag; mesh.castShadow = true; group.add(mesh); return mesh; };
  const vertebrae = [];
  for (let z = FOUNDER.from, i = 0; z > FOUNDER.to; z -= 9, i++) {
    const v = tagged(new THREE.Mesh(new THREE.CylinderGeometry(FOUNDER.radius, FOUNDER.radius * 1.1, 7, 10), bone), 'bone');
    v.rotation.x = Math.PI / 2; v.position.set(Math.sin(i * .3) * 2, FOUNDER.y, z); vertebrae.push(v);
    const spike = tagged(new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 6), bone), 'bone'); spike.position.set(v.position.x, FOUNDER.y + 7, z);
    world.colliders.push({ minX: v.position.x - FOUNDER.radius, maxX: v.position.x + FOUNDER.radius, minZ: z - 4.5, maxZ: z + 4.5, top: FOUNDER.y + FOUNDER.radius, bottom: FOUNDER.y - FOUNDER.radius, tag: 'bone' });
    if (i % 2 === 0) for (const s of [-1, 1]) {
      const rib = tagged(new THREE.Mesh(new THREE.TorusGeometry(18, 1.1, 6, 16, Math.PI * .7), bone), 'bone');
      rib.position.set(v.position.x, FOUNDER.y - 2, z); rib.rotation.set(0, Math.PI / 2, s > 0 ? -Math.PI * .85 : Math.PI * .15);
    }
    if (i % 3 === 1) { const m = tagged(new THREE.Mesh(new THREE.IcosahedronGeometry(6 + (i % 4), 1), flesh), 'flesh'); m.scale.set(1.4, .7, 1); m.position.set(v.position.x + (i % 2 ? 9 : -9), FOUNDER.y - 6, z); }
  }
  // Legs of bone reaching down to the ground.
  for (const [x, z] of [[-14, 30], [14, 30], [-14, -150], [14, -150]]) { const leg = tagged(new THREE.Mesh(new THREE.CylinderGeometry(3, 4, FOUNDER.y, 8), bone), 'bone'); leg.position.set(x, FOUNDER.y / 2, z); world.colliders.push({ minX: x - 3.5, maxX: x + 3.5, minZ: z - 3.5, maxZ: z + 3.5, top: FOUNDER.y - 6, tag: 'bone' }); }
  const top = z => { const v = vertebrae.reduce((b, v) => (Math.abs(v.position.z - z) < Math.abs(b.position.z - z) ? v : b)); return { x: v.position.x, y: FOUNDER.y + FOUNDER.radius, z: v.position.z }; };
  return { group, vertebrae, top };
}
