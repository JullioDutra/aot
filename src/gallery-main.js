import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './gallery.css';
import { CHARACTER_SPECS } from './character-specs.js';
import { createCharacter, setExpression } from './character-model.js';
import { EXPRESSIONS } from './face-expressions.js';
import { ERAS, eraOf, dressFor } from './campaign/wardrobe.js';
import { characterPose, applyPose, POSES } from './character-animation.js';
import { TITAN_FORMS, createTitanForm } from './titan-forms.js';
import { toggleFullscreen } from './platform.js';

const $ = id => document.getElementById(id);
const canvas = $('gallery-canvas');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (error) { $('gallery-error').hidden = false; throw error; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#9fb3b6'); scene.fog = new THREE.Fog('#9fb3b6', 60, 260);
const camera = new THREE.PerspectiveCamera(32, 1, .1, 800);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .52;
scene.add(new THREE.HemisphereLight('#e8f0f2', '#5d5a48', 1.6));
const sun = new THREE.DirectionalLight('#fff1d2', 2.4); sun.position.set(6, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 120 }); scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshStandardMaterial({ color: '#b6aa86', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

const CAST = ['eren', 'mikasa', 'armin', 'levi', 'erwin', 'hange', 'jean', 'sasha', 'connie', 'reiner', 'bertholdt', 'annie', 'historia', 'ymir', 'marco', 'hannes', 'pixis', 'shadis', 'zeke', 'pieck', 'falco', 'gabi', 'eren-s4'];
const CHILDHOOD = ['eren-child', 'mikasa-child', 'armin-child', 'carla', 'grisha', 'hannes'];
const params = new URLSearchParams(location.search);
let mode = params.get('modo') === 'titas' ? 'titans' : 'cast', selected = params.get('id'), pose = 'idle', era = Number(params.get('fase')) || 0, closeUp = params.get('rosto') === '1', expression = EXPRESSIONS.includes(params.get('expressao')) ? params.get('expressao') : 'neutral';
const actors = [];
const stage = new THREE.Group(); scene.add(stage);

function clear() {
  for (const actor of actors) stage.remove(actor.root);
  actors.length = 0;
}
function lineup(ids) {
  clear();
  const gap = .75;
  ids.forEach((id, i) => {
    const rig = createCharacter(dressFor(CHARACTER_SPECS[id], era), { blades: pose === 'strike' });
    rig.root.position.x = (i - (ids.length - 1) / 2) * gap; rig.id = id;
    stage.add(rig.root); actors.push(rig);
  });
  const width = ids.length * gap;
  controls.target.set(0, .95, 0); camera.position.set(0, 1.4, Math.max(4.2, width * 1.25));
}
function single(id) {
  clear();
  const rig = createCharacter(dressFor(CHARACTER_SPECS[id], era), { blades: ['strike', 'odm'].includes(pose) }); rig.id = id;
  stage.add(rig.root); actors.push(rig);
  const h = CHARACTER_SPECS[id].height;
  if (closeUp) { const head = rig.proportions.H - rig.proportions.headH * .55; controls.target.set(0, head, 0); camera.position.set(.12, head + .02, rig.proportions.headH * 3.4); }
  else { controls.target.set(0, h * .62, 0); camera.position.set(1.2, h * .8, 3.2); }
}
function titans(id) {
  clear();
  const list = id ? TITAN_FORMS.filter(t => t.id === id) : TITAN_FORMS.filter(t => t.group !== 'colossal');
  let x = 0; const placed = [];
  for (const spec of list) {
    const titan = createTitanForm(spec); const width = Math.max(6, spec.height * .55);
    titan.root.position.x = x + width / 2; x += width + 3; placed.push(titan);
    stage.add(titan.root); actors.push(titan);
  }
  for (const t of placed) t.root.position.x -= x / 2;
  const tallest = Math.max(...list.map(t => t.height));
  controls.target.set(0, tallest * .5, 0); camera.position.set(0, tallest * .6, Math.max(tallest * 2.2, x * .9));
  if (!id) { const human = createCharacter(CHARACTER_SPECS.levi, {}); human.root.position.set(placed[0].root.position.x - 6, 0, 4); stage.add(human.root); actors.push(human); human.id = 'levi'; }
}

function renderList() {
  const items = mode === 'titans' ? [{ id: '', name: 'Todos (escala)' }, ...TITAN_FORMS] : [{ id: '', name: 'Elenco principal' }, { id: 'infancia', name: 'Shiganshina, 845' }, ...CAST.map(id => CHARACTER_SPECS[id])];
  $('gallery-list').replaceChildren(...items.map(item => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = item.id; b.textContent = item.name;
    b.className = (selected ?? '') === item.id ? 'active' : '';
    b.addEventListener('click', () => { selected = item.id || null; build(); });
    return b;
  }));
}
function build() {
  if (mode === 'titans') titans(selected);
  else if (selected === 'infancia') lineup(CHILDHOOD);
  else if (selected && CHARACTER_SPECS[selected]) single(selected);
  else lineup(CAST.slice(0, 15));
  renderList();
  const spec = mode === 'titans' ? TITAN_FORMS.find(t => t.id === selected) : CHARACTER_SPECS[selected];
  $('gallery-caption').textContent = spec ? `${spec.name} · ${spec.height} m${spec.note ? ` · ${spec.note}` : ''}` : mode === 'titans' ? 'Titãs puros e os Nove lado a lado, com Levi para escala. O Colossal (60 m) aparece só na seleção individual.' : 'Escala real entre os personagens. Selecione um nome para girar 360°.';
  history.replaceState(null, '', `?modo=${mode === 'titans' ? 'titas' : 'elenco'}${selected ? `&id=${selected}` : ''}`);
}

for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
  mode = button.dataset.mode; selected = null;
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b === button)); build();
});
$('gallery-pose').replaceChildren(...POSES.map(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; return o; }));
$('gallery-pose').addEventListener('change', event => { pose = event.target.value; build(); });
const EXPRESSION_NAMES = { neutral: 'neutra', angry: 'raiva', shout: 'grito', cry: 'choro', sad: 'tristeza', smile: 'sorriso', closed: 'olhos fechados', determined: 'determinação', shock: 'susto' };
$('gallery-expression').replaceChildren(...EXPRESSIONS.map(e => { const o = document.createElement('option'); o.value = e; o.textContent = EXPRESSION_NAMES[e]; o.selected = e === expression; return o; }));
$('gallery-expression').addEventListener('change', event => { expression = event.target.value; });
$('gallery-era').replaceChildren(...[{ from: 0, label: 'Padrão' }, ...ERAS].map(e => { const o = document.createElement('option'); o.value = e.from; o.textContent = e.year ? `${e.label} (${e.year})` : e.label; o.selected = e.from === (era ? eraOf(era).from : 0); return o; }));
$('gallery-era').addEventListener('change', event => { era = Number(event.target.value); build(); });
$('gallery-face').checked = closeUp;
$('gallery-face').addEventListener('change', event => { closeUp = event.target.checked; build(); });
$('gallery-fullscreen').addEventListener('click', () => void toggleFullscreen(document, document.documentElement));
document.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize(); build();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const time = clock.getElapsedTime();
  for (const actor of actors) {
    if (actor.proportions) { applyPose(actor, characterPose(pose, time, { progress: (time % 1.2) / 1.2 })); setExpression(actor, expression); }
    else actor.animate?.(time);
  }
  controls.update(); renderer.render(scene, camera);
});
window.__GALLERY__ = Object.freeze({ snapshot: () => ({ mode, selected, pose, expression, era, actors: actors.map(a => a.id ?? a.spec?.id), drawCalls: renderer.info.render.calls }) });
