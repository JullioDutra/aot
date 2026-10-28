import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGraphicsQuality, loadGraphicsQuality, GRAPHICS_KEY } from '../src/graphics-quality.js';

function setup(storage) {
  let ratio = 1;
  const renderer = { getPixelRatio: () => ratio, setPixelRatio: n => { ratio = n; }, shadowMap: { enabled: true }, capabilities: { getMaxAnisotropy: () => 4 } };
  const scene = new THREE.Scene(), light = new THREE.DirectionalLight();
  light.shadow.mapSize.set(2048, 2048);
  const map = new THREE.Texture(), material = new THREE.MeshStandardMaterial({ map, bumpMap: map });
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  return { renderer, light, map, material, controller: createGraphicsQuality({ renderer, scene, light, storage, pixelRatio: () => 2 }) };
}
test('performance removes relief and shadows, high restores the original texture', () => {
  const { controller, material, map } = setup();
  const low = controller.apply('low');
  assert.equal(low.pixelRatio, .8); assert.equal(low.shadows, false); assert.equal(material.bumpMap, null); assert.equal(material.map, map);
  const high = controller.apply('high');
  assert.equal(high.pixelRatio, 1.6); assert.equal(high.shadowSize, 2048); assert.equal(material.bumpMap, map); assert.equal(map.anisotropy, 4);
});
test('changing shadow resolution releases the old render targets', () => {
  const { controller, light } = setup();
  let released = 0;
  light.shadow.map = { dispose: () => released++ }; light.shadow.mapPass = { dispose: () => released++ };
  controller.apply('medium');
  assert.equal(released, 2); assert.equal(light.shadow.map, null); assert.equal(light.shadow.mapSize.x, 1024);
});
test('reapplying a profile does not recompile unchanged materials', () => {
  const { controller, material } = setup();
  controller.apply('low'); const version = material.version;
  controller.apply('low'); assert.equal(material.version, version);
});
test('stored choice is restored independently of mission checkpoints', () => {
  const data = new Map([['trost.operation.v1', 'mission']]);
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  setup(storage).controller.apply('low');
  assert.equal(setup(storage).controller.snapshot().quality, 'low');
  assert.equal(data.get('trost.operation.v1'), 'mission'); assert.equal(data.get(GRAPHICS_KEY), 'low');
});
test('blocked or invalid storage keeps the profiles usable', () => {
  const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(loadGraphicsQuality(storage), 'high');
  const { controller } = setup(storage); assert.equal(controller.apply('low').persisted, false);
  assert.equal(controller.apply('unknown').quality, 'high');
  assert.equal(loadGraphicsQuality({ getItem: () => '__proto__' }), 'high');
});
