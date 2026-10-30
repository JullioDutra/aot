import test from 'node:test';
import assert from 'node:assert/strict';
import { walkSpeeds, flightPace, agility, BASE_SPEEDS } from '../src/story/movement.js';
import { CHARACTER_SPECS } from '../src/character-specs.js';

test('the Ackermans outrun the cadets and Armin and the children lag behind', () => {
  const run = id => walkSpeeds(id)[1];
  assert.ok(run('levi') > run('mikasa') && run('mikasa') > run('eren'));
  assert.ok(run('sasha') > run('jean') && run('eren') > run('armin'));
  assert.ok(run('armin') > run('armin-child') && run('pixis') < run('armin'));
});

test('unknown characters and extras move at the base pace, faster than before', () => {
  assert.deepEqual(walkSpeeds('soldier-m'), [BASE_SPEEDS.walk, BASE_SPEEDS.run]);
  assert.ok(BASE_SPEEDS.walk > 3.1 && BASE_SPEEDS.run > 5.6);
  assert.equal(flightPace('civilian-f'), 1);
});

test('every agility entry names a real character and stays within a sane range', () => {
  for (const id of ['levi', 'armin', 'pixis', 'eren-child']) assert.ok(CHARACTER_SPECS[id], id);
  for (const id of Object.keys(CHARACTER_SPECS)) { const k = agility(id); assert.ok(k >= .8 && k <= 1.25, id); }
  // Flight depends less on the body than running does.
  assert.ok(flightPace('levi') < agility('levi') && flightPace('armin') > agility('armin'));
});
