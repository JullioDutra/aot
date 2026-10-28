import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { stepTrostTitan, napeProtected, napeGuardWeight } from '../src/trost-titan-ai.js';
import { canStrikeNape } from '../src/mechanics.js';
import { createTitan } from '../src/titan-model.js';
import { applyNapeGuard } from '../src/nape-guard-pose.js';
const idle = () => ({ phase: 'walk', yaw: 0, attackTimer: 0 });
const encounter = (extra = {}) => ({ position: [0, 0, 0], player: [0, 13, -6], height: 18, index: 1, visible: true, ...extra });

test('only the larger titan responds to a visible elevated rear approach', () => {
  const s = stepTrostTitan(idle(), encounter(), .01);
  assert.equal(s.phase, 'guardPrepare'); assert.equal(s.attackTimer, .75);
  assert.equal(napeProtected(s), false); assert.equal(s.moving, false);
  for (const extra of [{ visible: false }, { index: 0 }, { index: 2 }, { player: [0, 0, -6] }, { player: [0, 13, 6] }, { player: [0, 13, -15] }]) {
    assert.notEqual(stepTrostTitan(idle(), encounter(extra), .01).phase, 'guardPrepare');
  }
});
test('defense has vulnerable preparation and recovery, with no damage or tracking while guarding', () => {
  let s = stepTrostTitan(idle(), encounter(), .01);
  s = stepTrostTitan(s, encounter(), .5);
  assert.equal(napeProtected(s), false); assert.ok(napeGuardWeight(s) > 0);
  s = stepTrostTitan(s, encounter(), .25);
  assert.equal(s.phase, 'guard'); assert.equal(napeProtected(s), true); assert.equal(napeGuardWeight(s), 1);
  const hidden = encounter({ visible: false, player: [40, 30, 30] });
  const paused = stepTrostTitan(s, hidden, 0);
  assert.deepEqual(paused, s);
  s = stepTrostTitan(s, hidden, 1.2);
  assert.equal(s.phase, 'guardRecover'); assert.equal(napeProtected(s), false);
  assert.equal(s.yaw, 0); assert.equal(s.hit, false); assert.equal(s.moving, false);
  s = stepTrostTitan(s, encounter(), .5);
  assert.equal(s.phase, 'guardRecover'); assert.equal(napeGuardWeight(s), 0);
  s = stepTrostTitan(s, encounter(), 1);
  assert.equal(s.phase, 'walk'); assert.equal(s.hit, false);
});
test('rear approach cannot interrupt an attack or its recovery', () => {
  for (const phase of ['windup', 'recover']) {
    const s = stepTrostTitan({ ...idle(), phase, attackTimer: .5 }, encounter(), .1);
    assert.equal(s.phase, phase);
  }
});
test('the same valid blade strike is blocked only during active protection', () => {
  const player = [0, 14, -4], nape = [0, 14, 0], forward = [0, 0, 1];
  for (const phase of ['walk', 'guardPrepare', 'guard', 'guardRecover']) {
    assert.equal(canStrikeNape(player, nape, forward, 1, true, napeProtected({ phase })), phase !== 'guard');
  }
  assert.equal(canStrikeNape(player, nape, forward, 0, true, false), false);
});
test('articulated hands reach either side of the nape under scaling and rotation', () => {
  const titan = createTitan(new THREE.Scene(), 8, -12, 18, 1);
  titan.root.rotation.y = 1.2;
  applyNapeGuard(titan, 1); titan.root.updateWorldMatrix(true, true);
  titan.hands.forEach((hand, i) => {
    const expected = titan.body.localToWorld(new THREE.Vector3(i === 0 ? -.25 : .25, 4.65, -.65));
    assert.ok(hand.getWorldPosition(new THREE.Vector3()).distanceTo(expected) < 1e-6);
  });
});
