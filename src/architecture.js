import * as THREE from 'three';

// Decorative facade relief shares a handful of draw calls across the district.
// Collision and cable targets remain the structural building surfaces.
export function addWindowDetails(scene, windows) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: '#807260', roughness: .9 });
  const sillMaterial = new THREE.MeshStandardMaterial({ color: '#b1aa96', roughness: .95 });
  const shutterMaterial = new THREE.MeshStandardMaterial({ color: '#465a50', roughness: .85 });
  const frame = new THREE.Object3D();
  function batch(material, pieces, filter = () => true) {
    const selected = windows.filter(filter);
    const mesh = new THREE.InstancedMesh(geometry, material, selected.length * pieces.length);
    let index = 0;
    for (const p of selected) for (const [x, y, z, w, h, d] of pieces) {
      const c = Math.cos(p.ry), s = Math.sin(p.ry);
      frame.position.set(p.x + c * x + s * z, p.y + y, p.z - s * x + c * z);
      frame.rotation.set(0, p.ry, 0); frame.scale.set(w, h, d); frame.updateMatrix();
      mesh.setMatrixAt(index++, frame.matrix);
    }
    mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere(); scene.add(mesh);
  }
  batch(frameMaterial, [[-.6, 0, 0, .12, 1.85, .2], [.6, 0, 0, .12, 1.85, .2], [0, .87, 0, 1.3, .12, .2], [0, 0, .02, .06, 1.6, .18], [0, -.1, .02, 1.1, .06, .18]]);
  batch(sillMaterial, [[0, -.9, .05, 1.5, .18, .4]]);
  batch(shutterMaterial, [[-.91, 0, .01, .43, 1.65, .16], [.91, 0, .01, .43, 1.65, .16]], (_, i) => i % 3 !== 0);
}

export function addGateDetails(scene, box, stone, timber, metal) {
  // A closed timber gate remains inside the existing solid collision volume.
  for (let x = -9; x <= 9; x += 1.5) box(scene, timber, x, 10.5, -160.8, 1.38, 21, .3);
  for (const y of [3, 10, 17]) box(scene, metal, 0, y, -160.55, 19.6, .3, .18);
  for (const x of [-8, -4, 0, 4, 8]) for (const y of [3, 10, 17]) box(scene, stone, x, y, -160.4, .18, .18, .12);
  for (const x of [-11.5, 11.5]) {
    box(scene, stone, x, 12, -154.7, 3, 24, .6);
    box(scene, stone, x, 1, -154.5, 4, 2, 1);
    box(scene, stone, x, 23, -154.4, 4, 1, 1.2);
    for (let y = 3; y < 23; y += 2) box(scene, metal, x, y, -154.32, 3, .04, .03);
  }
  // Voussoirs form a raised semicircular arch above the entrance.
  for (let i = 0; i < 17; i++) {
    const angle = (i + .5) * Math.PI / 17;
    const block = box(scene, stone, Math.cos(angle) * 11.5, 22 + Math.sin(angle) * 11.5, -154.5, 2.05, 2.6, 1);
    block.rotation.z = angle - Math.PI / 2;
  }
  box(scene, stone, 0, 37, -154.3, 9, 3, 1);
  box(scene, metal, 0, 37, -153.75, 6.8, 1.6, .12);
  for (const x of [-1.1, 1.1]) {
    const crest = box(scene, stone, x, 37, -153.64, .6, 1.25, .1);
    crest.rotation.z = x < 0 ? -.4 : .4;
  }
}
