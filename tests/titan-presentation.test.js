import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTitan } from '../src/titan-model.js';
import { combatPose, applyCombatPose } from '../src/titan-animation.js';
import { MOVES } from '../src/titan-combat.js';

test('new titan rig preserves the ODM nape height and has articulated limbs', () => {
  const scene = new THREE.Scene(); const titan = createTitan(scene, 3, 5, 15, 0, { variant: 'attack' });
  scene.updateMatrixWorld(true); const position = new THREE.Vector3(); titan.nape.getWorldPosition(position);
  assert.ok(Math.abs(position.y - 9.75 * 15 / 12.4) < .001);
  assert.equal(position.x, 3); assert.equal(titan.elbows.length, 2); assert.equal(titan.knees.length, 2);
  assert.equal(titan.elbows[0].parent, titan.arms[0]); assert.equal(titan.knees[1].parent, titan.legs[1]);
  const bounds = new THREE.Box3().setFromObject(titan.root);
  assert.ok(bounds.min.y > -.3 && bounds.min.y < .3); assert.ok(bounds.max.y > 13 && bounds.max.y < 16);
});
test('hand extension reaches the impact pose at the combat hit timestamp', () => {
  for (const kind of ['light', 'heavy', 'grab']) {
    const impact = combatPose({ action: { kind, elapsed: MOVES[kind].windup }, strikeSide: 0 });
    const preparation = combatPose({ action: { kind, elapsed: MOVES[kind].windup * .5 }, strikeSide: 0 });
    assert.ok(impact.shoulders[0] < preparation.shoulders[0]);
    assert.ok(impact.elbows[0] > preparation.elbows[0]);
    if (kind === 'grab') assert.equal(impact.shoulders[0], impact.shoulders[1]);
  }
});
test('pose sampling is independent of frame history and guard bends both elbows', () => {
  const a = combatPose({ time: 1, walking: true, action: { kind: 'heavy', elapsed: .6 } });
  for (let time = 0; time < .6; time += 1 / 144) combatPose({ time, action: { kind: 'heavy', elapsed: time } });
  assert.deepEqual(combatPose({ time: 1, walking: true, action: { kind: 'heavy', elapsed: .6 } }), a);
  const titan = createTitan(new THREE.Scene(), 0, 0, 15, 0);
  applyCombatPose(titan, combatPose({ guard: true }));
  assert.ok(titan.elbows.every(elbow => elbow.rotation.x < -1));
  assert.ok(titan.arms.every(arm => arm.rotation.x < -1));
});
