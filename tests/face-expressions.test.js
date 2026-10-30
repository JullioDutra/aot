import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_SPECS } from '../src/character-specs.js';
import { EXPRESSIONS, faceFeatures, poseExpression } from '../src/face-expressions.js';

test('every character resolves every expression', () => {
  for (const spec of Object.values(CHARACTER_SPECS)) for (const e of EXPRESSIONS) {
    const f = faceFeatures(spec, e);
    assert.equal(f.expression, e);
    assert.ok(f.eye.hw > 15 && f.eye.hh >= 0, `${spec.id} ${e}`);
  }
});

test('expressions change the face the way the anime reads them', () => {
  const eren = CHARACTER_SPECS.eren;
  const neutral = faceFeatures(eren), shout = faceFeatures(eren, 'shout'), cry = faceFeatures(eren, 'cry');
  assert.ok(shout.eye.hh > neutral.eye.hh && shout.eye.pupil < 1, 'shouting opens the eyes and shrinks the pupils');
  assert.equal(shout.mouth, 'shout'); assert.equal(shout.brows, 'angry');
  assert.equal(cry.tears, true); assert.equal(cry.brows, 'worried');
  assert.equal(faceFeatures(eren, 'closed').eye.closed, true);
  assert.equal(faceFeatures(eren, 'unknown').expression, 'neutral');
});

test('characters keep their own eyes: Levi narrow, Armin round, children larger', () => {
  const levi = faceFeatures(CHARACTER_SPECS.levi), armin = faceFeatures(CHARACTER_SPECS.armin);
  assert.ok(levi.eye.hh < armin.eye.hh);
  assert.ok(faceFeatures(CHARACTER_SPECS['eren-child']).eye.hw > faceFeatures(CHARACTER_SPECS.eren).eye.hw);
  assert.equal(faceFeatures(CHARACTER_SPECS.mikasa).lashes, 'long');
  assert.equal(faceFeatures(CHARACTER_SPECS.levi).lashes, 'short');
});

test('poses pick an expression; other poses keep the current one', () => {
  assert.equal(poseExpression('grief'), 'cry');
  assert.equal(poseExpression('strike'), 'shout');
  assert.equal(poseExpression('lie'), 'closed');
  assert.equal(poseExpression('walk', 'smile'), 'smile');
  assert.equal(poseExpression('idle'), 'neutral');
});
