import * as THREE from 'three';
import { toon, outlineMaterial } from '../character-model.js';
import { LANDMARKS } from './shiganshina-script.js';

// Shiganshina district, 845. North: inner gate toward Wall Maria and the hill
// with the tree; south: the outer gate the Colossal kicks. A main avenue runs
// north–south, a canal crosses east–west under a bridge. Houses are boxes with
// timber frames and pitched roofs; some can collapse into rubble.

export const BOUNDS = Object.freeze({ minX: -118, maxX: 118, minZ: -112, maxZ: 230 });
const WALL_HEIGHT = 50;

function brickTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d'); c.fillStyle = '#b9b2a2'; c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 256; x += 64) {
    c.fillStyle = ['#b3ab9a', '#c2bba9', '#aaa290'][(x + y) % 3 === 0 ? 0 : (x * y) % 2 ? 1 : 2]; c.fillRect(x + 2, y + 2, 60, 28);
  }
  const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createShiganshina(scene, { outline = true } = {}) {
  const line = outline ? outlineMaterial(.06) : null;
  const group = new THREE.Group(); scene.add(group);
  const colliders = [];
  const solid = (minX, maxX, minZ, maxZ, tag) => { const c = { minX, maxX, minZ, maxZ, tag }; colliders.push(c); return c; };
  const mat = {
    grass: toon('#8da862'), field: toon('#a7b46d'), cobble: toon('#b6ab93'), dirt: toon('#a3916f'),
    wall: new THREE.MeshToonMaterial({ map: (() => { const t = brickTexture(); t.repeat.set(30, 6); return t; })(), color: '#ffffff' }),
    wallTop: toon('#8f897b'), plaster: [toon('#ece3cf'), toon('#e3d6bd'), toon('#efe8da'), toon('#d9cdb4')],
    timber: toon('#5b3f2b'), roof: [toon('#a2533c'), toon('#8f4a37'), toon('#7e5a45'), toon('#9d6b4b')],
    water: new THREE.MeshToonMaterial({ color: '#5f8f9f', transparent: true, opacity: .88 }), stone: toon('#9b9384'),
    trunk: toon('#6b4a32'), leaf: [toon('#557d3a'), toon('#628d42'), toon('#4b6f33')], door: toon('#4a6a86'), cloth: [toon('#b5584a'), toon('#d7c497'), toon('#6f8c9a')],
    rubble: toon('#8d8273'), gate: toon('#5e4a37'), iron: toon('#4a4642'),
  };
  const box = (m, x, y, z, w, h, d, parent = group) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); if (line && w * h * d < 4000) { const o = new THREE.Mesh(mesh.geometry, line); mesh.add(o); } return mesh; };

  // Ground: field and hill outside the inner gate, paved district inside.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat.field); ground.rotation.x = -Math.PI / 2; ground.position.z = 60; ground.receiveShadow = true; group.add(ground);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(236, 224), mat.cobble); pave.rotation.x = -Math.PI / 2; pave.position.set(0, .02, 0); pave.receiveShadow = true; group.add(pave);
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat.grass); hill.scale.set(70, 7, 48); hill.position.set(0, -1.5, 185); hill.receiveShadow = true; group.add(hill);
  const hillHeight = (x, z) => { const u = x / 70, v = (z - 185) / 48, d = 1 - u * u - v * v; return d > 0 ? Math.sqrt(d) * 7 - 1.5 : 0; };
  // The tree on the hill: thick trunk and layered crown.
  const tree = new THREE.Group(); tree.position.set(0, hillHeight(0, 182), 182); group.add(tree);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.7, 1.3, 9, 10), mat.trunk); trunk.position.y = 4.5; trunk.castShadow = true; tree.add(trunk);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.25, .45, 5, 6), mat.trunk); b.position.set(Math.cos(i * 1.7) * 1.6, 8, Math.sin(i * 1.7) * 1.6); b.rotation.set(Math.sin(i) * .7, 0, Math.cos(i * 1.7) * .8); tree.add(b); }
  for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 2 + (i % 4) * 1.4; const leaf = new THREE.Mesh(new THREE.SphereGeometry(2.6 + (i % 3) * .8, 12, 10), mat.leaf[i % 3]); leaf.position.set(Math.cos(a) * r, 10 + (i % 5) * 1.1, Math.sin(a) * r); leaf.castShadow = true; tree.add(leaf); if (line) leaf.add(new THREE.Mesh(leaf.geometry, outlineMaterial(.08))); }
  solid(-1.2, 1.2, 180.8, 183.2, 'tree');

  // Walls: 50 m, with an inner gate (north) and outer gate (south).
  const walls = new THREE.Group(); group.add(walls);
  const wallSegment = (x1, z1, x2, z2, gapCenter = null, gapWidth = 0) => {
    const horizontal = z1 === z2;
    const length = horizontal ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const pieces = gapCenter === null ? [[horizontal ? (x1 + x2) / 2 : (z1 + z2) / 2, length]] : (() => {
      const a = Math.min(horizontal ? x1 : z1, horizontal ? x2 : z2), b = Math.max(horizontal ? x1 : z1, horizontal ? x2 : z2);
      return [[(a + gapCenter - gapWidth / 2) / 2, gapCenter - gapWidth / 2 - a], [(gapCenter + gapWidth / 2 + b) / 2, b - gapCenter - gapWidth / 2]];
    })();
    for (const [center, len] of pieces) {
      const w = horizontal ? len : 8, d = horizontal ? 8 : len, x = horizontal ? center : x1, z = horizontal ? z1 : center;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_HEIGHT, d), mat.wall); mesh.position.set(x, WALL_HEIGHT / 2, z); mesh.castShadow = mesh.receiveShadow = true; walls.add(mesh);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1.5, d + 1), mat.wallTop); top.position.set(x, WALL_HEIGHT + .75, z); walls.add(top);
      solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'wall');
    }
    if (gapCenter !== null) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? gapWidth : 8, WALL_HEIGHT - 16, horizontal ? 8 : gapWidth), mat.wall);
      lintel.position.set(horizontal ? gapCenter : x1, 16 + (WALL_HEIGHT - 16) / 2, horizontal ? z1 : gapCenter); walls.add(lintel);
    }
  };
  wallSegment(-120, 116, 120, 116, 0, 14);
  wallSegment(-120, -118, 120, -118, 0, 14);
  wallSegment(-120, -118, -120, 116); wallSegment(120, -118, 120, 116);
  const gate = (z, open) => { const g = new THREE.Group(); g.position.set(0, 0, z); walls.add(g); const door = box(mat.gate, 0, 8, 0, 14, 16, 2.5, g); for (let i = -2; i <= 2; i++) box(mat.iron, i * 2.8, 8, 1.4, .4, 16, .3, g); if (open) door.position.y = 15.5; return g; };
  const innerGate = gate(116, true);
  const outerGate = gate(-118, false);
  const outerBlock = solid(-7, 7, -120, -116, 'outer-gate');

  // Canal with stone banks and two bridges.
  const canalZ = -22;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(236, 9), mat.water); water.rotation.x = -Math.PI / 2; water.position.set(0, -.6, canalZ); group.add(water);
  for (const side of [-1, 1]) box(mat.stone, 0, -.2, canalZ + side * 5, 236, 1, 1.2);
  for (const [x, w] of [[0, 14], [-70, 7]]) {
    box(mat.stone, x, .15, canalZ, w, .5, 11);
    for (const s of [-1, 1]) box(mat.stone, x + s * (w / 2 - .3), .8, canalZ, .5, 1, 11);
  }
  solid(-118, -73.5, canalZ - 5.6, canalZ + 5.6, 'canal'); solid(-66.5, -7, canalZ - 5.6, canalZ + 5.6, 'canal'); solid(7, 118, canalZ - 5.6, canalZ + 5.6, 'canal');
  // Boat landmark.
  const boat = new THREE.Group(); boat.position.set(-58, -.5, canalZ - 2); group.add(boat);
  box(toon('#7a5638'), 0, .4, 0, 7, 1, 2.4, boat); box(toon('#d9cfb6'), 1, 2.6, 0, .2, 3.5, .2, boat);

  // Houses along the streets.
  const houses = []; let seed = 3;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // An open square south of the canal keeps the sightline to the outer wall,
  // where the children see the Colossal appear.
  const blocked = (x, z, w, d) => Math.abs(x) - w / 2 < 9 || (x + w / 2 > -52 && x - w / 2 < -10 && z + d / 2 > -84 && z - d / 2 < -26) || (Math.abs(z - canalZ) - d / 2 < 7) || (Math.abs(x) < 26 && z > 38 && z < 68) || (x > 18 && x < 44 && z > 4 && z < 28) || z + d / 2 > 108 || z - d / 2 < -110 || Math.abs(x) + w / 2 > 114;
  function house(id, x, z, w, d, h, options = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const body = box(options.plaster ?? mat.plaster[Math.floor(rand() * 4)], 0, h / 2, 0, w, h, d, g);
    // Timber frame: corner posts, floor beams and a door.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(mat.timber, sx * (w / 2 - .15), h / 2, sz * (d / 2 - .15), .35, h, .35, g);
    for (let y = 3; y < h; y += 3) for (const sz of [-1, 1]) box(mat.timber, 0, y, sz * (d / 2 + .02), w, .3, .1, g);
    box(options.door ?? mat.timber, 0, 1.2, d / 2 + .05, 1.6, 2.4, .1, g);
    for (let i = 0; i < Math.floor(w / 3); i++) for (let y = 4; y < h - 1; y += 3) box(toon('#3d4c55'), -w / 2 + 1.5 + i * 3, y + .2, d / 2 + .06, .9, 1.2, .05, g);
    const roofShape = new THREE.Shape(); roofShape.moveTo(-w / 2 - .6, 0); roofShape.lineTo(0, Math.min(w, 8) * .45); roofShape.lineTo(w / 2 + .6, 0); roofShape.closePath();
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: d + 1, bevelEnabled: false }), options.roof ?? mat.roof[Math.floor(rand() * 4)]);
    roof.position.set(0, h, -d / 2 - .5); roof.castShadow = true; g.add(roof);
    if (rand() > .4) box(mat.stone, w * .25, h + 2.5, 0, .9, 3, .9, g);
    const collider = solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, id);
    const record = { id, group: g, collider, x, z, w, d, h, collapsed: false };
    houses.push(record); return record;
  }
  for (let z = -104; z < 104; z += 15) for (let x = -108; x < 108; x += 13) {
    const w = 8 + rand() * 4, d = 9 + rand() * 3, h = 6 + Math.floor(rand() * 3) * 3;
    const px = x + rand() * 2, pz = z + rand() * 2;
    if (blocked(px, pz, w, d) || rand() < .12) continue;
    house(`casa-${houses.length}`, px, pz, w, d, h);
  }
  const yeager = house('casa-yeager', 34, 16, 10, 9, 7.5, { plaster: toon('#efe6d2'), roof: toon('#8a4b38'), door: mat.door });

  // Market square with stalls and the bell tower.
  const stallWood = toon('#9a7a55');
  for (let i = 0; i < 6; i++) { const x = -18 + (i % 3) * 12 + (i > 2 ? 4 : 0), z = 44 + (i > 2 ? 14 : 0); box(stallWood, x, .55, z, 3.2, 1.1, 1.6); for (const s of [-1, 1]) box(stallWood, x + s * 1.5, 1.4, z - .7, .15, 2.8, .15); box(mat.cloth[i % 3], x, 2.8, z, 3.6, .12, 2.2); solid(x - 1.6, x + 1.6, z - .8, z + .8, 'stall'); }
  const bell = new THREE.Group(); bell.position.set(-14, 0, 60); group.add(bell);
  box(mat.stone, 0, 7, 0, 3.2, 14, 3.2, bell); box(mat.roof[0], 0, 15, 0, 4, 2, 4, bell); const bellMesh = new THREE.Mesh(new THREE.CylinderGeometry(.5, .9, 1.2, 12), toon('#a88a45')); bellMesh.position.y = 12.5; bell.add(bellMesh);
  solid(-15.6, -12.4, 58.4, 61.6, 'bell');
  // Guard post at the inner gate.
  box(mat.timber, 9, .9, 103, 3, .2, 1.6); for (let i = 0; i < 3; i++) box(toon('#4f6a3a'), 8.2 + i * .7, 1.25, 103, .2, .5, .2);
  solid(7.5, 10.5, 102.2, 103.8, 'table');

  // Rubble that replaces a collapsed house; returns debris meshes for effects.
  function collapse(record) {
    if (record.collapsed) return;
    record.collapsed = true; record.group.visible = false;
    const pile = new THREE.Group(); pile.position.set(record.x, 0, record.z); group.add(pile); record.rubble = pile;
    for (let i = 0; i < 18; i++) { const s = 1 + rand() * 2.5; const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), i % 4 ? mat.rubble : mat.roof[i % 4]); b.position.set((rand() - .5) * record.w, s * .5, (rand() - .5) * record.d); b.rotation.set(rand() * 3, rand() * 3, 0); b.castShadow = true; pile.add(b); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(record.w * .9, .6, .6), mat.timber); beam.position.set(-1, 1.4, record.d / 2 - 1); beam.rotation.z = .25; pile.add(beam); record.beam = beam;
  }
  function breakOuterGate() { outerGate.visible = false; colliders.splice(colliders.indexOf(outerBlock), 1); }
  function breakInnerGate() { innerGate.visible = false; }

  return {
    group, colliders, houses, yeager, tree, bellMesh, innerGate, outerGate, canalZ, wallHeight: WALL_HEIGHT,
    landmarks: LANDMARKS, groundHeight: hillHeight, collapse, breakOuterGate, breakInnerGate,
  };
}

// Circle vs. box push-out for walking characters (y is handled by groundHeight).
export function moveWithCollisions(position, delta, radius, colliders, bounds = BOUNDS) {
  let x = position[0] + delta[0], z = position[1] + delta[1];
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX)), nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); x = nx + dx / d * radius; z = nz + dz / d * radius; }
    else {
      // Center inside the box: leave through the nearest face.
      const exits = [[c.minX - radius - x, 0], [c.maxX + radius - x, 0], [0, c.minZ - radius - z], [0, c.maxZ + radius - z]];
      const [ex, ez] = exits.reduce((best, e) => Math.abs(e[0] + e[1]) < Math.abs(best[0] + best[1]) ? e : best);
      x += ex; z += ez;
    }
  }
  x = Math.max(bounds.minX, Math.min(bounds.maxX, x)); z = Math.max(bounds.minZ, Math.min(bounds.maxZ, z));
  return [x, z];
}
