// Renders the three Eren and Mikasa scenes of the home page once, with one
// temporary WebGL context, into plain 2D canvases; the context is released
// afterwards so the live Trost scene keeps the GPU to itself.
import * as THREE from 'three';
import { CHARACTER_SPECS } from './character-specs.js';
import { createCharacter, toon } from './character-model.js';
import { characterPose, applyPose } from './character-animation.js';

function actor(scene, id, { pose = 'idle', x = 0, z = 0, yaw = 0, y = 0, blades = false, extras, tweak } = {}) {
  const base = CHARACTER_SPECS[id];
  const rig = createCharacter(extras ? { ...base, extras } : base, { blades });
  applyPose(rig, characterPose(pose, 1.2));
  tweak?.(rig);
  rig.root.position.set(x, y, z); rig.root.rotation.y = yaw;
  rig.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(rig.root);
  return rig;
}

function stage({ sky, ground, fog, sun, sunColor, hemi }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(fog ?? sky, 14, 70);
  scene.add(new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]));
  const light = new THREE.DirectionalLight(sunColor, 2.2); light.position.set(...sun); light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024); Object.assign(light.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 40 });
  scene.add(light);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 48), toon(ground)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  return scene;
}

function tree(scene, x, z) {
  const bark = toon('#5a4030'), leaves = toon('#5f7d3e'), light = toon('#7a9a4c');
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.32, .55, 4.2, 10), bark); trunk.position.set(x, 2.1, z); scene.add(trunk);
  for (const [dx, dy, dz, r, m] of [[0, 4.8, 0, 2.2, leaves], [1.6, 4.2, .4, 1.5, light], [-1.5, 4.4, -.3, 1.6, leaves], [.3, 5.9, -.4, 1.5, light], [-.6, 4.1, 1.2, 1.3, light]]) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); crown.position.set(x + dx, dy, z + dz); crown.castShadow = true; scene.add(crown);
  }
  for (const s of [-1, 1]) { const root = new THREE.Mesh(new THREE.CylinderGeometry(.08, .2, 1.2, 6), bark); root.position.set(x + s * .45, .2, z + .2); root.rotation.z = s * 1.1; scene.add(root); }
}

// Each builder returns the scene and its camera framing.
const BUILDERS = {
  arvore() {
    const scene = stage({ sky: '#e9c48c', fog: '#f0d3a2', ground: '#8ea25c', sun: [-6, 7, 5], sunColor: '#ffd9a0', hemi: ['#ffe8c4', '#5c6a3a', 1.5] });
    tree(scene, 0, -1);
    const wood = toon('#7a5638');
    for (let i = 0; i < 4; i++) { const log = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .7, 6), wood); log.position.set(1.05 + i * .05, .06 + (i % 2) * .08, .35); log.rotation.set(Math.PI / 2, 0, .3 + i * .2); scene.add(log); }
    actor(scene, 'eren-child', { pose: 'sit', x: 0, z: -.35, yaw: .3, tweak: r => { r.head.rotation.x = .25; } });
    actor(scene, 'mikasa-child', { pose: 'idle', x: 1.1, z: .55, yaw: -1.9, tweak: r => { r.head.rotation.x = .3; r.spine.rotation.x = .12; } });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 5, 1), toon('#c9b48e')); wall.position.set(0, 2.5, -30); scene.add(wall);
    return { scene, eye: [2.7, 1.5, 3.5], look: [.35, 1.05, -.4] };
  },
  cachecol() {
    const scene = stage({ sky: '#5d7392', fog: '#7487a3', ground: '#d8dde4', sun: [5, 6, 4], sunColor: '#c8d6ff', hemi: ['#b9c8e8', '#59647a', 1.6] });
    const pine = toon('#2f4a42');
    for (const [x, z, h] of [[-3.5, -4, 3.5], [-1.2, -6, 4.2], [2.8, -5, 3.8], [5, -3, 3]]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(h * .32, h, 8), pine); cone.position.set(x, h / 2, z); scene.add(cone); }
    actor(scene, 'eren-child', { pose: 'idle', x: -.3, z: 0, yaw: Math.PI / 2 - .25, extras: [], tweak: r => { r.arms.forEach((a, i) => { a.rotation.set(-1.25, 0, (i ? -1 : 1) * .35); }); r.elbows.forEach(e => { e.rotation.x = -1.1; }); r.head.rotation.x = .12; } });
    actor(scene, 'mikasa-child', { pose: 'idle', x: .3, z: 0, yaw: -Math.PI / 2 + .45, tweak: r => { r.head.rotation.x = .3; r.arms.forEach(a => { a.rotation.x = -.35; }); } });
    return { scene, eye: [1.1, 1.15, 2.3], look: [0, .95, 0] };
  },
  batalha() {
    const scene = stage({ sky: '#d98b55', fog: '#e6a06a', ground: '#6e4b3a', sun: [-4, 5, 6], sunColor: '#ffbb7a', hemi: ['#ffcf9a', '#4a3530', 1.3] });
    const roof = toon('#7c3f2c'), stone = toon('#b8a07c');
    const top = new THREE.Mesh(new THREE.BoxGeometry(6, .4, 4), roof); top.position.set(0, -.2, 0); top.receiveShadow = true; scene.add(top);
    for (const [x, z, h] of [[-6, -6, 6], [4, -9, 8], [9, -4, 5], [-11, -10, 9]]) { const house = new THREE.Mesh(new THREE.BoxGeometry(4, h, 4), stone); house.position.set(x, h / 2 - 3, z); scene.add(house); }
    const wall = new THREE.Mesh(new THREE.BoxGeometry(90, 26, 2), toon('#a99272')); wall.position.set(0, 10, -34); scene.add(wall);
    const blades = r => { r.arms.forEach((a, i) => { a.rotation.set(-.35, 0, (i ? 1 : -1) * .35); }); r.elbows.forEach(e => { e.rotation.x = -.5; }); };
    actor(scene, 'eren', { x: -.42, yaw: .25, blades: true, tweak: blades });
    actor(scene, 'mikasa', { x: .42, yaw: -.15, blades: true, tweak: blades });
    return { scene, eye: [.5, .85, 3.3], look: [0, 1.2, 0] };
  },
};

export function renderHomeScenes(targets, { width = 512, height = 288 } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); } catch { return 0; }
  renderer.setPixelRatio(1); renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  let done = 0;
  for (const { id, canvas } of targets) {
    const build = BUILDERS[id]; if (!build) continue;
    const { scene, eye, look } = build();
    const camera = new THREE.PerspectiveCamera(36, width / height, .1, 200); camera.position.set(...eye); camera.lookAt(...look);
    renderer.render(scene, camera);
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(renderer.domElement, 0, 0);
    scene.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    done++;
  }
  renderer.dispose(); renderer.forceContextLoss();
  return done;
}
