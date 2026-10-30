import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, relative, chooseAttack, attackHits, throwTarget } from '../src/story/boss-rules.js';

const ready = { cooldown: 0, throwCooldown: 0, hardenCooldown: 0, blind: false };

test('relative frame: ahead, to the left and above are positive, in heights', () => {
  // Titan at the origin facing +z (yaw 0), 10 m tall.
  const r = relative([0, 0, 0], 0, 10, [5, 6, 8]);
  assert.ok(Math.abs(r.front - .8) < 1e-9 && Math.abs(r.side - .5) < 1e-9 && Math.abs(r.up - .6) < 1e-9);
  const turned = relative([0, 0, 0], Math.PI / 2, 10, [8, 0, 0]);
  assert.ok(Math.abs(turned.front - .8) < 1e-9 && Math.abs(turned.side) < 1e-9);
});

test('a pilot hovering in front gets swatted from the matching side', () => {
  assert.equal(chooseAttack('female', { front: .5, side: .2, up: .6, distance: .54 }, ready), 'swat-left');
  assert.equal(chooseAttack('female', { front: .5, side: -.2, up: .6, distance: .54 }, ready), 'swat-right');
  assert.equal(attackHits('female', 'swat-left', { front: .5, side: .2, up: .6, distance: .54 }), true);
  assert.equal(attackHits('female', 'swat-left', { front: .5, side: -.4, up: .6, distance: .64 }), false, 'dodged to the other side');
  assert.equal(attackHits('female', 'swat-left', { front: -.6, side: .2, up: .6, distance: .63 }), false, 'dodged behind');
  assert.equal(attackHits('female', 'swat-left', { front: .2, side: .1, up: 1.3, distance: .22 }), false, 'dodged above the head');
});

test('feet on the ground near the titan invite a stomp; the Beast has none', () => {
  const low = { front: .1, side: .1, up: .02, distance: .14 };
  assert.equal(chooseAttack('armored', low, ready), 'stomp');
  assert.equal(attackHits('armored', 'stomp', low), true);
  assert.notEqual(chooseAttack('beast', low, ready), 'stomp');
});

test('the Female hardens her nape when the pilot closes in from behind, then waits for the cooldown', () => {
  const behind = { front: -.3, side: 0, up: .8, distance: .3 };
  assert.equal(chooseAttack('female', behind, ready), 'harden');
  assert.notEqual(chooseAttack('female', behind, { ...ready, hardenCooldown: 2 }), 'harden');
  assert.notEqual(chooseAttack('armored', behind, ready), 'harden');
});

test('the Beast throws at range and leads the target', () => {
  assert.equal(chooseAttack('beast', { front: 2, side: 0, up: .2, distance: 2 }, ready), 'throw');
  assert.equal(chooseAttack('beast', { front: 2, side: 0, up: .2, distance: 2 }, { ...ready, throwCooldown: 1 }), null);
  assert.deepEqual(throwTarget([10, 5, 0], [4, 0, -2], 1.5), [16, 0, -3]);
});

test('a blind boss or one recovering from an attack does not pick a new one', () => {
  const front = { front: .5, side: .2, up: .6, distance: .54 };
  assert.equal(chooseAttack('beast', front, { ...ready, blind: true }), null);
  assert.equal(chooseAttack('beast', front, { ...ready, cooldown: .4 }), null);
  for (const boss of Object.values(BOSSES)) assert.ok(boss.cooldown > 1 && boss.swat.damage >= 30);
});
