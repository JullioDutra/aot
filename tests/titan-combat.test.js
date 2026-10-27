import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaCommand, createArenaState, stepArena } from '../src/titan-combat.js';

function advance(s, seconds, input = {}) {
  const events = [];
  for (let i = 0; i < Math.ceil(seconds * 120); i++) events.push(...stepArena(s, 1 / 120, input));
  return events;
}
function transformed() { const s = createArenaState(); assert.equal(arenaCommand(s, 'transform').accepted, true); advance(s, 2.3); assert.equal(s.form, 'titan'); return s; }

test('transform requires a deliberate command, has a transition and spends reserves', () => {
  const s = createArenaState(); advance(s, 2);
  assert.equal(s.form, 'human'); assert.equal(s.enemy.action, 'idle');
  assert.equal(arenaCommand(s, 'heavy').accepted, false);
  arenaCommand(s, 'transform'); assert.equal(s.form, 'transforming'); assert.equal(s.transforms, 1); assert.equal(s.energy, 85);
  advance(s, 1); assert.equal(s.form, 'transforming'); advance(s, 1.3); assert.equal(s.form, 'titan');
});
test('exit applies fatigue, preserves health and caps repeat transformations', () => {
  const s = transformed(); s.health = 60;
  arenaCommand(s, 'exit'); advance(s, 1.7); assert.equal(s.form, 'human'); assert.equal(s.health, 60);
  assert.equal(arenaCommand(s, 'transform').accepted, false); advance(s, 5.1);
  assert.equal(arenaCommand(s, 'transform').accepted, true); advance(s, 2.3); arenaCommand(s, 'exit'); advance(s, 7);
  assert.equal(s.transforms, 2); assert.equal(arenaCommand(s, 'transform').accepted, false);
});
test('a punch has windup, one impact, recovery and no instant repeat', () => {
  const s = transformed(); s.player.z = 7; s.enemy.z = 0; s.enemy.clock = 10;
  assert.equal(arenaCommand(s, 'light').accepted, true);
  advance(s, .2); assert.equal(s.enemy.health, 160);
  assert.equal(arenaCommand(s, 'light').accepted, false);
  advance(s, .2); assert.equal(s.enemy.health, 142); advance(s, .4); assert.equal(s.enemy.health, 142); assert.equal(s.action, null);
});
test('range and facing prevent distant hits and attacks behind the player', () => {
  const distant = transformed(); arenaCommand(distant, 'heavy'); advance(distant, .8); assert.equal(distant.enemy.health, 160); assert.equal(distant.stats.misses, 1);
  const rear = transformed(); rear.player.z = 7; rear.enemy.z = 0; rear.enemy.clock = 10;
  arenaCommand(rear, 'light'); advance(rear, .4, { lock: false, yaw: 0 }); assert.equal(rear.enemy.health, 160);
});
test('guard reduces a frontal hit and consumes stamina', () => {
  const s = transformed(); s.player.z = 7; s.enemy.z = 0; s.enemy.action = 'windup'; s.enemy.clock = .05; s.enemy.yaw = 0;
  const events = advance(s, .1, { guard: true });
  assert.equal(s.health, 96); assert.equal(s.stats.blocked, 1); assert.ok(s.stamina < 81); assert.ok(events.some(e => e.kind === 'blocked'));
});
test('guard breaks at low stamina and blocks attacks during stun', () => {
  const s = transformed(); s.stamina = 10; s.player.z = 7; s.enemy.z = 0; s.enemy.action = 'windup'; s.enemy.clock = .05; s.enemy.yaw = 0;
  advance(s, .1, { guard: true }); assert.equal(s.health, 80); assert.equal(s.action.kind, 'stun'); assert.equal(arenaCommand(s, 'light').accepted, false);
});
test('dodge avoids an imminent hit and enforces cooldown', () => {
  const s = transformed(); s.player.z = 7; s.enemy.z = 0; s.enemy.action = 'windup'; s.enemy.clock = .1; s.enemy.yaw = 0;
  arenaCommand(s, 'dodge', [1, 0]); advance(s, .2); assert.equal(s.health, 100); assert.equal(s.stats.dodged, 1);
  advance(s, .2); assert.equal(arenaCommand(s, 'dodge').accepted, false); assert.ok(s.player.x > 5);
});
test('grab requires nearby enemy recovery and resolves as a single throw', () => {
  const s = transformed(); s.player.z = 7; s.enemy.z = 0;
  assert.equal(arenaCommand(s, 'grab').accepted, false);
  s.enemy.action = 'recovery'; s.enemy.clock = 1.5;
  assert.equal(arenaCommand(s, 'grab').accepted, true); advance(s, .4); assert.equal(s.enemy.health, 108); assert.equal(s.stats.hits, 1);
});
test('regeneration exchanges reserves for health and stops after recent damage', () => {
  const s = transformed(); s.health = 50; s.enemy.clock = 10;
  const energy = s.energy; advance(s, 1, { regenerate: true }); assert.ok(s.health >= 54.9); assert.ok(s.energy <= energy - 4.9);
  s.lastDamage = s.time; const health = s.health; advance(s, 1, { regenerate: true }); assert.equal(s.health, health);
});
test('empty reserves force an exit and prevent another transformation', () => {
  const s = transformed(); s.energy = .02;
  advance(s, .1); assert.equal(s.form, 'exiting'); advance(s, 1.7); assert.equal(s.form, 'human'); assert.equal(s.energy, 0);
  advance(s, 5.1); assert.equal(arenaCommand(s, 'transform').accepted, false);
});
test('a complete fight can be won through movement, defense and attacks', () => {
  const s = transformed();
  for (let i = 0; i < 120 * 70 && s.form === 'titan'; i++) {
    const gap = Math.hypot(s.player.x - s.enemy.x, s.player.z - s.enemy.z);
    const guard = s.enemy.action === 'windup';
    if (!guard) s.guarding = false;
    if (!s.action && !guard && gap < 8.5) arenaCommand(s, s.enemy.action === 'recovery' && s.stamina >= 35 ? 'grab' : 'light');
    stepArena(s, 1 / 120, { move: gap > 7.5 ? [s.enemy.x - s.player.x, s.enemy.z - s.player.z] : [0, 0], guard });
  }
  assert.equal(s.form, 'won'); assert.equal(s.enemy.health, 0); assert.ok(s.health > 0); assert.ok(s.stats.hits >= 4);
  const time = s.time; advance(s, 1); assert.equal(s.time, time);
});
test('taking unguarded hits can end the fight in defeat', () => {
  const s = transformed(); s.player.z = 7; s.enemy.z = 0;
  advance(s, 30); assert.equal(s.form, 'lost'); assert.equal(s.health, 0);
  assert.equal(arenaCommand(s, 'heavy').accepted, false);
});
