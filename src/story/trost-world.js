import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, outlineMaterial, emblemTexture } from '../character-model.js';
import { gableCollider, surfaceHeight } from '../collision.js';

// Trost district, 850. The outer wall (toward Maria) runs along z = -200 with
// the gate the Colossal kicks; the inner gate to Wall Rose sits at z = +200.
// Buildings are tall enough for ODM and merged per material so a whole city
// costs a handful of draw calls; every façade and roof is an anchor.
export const TROST = Object.freeze({
  wallZ: -200, wallHeight: 50, gate: [0, -200], innerGate: [0, 196], hq: [64, 30], boulder: [-46, -120],
  bounds: { minX: -236, maxX: 236, minZ: -196, maxZ: 192 },
});

function stoneTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d'); c.fillStyle = '#b5ad9c'; c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 256; x += 64) { c.fillStyle = ['#ada593', '#bdb6a4', '#a69e8c'][(x + y) % 3 ? 1 : (x * y) % 2 ? 0 : 2]; c.fillRect(x + 2, y + 2, 60, 28); }
  const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createTrost(scene, { outline = true, liberio = false } = {}) {
  const group = new THREE.Group(); scene.add(group);
  const colliders = [], anchorRoots = [];
  const line = outline ? outlineMaterial(.08) : null;
  const mat = {
    ground: toon('#a99b80'), street: toon('#b9ae96'), plaster: [toon('#e6dcc6'), toon('#d9cbb0'), toon('#efe6d4'), toon('#cfc0a2')],
    timber: toon('#5b3f2b'), roof: [toon('#9f533c'), toon('#8a4a36'), toon('#7d5a45'), toon('#a5664a')], window: toon('#3b4a53'),
    wall: new THREE.MeshToonMaterial({ map: (() => { const t = stoneTexture(); t.repeat.set(40, 7); return t; })() }), wallTop: toon('#8d877a'),
    gate: toon('#5e4a37'), iron: toon('#4a4642'), hq: toon('#c7b79a'), rock: toon('#8e8577'), cannon: toon('#3d3a36'), course: toon('#9a9282'),
  };
  // Liberio (chapters 36–38): brick tenements, slate roofs and a concrete
  // internment wall instead of Trost's plaster and tile.
  if (liberio) {
    mat.plaster = [toon('#a8664a'), toon('#94583f'), toon('#b5755a'), toon('#8a5442')];
    mat.roof = [toon('#4a4e55'), toon('#555a60'), toon('#3f444a'), toon('#5d6168')];
    mat.ground = toon('#9a9488'); mat.street = toon('#7f7a72'); mat.wallTop = toon('#7a7a76');
    mat.wall = toon('#a3a19a');
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(18, 400), mat.street); avenue.rotation.x = -Math.PI / 2; avenue.position.y = .02; avenue.receiveShadow = true; group.add(avenue);
  const solid = (minX, maxX, minZ, maxZ, top, tag) => { const c = { minX, maxX, minZ, maxZ, top, tag }; colliders.push(c); return c; };

  // ── Buildings, merged per material ─────────────────────────────────────
  const buckets = new Map(); const push = (m, g) => { if (!buckets.has(m)) buckets.set(m, []); buckets.get(m).push(g); };
  const boxAt = (m, x, y, z, w, h, d) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); push(m, g); return g; };
  let seed = 41; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const buildings = [];
  const reserved = (x, z, w, d) => Math.abs(x) - w / 2 < 11 // main avenue
    || (Math.abs(x - TROST.hq[0]) < 30 && Math.abs(z - TROST.hq[1]) < 24) // supply HQ
    || (Math.abs(x - TROST.boulder[0]) < 22 && Math.abs(z - TROST.boulder[1]) < 22) // boulder square
    || z < -178 || z > 176 || (Math.abs(z + 60) - d / 2 < 7) || (Math.abs(z - 90) - d / 2 < 7); // gate yards and cross streets
  function building(x, z, w, d, h) {
    const plaster = mat.plaster[Math.floor(rand() * 4)], roof = mat.roof[Math.floor(rand() * 4)];
    boxAt(plaster, x, h / 2, z, w, h, d);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxAt(mat.timber, x + sx * (w / 2 - .2), h / 2, z + sz * (d / 2 - .2), .45, h, .45);
    for (let y = 3.4; y < h; y += 3.4) { boxAt(mat.timber, x, y, z + d / 2 + .03, w, .3, .12); boxAt(mat.timber, x, y, z - d / 2 - .03, w, .3, .12); }
    for (let y = 4.6; y < h - 1; y += 3.4) for (let i = 0; i < Math.floor(w / 3.2); i++) { const wx = x - w / 2 + 1.7 + i * 3.2; boxAt(mat.window, wx, y, z + d / 2 + .08, 1, 1.4, .06); boxAt(mat.window, wx, y, z - d / 2 - .08, 1, 1.4, .06); }
    // Gabled roof (a triangular prism, ridge along z); the collider follows
    // both slopes so actors stand on the tiles instead of sinking into them.
    const rise = Math.min(w, d) * .38, eave = .5;
    const r = new THREE.CylinderGeometry(1, 1, d + eave * 2, 3, 1); r.rotateX(-Math.PI / 2); r.scale((w / 2 + eave) / Math.sin(Math.PI / 3), rise / 1.5, 1); r.translate(x, h + rise / 3, z); push(roof, r);
    if (rand() > .55) boxAt(mat.timber, x + w * .25, h + 2.6, z, 1, 3.4, 1);
    Object.assign(solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, 'building'), gableCollider(h, w / 2, rise, eave));
    buildings.push({ x, z, w, d, h: h + rise });
  }
  for (let z = -170; z < 172; z += 19) for (let x = -226; x < 228; x += 17) {
    const w = 11 + rand() * 4, d = 12 + rand() * 4, h = 9 + Math.floor(rand() * 4) * 2.5;
    const px = x + rand() * 2, pz = z + rand() * 2;
    if (reserved(px, pz, w, d) || rand() < .08) continue;
    building(px, pz, w, d, h);
  }
  // Supply headquarters: a stone block with a tower and big windows.
  const [hx, hz] = TROST.hq;
  boxAt(mat.hq, hx, 9, hz, 40, 18, 28); boxAt(mat.hq, hx + 14, 16, hz - 8, 9, 32, 9); boxAt(mat.roof[1], hx, 18.6, hz, 41, 1.2, 29);
  for (let i = 0; i < 7; i++) for (const y of [6, 12]) { boxAt(mat.window, hx - 17 + i * 5.6, y, hz + 14.06, 2.2, 3, .1); boxAt(mat.window, hx - 17 + i * 5.6, y, hz - 14.06, 2.2, 3, .1); }
  solid(hx - 20, hx + 20, hz - 14, hz + 14, 18, 'hq'); solid(hx + 9.5, hx + 18.5, hz - 12.5, hz - 3.5, 32, 'hq-tower');

  const city = new THREE.Group(); group.add(city); anchorRoots.push(city);
  for (const [m, list] of buckets) {
    const merged = mergeGeometries(list); list.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(merged, m); mesh.castShadow = mesh.receiveShadow = true; city.add(mesh);
    if (line && m !== mat.window && m !== mat.timber) city.add(Object.assign(new THREE.Mesh(merged, line), { raycast: () => {} }));
  }

  // ── Walls and gates ────────────────────────────────────────────────────
  const walls = new THREE.Group(); group.add(walls); anchorRoots.push(walls);
  const H = TROST.wallHeight;
  function wallRun(z, gap) {
    for (const [a, b] of gap ? [[-240, -gap], [gap, 240]] : [[-240, 240]]) {
      const w = b - a, x = (a + b) / 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, 10), mat.wall); m.position.set(x, H / 2, z); m.castShadow = m.receiveShadow = true; walls.add(m);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1.4, 11), mat.wallTop); top.position.set(x, H + .7, z); top.receiveShadow = true; walls.add(top);
      solid(a, b, z - 5, z + 5, H + 1.4, 'wall');
    }
    if (gap) { const lintel = new THREE.Mesh(new THREE.BoxGeometry(gap * 2, H - 18, 10), mat.wall); lintel.position.set(0, 18 + (H - 18) / 2, z); walls.add(lintel); solid(-gap, gap, z - 5, z + 5, H + 1.4, 'lintel').bottom = 18; }
  }
  wallRun(TROST.wallZ, 9); wallRun(200, 9);
  // Stone courses and buttresses on the inner face, rails for the cannons on
  // top and an arch around each gate: visual detail, no extra colliders.
  const detail = new THREE.Group(); walls.add(detail);
  for (const z of [TROST.wallZ + 5.2, 200 - 5.2]) {
    for (const y of [12, 26, 40]) { const band = new THREE.Mesh(new THREE.BoxGeometry(480, .9, .6), mat.course); band.position.set(0, y, z); detail.add(band); }
    for (let x = -220; x <= 220; x += 40) { if (Math.abs(x) < 20) continue; const b = new THREE.Mesh(new THREE.BoxGeometry(4, H, 2.4), mat.wallTop); b.position.set(x, H / 2, z + Math.sign(-z) * .8); b.castShadow = true; detail.add(b); }
    for (const dx of [-1.2, 1.2]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(480, .25, .25), mat.iron); rail.position.set(0, H + 1.55, z + Math.sign(z) * 5.2 + dx); detail.add(rail); }
    // Gate arch: two pillars and a keystone frame the opening.
    for (const sx of [-1, 1]) { const pillar = new THREE.Mesh(new THREE.BoxGeometry(3, 20, 1.6), mat.wallTop); pillar.position.set(sx * 10.5, 10, z); detail.add(pillar); }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(10.5, 1.2, 8, 20, Math.PI), mat.wallTop); arch.position.set(0, 18, z); detail.add(arch);
    const key = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 1.8), mat.course); key.position.set(0, 29.4, z); detail.add(key);
  }
  // Garrison banners hang from the wall top (Marley flags in Liberio).
  const flagMaterial = new THREE.MeshBasicMaterial({ map: liberio ? null : emblemTexture('roses'), color: liberio ? '#b8322c' : '#ffffff', side: THREE.DoubleSide });
  const cloth = new THREE.MeshToonMaterial({ color: liberio ? '#e9e2d0' : '#6f2a2a', side: THREE.DoubleSide });
  for (let x = -200; x <= 200; x += 50) {
    if (Math.abs(x) < 30) continue;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(6, 12), cloth); banner.position.set(x, H - 7, 200 - 5.6); banner.rotation.y = Math.PI; detail.add(banner);
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), flagMaterial); mark.position.set(x, H - 5, 200 - 5.7); mark.rotation.y = Math.PI; detail.add(mark);
  }
  detail.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.userData.noAnchor = true; } });
  for (const x of [-240, 240]) { const m = new THREE.Mesh(new THREE.BoxGeometry(10, H, 400), mat.wall); m.position.set(x, H / 2, 0); walls.add(m); solid(x - 5, x + 5, -200, 200, H, 'wall'); }
  const gate = new THREE.Group(); gate.position.set(0, 0, TROST.wallZ); walls.add(gate);
  const door = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 3), mat.gate); door.position.y = 9; gate.add(door);
  for (let i = -3; i <= 3; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.4, 18, .3), mat.iron); bar.position.set(i * 2.6, 9, 1.7); gate.add(bar); }
  const gateBlock = solid(-9, 9, TROST.wallZ - 5, TROST.wallZ + 5, 18, 'gate');
  // Cannons on the wall top facing outward.
  const cannons = [];
  for (let i = -6; i <= 6; i++) { if (!i) continue; const c = new THREE.Group(); c.position.set(i * 14, H + 1.4, TROST.wallZ + 1.5); walls.add(c); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.35, .45, 3.4, 10), mat.cannon); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .9, -1.2); c.add(barrel); const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.4, .8, 2), mat.timber); carriage.position.y = .4; c.add(carriage); cannons.push(c); }
  const breach = new THREE.Group(); breach.visible = false; breach.position.set(0, 0, TROST.wallZ + 8); group.add(breach);
  for (let i = 0; i < 16; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + (i % 4) * .8, 0), mat.rock); r.position.set((i % 6 - 2.5) * 4, .8, (Math.floor(i / 6)) * 5); r.castShadow = true; breach.add(r); }

  // The boulder used to seal the gate.
  const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(7, 1), mat.rock); boulder.position.set(TROST.boulder[0], 6, TROST.boulder[1]); boulder.scale.set(1.2, .9, 1); boulder.castShadow = boulder.receiveShadow = true; group.add(boulder);
  const boulderBlock = solid(TROST.boulder[0] - 7.5, TROST.boulder[0] + 7.5, TROST.boulder[1] - 6.5, TROST.boulder[1] + 6.5, 12, 'boulder');

  function breakGate() { gate.visible = false; breach.visible = true; const i = colliders.indexOf(gateBlock); if (i >= 0) colliders.splice(i, 1); }
  function sealGate() { boulder.position.set(0, 9, TROST.wallZ + 6); boulder.rotation.set(.3, .4, 0); colliders.push(gateBlock); }
  function liftBoulder() { const i = colliders.indexOf(boulderBlock); if (i >= 0) colliders.splice(i, 1); }
  // Nearest rooftop under a point, for placing actors on roofs.
  function roofAt(x, z) { let top = 0; for (const c of colliders) if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ && c.tag !== 'lintel') top = Math.max(top, surfaceHeight(c, x)); return top; }
  return { group, colliders, anchorRoots, buildings, cannons, boulder, gate, door, breach, breakGate, sealGate, liftBoulder, roofAt };
}
