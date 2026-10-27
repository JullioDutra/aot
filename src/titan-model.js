import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const sphere = new THREE.SphereGeometry(1, 18, 12);
const cube = new THREE.BoxGeometry(1, 1, 1);
const surface = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .82, ...extra });
function part(parent, geometry, mat, position, scale) {
  const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(...position); mesh.scale.set(...scale);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
const oval = (p, m, x, y, z, w, h, d) => part(p, sphere, m, [x, y, z], [w, h, d]);
function joint(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
function taper(parent, mat, top, bottom, length, y, depth = 1) {
  return part(parent, new THREE.CylinderGeometry(top, bottom, length, 14), mat, [0, y, 0], [1, 1, depth]);
}
// Consolidate rigid geometry within each articulated segment, preserving joints.
function batch(group) {
  const buckets = new Map();
  for (const child of [...group.children]) {
    if (child.isGroup) { batch(child); continue; }
    if (!child.isMesh) continue;
    child.updateMatrix();
    const list = buckets.get(child.material) || [];
    list.push(child.geometry.clone().applyMatrix4(child.matrix)); buckets.set(child.material, list); group.remove(child);
  }
  for (const [mat, geometries] of buckets) {
    const m = new THREE.Mesh(mergeGeometries(geometries), mat); m.castShadow = m.receiveShadow = true; group.add(m);
    geometries.forEach(g => g.dispose());
  }
}

export function createTitan(scene, x, z, height, index, options = {}) {
  const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root);
  const attack = options.variant === 'attack';
  const skin = surface(attack ? '#bfa28c' : ['#c1a691', '#c5b19b', '#b6a08e'][index % 3]);
  const accent = surface(attack ? '#b49781' : '#ae9480'), crease = surface('#806d5e');
  const hair = surface(attack ? '#302b24' : '#494035'), white = surface('#e5d8bb'), mouth = surface('#513a32');
  const iris = surface(attack ? '#83b095' : '#685c3c', attack ? { emissive: '#46634b', emissiveIntensity: .25 } : {});
  const body = joint(root, 0, 5.1, 0);
  // A continuous torso replaces the old stacked ellipsoids: narrow waist,
  // widening rib cage and a shoulder line. Heights stay compatible with ODM.
  const profile = [[.72, -.35], [1.0, 0], [.87, .6], [.83, 1.3], [1.17, 2], [1.55, 2.9], [1.6, 3.35], [1.2, 3.65], [.52, 4.1]].map(([r, y]) => new THREE.Vector2(r, y));
  part(body, new THREE.LatheGeometry(profile, 24), skin, [0, 0, 0], [1, 1, .61]);
  oval(body, skin, 0, -.15, 0, 1.04, .63, .67);
  taper(body, skin, .43, .57, 1.1, 4.15, .9);
  for (const side of [-1, 1]) {
    const chest = oval(body, skin, side * .74, 2.9, .65, .73, .5, .25); chest.rotation.z = side * .1;
    const back = oval(body, accent, side * .7, 2.95, -.52, .61, .8, .2); back.rotation.z = side * -.3;
    const oblique = oval(body, accent, side * .82, 1.65, .34, .2, .7, .25); oblique.rotation.z = side * -.22;
    for (let i = 0; i < 3; i++) oval(body, skin, side * .3, 2.05 - i * .48, .53 - i * .04, .29, .22, .18);
    const collar = oval(body, accent, side * .75, 3.55, .43, .77, .1, .12); collar.rotation.z = side * .12;
  }
  const head = joint(body, 0, 5.45, .04);
  oval(head, skin, 0, .1, 0, .73, 1.03, .69);
  oval(head, skin, 0, -.62, .19, .6, .45, .57);
  for (const side of [-1, 1]) {
    oval(head, accent, side * .45, -.12, .46, .24, .35, .23);
    oval(head, skin, side * .77, .08, -.05, .16, .33, .16);
    oval(head, crease, side * .3, .27, .585, .26, .18, .095);
    oval(head, white, side * .3, .27, .66, .19, .085, .06);
    oval(head, iris, side * .3, .27, .714, .065, .07, .025);
    const brow = oval(head, hair, side * .3, .45, .62, .26, .065, .08); brow.rotation.z = side * .15;
  }
  oval(head, skin, 0, .02, .7, .12, .33, .2);
  oval(head, accent, 0, -.21, .78, .19, .12, .14);
  oval(head, mouth, 0, -.48, .65, .43, .13, .055);
  for (let i = 0; i < 8; i++) part(head, cube, white, [(i - 3.5) * .094, -.46, .695,], [.075, .08, .035]);
  // A scalp layer and tapered locks form a deterministic, original hairstyle.
  part(head, new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, 1.65), hair, [0, .25, -.08], [.75, .96, .68]);
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2;
    const length = attack ? .8 + i % 3 * .2 : .45 + i % 3 * .12;
    const lock = part(head, new THREE.ConeGeometry(.23, length, 5), hair,
      [Math.sin(angle) * .62, .75 - (Math.cos(angle) < 0 ? .15 : 0), Math.cos(angle) * .5], [1, 1, 1]);
    lock.rotation.set(Math.cos(angle) * 2.1, angle, -Math.sin(angle) * 1.8);
  }
  oval(head, hair, 0, .91, -.12, .62, .23, .56);
  const legs = [], knees = [], arms = [], elbows = [], hands = [];
  for (const side of [-1, 1]) {
    const leg = joint(root, side * .65, 5.05, 0); legs.push(leg);
    taper(leg, skin, .59, .4, 2.2, -1.1, 1.05);
    oval(leg, skin, side * .05, -1.1, .1, .56, 1.05, .54);
    const knee = joint(leg, 0, -2.2, 0); knees.push(knee);
    oval(knee, accent, 0, -.02, .13, .38, .37, .4);
    taper(knee, skin, .34, .21, 2.35, -1.175, 1.05);
    oval(knee, skin, 0, -.8, -.12, .39, .75, .36);
    oval(knee, skin, 0, -2.55, .3, .35, .3, .7);
    for (let i = 0; i < 4; i++) oval(knee, accent, (i - 1.5) * .14, -2.64, .87, .09, .16, .16);
    const arm = joint(body, side * 1.55, 3.35, 0); arms.push(arm);
    oval(arm, skin, side * .06, -.12, 0, .57, .62, .55);
    taper(arm, skin, .4, .29, 1.85, -1.05, .95);
    oval(arm, skin, 0, -.95, .18, .4, .68, .35);
    const elbow = joint(arm, 0, -1.95, 0); elbows.push(elbow);
    oval(elbow, accent, 0, 0, 0, .29, .3, .29);
    taper(elbow, skin, .34, .18, 1.65, -.825, .9);
    const hand = joint(elbow, 0, -1.8, .04); hands.push(hand);
    oval(hand, skin, 0, -.22, 0, .3, .4, .18);
    for (let i = 0; i < 4; i++) oval(hand, skin, (i - 1.5) * .14, -.58, .06, .085, .25 - Math.abs(i - 1.5) * .025, .1);
    const thumb = oval(hand, skin, -side * .32, -.16, .07, .13, .26, .13); thumb.rotation.z = side * -.5;
  }
  const nape = joint(body, 0, 4.65, -.48);
  batch(root);
  const scale = height / 12.4; root.scale.setScalar(scale);
  return { root, body, head, nape, legs, knees, arms, elbows, hands, height, scale, index,
    alive: true, deathTime: 0, yaw: Math.PI, spawn: new THREE.Vector3(x, 0, z), attackTimer: 0, phase: 'walk' };
}
