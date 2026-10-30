import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OUTFITS } from './character-specs.js';
import { faceFeatures } from './face-expressions.js';

// Toon-shaded procedural cast. Each character is a joint hierarchy (hips,
// spine, chest, neck, head, arms, legs) built in meters, with a hand-drawn
// face texture, lock-based hair and outfit layers. Rigid parts are merged per
// joint and material; an inverted-hull outline gives the cel-shaded contour.

let gradientMap = null;
function gradient() {
  if (!gradientMap) {
    gradientMap = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 3, 1);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter; gradientMap.needsUpdate = true;
  }
  return gradientMap;
}
const toonCache = new Map();
export function toon(color, extra = {}) {
  const key = `${color}|${JSON.stringify(extra)}`;
  if (!toonCache.has(key)) toonCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradient(), ...extra }));
  return toonCache.get(key);
}
const outlineCache = new Map();
export function outlineMaterial(thickness = .008, color = '#1d1512') {
  const key = `${thickness}|${color}`;
  if (!outlineCache.has(key)) {
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    material.onBeforeCompile = shader => {
      shader.uniforms.outlineWidth = { value: thickness };
      shader.vertexShader = shader.vertexShader.replace('void main() {', 'uniform float outlineWidth;\nvoid main() {')
        .replace('#include <begin_vertex>', 'vec3 transformed = position + normal * outlineWidth;');
    };
    material.customProgramCacheKey = () => `outline-${thickness}`;
    outlineCache.set(key, material);
  }
  return outlineCache.get(key);
}

const unitSphere = new THREE.SphereGeometry(1, 20, 14);
const unitCube = new THREE.BoxGeometry(1, 1, 1);
function add(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
const oval = (p, m, pos, scale, rot) => add(p, unitSphere, m, pos, scale, rot);
const capsule = (p, m, radius, length, pos, rot = [0, 0, 0], radialScale = [1, 1]) => {
  const mesh = add(p, new THREE.CapsuleGeometry(radius, length, 6, 12), m, pos, [radialScale[0], 1, radialScale[1]], rot);
  return mesh;
};
function joint(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

// Merge rigid meshes per material inside each joint; keep textured decals.
function batch(group, outline) {
  const buckets = new Map();
  for (const child of [...group.children]) {
    if (child.isGroup) { batch(child, outline); continue; }
    if (!child.isMesh || child.userData.keep) continue;
    child.updateMatrix();
    const geometry = child.geometry.clone();
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
    const list = buckets.get(child.material) ?? [];
    list.push(geometry.applyMatrix4(child.matrix)); buckets.set(child.material, list); group.remove(child);
  }
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) continue;
    // Open shells (jacket, cloak) would self-shadow into stripes.
    const shell = material.side === THREE.DoubleSide;
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = !shell; group.add(mesh);
    if (outline && !material.transparent && !shell) { const line = new THREE.Mesh(merged, outline); line.userData.outline = true; group.add(line); }
    geometries.forEach(g => g.dispose());
  }
}

// ── Emblems and face textures ───────────────────────────────────────────
const textureCache = new Map();
function canvasTexture(key, size, draw) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  textureCache.set(key, texture); return texture;
}
export function emblemTexture(kind) {
  return canvasTexture(`emblem-${kind}`, 128, (c, s) => {
    c.translate(s / 2, s / 2);
    // Shield outline shared by the regiments.
    c.beginPath(); c.moveTo(-44, -50); c.lineTo(44, -50); c.lineTo(44, 18); c.quadraticCurveTo(44, 50, 0, 58); c.quadraticCurveTo(-44, 50, -44, 18); c.closePath();
    c.fillStyle = '#efe9d8'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#2f2a24'; c.stroke();
    if (kind === 'wings') {
      // Two overlapping wings: one white, one blue, original simplified drawing.
      const wing = (color, flip) => { c.save(); c.scale(flip, 1); c.beginPath(); c.moveTo(-2, 30); c.bezierCurveTo(-10, 0, -20, -22, -36, -36); c.lineTo(-28, -16); c.lineTo(-38, -14); c.lineTo(-26, 2); c.lineTo(-34, 6); c.lineTo(-18, 18); c.closePath(); c.fillStyle = color; c.fill(); c.strokeStyle = '#2b2a2c'; c.lineWidth = 2.5; c.stroke(); c.restore(); };
      wing('#2f5f9c', 1); wing('#fbfbf7', -1);
    } else if (kind === 'swords') {
      c.strokeStyle = '#3a3634'; c.lineWidth = 6;
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * -28, -34); c.lineTo(d * 24, 34); c.stroke(); c.beginPath(); c.moveTo(d * 16, 18); c.lineTo(d * 30, 26); c.stroke(); }
    } else if (kind === 'unicorn') {
      // Original simplified horned horse head facing left.
      c.beginPath(); c.moveTo(18, 40); c.lineTo(14, 4); c.quadraticCurveTo(10, -18, -6, -22); c.lineTo(-26, -8); c.lineTo(-30, 4); c.lineTo(-14, 6); c.lineTo(-6, 24); c.closePath();
      c.fillStyle = '#2f5f4a'; c.fill(); c.strokeStyle = '#1f2a24'; c.lineWidth = 2.5; c.stroke();
      c.beginPath(); c.moveTo(-4, -22); c.lineTo(-20, -48); c.lineTo(2, -24); c.closePath(); c.fillStyle = '#efe9d8'; c.fill(); c.stroke();
    } else if (kind === 'roses') {
      for (const [x, y] of [[-14, -8], [14, -8], [0, 16]]) { c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.fillStyle = '#b8323a'; c.fill(); c.strokeStyle = '#4a1418'; c.lineWidth = 2.5; c.stroke(); c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 1.5); c.stroke(); }
    }
  });
}

const BROWS = { angry: [9, -.42, 6], worried: [-6, .32, 4], flat: [0, 0, 5], soft: [-1, .08, 3], thick: [1, -.05, 8], raised: [-11, .14, 4] };
// Anime-style face drawn at 512 px in a 256-unit space: tapered upper lash
// line with flicks, eyelid crease, iris with dark rim, two highlights and a
// lid shadow on the sclera; expressions from face-expressions.js.
export function faceTexture(spec, expression = 'neutral') {
  return canvasTexture(`face-${spec.id}-${expression}`, 512, (c) => {
    c.scale(2, 2);
    const f = faceFeatures(spec, expression), ink = '#24170f', hairInk = spec.hair.color, e = f.eye;
    if (f.blush) { for (const side of [-1, 1]) { const g = c.createRadialGradient(128 + side * 58, 170, 2, 128 + side * 58, 170, 20); g.addColorStop(0, 'rgba(232,120,110,.32)'); g.addColorStop(1, 'rgba(232,120,110,0)'); c.fillStyle = g; c.fillRect(128 + side * 58 - 22, 148, 44, 44); } }
    // Anime proportions: features scaled up around the face center.
    c.translate(128, 140); c.scale(1.35, 1.35); c.translate(-128, -140);
    for (const side of [-1, 1]) {
      const x = 128 + side * 42, y = 136, { hw, hh, tilt } = e;
      c.save(); c.translate(x, y); c.scale(side, 1);
      c.lineCap = 'round'; c.lineJoin = 'round';
      if (e.closed || e.happy) {
        // Closed lids: a lash curve, down for sleep, up for a smile.
        c.strokeStyle = ink; c.lineWidth = 5;
        c.beginPath(); c.moveTo(-hw, 0); c.quadraticCurveTo(0, e.happy ? -14 : 8, hw + 4, e.happy ? 2 : -2); c.stroke();
        if (!e.happy) { c.lineWidth = 1.6; for (const t of [.35, .6, .85]) { const lx = -hw + t * (2 * hw + 4); c.beginPath(); c.moveTo(lx, 5 - t * 4); c.lineTo(lx + 2, 10 - t * 4); c.stroke(); } }
      } else {
        const top = -hh * 1.25 - tilt * 10, outer = -tilt * 8;
        const almond = () => { c.beginPath(); c.moveTo(-hw, 1); c.quadraticCurveTo(0, top, hw, outer); c.quadraticCurveTo(0, hh * .9, -hw, 1); c.closePath(); };
        almond(); c.fillStyle = '#fdfaf4'; c.fill(); c.save(); almond(); c.clip();
        const irisR = Math.max(6, Math.min(hh * 1.05, 17) * e.iris), ix = -1, iy = -hh * .12;
        const g = c.createRadialGradient(ix, iy - irisR * .35, irisR * .1, ix, iy, irisR);
        g.addColorStop(0, f.marks.includes('titanEyes') ? '#d9f4ff' : spec.face.iris); g.addColorStop(.75, spec.face.iris); g.addColorStop(1, '#1b1514');
        c.beginPath(); c.ellipse(ix, iy, irisR * .92, irisR, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
        c.lineWidth = 1.6; c.strokeStyle = '#1b1514'; c.stroke();
        c.beginPath(); c.ellipse(ix, iy, irisR * .4 * e.pupil, irisR * .46 * e.pupil, 0, 0, Math.PI * 2); c.fillStyle = '#0e0b0b'; c.fill();
        // Shadow of the upper lid on the eyeball, then the highlights.
        c.fillStyle = 'rgba(70,50,60,.28)'; c.beginPath(); c.moveTo(-hw, 1); c.quadraticCurveTo(0, top, hw, outer); c.lineTo(hw, outer + 6); c.quadraticCurveTo(0, top + 9, -hw, 7); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(ix - irisR * .42, iy - irisR * .45, irisR * .27, irisR * .2, -.4, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(ix + irisR * .38, iy + irisR * .42, irisR * .1, 0, Math.PI * 2); c.fill();
        c.restore();
        // Tapered upper lash line, thick toward the outer corner, with flicks.
        c.fillStyle = ink; c.beginPath(); c.moveTo(-hw - 2, 3); c.quadraticCurveTo(0, top - 3, hw + 4, outer - 2); c.lineTo(hw + (f.lashes === 'long' ? 12 : 8), outer + 3); c.quadraticCurveTo(0, top + 5, -hw - 1, 4.5); c.closePath(); c.fill();
        if (f.lashes === 'long') { c.strokeStyle = ink; c.lineWidth = 2; for (const t of [.55, .75, .92]) { const lx = -hw + t * 2 * hw, ly = top * (1 - Math.abs(t - .5) * 1.6) - 2; c.beginPath(); c.moveTo(lx, ly + 1); c.lineTo(lx + 5, ly - 5); c.stroke(); } }
        // Eyelid crease and lower lid.
        c.strokeStyle = 'rgba(60,35,28,.55)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-hw + 6, top * .6 - 4); c.quadraticCurveTo(2, top - 7, hw, outer - 7); c.stroke();
        c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-hw + 6, 4); c.quadraticCurveTo(0, hh * 1.0, hw - 1, outer + 3); c.stroke();
        if (f.lashes === 'long') { c.lineWidth = 1.2; c.beginPath(); c.moveTo(hw - 4, outer + 4); c.lineTo(hw + 1, outer + 8); c.stroke(); }
      }
      if (f.marks.includes('underEye')) { c.strokeStyle = 'rgba(80,50,45,.5)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-hw + 6, hh + 6); c.quadraticCurveTo(0, hh + 10, hw - 2, hh + 4); c.stroke(); }
      if (f.marks.includes('titanMarks')) { c.strokeStyle = 'rgba(150,60,70,.7)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(hw - 6, hh + 2); c.quadraticCurveTo(hw + 6, hh + 18, hw + 14, hh + 26); c.stroke(); }
      if (f.tears) {
        c.fillStyle = 'rgba(170,220,255,.75)'; c.beginPath(); c.moveTo(-hw * .2, hh * .8); c.quadraticCurveTo(-hw * .4, hh + 30, -hw * .15, hh + 52); c.quadraticCurveTo(0, hh + 30, hw * .15, hh * .8); c.fill();
        c.strokeStyle = 'rgba(120,180,230,.9)'; c.lineWidth = 1.2; c.stroke();
      }
      // Brows: angry ones meet low toward the nose, worried ones lift there.
      const [lift, angle, width] = BROWS[f.brows] ?? BROWS.flat;
      c.save(); c.translate(0, -e.hh * 1.25 - 12 - lift * .45 - (e.closed ? 4 : 0)); c.rotate(angle); c.fillStyle = f.brows === 'thick' ? hairInk : ink;
      c.beginPath(); c.moveTo(-e.hw - 3, width * .25); c.quadraticCurveTo(0, -width, e.hw + 6, -width * .2); c.quadraticCurveTo(0, width * .2, -e.hw - 3, width * .5); c.fill(); c.restore();
      if (f.crease) { c.strokeStyle = 'rgba(60,35,28,.5)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-e.hw - 8, -e.hh - 18); c.lineTo(-e.hw - 3, -e.hh - 6); c.stroke(); }
      c.restore();
    }
    // Nose: a soft shadow and a tip stroke.
    c.fillStyle = 'rgba(160,100,80,.25)'; c.beginPath(); c.moveTo(132, 150); c.quadraticCurveTo(124, 168, 127, 176); c.lineTo(134, 175); c.fill();
    c.strokeStyle = '#9b6d55'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(126, 174); c.lineTo(132, 176); c.stroke();
    drawMouth(c, f.mouth);
    if (f.marks.includes('freckles')) { c.fillStyle = '#a96b4f'; for (let i = 0; i < 14; i++) { const side = i % 2 ? 1 : -1; c.beginPath(); c.arc(128 + side * (40 + (i * 7) % 22), 158 + (i * 5) % 14, 1.7, 0, Math.PI * 2); c.fill(); } }
    if (f.marks.includes('stubble') || f.marks.includes('beard')) {
      c.fillStyle = hairInk; c.globalAlpha = f.marks.includes('beard') ? .85 : .22;
      c.beginPath(); c.moveTo(66, 172); c.quadraticCurveTo(128, 262, 190, 172); c.quadraticCurveTo(150, 198, 128, 190); c.quadraticCurveTo(106, 198, 66, 172); c.fill();
      c.globalAlpha = 1;
    }
    if (f.marks.includes('mustache')) { c.fillStyle = hairInk; c.beginPath(); c.moveTo(128, 186); c.bezierCurveTo(108, 176, 88, 184, 76, 200); c.bezierCurveTo(96, 192, 112, 194, 128, 194); c.bezierCurveTo(144, 194, 160, 192, 180, 200); c.bezierCurveTo(168, 184, 148, 176, 128, 186); c.fill(); }
    if (f.marks.includes('goatee')) { c.fillStyle = hairInk; c.beginPath(); c.ellipse(128, 224, 13, 16, 0, 0, Math.PI * 2); c.fill(); }
    if (f.marks.includes('wrinkles')) { c.strokeStyle = '#a07a62'; c.lineWidth = 1.2; for (const y of [66, 76]) { c.beginPath(); c.moveTo(96, y); c.quadraticCurveTo(128, y - 5, 160, y); c.stroke(); } }
    // Scars from the timeline: Mikasa's cut under the right eye (854), Levi's
    // slashes across the face after the forest blast.
    if (f.marks.includes('cheekScar')) { c.strokeStyle = '#b8645a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(70, 160); c.lineTo(84, 170); c.stroke(); }
    if (f.marks.includes('slashScars')) { c.strokeStyle = 'rgba(176,96,88,.8)'; c.lineWidth = 1.5; for (const [x1, y1, x2, y2] of [[58, 92, 196, 196], [150, 110, 108, 214], [80, 150, 112, 156]]) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); } }
  });
}

function drawMouth(c, mouth) {
  c.strokeStyle = '#7a3f34'; c.lineWidth = 2.6; c.lineCap = 'round';
  c.beginPath();
  if (mouth === 'smile') { c.moveTo(116, 199); c.quadraticCurveTo(128, 208, 140, 198); c.stroke(); return; }
  if (mouth === 'smirk') { c.moveTo(119, 202); c.quadraticCurveTo(130, 204, 139, 197); c.stroke(); return; }
  if (mouth === 'firm') { c.moveTo(120, 201); c.lineTo(136, 200); c.stroke(); return; }
  if (mouth === 'down') { c.moveTo(119, 204); c.quadraticCurveTo(128, 198, 137, 204); c.stroke(); return; }
  if (mouth === 'tremble') { c.moveTo(118, 203); c.quadraticCurveTo(122, 199, 126, 203); c.quadraticCurveTo(130, 207, 134, 202); c.quadraticCurveTo(136, 200, 138, 203); c.stroke(); return; }
  if (mouth === 'open') { c.ellipse(128, 203, 7, 6, 0, 0, Math.PI * 2); c.fillStyle = '#5a2422'; c.fill(); return; }
  if (mouth === 'grit') {
    // Clenched teeth between drawn-back lips.
    c.moveTo(114, 198); c.quadraticCurveTo(128, 194, 142, 198); c.quadraticCurveTo(128, 210, 114, 198); c.closePath(); c.fillStyle = '#f4efe6'; c.fill(); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.moveTo(116, 200.5); c.lineTo(140, 200.5); c.stroke(); return;
  }
  if (mouth === 'shout') {
    // Wide open mouth: dark inside, upper teeth and the tongue.
    c.moveTo(110, 194); c.quadraticCurveTo(128, 188, 146, 194); c.quadraticCurveTo(140, 226, 128, 228); c.quadraticCurveTo(116, 226, 110, 194); c.closePath();
    c.fillStyle = '#4a1716'; c.fill(); c.stroke();
    c.fillStyle = '#f4efe6'; c.fillRect(114, 194, 28, 5);
    c.fillStyle = '#b24a48'; c.beginPath(); c.ellipse(128, 222, 10, 5, 0, 0, Math.PI * 2); c.fill(); return;
  }
  c.moveTo(121, 201); c.quadraticCurveTo(128, 203, 135, 201); c.stroke();
}

// ── Hair ────────────────────────────────────────────────────────────────
const lockGeometry = new THREE.ConeGeometry(1, 1, 7, 1).rotateX(Math.PI).translate(0, -.5, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
function segment(head, material, origin, direction, normal, length, width, flat) {
  const z = normal.clone().addScaledVector(direction, -normal.dot(direction)); if (z.lengthSq() < 1e-6) z.set(0, 0, 1); z.normalize();
  const y = direction.clone().negate(), x = new THREE.Vector3().crossVectors(y, z).normalize();
  const mesh = new THREE.Mesh(lockGeometry, material);
  new THREE.Matrix4().makeBasis(x, y, z).scale(new THREE.Vector3(width, length, width * flat)).setPosition(origin).decompose(mesh.position, mesh.quaternion, mesh.scale);
  mesh.castShadow = true; head.add(mesh); return mesh;
}
// theta: azimuth (0 = front), phi: polar angle from the crown. A lock first
// hugs the skull along the surface (`bend` of its length) and then falls with
// gravity (`fall`), flaring outward by `flare`. Without the bend, long locks
// would pass through the head and disappear.
function lock(head, material, r, { theta, phi, length, width, fall = .6, flare = .2, flat = .45, bend = 0 }) {
  const n = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta));
  const tangent = new THREE.Vector3(Math.cos(phi) * Math.sin(theta), -Math.sin(phi), Math.cos(phi) * Math.cos(theta));
  const origin = n.clone().multiplyScalar(r * .98);
  if (bend > 0) {
    const hug = tangent.clone().addScaledVector(n, .18).normalize(), first = length * bend * r;
    segment(head, material, origin, hug, n, first, width * r, flat);
    const end = origin.clone().addScaledVector(hug, first * .92);
    const out = end.clone().setY(0).normalize();
    const drop = DOWN.clone().multiplyScalar(fall).addScaledVector(out, flare).addScaledVector(hug, 1 - fall).normalize();
    return segment(head, material, end, drop, out, length * (1 - bend) * r, width * r * .9, flat);
  }
  const d = tangent.multiplyScalar(1 - fall).addScaledVector(DOWN, fall).addScaledVector(n, flare).normalize();
  return segment(head, material, origin, d, n, length * r, width * r, flat);
}
const span = (count, from, to) => Array.from({ length: count }, (_, i) => count === 1 ? (from + to) / 2 : from + (to - from) * i / (count - 1));
function ring(list, count, from, to, opts) { span(count, from, to).forEach((theta, i) => list.push({ ...opts, theta, length: opts.length * (1 + ((i * 37) % 7 - 3) * (opts.jitter ?? .04)) })); }

// Front locks keep a low fall so they lie on the forehead; long hair uses
// `bend` to wrap the skull before dropping.
export const HAIR_STYLES = {
  short: l => { ring(l, 7, -.8, .8, { phi: .7, length: .5, width: .2, fall: .3, flare: .2 }); ring(l, 12, 1, 5.3, { phi: 1.0, length: .5, width: .24, fall: .45, flare: .25 }); },
  eren: l => { ring(l, 7, -.85, .85, { phi: .62, length: .82, width: .21, fall: .35, flare: .3, jitter: .1 }); ring(l, 4, 1, 1.9, { phi: .95, length: .88, width: .22, fall: .6, flare: .25 }); ring(l, 4, -1.9, -1, { phi: .95, length: .88, width: .22, fall: .6, flare: .25 }); ring(l, 8, 2.1, 4.2, { phi: 1.05, length: .8, width: .25, fall: .4, flare: .42, jitter: .12 }); ring(l, 6, 0, 5.2, { phi: .35, length: .55, width: .26, fall: .1, flare: .55 }); },
  long: l => { ring(l, 6, -.75, .75, { phi: .5, length: 1.0, width: .2, fall: .3, flare: .12 }); ring(l, 16, 1, 5.3, { phi: .7, length: 2.5, width: .27, fall: .97, flare: .1, bend: .32, jitter: .06 }); },
  bob: l => { ring(l, 9, -.7, .95, { phi: .42, length: 1.0, width: .2, fall: .28, flare: .07 }); ring(l, 14, 1, 5.3, { phi: .65, length: 1.65, width: .28, fall: .96, flare: .12, bend: .42 }); },
  longStraight: l => { ring(l, 8, -.7, .7, { phi: .45, length: .95, width: .2, fall: .28, flare: .07 }); ring(l, 18, .95, 5.33, { phi: .65, length: 2.7, width: .27, fall: .97, flare: .08, bend: .3 }); },
  bowl: l => { ring(l, 10, -.95, .95, { phi: .4, length: .95, width: .22, fall: .25, flare: .08 }); ring(l, 14, 1, 5.28, { phi: .6, length: 1.55, width: .29, fall: .95, flare: .16, bend: .45 }); },
  // Levi: middle-parted curtain bangs falling to the brows over a shaved undercut.
  'undercut-curtain': l => { ring(l, 5, .1, 1.0, { phi: .3, length: 1.15, width: .22, fall: .55, flare: .04, bend: .35 }); ring(l, 5, -1.0, -.1, { phi: .3, length: 1.15, width: .22, fall: .55, flare: .04, bend: .35 }); ring(l, 7, 1.4, 4.9, { phi: .4, length: .8, width: .27, fall: .35, flare: .06 }); },
  sidepart: l => { ring(l, 9, -.5, 2.3, { phi: .38, length: .95, width: .26, fall: .1, flare: .03 }); ring(l, 4, -1.4, -.6, { phi: .5, length: .55, width: .25, fall: .2, flare: .05 }); ring(l, 6, 2.4, 4.6, { phi: .5, length: .7, width: .28, fall: .25, flare: .05 }); },
  'ponytail-messy': l => { ring(l, 8, -.9, .9, { phi: .55, length: .95, width: .18, fall: .35, flare: .3, jitter: .14 }); ring(l, 8, 1, 5.3, { phi: .85, length: 1.0, width: .22, fall: .7, flare: .3, bend: .3, jitter: .14 }); ring(l, 5, 2.8, 3.5, { phi: 1.15, length: 2.0, width: .22, fall: .85, flare: .45, bend: .2, jitter: .15 }); },
  'ponytail-high': l => { ring(l, 7, -.8, .8, { phi: .55, length: .85, width: .2, fall: .3, flare: .12 }); ring(l, 8, 1, 5.3, { phi: .8, length: .8, width: .24, fall: .6, flare: .08, bend: .4 }); ring(l, 4, 2.9, 3.4, { phi: .6, length: 1.7, width: .25, fall: .8, flare: .55, bend: .15 }); },
  'ponytail-low': l => { ring(l, 7, -.8, .8, { phi: .55, length: .75, width: .2, fall: .3, flare: .12 }); ring(l, 8, 1, 5.3, { phi: .8, length: .8, width: .24, fall: .6, flare: .06, bend: .45 }); ring(l, 4, 2.95, 3.35, { phi: 1.2, length: 1.8, width: .23, fall: .97, flare: .25, bend: .1 }); },
  'ponytail-side': l => { ring(l, 7, -.8, .8, { phi: .5, length: .8, width: .2, fall: .28, flare: .08 }); ring(l, 10, 1, 5.3, { phi: .75, length: .95, width: .24, fall: .9, flare: .06, bend: .45 }); ring(l, 3, 1.95, 2.25, { phi: 1.25, length: 2.7, width: .27, fall: .92, flare: .6, bend: .15 }); },
  bun: l => { ring(l, 3, .45, .95, { phi: .55, length: 1.35, width: .18, fall: .9, flare: .1, bend: .35 }); ring(l, 3, -.95, -.45, { phi: .55, length: 1.35, width: .18, fall: .9, flare: .1, bend: .35 }); ring(l, 8, 1.2, 5.1, { phi: .8, length: .55, width: .25, fall: .15, flare: .02 }); },
  'undercut-top': l => { ring(l, 7, -.9, .9, { phi: .42, length: .72, width: .23, fall: .25, flare: .32 }); ring(l, 6, 1.2, 5.1, { phi: .38, length: .6, width: .26, fall: .2, flare: .2 }); },
  cropped: l => { ring(l, 10, 0, 6, { phi: .55, length: .32, width: .27, fall: .12, flare: .4 }); },
  spiky: l => { ring(l, 9, 0, 6, { phi: .45, length: .62, width: .27, fall: .05, flare: .75, jitter: .1 }); ring(l, 5, -.7, .7, { phi: .7, length: .45, width: .22, fall: .2, flare: .45 }); },
  middlepart: l => { ring(l, 4, .1, .9, { phi: .38, length: .75, width: .23, fall: .3, flare: .15 }); ring(l, 4, -.9, -.1, { phi: .38, length: .75, width: .23, fall: .3, flare: .15 }); ring(l, 10, 1, 5.3, { phi: .8, length: .5, width: .25, fall: .45, flare: .2 }); },
  buzz: () => {}, bald: () => {},
};
// Styles whose front is short keep the cap low over the forehead.
const SHORT_FRONT = new Set(['undercut-curtain', 'undercut-top', 'cropped', 'buzz', 'sidepart', 'spiky']);
const CAPS = { bald: null, buzz: .995, 'undercut-curtain': 1.0, 'undercut-top': 1.0, sidepart: 1.02, cropped: 1.02, bob: 1.07, bowl: 1.09, longStraight: 1.06, long: 1.06 };

// ── Body ────────────────────────────────────────────────────────────────
const BUILDS = { average: [.118, 1], broad: [.13, 1.12], athletic: [.122, 1.04], lean: [.112, .95], slim: [.105, .9], 'athletic-female': [.108, .92] };

export function characterProportions(spec) {
  const H = spec.height;
  const heads = spec.age === 'child' ? 5.6 : spec.age === 'teen' ? 6.5 : 7.3;
  const headH = H / heads, headR = headH * .5;
  const leg = H * (spec.age === 'child' ? .44 : .48);
  const [shoulderRatio, girth] = BUILDS[spec.build] ?? BUILDS.average;
  return { H, headH, headR, thigh: leg * .5, shin: leg * .44, foot: leg * .06, hipY: leg, torso: H - leg - headH - H * .03, shoulder: H * shoulderRatio, girth, upperArm: H * .17, foreArm: H * .155 };
}

export function createCharacter(spec, { gear = true, blades = false, outline = true } = {}) {
  const o = OUTFITS[spec.outfit] ?? OUTFITS.survey;
  const p = characterProportions(spec);
  const line = outline ? outlineMaterial(p.H * .0045) : null;
  const skin = toon(spec.skin), hair = toon(spec.hair.color), under = toon(spec.hair.under ?? spec.hair.color);
  const shirt = toon(o.shirt), pants = toon(o.pants), boots = toon(o.boots), strap = o.straps ? toon(o.straps) : null;
  const jacket = o.jacket ? toon(o.jacket) : null, sleeve = jacket ?? shirt;
  const metal = toon('#8d9497', { emissive: '#1c2124' }), dark = toon('#2a2724');
  const root = new THREE.Group(); root.name = spec.id;
  const hips = joint(root, 0, p.hipY, 0);
  const w = p.shoulder, g = p.girth;
  // Pelvis and lower torso (shirt or pants), waist belt.
  oval(hips, pants, [0, 0, 0], [w * .68 * g, p.H * .045, w * .48 * g]);
  const spine = joint(hips, 0, p.H * .03, 0);
  const chest = joint(spine, 0, p.torso * .45, 0);
  const torsoProfile = [[.62, -p.torso * .47], [.6, -p.torso * .2], [.7, 0], [.86, p.torso * .25], [.88, p.torso * .42], [.55, p.torso * .55]].map(([r, y]) => new THREE.Vector2(r * w * g, y));
  add(chest, new THREE.LatheGeometry(torsoProfile, 20), shirt, [0, 0, 0], [1, 1, .62]);
  if (o.skirt) add(hips, new THREE.CylinderGeometry(w * .62, w * 1.15, p.thigh * 1.55, 18, 1, true), toon(o.skirt, { side: THREE.DoubleSide }), [0, -p.thigh * .65, 0]);
  if (o.apron) add(hips, new THREE.PlaneGeometry(w * 1.05, p.thigh * 1.4), toon(o.apron, { side: THREE.DoubleSide }), [0, -p.thigh * .55, w * .6], [1, 1, 1], [-.08, 0, 0]);
  add(hips, new THREE.TorusGeometry(w * .72 * g, p.H * .012, 6, 20), strap ?? toon('#3a2a20'), [0, p.H * .025, 0], [1, .62, 1], [Math.PI / 2, 0, 0]);
  if (jacket) {
    // Cropped regiment jacket over the rib cage, open at the front.
    const jacketProfile = [[.92, -p.torso * .02], [.98, p.torso * .25], [.98, p.torso * .42], [.6, p.torso * .56]].map(([r, y]) => new THREE.Vector2(r * w * g, y));
    add(chest, new THREE.LatheGeometry(jacketProfile, 20, Math.PI * .14, Math.PI * 1.72), toon(o.jacket, { side: THREE.DoubleSide }), [0, 0, 0], [1, 1, .64], [0, 0, 0]);
    if (o.coat) add(chest, new THREE.CylinderGeometry(w * .95 * g, w * 1.25, p.torso * .6 + p.thigh * 1.3, 18, 1, true, Math.PI * .12, Math.PI * 1.76), toon(o.jacket, { side: THREE.DoubleSide }), [0, -p.thigh * .55, 0], [1, 1, .68]);
  }
  if (strap) {
    // Harness: chest band and two shoulder straps over the shirt.
    add(chest, new THREE.TorusGeometry(w * .86 * g, p.H * .009, 6, 20), strap, [0, p.torso * .12, 0], [1, .62, 1], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) add(chest, unitCube, strap, [s * w * .36, p.torso * .25, w * .55], [p.H * .011, p.torso * .5, p.H * .005], [0, 0, s * .05]);
  }
  if (spec.extras.includes('laceShirt')) for (let i = 0; i < 3; i++) add(chest, unitCube, toon('#8a7660'), [0, p.torso * (.32 - i * .06), w * .56], [w * .25, p.H * .004, p.H * .004], [0, 0, (i % 2 ? .4 : -.4)]);
  // Neck and head.
  const neck = joint(chest, 0, p.torso * .55, 0);
  add(neck, new THREE.CylinderGeometry(p.headR * .36, p.headR * .42, p.H * .05, 12), skin, [0, p.H * .022, 0]);
  const head = joint(neck, 0, p.H * .045 + p.headR * .98, p.headR * .04);
  oval(head, skin, [0, 0, 0], [p.headR * .94, p.headR * 1.1, p.headR * .98]);
  // Jaw tapering to a small chin, as in the anime.
  oval(head, skin, [0, -p.headR * .58, p.headR * .14], [p.headR * .58, p.headR * .52, p.headR * .58]);
  oval(head, skin, [0, -p.headR * .86, p.headR * .3], [p.headR * .26, p.headR * .2, p.headR * .3]);
  for (const s of [-1, 1]) oval(head, skin, [s * p.headR * .9, -p.headR * .05, -p.headR * .05], [p.headR * .14, p.headR * .24, p.headR * .11]);
  const face = new THREE.Mesh(new THREE.SphereGeometry(p.headR * 1.012, 32, 20, Math.PI / 2 - .8, 1.6, .95, 1.3), new THREE.MeshToonMaterial({ map: faceTexture(spec), transparent: true, alphaTest: .08, gradientMap: gradient(), depthWrite: false }));
  face.scale.set(.94, 1.1, .98); face.userData.keep = true; face.renderOrder = 2; head.add(face);
  face.userData.expression = 'neutral';
  // Hair: a cap following the skull plus individual locks.
  const capScale = CAPS[spec.hair.style] ?? 1.05;
  if (spec.hair.style !== 'bald') add(head, new THREE.SphereGeometry(p.headR * capScale, 22, 14, 0, Math.PI * 2, 0, spec.hair.style === 'buzz' ? 1.75 : 1.62), spec.hair.under ? under : hair, [0, p.headR * .08, -p.headR * .08], [.97, 1.08, 1.02], [SHORT_FRONT.has(spec.hair.style) ? -.2 : -.42, 0, 0]);
  const locks = []; (HAIR_STYLES[spec.hair.style] ?? HAIR_STYLES.short)(locks);
  for (const l of locks) lock(head, hair, p.headR * 1.04, l);
  if (spec.hair.style === 'bun') oval(head, hair, [0, p.headR * .25, -p.headR * 1.02], [p.headR * .42, p.headR * .4, p.headR * .4]);
  if (spec.extras.includes('glasses') || spec.extras.includes('roundGlasses')) {
    const frame = toon('#3a332c');
    for (const s of [-1, 1]) add(head, new THREE.TorusGeometry(p.headR * (spec.extras.includes('roundGlasses') ? .2 : .22), p.headR * .025, 6, 16), frame, [s * p.headR * .36, -p.headR * .02, p.headR * .99], [1, spec.extras.includes('roundGlasses') ? 1 : .75, 1]);
    add(head, unitCube, frame, [0, -p.headR * .02, p.headR * 1.02], [p.headR * .25, p.headR * .03, p.headR * .03]);
  }
  if (spec.extras.includes('eyepatch')) {
    // Hange after 850: patch over the left eye and a band around the head.
    const patch = toon('#1d1a18');
    oval(head, patch, [p.headR * .36, -p.headR * .02, p.headR * .93], [p.headR * .24, p.headR * .2, p.headR * .08]);
    add(head, new THREE.TorusGeometry(p.headR * 1.0, p.headR * .03, 6, 28), patch, [0, p.headR * .05, 0], [1, 1, 1], [Math.PI / 2 - .12, 0, -.25]);
  }
  if (spec.extras.includes('goggles')) {
    add(head, new THREE.TorusGeometry(p.headR * 1.02, p.headR * .05, 6, 24), dark, [0, p.headR * .35, 0], [1, 1, 1], [Math.PI / 2 - .25, 0, 0]);
    for (const s of [-1, 1]) add(head, new THREE.CylinderGeometry(p.headR * .19, p.headR * .19, p.headR * .16, 14), metal, [s * p.headR * .3, p.headR * .62, p.headR * .78], [1, 1, 1], [1.2, 0, 0]);
  }
  if (spec.extras.includes('scarf')) {
    const red = toon('#8f2a2c');
    add(neck, new THREE.TorusGeometry(p.headR * .55, p.headR * .2, 8, 18), red, [0, p.H * .02, 0], [1, 1, .9], [Math.PI / 2, 0, 0]);
    add(neck, unitCube, red, [p.headR * .25, -p.H * .05, p.headR * .55], [p.headR * .35, p.H * .09, p.headR * .12], [.2, 0, -.15]);
  }
  if (spec.extras.includes('cravat')) oval(neck, toon('#f3f1ea'), [0, -p.H * .01, p.headR * .45], [p.headR * .28, p.H * .04, p.headR * .16]);
  if (spec.extras.includes('bolo')) add(neck, unitCube, toon('#5f86b8'), [0, -p.H * .015, p.headR * .48], [p.headR * .12, p.headR * .12, p.headR * .05]);
  if (spec.extras.includes('hoodie')) add(neck, new THREE.TorusGeometry(p.headR * .7, p.headR * .22, 8, 18), toon('#d8d6cf'), [0, -p.H * .005, -p.headR * .12], [1, 1, 1], [Math.PI / 2 + .3, 0, 0]);
  // Arms with sleeves and hands.
  const arms = [], elbows = [], hands = [];
  for (const s of [-1, 1]) {
    const arm = joint(chest, s * w * g * .98, p.torso * .4, 0); arms.push(arm);
    oval(arm, sleeve, [0, -p.H * .012, 0], [p.H * .033 * g, p.H * .04, p.H * .033 * g]);
    capsule(arm, sleeve, p.H * .03 * g, p.upperArm * .8, [0, -p.upperArm / 2, 0]);
    if (o.emblem && s === -1) { const decal = add(arm, new THREE.PlaneGeometry(p.H * .045, p.H * .05), new THREE.MeshBasicMaterial({ map: emblemTexture(o.emblem), transparent: true }), [-p.H * .033 * g, -p.upperArm * .25, 0], [1, 1, 1], [0, -Math.PI / 2, 0]); decal.userData.keep = true; }
    if (spec.extras.includes('armband') && s === -1) add(arm, new THREE.CylinderGeometry(p.H * .034, p.H * .034, p.H * .025, 12), toon('#c9a640'), [0, -p.upperArm * .35, 0]);
    const elbow = joint(arm, 0, -p.upperArm, 0); elbows.push(elbow);
    capsule(elbow, sleeve, p.H * .026 * g, p.foreArm * .8, [0, -p.foreArm / 2, 0]);
    const hand = joint(elbow, 0, -p.foreArm, 0); hands.push(hand);
    oval(hand, skin, [0, -p.H * .025, 0], [p.H * .022, p.H * .035, p.H * .017]);
    if (blades) add(hand, unitCube, toon('#d9dee0', { emissive: '#2a3134' }), [0, -p.H * .05, p.H * .2], [p.H * .006, p.H * .02, p.H * .38]);
  }
  // Legs: trousers, thigh straps, knee-high boots.
  const legs = [], knees = [], feet = [];
  for (const s of [-1, 1]) {
    const leg = joint(hips, s * w * .42, -p.H * .02, 0); legs.push(leg);
    capsule(leg, pants, p.H * .043 * g, p.thigh * .8, [0, -p.thigh / 2, 0]);
    if (strap) for (const t of [.35, .7]) add(leg, new THREE.TorusGeometry(p.H * .045 * g, p.H * .006, 6, 16), strap, [0, -p.thigh * t, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    if (strap) add(leg, unitCube, strap, [s * p.H * .043 * g, -p.thigh * .45, 0], [p.H * .006, p.thigh * .9, p.H * .014]);
    const knee = joint(leg, 0, -p.thigh, 0); knees.push(knee);
    capsule(knee, o.boots === o.pants ? pants : boots, p.H * .036 * g, p.shin * .82, [0, -p.shin / 2, 0]);
    const foot = joint(knee, 0, -p.shin, 0); feet.push(foot);
    oval(foot, boots, [0, -p.foot * .35, p.H * .035], [p.H * .032, p.foot * .55, p.H * .07]);
  }
  // ODM gear: blade cases at the hips, gas cylinders and the central unit.
  if (gear && o.gear) {
    for (const s of [-1, 1]) {
      const box = add(hips, unitCube, metal, [s * w * .82, -p.H * .1, -p.H * .07], [p.H * .032, p.H * .075, p.H * .23], [-.32, 0, s * .1]);
      box.userData.part = 'bladeCase';
      add(hips, new THREE.CylinderGeometry(p.H * .025, p.H * .025, p.H * .2, 10), metal, [s * p.H * .065, -p.H * .02, -w * .72], [1, 1, 1], [0, 0, Math.PI / 2 - s * .4]);
    }
    add(hips, unitCube, dark, [0, 0, -w * .62], [p.H * .1, p.H * .06, p.H * .05]);
  }
  // Survey Corps cloak with the emblem on the back.
  let cloak = null;
  if (o.cloak) {
    cloak = joint(chest, 0, p.torso * .5, -w * .45 * g);
    add(cloak, new THREE.CylinderGeometry(w * .75 * g, w * 1.25, p.torso + p.thigh * .55, 16, 1, true, Math.PI * .58, Math.PI * .84), toon(o.cloak, { side: THREE.DoubleSide }), [0, -(p.torso + p.thigh * .55) / 2, w * .3], [1, 1, .7]);
    oval(cloak, toon(o.cloak), [0, 0, w * .05], [w * .7 * g, p.H * .03, w * .3]);
    const back = add(cloak, new THREE.PlaneGeometry(w * .8, w * .9), new THREE.MeshBasicMaterial({ map: emblemTexture(o.emblem), transparent: true, side: THREE.DoubleSide }), [0, -p.torso * .5, -w * .58], [1, 1, 1], [0, Math.PI, 0]);
    back.userData.keep = true;
  } else if (o.emblem && jacket) {
    const back = add(chest, new THREE.PlaneGeometry(w * .7, w * .75), new THREE.MeshBasicMaterial({ map: emblemTexture(o.emblem), transparent: true }), [0, p.torso * .25, -w * .63 * g], [1, 1, 1], [0, Math.PI, 0]);
    back.userData.keep = true;
  }
  batch(root, line);
  return { root, hips, spine, chest, neck, head, face, arms, elbows, hands, legs, knees, feet, cloak, spec, proportions: p };
}

// Swaps the face texture; textures are cached per character and expression.
export function setExpression(rig, expression = 'neutral') {
  if (!rig.face || rig.face.userData.expression === expression) return;
  rig.face.userData.expression = expression; rig.face.material.map = faceTexture(rig.spec, expression); rig.face.material.needsUpdate = true;
}
