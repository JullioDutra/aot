import test from 'node:test';
import assert from 'node:assert/strict';
import { canalHeight, moveWithCollisions, BRIDGES, CANAL_Z } from '../src/story/shiganshina-world.js';

test('walkers stand on the bridge decks and the stone banks, not inside them', () => {
  for (const [x] of BRIDGES) assert.equal(canalHeight(x, CANAL_Z), .4);
  assert.equal(canalHeight(0, CANAL_Z + 5.4), .4);
  assert.equal(canalHeight(40, CANAL_Z - 5), .3);
  assert.equal(canalHeight(40, CANAL_Z + 20), 0);
});

test('a spot inside a stall is pushed out of it', () => {
  const stall = { minX: -3.6, maxX: -.4, minZ: 57.2, maxZ: 58.8 };
  const [x, z] = moveWithCollisions([-2, 58], [0, 0], .5, [stall]);
  assert.ok(x <= stall.minX - .5 + 1e-9 || x >= stall.maxX + .5 - 1e-9 || z <= stall.minZ - .5 + 1e-9 || z >= stall.maxZ + .5 - 1e-9);
});
