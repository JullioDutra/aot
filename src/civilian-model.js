import * as THREE from 'three';

const box = new THREE.BoxGeometry(1, 1, 1), sphere = new THREE.SphereGeometry(1, 10, 8);
export function createCivilians(parent) {
  const skin = new THREE.MeshStandardMaterial({ color: '#c8a58a', roughness: .9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3e3832', roughness: .9 });
  function mesh(group, geometry, material, x, y, z, sx, sy, sz) {
    const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; group.add(m); return m;
  }
  return ['#a8a38b', '#737e78', '#b29a80'].map((color, i) => {
    const root = new THREE.Group(); parent.add(root); root.position.set((i - 1) * 1.2, 0, i % 2);
    const coat = new THREE.MeshStandardMaterial({ color, roughness: .9 });
    mesh(root, box, coat, 0, 1.15, 0, .56, .65, .34);
    mesh(root, sphere, skin, 0, 1.69, 0, .2, .25, .21);
    mesh(root, sphere, dark, 0, 1.82, -.03, .21, .14, .21);
    const legs = [], arms = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * .15, .85, 0); root.add(leg);
      mesh(leg, box, dark, 0, -.38, 0, .21, .76, .23); mesh(leg, box, dark, 0, -.78, .07, .22, .13, .35); legs.push(leg);
      const arm = new THREE.Group(); arm.position.set(side * .36, 1.38, 0); root.add(arm);
      mesh(arm, box, coat, 0, -.24, 0, .17, .48, .2); mesh(arm, sphere, skin, 0, -.51, 0, .09, .11, .1); arms.push(arm);
    }
    return { root, legs, arms, index: i };
  });
}
export function animateCivilians(actors, moving, time, heading, afraid = false) {
  for (const actor of actors) {
    actor.root.rotation.y = heading;
    actor.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(time * 10 + i * Math.PI + actor.index) * .5 : 0; });
    actor.arms.forEach((arm, i) => { arm.rotation.x = afraid ? -1.1 : moving ? -Math.sin(time * 10 + i * Math.PI + actor.index) * .35 : -.08; });
  }
}
