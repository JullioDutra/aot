import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { selectAnchor } from '../src/targeting.js';

function setup() {
  const camera = new THREE.PerspectiveCamera(65, 1.6, .1, 200);
  camera.position.set(0, 2, 5); camera.lookAt(0, 2, -20); camera.updateMatrixWorld();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 1), new THREE.MeshBasicMaterial());
  mesh.position.set(0, 10, -20); mesh.updateMatrixWorld();
  const wall = { minX: -20, maxX: 20, minZ: -20.5, maxZ: -19.5, top: 20 };
  return { camera, mesh, wall };
}

test('left and right cables select separate visible surface points', () => {
  const { camera, mesh, wall } = setup();
  const left = selectAnchor(camera, new THREE.Vector3(-.35, 1.1, 0), -1, [mesh], [wall], false);
  assert.ok(left);
  const right = selectAnchor(camera, new THREE.Vector3(.35, 1.1, 0), 1, [mesh], [wall], false, left.point);
  assert.ok(right); assert.ok(left.point.x < right.point.x); assert.ok(left.point.distanceTo(right.point) > .7);
});

test('an obstacle below the camera blocks a shoulder-level cable', () => {
  const { camera, mesh, wall } = setup();
  const cover = { minX: -2, maxX: 2, minZ: -2, maxZ: -1, top: 1.5 };
  assert.equal(selectAnchor(camera, new THREE.Vector3(-.35, 1.1, 0), -1, [mesh], [wall, cover], true), null);
});

test('rejecting the nearest camera hit does not target a wall behind it', () => {
  const { camera, mesh, wall } = setup();
  const near = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 1), new THREE.MeshBasicMaterial());
  near.position.set(0, 2, -1); near.updateMatrixWorld();
  assert.equal(selectAnchor(camera, new THREE.Vector3(0, 2, 0), -1, [near, mesh], [wall], false), null);
});

test('anchors beyond cable range are rejected', () => {
  const { camera, mesh } = setup(); mesh.position.z = -110; mesh.updateMatrixWorld();
  assert.equal(selectAnchor(camera, new THREE.Vector3(0, 2, 0), 1, [mesh], [], true), null);
});
