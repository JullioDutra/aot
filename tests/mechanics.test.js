import test from 'node:test';
import assert from 'node:assert/strict';
import { cableAcceleration, canStrikeNape, insideSupplyRadius, formatTime } from '../src/mechanics.js';

test('cable pulls toward a distant anchor and boost adds acceleration', () => {
  const normal = cableAcceleration([0, 0, 0], [0, 0, 0], [10, 10, 0], 8);
  const boosted = cableAcceleration([0, 0, 0], [0, 0, 0], [10, 10, 0], 8, true);
  assert.ok(normal[0] > 0 && normal[1] > 0); assert.equal(normal[2], 0); assert.ok(boosted[0] > normal[0]);
});
test('cable never pushes and zero distance stays finite', () => {
  assert.deepEqual(cableAcceleration([0, 0, 0], [100, 0, 0], [1, 0, 0], 5), [0, 0, 0]);
  assert.deepEqual(cableAcceleration([1, 2, 3], [0, 0, 0], [1, 2, 3], 1), [0, 0, 0]);
});
test('nape requires rear approach, correct altitude, proximity, live titan and blades', () => {
  const nape = [0, 12, 0], forward = [0, 0, 1];
  assert.equal(canStrikeNape([0, 12, -4], nape, forward, 100, true), true);
  assert.equal(canStrikeNape([0, 12, 4], nape, forward, 100, true), false);
  assert.equal(canStrikeNape([0, 0, -2], nape, forward, 100, true), false);
  assert.equal(canStrikeNape([0, 12, -8], nape, forward, 100, true), false);
  assert.equal(canStrikeNape([0, 12, -4], nape, forward, 0, true), false);
  assert.equal(canStrikeNape([0, 12, -4], nape, forward, 100, false), false);
});
test('supply requires proximity in all three dimensions', () => {
  assert.equal(insideSupplyRadius([2, 1, 2], [0, 0, 0]), true);
  assert.equal(insideSupplyRadius([0, 15, 0], [0, 0, 0]), false);
});
test('mission timer formats minutes without rounding up', () => {
  assert.equal(formatTime(0), '00:00'); assert.equal(formatTime(125.9), '02:05');
});
