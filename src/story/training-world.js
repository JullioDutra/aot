import * as THREE from 'three';
import { toon, outlineMaterial } from '../character-model.js';

// Training grounds of the 104th Cadet Corps (847–850): barracks and parade
// ground, the balance rig, the sparring ring, a cable course of tall posts,
// the forest of giant trees with wooden titan targets and the mess hall.
export const RIG = Object.freeze([20, 20]);
export const RING = Object.freeze([-10, 0]);
export const COURSE = Object.freeze([[70, 9, -10], [100, 11, -32], [130, 9, -12], [154, 12, -44]]);
export const HALL = Object.freeze([300, 0]);
export const FOREST_START = Object.freeze([0, -112]);

export function createTrainingGrounds(scene) {
  const line = outlineMaterial(.05);
  const group = new THREE.Group(); scene.add(group);
  const colliders = [], anchorRoots = [];
  const mat = {
    grass: toon('#8fa864'), dirt: toon('#a8956f'), wood: toon('#7b5a3c'), plank: toon('#a07e57'), roof: toon('#6e4a36'), plaster: toon('#ddd2bc'),
    bark: toon('#5d4330'), leaf: [toon('#46703a'), toon('#3d6332'), toon('#557d41')], rope: toon('#cdbb8f'), nape: toon('#9c2d24'), target: toon('#b9925f'),
    hall: new THREE.MeshToonMaterial({ color: '#8a6e4e', side: THREE.DoubleSide }), table: toon('#6d4d33'),
  };
  const box = (m, x, y, z, w, h, d, parent = group, outlined = true) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); if (outlined) mesh.add(new THREE.Mesh(mesh.geometry, line)); return mesh; };
  const solid = (minX, maxX, minZ, maxZ, top) => { const c = { minX, maxX, minZ, maxZ, top }; colliders.push(c); return c; };
  let seed = 7; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat.grass); ground.rotation.x = -Math.PI / 2; ground.position.z = -200; ground.receiveShadow = true; group.add(ground);
  const parade = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), mat.dirt); parade.rotation.x = -Math.PI / 2; parade.position.set(0, .02, 25); parade.receiveShadow = true; group.add(parade);

  // Barracks with pitched roofs and a flagpole.
  for (const z of [62, 84]) {
    box(mat.plaster, -30, 3, z, 46, 6, 11);
    const gable = new THREE.Shape(); gable.moveTo(-6.3, 0); gable.lineTo(0, 3.4); gable.lineTo(6.3, 0); gable.closePath();
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 47, bevelEnabled: false }), mat.roof); roof.rotation.y = Math.PI / 2; roof.position.set(-53.5, 6, z); roof.castShadow = true; group.add(roof);
    for (let i = 0; i < 8; i++) box(toon('#3d4c55'), -50 + i * 5.6, 3.2, z - 5.55, 1.2, 1.4, .1, group, false);
    solid(-53, -7, z - 5.5, z + 5.5, 6);
  }
  box(mat.wood, 22, 7, 52, .3, 14, .3); const flag = box(toon('#3d5f8c'), 23.4, 12.6, 52, 2.6, 1.6, .05, group, false);

  // Balance rig: two posts, a crossbar and two ropes to the cadet's belt.
  box(mat.wood, RIG[0] - 2, 2.4, RIG[1], .35, 4.8, .35); box(mat.wood, RIG[0] + 2, 2.4, RIG[1], .35, 4.8, .35); box(mat.wood, RIG[0], 4.8, RIG[1], 4.6, .3, .3);
  const ropes = [-1, 1].map(s => { const rope = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 5), mat.rope); rope.position.set(RIG[0] + s * .5, 3.6, RIG[1]); group.add(rope); return rope; });
  solid(RIG[0] - 2.3, RIG[0] - 1.7, RIG[1] - .3, RIG[1] + .3, 4.8); solid(RIG[0] + 1.7, RIG[0] + 2.3, RIG[1] - .3, RIG[1] + .3, 4.8);

  // Sparring ring.
  for (const [x, z] of [[-4, -4], [4, -4], [4, 4], [-4, 4]]) box(mat.wood, RING[0] + x, .7, RING[1] + z, .2, 1.4, .2);
  for (const [x, z, w, d] of [[0, -4, 8, .06], [0, 4, 8, .06], [-4, 0, .06, 8], [4, 0, .06, 8]]) box(mat.rope, RING[0] + x, 1.1, RING[1] + z, w || .06, .06, d || .06, group, false);

  // Cable course: tall posts in two rows and four hoops to fly through.
  const course = new THREE.Group(); group.add(course); anchorRoots.push(course);
  for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
    const x = 56 + i * 13, z = -24 + side * 22 + (i % 2) * 6;
    box(mat.wood, x, 12, z, 1.2, 24, 1.2, course); solid(x - .6, x + .6, z - .6, z + .6, 24);
  }
  const hoops = COURSE.map(([x, y, z], i) => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(3.6, .22, 8, 28), toon(i === 0 ? '#e0b44a' : '#c9b48b')); hoop.position.set(x, y, z); hoop.rotation.y = Math.PI / 2 + (i % 2 ? .5 : -.3); hoop.userData.noAnchor = true; group.add(hoop);
    box(mat.wood, x, (y - 3.6) / 2, z, .3, y - 3.6, .3, group, false).userData.noAnchor = true;
    return hoop;
  });

  // Forest of giant trees: instanced trunks and crowns, every trunk anchors.
  const forest = new THREE.Group(); group.add(forest); anchorRoots.push(forest);
  const trees = [];
  for (let z = -130; z > -540; z -= 17) for (let x = -96; x <= 96; x += 19) {
    const px = x + (rand() - .5) * 9, pz = z + (rand() - .5) * 8;
    if (Math.abs(px) < 6 && pz > -170) continue;
    trees.push({ x: px, z: pz, r: 1.5 + rand() * 1.1, h: 34 + rand() * 14 });
  }
  const trunkGeo = new THREE.CylinderGeometry(.75, 1, 1, 9), crownGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunks = new THREE.InstancedMesh(trunkGeo, mat.bark, trees.length), crowns = new THREE.InstancedMesh(crownGeo, mat.leaf[0], trees.length * 3);
  trunks.castShadow = trunks.receiveShadow = crowns.castShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  trees.forEach((t, i) => {
    trunks.setMatrixAt(i, m.compose(p.set(t.x, t.h / 2, t.z), q.identity(), s.set(t.r * 2, t.h, t.r * 2)));
    for (let k = 0; k < 3; k++) crowns.setMatrixAt(i * 3 + k, m.compose(p.set(t.x + Math.cos(k * 2.1) * 3, t.h - 2 + k * 3, t.z + Math.sin(k * 2.1) * 3), q.identity(), s.setScalar(6 + k * 1.5)));
    solid(t.x - t.r, t.x + t.r, t.z - t.r, t.z + t.r, t.h);
  });
  forest.add(trunks, crowns);

  // Wooden titan targets: a plank body and head on a frame, the nape a red
  // leather patch on the back of the neck. Hidden ones sit low behind trunks.
  const targets = [];
  const spots = [[-14, -160], [16, -182], [-30, -205], [8, -228], [34, -246], [-18, -262], [22, -290], [-40, -310], [4, -330], [42, -352], [-22, -372], [14, -398], [-36, -420], [30, -440], [-8, -466], [52, -480]];
  const hidden = [[-60, -230], [66, -300], [-70, -400], [74, -455]];
  for (const [list, isHidden] of [[spots, false], [hidden, true]]) for (const [x, z] of list) {
    const g = new THREE.Group(); const h = isHidden ? 5 + rand() * 2 : 7 + rand() * 3; g.position.set(x, 0, z); g.rotation.y = rand() * Math.PI * 2; group.add(g);
    for (const sx of [-1, 1]) box(mat.wood, sx * 1.3, h * .4, -.6, .3, h * .8, .3, g, false);
    const body = box(mat.target, 0, h * .55, 0, 2.6, h * .5, .4, g); const head = box(mat.target, 0, h * .9, 0, 1.6, 1.8, .5, g);
    const nape = box(mat.nape, 0, h * .82, -.35, 1, .7, .2, g, false);
    targets.push({ group: g, body, head, napeMesh: nape, hidden: isHidden, cut: false, height: h });
  }

  // Mess hall: one room with three long tables.
  const hall = new THREE.Group(); hall.position.set(HALL[0], 0, HALL[1]); group.add(hall);
  box(toon('#7e6446'), 0, -.1, 0, 30, .2, 22, hall, false);
  for (const [x, z, w, d] of [[0, -11, 30, .4], [0, 11, 30, .4], [-15, 0, .4, 22], [15, 0, .4, 22]]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 7, d), mat.hall); wall.position.set(x, 3.5, z); hall.add(wall); }
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(30, .3, 22), mat.hall); ceiling.position.y = 7; hall.add(ceiling);
  const hallColliders = [];
  for (const x of [-7, 0, 7]) { box(mat.table, x, .8, -1, 2, .15, 9, hall); for (const sx of [-1.7, 1.7]) box(mat.plank, x + sx, .45, -1, .5, .1, 9, hall, false); hallColliders.push({ minX: HALL[0] + x - 2.2, maxX: HALL[0] + x + 2.2, minZ: -5.6, maxZ: 3.6 }); }
  for (let i = 0; i < 4; i++) { const lamp = new THREE.PointLight('#ffbd73', 40, 26); lamp.position.set(-10 + i * 7, 5.5, i % 2 ? 4 : -2); hall.add(lamp); }

  return {
    group, colliders, anchorRoots, hoops, targets, trees, hallColliders, ropes, flag,
    bounds: { minX: -200, maxX: 260, minZ: -560, maxZ: 120 },
    hallBounds: { minX: HALL[0] - 14, maxX: HALL[0] + 14, minZ: -10, maxZ: 9 },
  };
}
