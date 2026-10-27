import * as THREE from 'three';
import { LOCATIONS } from './trost-mission.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 12, 10);
export function material(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...extra }); }
export function box(parent, mat, x, y, z, w, h, d, shadow = true) {
  const mesh = new THREE.Mesh(boxGeo, mat);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function ellipsoid(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(sphereGeo, mat);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function texture(type, color) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d'); c.fillStyle = color; c.fillRect(0, 0, 256, 256);
  let seed = 71;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let y = 0; y < 256; y += type === 'roof' ? 16 : 32) {
    for (let x = -32; x < 256; x += 64) {
      const shift = (y / 32) % 2 ? 32 : 0;
      c.fillStyle = `rgba(15,17,17,${.04 + rand() * .17})`;
      c.fillRect(x + shift, y, 62, type === 'roof' ? 14 : 30);
      c.strokeStyle = 'rgba(235,220,185,.12)'; c.strokeRect(x + shift, y, 62, type === 'roof' ? 14 : 30);
    }
  }
  for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${rand() > .5 ? '255,255,255' : '0,0,0'},.035)`; c.fillRect(rand() * 256, rand() * 256, 2, 2); }
  const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function roofGeometry(w, h, d) {
  const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
}

export function createWorld(scene) {
  const existing = new Set(scene.children);
  const colliders = [], anchors = [], windows = [];
  const stoneTexture = texture('stone', '#a4a99b'); stoneTexture.repeat.set(4, 6);
  const wallMat = material('#b2b5a8', { map: stoneTexture });
  const trimMat = material('#737d76'); const timber = material('#4c4439');
  const roofTex = texture('roof', '#814c39'); roofTex.repeat.set(2, 3);
  const roofMat = material('#be9780', { map: roofTex });
  const plaster = ['#c4bba5', '#aaa992', '#b7a98d', '#d1c6ad', '#aaa69a'].map(color => material(color));
  const roadTex = texture('stone', '#777d71'); roadTex.repeat.set(65, 65); roadTex.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), material('#a3a68e', { map: roadTex }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); anchors.push(ground);
  const roadMat = material('#898b7c');
  box(scene, roadMat, 0, .025, -5, 31, .05, 270, false);
  for (const z of [-80, -48, -16, 16, 48, 80]) box(scene, roadMat, 0, .03, z, 240, .06, 9, false);
  const addCollider = (x, z, w, d, h, extra = {}) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h, ...extra });
  function building(x, z, w, d, h, index) {
    const m = box(scene, plaster[index % plaster.length], x, h / 2, z, w, h, d); anchors.push(m);
    const roof = new THREE.Mesh(roofGeometry(w + 1.3, 4, d + 1.5), roofMat); roof.position.set(x, h, z); roof.castShadow = true; roof.receiveShadow = true; scene.add(roof); anchors.push(roof);
    addCollider(x, z, w, d, h);
    addCollider(x, z, w + 1.3, d + 1.5, h, { bottom: h, roofRise: 4 });
    box(scene, timber, x, h - .8, z, w + .1, .22, d + .1);
    box(scene, trimMat, x, 1, z, w + .3, 2, d + .3);
    for (let level = 3.8; level < h - 1; level += 3.6) {
      for (let xx = -w / 2 + 2; xx < w / 2 - 1; xx += 3.3) {
        windows.push({ x: x + xx, y: level, z: z + d / 2 + .06, ry: 0 });
        windows.push({ x: x + xx, y: level, z: z - d / 2 - .06, ry: 0 });
      }
      for (let zz = -d / 2 + 2; zz < d / 2 - 1; zz += 3.6) {
        windows.push({ x: x + w / 2 + .06, y: level, z: z + zz, ry: Math.PI / 2 });
        windows.push({ x: x - w / 2 - .06, y: level, z: z + zz, ry: Math.PI / 2 });
      }
    }
    box(scene, timber, x, 1.5, z + d / 2 + .1, 1.6, 3, .2);
    const chimney = box(scene, trimMat, x + w * .27, h + 4, z - d * .2, 1.2, 3.4, 1.4); anchors.push(chimney);
    addCollider(x + w * .27, z - d * .2, 1.2, 1.4, h + 5.7, { bottom: h + 2.3 });
  }
  let n = 0;
  for (const x of [-104, -77, -49, -27, 27, 49, 77, 104]) {
    for (const z of [-110, -78, -46, -14, 18, 50, 82]) {
      if ((Math.abs(x) === 27 && (z === 18 || z === 50)) || (x === 49 && z === -46)) continue;
      const h = 10 + ((n * 13 + 5) % 12); building(x, z, Math.abs(x) === 27 ? 13 : 18, 19 + n % 4, h, n++);
    }
  }
  // Starting roof and a landmark bell tower; both are valid anchor geometry.
  building(-25, 65, 16, 15, 13, 3);
  building(-64, -112, 19, 22, 25, 2);
  const tower = box(scene, plaster[1], -64, 31, -112, 10, 28, 10); anchors.push(tower); addCollider(-64, -112, 10, 10, 45);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(9, 17, 4), material('#536862')); spire.position.set(-64, 53, -112); spire.rotation.y = Math.PI / 4; spire.castShadow = true; scene.add(spire);
  const frame = new THREE.Object3D();
  const windowMesh = new THREE.InstancedMesh(boxGeo, material('#253a3b', { metalness: .15, roughness: .45 }), windows.length);
  windows.forEach((p, i) => { frame.position.set(p.x, p.y, p.z); frame.rotation.set(0, p.ry, 0); frame.scale.set(1.1, 1.6, .12); frame.updateMatrix(); windowMesh.setMatrixAt(i, frame.matrix); });
  scene.add(windowMesh);
  // Four 50 m defensive walls surround the district. The north gate is visible from the main avenue.
  for (const x of [-145, 145]) { const m = box(scene, wallMat, x, 25, -15, 9, 50, 300); anchors.push(m); addCollider(x, -15, 9, 300, 50); }
  for (const x of [-82, 82]) { const m = box(scene, wallMat, x, 25, -160, 144, 50, 10); anchors.push(m); addCollider(x, -160, 144, 10, 50); }
  const arch = box(scene, wallMat, 0, 36, -160, 20, 28, 10); anchors.push(arch);
  const gate = box(scene, timber, 0, 11, -162, 20, 22, 2); anchors.push(gate); addCollider(0, -160, 20, 10, 50);
  const backWall = box(scene, wallMat, 0, 25, 135, 298, 50, 9); anchors.push(backWall); addCollider(0, 135, 298, 9, 50);
  for (let t = -140; t <= 140; t += 14) {
    for (const x of [-145, 145]) { box(scene, trimMat, x + (x < 0 ? 4.6 : -4.6), 25, t - 15, .7, 50, 1); box(scene, wallMat, x, 51, t - 15, 10, 2, 8); }
    box(scene, trimMat, t, 25, -154.8, 1, 50, .6); box(scene, wallMat, t, 51, -160, 8, 2, 11);
    box(scene, wallMat, t, 51, 135, 8, 2, 10);
  }
  for (const x of [-145, 145]) box(scene, trimMat, x, 48.5, -15, 10, 1, 300);
  box(scene, trimMat, 0, 48.5, -160, 300, 1, 11);
  // Supply point and civilian pocket, deliberately reachable without cables.
  const supply = new THREE.Vector3(...LOCATIONS.supply);
  const supplyGroup = new THREE.Group(); supplyGroup.position.copy(supply); scene.add(supplyGroup);
  const teal = material('#4d9f9d', { emissive: '#226666', emissiveIntensity: .3 });
  box(supplyGroup, timber, 0, .9, 0, 3, 1.8, 2.2); box(supplyGroup, teal, 0, 1.9, 0, 3.2, .3, 2.3);
  box(supplyGroup, material('#e6e4c3'), 0, 1.15, 1.12, 1.3, .25, .07); box(supplyGroup, material('#e6e4c3'), 0, 1.15, 1.12, .25, 1.2, .08);
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.7), teal); marker.position.set(13, 5, 42); scene.add(marker);
  const rescue = new THREE.Vector3(...LOCATIONS.rescue); const civilians = new THREE.Group(); civilians.position.copy(rescue); scene.add(civilians);
  for (let i = 0; i < 3; i++) { const p = new THREE.Group(); p.position.set(i * 1.1 - 1, 0, i % 2); civilians.add(p); box(p, plaster[i], 0, .9, 0, .55, 1.2, .4); ellipsoid(p, material('#c9aa89'), 0, 1.65, 0, .22, .27, .23); }
  const extraction = new THREE.Vector3(...LOCATIONS.extraction);
  const extractionBeacon = new THREE.Group(); extractionBeacon.position.copy(extraction); scene.add(extractionBeacon);
  const beaconMaterial = material('#7dcc9c', { emissive: '#378557', emissiveIntensity: .7, transparent: true, opacity: .65 });
  const beaconRing = new THREE.Mesh(new THREE.TorusGeometry(6, .12, 8, 48), beaconMaterial); beaconRing.rotation.x = -Math.PI / 2; beaconRing.position.y = .14; extractionBeacon.add(beaconRing);
  const signal = new THREE.Mesh(new THREE.CylinderGeometry(.15, .65, 12, 12), beaconMaterial); signal.position.y = 6; extractionBeacon.add(signal);
  extractionBeacon.visible = false;
  // Debris clusters keep the main navigation lanes open.
  const rubble = new THREE.InstancedMesh(boxGeo, trimMat, 80);
  for (let i = 0; i < 80; i++) { const side = i % 2 ? 1 : -1; frame.position.set(side * (17 + Math.sin(i * 4) * 2), .25, -120 + (i * 31) % 230); frame.rotation.set(i, i * 2, i / 4); frame.scale.set(.4 + (i % 3) * .3, .3, .7); frame.updateMatrix(); rubble.setMatrixAt(i, frame.matrix); } rubble.castShadow = true; scene.add(rubble);
  // Mountain silhouette outside the walls.
  const mountain = material('#7c9693');
  for (let i = 0; i < 15; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(55 + i % 3 * 20, 60 + i % 4 * 22, 5), mountain); m.position.set(-450 + i * 65, 10, -340 - i % 3 * 40); scene.add(m); }
  const flagMat = material('#334e4a', { side: THREE.DoubleSide }); const flags = [];
  for (const x of [-16, 16]) { box(scene, timber, x, 5, 47, .12, 10, .12); const f = new THREE.Mesh(new THREE.PlaneGeometry(2, 3, 5, 6), flagMat); f.position.set(x + 1, 8, 47); scene.add(f); flags.push(f); }
  // Batch static geometry by material. Keep original anchor meshes as CPU raycast
  // targets with their world transforms, without submitting them for rendering.
  scene.updateMatrixWorld(true);
  const batches = new Map();
  for (const object of [...scene.children]) {
    if (existing.has(object) || !object.isMesh || object.isInstancedMesh || object === marker || flags.includes(object)) continue;
    const entries = batches.get(object.material) || [];
    entries.push(object.geometry.clone().applyMatrix4(object.matrixWorld)); batches.set(object.material, entries);
    scene.remove(object);
  }
  for (const [mat, geometries] of batches) {
    const merged = new THREE.Mesh(mergeGeometries(geometries), mat); merged.castShadow = true; merged.receiveShadow = true; scene.add(merged);
    for (const geometry of geometries) geometry.dispose();
  }
  return { colliders, anchors, supply, rescue, civilians, marker, flags, extraction, extractionBeacon };
}

export function createCadet(scene) {
  const root = new THREE.Group(); scene.add(root);
  const coat = material('#8d7050'), pants = material('#c8c8b6'), leather = material('#3f342e'), skin = material('#d0b49a'), metal = material('#8eaaa9', { metalness: .7, roughness: .3 });
  box(root, coat, 0, 1.3, 0, .65, .75, .36);
  ellipsoid(root, skin, 0, 1.94, 0, .24, .3, .24);
  ellipsoid(root, leather, 0, 2.08, -.05, .25, .2, .25);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .18, .95, 0); root.add(leg); box(leg, pants, 0, -.3, 0, .24, .6, .25); box(leg, leather, 0, -.7, .03, .25, .35, .35); legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .43, 1.58, 0); root.add(arm); box(arm, coat, 0, -.25, 0, .2, .55, .23); box(arm, skin, 0, -.55, 0, .17, .15, .17);
    const blade = box(arm, metal, 0, -.55, .7, .065, .1, 1.45); arms.push(arm);
    box(root, metal, side * .49, .91, -.1, .25, .34, .7);
    box(root, leather, side * .19, .99, .205, .09, .9, .04);
  }
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.2, 4, 5), material('#304e43', { side: THREE.DoubleSide })); cape.position.set(0, 1.15, -.26); root.add(cape);
  return { root, legs, arms, cape };
}

export { createTitan } from './titan-model.js';
