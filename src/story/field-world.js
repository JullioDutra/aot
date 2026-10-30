import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, outlineMaterial } from '../character-model.js';

// Outside the walls, 850: the open plain of the long-range formation and the
// forest of giant trees. The expedition rides toward -z. The plain has only
// lone trees and an abandoned village to anchor cables; inside the forest
// every trunk is an anchor and a collider. The castle of Levi's squad stands
// behind the start line.
export const FIELD = Object.freeze({
  forest: { minX: -170, maxX: 170, minZ: -720, maxZ: -330 },
  road: 9, // half-width of the trail through the forest (x = 0)
  clearing: [0, -600], clearingRadius: 46,
  castle: [70, 230], village: [-120, -150],
  wallZ: 330, wallHeight: 50, tower: [-300, 60], towerHeight: 24, towerRadius: 9,
  bounds: 760,
});

const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export function createField(scene, { outline = true, forest = true, castle = true, village = true, wall = false, tower = false, seed = 77 } = {}) {
  const group = new THREE.Group(); scene.add(group);
  const colliders = [], anchorRoots = [], trunks = [];
  const line = outline ? outlineMaterial(.06) : null;
  const rand = rng(seed);
  const mat = {
    grass: toon('#93a06a'), meadow: toon('#a8ae74'), path: toon('#b4a67f'), bark: toon('#6a4e38'), barkDark: toon('#5a3f2d'),
    leaves: [toon('#4d6b3a'), toon('#5b7a40'), toon('#456236')], stone: toon('#9d968a'), stoneDark: toon('#7f786d'), roof: toon('#6e4436'), plaster: toon('#d8ccb2'), timber: toon('#5b3f2b'),
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), mat.grass); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.road * 2, 1200), mat.path); trail.rotation.x = -Math.PI / 2; trail.position.set(0, .02, -260); trail.receiveShadow = true; group.add(trail);
  // Patches of lighter meadow break up the plain.
  for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(20 + rand() * 40, 12), mat.meadow); p.rotation.x = -Math.PI / 2; p.position.set((rand() - .5) * 900, .01, 250 - rand() * 560); p.receiveShadow = true; group.add(p); }
  const solid = (minX, maxX, minZ, maxZ, top, tag) => { const c = { minX, maxX, minZ, maxZ, top, tag }; colliders.push(c); return c; };

  const buckets = new Map(); const push = (m, g) => { if (!buckets.has(m)) buckets.set(m, []); buckets.get(m).push(g); };
  const shape = (m, g, x, y, z, ry = 0) => { if (ry) g.rotateY(ry); g.translate(x, y, z); push(m, g); return g; };

  // ── Trees ──────────────────────────────────────────────────────────────
  function tree(x, z, height, radius, giant) {
    const bark = rand() > .5 ? mat.bark : mat.barkDark;
    shape(bark, new THREE.CylinderGeometry(radius * .7, radius * 1.25, height, giant ? 12 : 8), x, height / 2, z);
    // Root flare at the base.
    if (giant) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + rand(); const r = new THREE.BoxGeometry(radius * .9, radius * 1.4, radius * 2.6); shape(bark, r, x + Math.cos(a) * radius, radius * .5, z + Math.sin(a) * radius, a); }
    const crownFrom = giant ? height * .45 : height * .4;
    const blobs = giant ? 4 : 2;
    for (let i = 0; i < blobs; i++) {
      const y = crownFrom + (height - crownFrom) * (i + .5) / blobs, size = (giant ? 9 : 4) + rand() * (giant ? 6 : 2);
      const g = new THREE.IcosahedronGeometry(size, 1); g.scale(1.25, .55, 1.25);
      shape(mat.leaves[Math.floor(rand() * 3)], g, x + (rand() - .5) * size, y, z + (rand() - .5) * size);
      if (giant) { const b = new THREE.BoxGeometry(size * 1.2, .8, .8); shape(bark, b, x + Math.cos(i * 1.7) * size * .6, y - 3, z + Math.sin(i * 1.7) * size * .6, -i * 1.7); }
    }
    solid(x - radius, x + radius, z - radius, z + radius, height, giant ? 'trunk' : 'tree');
    trunks.push({ x, z, radius, height });
  }
  const { minX, maxX, minZ, maxZ } = FIELD.forest;
  if (forest) for (let z = maxZ - 6; z > minZ; z -= 21) for (let x = minX; x < maxX; x += 21) {
    const px = x + (rand() - .5) * 9, pz = z + (rand() - .5) * 9;
    if (Math.abs(px) < FIELD.road + 5) continue;
    if (Math.hypot(px - FIELD.clearing[0], pz - FIELD.clearing[1]) < FIELD.clearingRadius) continue;
    tree(px, pz, 68 + rand() * 24, 2.4 + rand() * 1.6, true);
  }
  // Giants right at the edge of the trail.
  if (forest) for (let z = -360; z > -700; z -= 46) { const side = rand() > .5 ? 1 : -1; const pz = z + rand() * 10; if (Math.abs(pz - FIELD.clearing[1]) > FIELD.clearingRadius + 8) tree(side * (FIELD.road + 3 + rand() * 2), pz, 70 + rand() * 16, 2.2, true); }
  // Lone trees on the plain: few anchors, as the chapter warns.
  for (let i = 0; i < 60; i++) {
    const x = (rand() - .5) * 1300, z = 240 - rand() * 540;
    if (Math.abs(x) < 14 || (castle && Math.hypot(x - FIELD.castle[0], z - FIELD.castle[1]) < 40) || (tower && Math.hypot(x - FIELD.tower[0], z - FIELD.tower[1]) < 45)) continue;
    tree(x, z, 11 + rand() * 7, .5 + rand() * .25, false);
  }

  // ── Abandoned village (anchors on the plain) ───────────────────────────
  const houses = [];
  if (village) for (let i = 0; i < 9; i++) {
    const x = FIELD.village[0] + (i % 3) * 16 + rand() * 3, z = FIELD.village[1] + Math.floor(i / 3) * 16 + rand() * 3, w = 8 + rand() * 3, d = 9, h = 6 + Math.floor(rand() * 3) * 2;
    shape(mat.plaster, new THREE.BoxGeometry(w, h, d), x, h / 2, z);
    const r = new THREE.CylinderGeometry(.01, 1, 1, 4, 1); r.rotateY(Math.PI / 4); r.scale(w * .74, 3.2, d * .74); shape(mat.roof, r, x, h + 1.6, z);
    for (const sx of [-1, 1]) shape(mat.timber, new THREE.BoxGeometry(.4, h, .4), x + sx * (w / 2 - .2), h / 2, z + d / 2);
    solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h + 1.5, 'house'); houses.push({ x, z, w, d, h: h + 1.5 });
  }

  // ── The castle of Levi's squad ─────────────────────────────────────────
  if (castle) {
    const [cx, cz] = FIELD.castle;
    shape(mat.stone, new THREE.BoxGeometry(34, 16, 22), cx, 8, cz);
    shape(mat.stoneDark, new THREE.BoxGeometry(35, 1.2, 23), cx, 16.6, cz);
    for (const [tx, tz] of [[-17, -11], [17, -11], [-17, 11], [17, 11]]) { shape(mat.stone, new THREE.CylinderGeometry(3.4, 3.8, 24, 12), cx + tx, 12, cz + tz); shape(mat.roof, new THREE.ConeGeometry(4.4, 7, 12), cx + tx, 27.5, cz + tz); }
    for (let i = 0; i < 6; i++) for (const y of [5, 11]) shape(mat.timber, new THREE.BoxGeometry(1.6, 2.6, .2), cx - 13 + i * 5.2, y, cz - 11.1);
    shape(mat.timber, new THREE.BoxGeometry(4, 6, .3), cx, 3, cz - 11.15);
    solid(cx - 17, cx + 17, cz - 11, cz + 11, 17.2, 'castle');
    // Stable and well in the courtyard in front.
    shape(mat.timber, new THREE.BoxGeometry(14, 4, 5), cx - 30, 2, cz - 22); shape(mat.roof, new THREE.BoxGeometry(15, .5, 6), cx - 30, 4.3, cz - 22);
    solid(cx - 37, cx - 23, cz - 24.5, cz - 19.5, 4.5, 'stable');
    shape(mat.stoneDark, new THREE.CylinderGeometry(1.4, 1.5, 1.1, 12), cx - 8, .55, cz - 26);
  }

  // ── Wall Rose behind the plain (chapters 21–24) ───────────────────────
  if (wall) {
    const H = FIELD.wallHeight;
    shape(mat.stone, new THREE.BoxGeometry(1520, H, 10), 0, H / 2, FIELD.wallZ);
    shape(mat.stoneDark, new THREE.BoxGeometry(1520, 1.4, 11), 0, H + .7, FIELD.wallZ);
    solid(-760, 760, FIELD.wallZ - 5, FIELD.wallZ + 5, H + 1.4, 'wall');
  }
  // ── The ruined tower of Utgard (chapter 20) ────────────────────────────
  if (tower) {
    const [tx, tz] = FIELD.tower, H = FIELD.towerHeight, R = FIELD.towerRadius;
    shape(mat.stone, new THREE.CylinderGeometry(R, R + .6, H, 20), tx, H / 2, tz);
    for (let i = 0; i < 12; i++) { if (i % 2) continue; const a = i / 12 * Math.PI * 2; shape(mat.stoneDark, new THREE.BoxGeometry(2.4, 1.6, 1), tx + Math.cos(a) * (R - .5), H + .8, tz + Math.sin(a) * (R - .5), -a + Math.PI / 2); }
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4; shape(mat.stone, new THREE.BoxGeometry(14, 9 + i * 2, 2.4), tx + Math.cos(a) * 22, (9 + i * 2) / 2, tz + Math.sin(a) * 22, -a); }
    shape(mat.timber, new THREE.BoxGeometry(2.4, 3.6, .3), tx, 1.8, tz + R + .2);
    solid(tx - R, tx + R, tz - R, tz + R, H, 'tower');
  }

  const world = new THREE.Group(); group.add(world); anchorRoots.push(world);
  for (const [m, list] of buckets) {
    const merged = mergeGeometries(list); list.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(merged, m); mesh.castShadow = mesh.receiveShadow = true; world.add(mesh);
    if (line && !mat.leaves.includes(m) && m !== mat.timber) world.add(Object.assign(new THREE.Mesh(merged, line), { raycast: () => {} }));
  }
  // Nearest trunk to a point (for placing soldiers on branches).
  const nearestTrunk = (x, z) => trunks.reduce((best, t) => (Math.hypot(t.x - x, t.z - z) < Math.hypot(best.x - x, best.z - z) ? t : best));
  // Height of whatever stands under a point (roof, castle, trunk top).
  function topAt(x, z) { let top = 0; for (const c of colliders) if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) top = Math.max(top, c.top ?? 0); return top; }
  return { group, colliders, anchorRoots, trunks, houses, nearestTrunk, topAt };
}
