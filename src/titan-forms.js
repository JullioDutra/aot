import * as THREE from 'three';
import { toon, outlineMaterial } from './character-model.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Toon-shaded titan forms built in a normalized space (height 1) and scaled.
// Pure titans come from parameters that reproduce the unsettling anime
// language: wrong proportions, fixed grins, staring eyes. The Nine get bespoke
// details: lipless jaw of the Attack Titan, skinless striated Colossal, armor
// plates, skin-lined muscle of the Female, fur and long arms of the Beast.

const sphere = new THREE.SphereGeometry(1, 22, 16);
const cube = new THREE.BoxGeometry(1, 1, 1);
const add = (parent, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
};
const oval = (p, m, pos, s, r) => add(p, sphere, m, pos, s, r);
const limb = (p, m, r1, r2, len, pos, rot = [0, 0, 0], depth = 1) => add(p, new THREE.CylinderGeometry(r1, r2, len, 14), m, pos, [1, 1, depth], rot);
const joint = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

const textures = new Map();
function canvasTexture(key, size, draw, repeat = null) {
  if (textures.has(key)) return textures.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  textures.set(key, texture); return texture;
}
// Striated muscle for skinless titans: red fibers with pale tendon bands.
function muscleTexture(tone) {
  return canvasTexture(`muscle-${tone}`, 256, (c, s) => {
    c.fillStyle = tone; c.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 6) { c.strokeStyle = x % 12 ? '#00000022' : '#ffffff1c'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 6, s * .3, x - 6, s * .7, x, s); c.stroke(); }
  }, [3, 1]);
}

// Titan faces: staring eyes, grins and teeth drawn on a front patch.
function titanFace(spec) {
  return canvasTexture(`titan-face-${spec.id}`, 512, (c) => {
    const f = spec.face, k = spec.kind;
    const eyeY = 232, eyeX = 122 * (f.eyeSpread ?? 1), eyeR = 62 * (f.eyeSize ?? 1);
    // Shading: sunken sockets, cheekbones and the jaw line give the faces the
    // heavy, too-human look of the anime instead of flat stickers.
    const shade = (x, y, rx, ry, alpha) => { const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, `rgba(60,25,20,${alpha})`); g.addColorStop(1, 'rgba(60,25,20,0)'); c.save(); c.translate(x, y); c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); c.fill(); c.restore(); };
    for (const s of [-1, 1]) {
      shade(256 + s * eyeX, eyeY - 6, eyeR * 1.9, eyeR * 1.5, k === 'attack' || k === 'colossal' ? .55 : .3);
      shade(256 + s * (eyeX + 40), 340, 70, 50, .18);
    }
    if (k === 'attack' || f.brows === 'angry') { c.fillStyle = 'rgba(40,18,14,.45)'; c.beginPath(); c.moveTo(256 - eyeX - eyeR * 1.6, eyeY - eyeR * 1.2); c.quadraticCurveTo(256, eyeY - eyeR * .55, 256 + eyeX + eyeR * 1.6, eyeY - eyeR * 1.2); c.lineTo(256 + eyeX + eyeR * 1.6, eyeY - eyeR * 1.8); c.lineTo(256 - eyeX - eyeR * 1.6, eyeY - eyeR * 1.8); c.fill(); }
    // Female: bands of exposed muscle around the eyes and down the nose.
    if (k === 'female') { c.strokeStyle = 'rgba(170,60,55,.55)'; c.lineWidth = 7; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(256 + s * eyeX, eyeY, eyeR * (1.45 + i * .14), eyeR * (1.15 + i * .12), 0, Math.PI * (s > 0 ? .9 : -1.1), Math.PI * (s > 0 ? 2.1 : .1)); c.stroke(); } }
    for (const s of [-1, 1]) {
      c.save(); c.translate(256 + s * eyeX, eyeY);
      c.fillStyle = f.lids ?? '#00000030'; c.beginPath(); c.ellipse(0, 0, eyeR * 1.35, eyeR * 1.05, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f6efe2'; c.beginPath(); c.ellipse(0, 0, eyeR, eyeR * (f.stare ? .95 : .62), 0, 0, Math.PI * 2); c.fill();
      const ir = eyeR * (f.iris ?? .38);
      c.fillStyle = f.irisColor ?? '#5c5236'; c.beginPath(); c.arc(s * (f.crossEyed ? -eyeR * .3 : 0), 0, ir, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#100c0a'; c.beginPath(); c.arc(s * (f.crossEyed ? -eyeR * .3 : 0), 0, ir * .45, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2a1a14'; c.lineWidth = 7; c.beginPath(); c.ellipse(0, 0, eyeR, eyeR * (f.stare ? .95 : .62), 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      if (f.brows) { c.lineWidth = 12; c.beginPath(); c.moveTo(-eyeR * 1.1, -eyeR * 1.15 - s * 0); c.lineTo(eyeR * 1.1, -eyeR * (f.brows === 'angry' ? .7 : 1.25)); c.stroke(); }
      c.restore();
    }
    // Nose: bridge, nostrils; the Colossal has only the bare cavity.
    if (k === 'colossal') { c.fillStyle = '#2a0e0c'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(256 + s * 16, 320, 11, 30, s * .2, 0, Math.PI * 2); c.fill(); } }
    else {
      const n = f.nose ?? 1;
      c.strokeStyle = '#6b4535'; c.lineWidth = 6; c.beginPath(); c.moveTo(256, 260); c.lineTo(256 - 14 * n, 330 + 30 * (n - 1)); c.lineTo(256 + 10, 336 + 30 * (n - 1)); c.stroke();
      c.fillStyle = '#4a2a22'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(256 + s * 16 * n, 338 + 30 * (n - 1), 9 * n, 5 * n, 0, 0, Math.PI * 2); c.fill(); }
    }
    // Mouth: a grin with teeth, or a lipless jaw that shows teeth to the hinge.
    const mw = 175 * (f.grin ?? .6), my = 405;
    if (f.lipless) {
      c.fillStyle = '#5a1f1c'; c.beginPath(); c.ellipse(256, my, 210, 44, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#efe6cf'; for (let i = -9; i <= 9; i++) { c.fillRect(256 + i * 22 - 9, my - 34, 18, 30); c.fillRect(256 + i * 22 - 9, my + 4, 18, 30); }
      c.strokeStyle = '#7d2f28'; c.lineWidth = 4; for (let i = -9; i <= 9; i++) { c.beginPath(); c.moveTo(256 + i * 22, my - 60); c.lineTo(256 + i * 22 * 1.08, my - 38); c.stroke(); }
      // Cheek muscle fibers from the corners of the mouth toward the ears.
      c.strokeStyle = 'rgba(150,50,45,.75)'; c.lineWidth = 5;
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(256 + s * 200, my - 30 + i * 12); c.quadraticCurveTo(256 + s * 236, my - 60 + i * 8, 256 + s * 250, my - 110 + i * 10); c.stroke(); }
    } else if (f.grin > .3) {
      c.fillStyle = '#3e1d19'; c.beginPath(); c.moveTo(256 - mw, my - 10); c.quadraticCurveTo(256, my + 70 * f.grin, 256 + mw, my - 10); c.quadraticCurveTo(256, my + 20, 256 - mw, my - 10); c.fill();
      c.fillStyle = '#eee4cd'; const teeth = Math.round(10 * f.grin + 4);
      for (let i = 0; i < teeth; i++) { const t = (i + .5) / teeth, x = 256 - mw + t * mw * 2, depth = Math.sin(t * Math.PI); c.fillRect(x - mw / teeth + 2, my - 8 + depth * 8, mw * 2 / teeth - 4, 18 + depth * 14 * f.grin); }
      c.strokeStyle = '#2a1410'; c.lineWidth = 5; c.beginPath(); c.moveTo(256 - mw - 10, my - 18); c.quadraticCurveTo(256, my + 76 * f.grin, 256 + mw + 10, my - 18); c.stroke();
      c.strokeStyle = '#a0584a'; c.lineWidth = 9; c.beginPath(); c.moveTo(256 - mw - 6, my - 14); c.quadraticCurveTo(256, my + 84 * f.grin, 256 + mw + 6, my - 14); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.moveTo(256 - mw * .8, my - 4); c.quadraticCurveTo(256, my - 18, 256 + mw * .8, my - 4); c.stroke();
    } else {
      // Closed mouth: a wide flat line with a lower lip shadow.
      const cw = Math.max(mw, 70); c.strokeStyle = '#4a2621'; c.lineWidth = 8; c.beginPath(); c.moveTo(256 - cw, my); c.quadraticCurveTo(256, my + 10, 256 + cw, my); c.stroke();
      c.strokeStyle = 'rgba(120,60,50,.35)'; c.lineWidth = 10; c.beginPath(); c.moveTo(256 - cw * .6, my + 20); c.quadraticCurveTo(256, my + 30, 256 + cw * .6, my + 20); c.stroke();
    }
    if (f.beard) { c.fillStyle = f.beard; c.globalAlpha = .95; c.beginPath(); c.moveTo(110, 330); c.quadraticCurveTo(256, 560, 402, 330); c.quadraticCurveTo(330, 380, 256, 372); c.quadraticCurveTo(182, 380, 110, 330); c.fill(); c.globalAlpha = 1; }
    if (f.creases) { c.strokeStyle = '#00000035'; c.lineWidth = 4; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(256 + s * 110, 320); c.quadraticCurveTo(256 + s * 150, 380, 256 + s * (mw + 30), 430); c.stroke(); } }
  });
}

// Lightweight fur/hair tufts reused by hair and the Beast Titan.
const tuftGeometry = new THREE.ConeGeometry(1, 1, 6).rotateX(Math.PI).translate(0, -.5, 0);
function tufts(parent, material, { center, radius, count, length, width, phiFrom = 0, phiTo = Math.PI * .6, fall = .8, seed = 1, faceGap = false }) {
  for (let i = 0; i < count; i++) {
    const r = Math.sin(seed * 91 + i * 12.9898) * 43758.5453; const rand = r - Math.floor(r);
    const theta = i / count * Math.PI * 2 * 3.1 + rand, phi = phiFrom + (phiTo - phiFrom) * ((i * 7) % count) / count;
    if (faceGap && Math.cos(theta) > .35 && phi > .75) continue;
    const n = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta));
    const d = n.clone().multiplyScalar(1 - fall).add(new THREE.Vector3(0, -fall, 0)).normalize();
    const mesh = new THREE.Mesh(tuftGeometry, material);
    mesh.position.copy(n).multiplyScalar(radius).add(center);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
    mesh.scale.set(width, length * (.75 + rand * .5), width * .55); mesh.castShadow = true; parent.add(mesh);
  }
}

function batch(group, outline) {
  const buckets = new Map();
  for (const child of [...group.children]) {
    if (child.isGroup) { batch(child, outline); continue; }
    if (!child.isMesh || child.userData.keep) continue;
    child.updateMatrix();
    const geometry = child.geometry.clone().applyMatrix4(child.matrix);
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
    const list = buckets.get(child.material) ?? []; list.push(geometry); buckets.set(child.material, list); group.remove(child);
  }
  for (const [material, list] of buckets) {
    const merged = mergeGeometries(list); if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
    if (outline) group.add(new THREE.Mesh(merged, outline));
    list.forEach(g => g.dispose());
  }
}

// ── Specs ───────────────────────────────────────────────────────────────
const pure = (id, name, height, o) => ({ id, name, height, group: 'pure', kind: 'pure', skin: '#d7b49b', ...o, face: { grin: .6, eyeSize: 1, ...o.face } });
export const TITAN_FORMS = Object.freeze([
  pure('sorridente', 'Titã sorridente', 15, { note: 'devorou Carla Yeager', heads: 6.2, build: .8, hair: { color: '#c9a76a', length: .9 }, face: { grin: 1, stare: true, eyeSize: .9, iris: .28, creases: true, irisColor: '#6a5d3a' } }),
  pure('barbudo', 'Titã barbudo', 12, { note: 'engoliu Eren em Trost', heads: 5, build: 1.15, belly: .2, hair: { color: '#3a2a20', length: .35 }, face: { grin: .35, beard: '#3a2a20', eyeSize: 1.1, stare: true } }),
  pure('anormal', 'Anormal corredor', 14, { note: 'locomoção e prioridades próprias', heads: 4.2, build: .7, armLength: 1.3, legLength: 1.15, hunch: .35, skin: '#cfae94', face: { grin: .9, eyeSize: 1.3, stare: true, iris: .2, crossEyed: true } }),
  pure('nariz', 'Titã do nariz', 7, { note: 'olhos esbugalhados, sem lábios', heads: 3.2, build: 1, legLength: .8, skin: '#d9b8a0', hair: { color: '#3b2b22', length: .2 }, face: { grin: .2, lipless: false, nose: 2.4, eyeSize: 1.5, stare: true, iris: .2, eyeSpread: .8 } }),
  pure('cabeludo', 'Titã de cabelo longo', 10, { heads: 4.5, build: .95, hair: { color: '#1d1714', length: 1.6 }, face: { grin: .85, eyeSize: .8, stare: true, creases: true } }),
  pure('gordo', 'Titã corpulento', 8, { heads: 3.8, build: 1.45, belly: .55, legLength: .75, skin: '#cda68d', face: { grin: .7, eyeSize: .7 } }),
  pure('pequeno', 'Titã de 4 metros', 4, { heads: 3, build: 1.05, skin: '#d4b29a', hair: { color: '#5a4030', length: .3 }, face: { grin: .95, stare: true, eyeSize: 1.2 } }),
  { id: 'ataque', name: 'Titã de Ataque', height: 15, group: 'nine', kind: 'attack', note: 'Eren · mandíbula sem lábios, cabelo longo, olhos verdes', skin: '#cda58a', hair: { color: '#2b211a', length: 1.1 }, face: { lipless: true, brows: 'angry', irisColor: '#3f9c86', iris: .45, eyeSize: .8 } },
  { id: 'colossal', name: 'Titã Colossal', height: 60, group: 'colossal', kind: 'colossal', note: 'sem pele, vapor; aparece sobre a muralha de 50 m', skin: '#a8433a', face: { lipless: true, brows: 'angry', eyeSize: .7, irisColor: '#6b5a3a', iris: .5 } },
  { id: 'blindado', name: 'Titã Blindado', height: 15, group: 'nine', kind: 'armored', note: 'placas endurecidas com articulações expostas', skin: '#b4483c', hair: { color: '#d9c47a', length: .25 }, face: { grin: 0, lipless: true, eyeSize: .65, irisColor: '#b7a86e' } },
  { id: 'femea', name: 'Titã Fêmea', height: 14, group: 'nine', kind: 'female', note: 'pele sobre musculatura exposta, endurece pontos', skin: '#e2b8a2', hair: { color: '#e2cf86', length: .75 }, face: { grin: 0, eyeSize: .8, irisColor: '#6fa6cf', iris: .45 } },
  { id: 'bestial', name: 'Titã Bestial', height: 17, group: 'nine', kind: 'beast', note: 'Zeke · pelagem, braços longos, arremessa pedras', skin: '#c8a487', hair: { color: '#6a4a33', length: 1 }, face: { grin: .25, eyeSize: .75, beard: '#5c3f2b', irisColor: '#cbb470', iris: .35 } },
  { id: 'carroca', name: 'Titã Carroça', height: 4, group: 'nine', kind: 'cart', note: 'quadrúpede, resistência prolongada', skin: '#cfa78f', hair: { color: '#1d1a1c', length: 1.1 }, face: { grin: 0, eyeSize: .9, irisColor: '#4a4a50', iris: .45 } },
  { id: 'mandibula', name: 'Titã Mandíbula', height: 5, group: 'nine', kind: 'jaw', note: 'Porco · mandíbula endurecida, garras', skin: '#c99c80', hair: { color: '#d9c58a', length: .35 }, face: { grin: 0, lipless: true, eyeSize: .9, irisColor: '#8c8a5a' } },
  { id: 'martelo', name: 'Titã Martelo de Guerra', height: 15, group: 'nine', kind: 'warhammer', note: 'cria armas de endurecimento; usuária ligada por um cordão', skin: '#e8e2d6', hair: { color: '#f2efe6', length: 1.4 }, face: { grin: 0, lipless: true, eyeSize: .75, irisColor: '#c3b68a', iris: .3 } },
]);

// ── Builder ─────────────────────────────────────────────────────────────
export function createTitanForm(spec, { outline = true } = {}) {
  const k = spec.kind;
  const skinless = k === 'colossal';
  const skin = skinless ? toon('#ffffff', { map: muscleTexture(spec.skin) }) : toon(spec.skin);
  const shade = toon(skinless ? '#7c2a24' : new THREE.Color(spec.skin).multiplyScalar(.82).getStyle());
  const muscle = toon(['female', 'armored'].includes(k) ? '#b9564a' : '#9b4a3e', k === 'female' || k === 'armored' ? { map: muscleTexture('#b4483c') } : {});
  const plate = toon(k === 'warhammer' ? '#f4f1ea' : '#efe3c4');
  const hair = toon(spec.hair?.color ?? '#3a2a20');
  const tendon = toon('#efdcc4');
  const root = new THREE.Group(); root.name = spec.id; root.userData.titan = spec.id;
  const heads = spec.heads ?? (k === 'jaw' ? 4.5 : k === 'cart' ? 3.5 : 7.2);
  const build = spec.build ?? (k === 'armored' || k === 'colossal' ? 1.25 : k === 'female' ? .85 : k === 'beast' ? 1.2 : 1);
  const headH = 1 / heads, headR = headH * .56;
  const legLen = .48 * (spec.legLength ?? (k === 'beast' ? .85 : 1));
  const armLen = .42 * (spec.armLength ?? (k === 'beast' ? 1.45 : 1));
  const w = .125 * build, quad = k === 'cart';
  const hipY = quad ? .55 : legLen;
  const hips = joint(root, 0, hipY, 0);
  oval(hips, skin, [0, 0, 0], [w * 1.05, .06, w * .68]);
  oval(hips, skin, [0, .045, w * .05], [w * 1.0, .05, w * .66]);
  const chest = joint(hips, 0, .04, 0);
  const torso = Math.max(.12, 1 - legLen - headH - .03);
  const belly = spec.belly ?? 0;
  const profile = [[.7 + belly * .6, 0], [.68 + belly, torso * .25], [.82 + belly * .5, torso * .5], [1.0, torso * .78], [.98, torso * .9], [.55, torso]].map(([r, y]) => new THREE.Vector2(r * w * 1.6, y));
  add(chest, new THREE.LatheGeometry(profile, 22), skin, [0, 0, 0], [1, 1, .62]);
  if (quad) { chest.rotation.x = 1.25; chest.position.z = -.05; }
  chest.rotation.x += spec.hunch ?? (k === 'beast' ? .35 : k === 'jaw' ? .5 : 0);
  // Musculature: pecs, abs and back; skinless forms get pale tendon bands.
  for (const s of [-1, 1]) {
    oval(chest, k === 'female' ? muscle : shade, [s * w * .55, torso * .78, w * .62], [w * .62, torso * .14, w * .25]);
    for (let i = 0; i < 3; i++) oval(chest, shade, [s * w * .26, torso * (.55 - i * .14), w * .74 - i * .01], [w * .22, torso * .055, w * .06]);
    oval(chest, shade, [s * w * .6, torso * .7, -w * .6], [w * .55, torso * .2, w * .2]);
    if (skinless) for (let i = 0; i < 4; i++) oval(chest, tendon, [s * w * (.3 + i * .18), torso * (.4 + i * .1), w * .85], [w * .05, torso * .12, w * .04]);
  }
  if (k === 'female') { oval(chest, skin, [0, torso * .82, w * .66], [w * 1.25, torso * .12, w * .16]); oval(chest, skin, [0, torso * .38, w * .75], [w * .55, torso * .2, w * .12]); }
  if (k === 'armored') {
    oval(chest, plate, [0, torso * .76, w * .55], [w * 1.45, torso * .22, w * .4]);
    for (let i = 0; i < 3; i++) add(chest, cube, plate, [0, torso * (.5 - i * .12), w * .8], [w * 1.1 - i * w * .12, torso * .09, w * .12]);
    oval(chest, plate, [0, torso * .75, -w * .6], [w * 1.3, torso * .28, w * .3]);
  }
  // Neck, head and face.
  const neck = joint(chest, 0, torso, 0);
  limb(neck, skin, headR * .55, headR * .7, headH * .35, [0, headH * .12, 0]);
  const head = joint(neck, 0, headH * .32 + headR * .9, headR * .1);
  if (quad) head.rotation.x = -1.25;
  oval(head, skin, [0, 0, 0], [headR, headR * 1.12, headR]);
  oval(head, skin, [0, -headR * .6, headR * .18], [headR * .72, headR * .55, headR * .72]);
  const face = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.015, 36, 24, Math.PI / 2 - .85, 1.7, .9, 1.45), new THREE.MeshToonMaterial({ map: titanFace(spec), transparent: true, alphaTest: .05, depthWrite: false }));
  face.scale.set(1, 1.12, 1); face.userData.keep = true; face.renderOrder = 2; head.add(face);
  for (const s of [-1, 1]) oval(head, skin, [s * headR * .98, 0, -headR * .1], [headR * .14, headR * (k === 'attack' ? .34 : .24), headR * .12], [0, 0, s * (k === 'attack' ? -.25 : 0)]);
  if (spec.hair && spec.hair.length > 0) {
    add(head, new THREE.SphereGeometry(headR * 1.06, 22, 14, 0, Math.PI * 2, 0, 1.6), hair, [0, headR * .08, -headR * .06], [1, 1.08, 1.02], [-.22, 0, 0]);
    tufts(head, hair, { center: new THREE.Vector3(0, headR * .1, -headR * .05), radius: headR * 1.02, count: 40, length: headR * spec.hair.length * 1.6, width: headR * .26, phiFrom: .5, phiTo: 1.9, fall: .9, seed: spec.id.length, faceGap: true });
  }
  if (k === 'armored') {
    // Helmet: brow ridge, cheek plates and the crest.
    oval(head, plate, [0, headR * .45, headR * .3], [headR * 1.08, headR * .55, headR * .9]);
    for (const s of [-1, 1]) oval(head, plate, [s * headR * .62, -headR * .25, headR * .55], [headR * .35, headR * .55, headR * .3]);
    oval(head, plate, [0, -headR * .05, headR * .9], [headR * .18, headR * .6, headR * .16]);
  }
  if (k === 'jaw') { oval(head, plate, [0, -headR * .55, headR * .55], [headR * .85, headR * .5, headR * .6]); for (const s of [-1, 1]) oval(head, plate, [s * headR * .5, headR * .2, headR * .7], [headR * .25, headR * .4, headR * .2]); }
  if (k === 'warhammer') for (const s of [-1, 1]) add(head, cube, toon('#c9c2b4'), [s * headR * .45, -headR * .1, headR * .95], [headR * .05, headR * 1.3, headR * .04], [0, 0, s * .12]);
  if (k === 'colossal') { oval(head, shade, [0, headR * .55, headR * .45], [headR * 1.05, headR * .25, headR * .6]); for (const s of [-1, 1]) oval(head, tendon, [s * headR * .85, -headR * .2, headR * .4], [headR * .12, headR * .55, headR * .12]); }
  const nape = joint(neck, 0, headH * .2, -headR * .65); nape.name = 'nape';
  // Arms.
  const arms = [], elbows = [], hands = [];
  for (const s of [-1, 1]) {
    const arm = joint(chest, s * w * 1.42, torso * .88, 0); arms.push(arm);
    if (quad) arm.position.set(s * w * 1.1, torso * .85, 0);
    oval(arm, k === 'armored' ? plate : skin, [s * w * .05, -.012, 0], [w * .42, w * .42, w * .4]);
    limb(arm, skinless || k === 'female' ? muscle : skin, w * .34, w * .27, armLen * .5, [0, -armLen * .25, 0]);
    if (skinless) oval(arm, tendon, [0, -armLen * .1, w * .2], [w * .1, armLen * .08, w * .1]);
    const elbow = joint(arm, 0, -armLen * .5, 0); elbows.push(elbow);
    limb(elbow, k === 'female' ? muscle : skin, w * .27, w * .2, armLen * .45, [0, -armLen * .22, 0]);
    if (k === 'armored') add(elbow, cube, plate, [0, -armLen * .22, w * .1], [w * .5, armLen * .4, w * .45]);
    if (k === 'beast') tufts(elbow, hair, { center: new THREE.Vector3(0, -armLen * .2, 0), radius: w * .3, count: 18, length: w * .4, width: w * .16, phiFrom: .4, phiTo: 2.6, fall: .4, seed: s + 3 });
    const hand = joint(elbow, 0, -armLen * .47, 0); hands.push(hand);
    oval(hand, skin, [0, -.02, 0], [w * .26, .035, w * .16]);
    for (let i = 0; i < 4; i++) oval(hand, skin, [(i - 1.5) * w * .12, -.06, w * .03], [w * .05, .03 * (k === 'jaw' ? 1.5 : 1), w * .05]);
  }
  // Legs.
  const legs = [], knees = [];
  for (const s of [-1, 1]) {
    const leg = joint(hips, s * w * .55, -.01, quad ? -.02 : 0); legs.push(leg);
    limb(leg, skinless ? muscle : skin, w * .5, w * .36, legLen * .5, [0, -legLen * .25, 0]);
    if (k === 'armored') oval(leg, plate, [0, -legLen * .2, w * .25], [w * .45, legLen * .2, w * .3]);
    const knee = joint(leg, 0, -legLen * .5, 0); knees.push(knee);
    oval(knee, k === 'armored' ? plate : shade, [0, 0, w * .2], [w * .3, w * .3, w * .3]);
    limb(knee, skin, w * .34, w * .24, legLen * .48, [0, -legLen * .24, 0]);
    oval(knee, skin, [0, -legLen * .5, w * .2], [w * .3, .03, w * .55]);
  }
  if (quad) { // Cart Titan front legs rest on the ground like hind legs.
    for (const arm of arms) { arm.rotation.x = -1.2; }
    for (const elbow of elbows) elbow.rotation.x = .2;
  }
  if (k === 'beast') {
    tufts(chest, hair, { center: new THREE.Vector3(0, torso * .55, 0), radius: w * 1.12, count: 150, length: w * .42, width: w * .14, phiFrom: .15, phiTo: 2.5, fall: .65, seed: 7 });
    tufts(chest, toon('#7a5a40'), { center: new THREE.Vector3(0, torso * .5, 0), radius: w * 1.08, count: 90, length: w * .32, width: w * .12, phiFrom: .3, phiTo: 2.4, fall: .7, seed: 13 });
    tufts(head, hair, { center: new THREE.Vector3(0, -headR * .2, 0), radius: headR * 1.05, count: 22, length: headR * .6, width: headR * .22, phiFrom: 1.4, phiTo: 2.6, fall: .7, seed: 9 });
    for (const leg of legs) tufts(leg, hair, { center: new THREE.Vector3(0, -legLen * .25, 0), radius: w * .5, count: 14, length: w * .45, width: w * .2, phiFrom: .6, phiTo: 2.4, fall: .5, seed: 11 });
  }
  batch(root, outline ? outlineMaterial(.0045, '#1a120f') : null);
  root.scale.setScalar(spec.height);
  const steam = skinless || k === 'attack';
  return {
    root, hips, chest, neck, head, nape, arms, elbows, hands, legs, knees, spec,
    animate(time) {
      const breathe = Math.sin(time * (k === 'colossal' ? .5 : 1.4));
      chest.scale.set(1 + breathe * .01, 1, 1 + breathe * .015);
      if (spec.group === 'pure') { head.rotation.z = Math.sin(time * .7 + spec.height) * .12; arms.forEach((a, i) => { a.rotation.x = Math.sin(time * .9 + i) * .15 - .1; }); }
      if (k === 'beast') arms[1].rotation.x = -1.2 - Math.max(0, Math.sin(time * 1.2)) * 1.4;
      if (steam) head.rotation.x = Math.sin(time * .4) * .04;
    },
  };
}
