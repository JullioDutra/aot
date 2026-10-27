import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceHeight, resolveMotion, segmentEntry, segmentObstructed } from '../src/collision.js';

const roof = { minX: -5, maxX: 5, minZ: -5, maxZ: 5, top: 10, roofRise: 4 };
const wall = { minX: 0, maxX: 2, minZ: -5, maxZ: 5, top: 20 };

test('gabled roof height matches the ridge, slopes and eaves', () => {
  assert.equal(surfaceHeight(roof, 0), 14);
  assert.equal(surfaceHeight(roof, 2.5), 12);
  assert.equal(surfaceHeight(roof, -2.5), 12);
  assert.equal(surfaceHeight(roof, 5), 10);
});
test('landing on a slope uses the actual roof, not the ridge height', () => {
  const landed = resolveMotion([2.5, 12.2, 0], [2.5, 11.9, 0], [0, -15, 0], [roof]);
  assert.equal(landed.position[1], 12); assert.equal(landed.velocity[1], 0); assert.equal(landed.grounded, true);
});
test('walking stays supported uphill and downhill without hovering', () => {
  for (const [from, to] of [[2.5, 2.3], [2.5, 2.7]]) {
    const y = surfaceHeight(roof, from);
    const result = resolveMotion([from, y, 0], [to, y - .002, 0], [4, -.18, 0], [roof], true);
    assert.equal(result.position[1], surfaceHeight(roof, to)); assert.equal(result.grounded, true);
  }
});
test('leaving an eave falls and jumping does not snap back to the roof', () => {
  assert.equal(resolveMotion([4.95, 10.04, 0], [5.1, 10.038, 0], [4, -.18, 0], [roof], true).grounded, false);
  const jump = resolveMotion([0, 14, 0], [0, 14.08, 0], [0, 10, 0], [roof], true);
  assert.equal(jump.grounded, false); assert.equal(jump.position[1], 14.08);
});
test('lateral collision blocks a 55 m/s approach at the physics timestep', () => {
  const result = resolveMotion([-.7, 3, 0], [-.7 + 55 / 120, 3, 0], [55, 0, 0], [wall]);
  assert.equal(result.position[0], -.45); assert.equal(result.velocity[0], 0); assert.equal(result.grounded, false);
});
test('the underside of an elevated obstacle blocks the player head', () => {
  const slab = { ...wall, bottom: 5, top: 7 };
  const hit = resolveMotion([1, 3, 0], [1, 3.2, 0], [0, 10, 0], [slab]);
  assert.equal(hit.position[1], 3.1); assert.equal(hit.velocity[1], 0);
});
test('cable rejects a wall crossing but accepts a surface endpoint', () => {
  assert.equal(segmentObstructed([-4, 3, 0], [4, 3, 0], [wall]), true);
  assert.equal(segmentObstructed([-4, 3, 0], [0, 3, 0], [wall]), false);
  assert.equal(segmentObstructed([-4, 3, 0], [.5, 3, 0], [wall]), true);
  assert.equal(segmentObstructed([-4, 25, 0], [4, 25, 0], [wall]), false);
});
test('roof occlusion follows sloping planes instead of the enclosing box', () => {
  assert.equal(segmentObstructed([4, 12, -10], [4, 12, 10], [roof]), false);
  assert.equal(segmentObstructed([0, 12, -10], [0, 12, 10], [roof]), true);
  assert.equal(segmentObstructed([0, 18, 0], [0, 14, 0], [roof]), false);
  assert.equal(segmentEntry([10, 15, 0], [10, 30, 0], roof), null);
});
test('a cable becomes obstructed after travelling behind a corner', () => {
  const anchor = [0, 12, 5];
  assert.equal(segmentObstructed([-4, 12, 7], anchor, [wall]), false);
  assert.equal(segmentObstructed([4, 12, 0], anchor, [wall]), true);
});

test('roof overhang does not extend an invisible wall below the eaves', () => {
  const body = { minX: -5, maxX: 5, minZ: -5, maxZ: 5, top: 10 };
  const canopy = { minX: -5.65, maxX: 5.65, minZ: -5.75, maxZ: 5.75, bottom: 10, top: 10, roofRise: 4 };
  assert.equal(segmentObstructed([0, 7, 12], [0, 7, 5], [body, canopy]), false);
  assert.equal(segmentObstructed([0, 7, 12], [0, 7, 4], [body, canopy]), true);
});
