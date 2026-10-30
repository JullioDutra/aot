import test from 'node:test';
import assert from 'node:assert/strict';
import { SHELL, shellPhase, shellHits, strikeOutcome, heatDamage, toppled, holdsCable, flightStep } from '../src/story/act8-rules.js';

test('Pieck aims, the shell lands where you were and moving dodges it', () => {
  assert.equal(shellPhase(.5), 'aim');
  assert.equal(shellPhase(SHELL.warning + .1), 'impact');
  assert.equal(shellPhase(SHELL.every - .1), 'reload');
  assert.equal(shellHits([0, 0], [3, 3]), true);
  assert.equal(shellHits([0, 0], [10, 0]), false);
});

test('from behind the blade disarms a Yeagerist; from the front it kills', () => {
  // The gunman faces +z (yaw 0).
  assert.equal(strikeOutcome(0, [0, 0], [0, -5]), 'disarm');
  assert.equal(strikeOutcome(0, [0, 0], [0, 5]), 'kill');
  assert.equal(strikeOutcome(0, [0, 0], [5, 0]), 'kill', 'from the side is still a risk');
});

test('the steam scalds near the Colossal body, less at its feet', () => {
  assert.equal(heatDamage(40, 10), 0);
  assert.ok(heatDamage(5, 50) > heatDamage(5, 2));
  assert.ok(heatDamage(5, 2) > heatDamage(20, 2));
  assert.equal(toppled({ left: true, right: false }), false);
  assert.equal(toppled({ left: true, right: true }), true);
});

test('only bone holds a cable on the Founder', () => {
  assert.equal(holdsCable('bone'), true);
  assert.equal(holdsCable('flesh'), false);
});

test("Falco's flight trades height for speed", () => {
  let s = { yaw: 0, speed: 30, y: 60 };
  s = flightStep(s, 1, { pitch: 1 });
  assert.ok(s.y > 60 && s.speed < 30);
  let d = flightStep({ yaw: 0, speed: 30, y: 60 }, 1, { pitch: -1 });
  assert.ok(d.y < 60 && d.speed > 30);
  assert.ok(flightStep({ yaw: 0, speed: 30, y: 60 }, 1, { turn: 1 }).yaw > 0);
  assert.equal(flightStep({ yaw: 0, speed: 30, y: 9 }, 5, { pitch: -1 }).y, 8, 'never into the ground');
});
