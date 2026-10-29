import test from 'node:test';
import assert from 'node:assert/strict';

test('co-op assigns controllers, rewards distraction kills and revives by holding', async () => {
  const { assignControllers, combinedStrike, reviveProgress, COOP_RULES } = await import('../src/coop-rules.js');
  assert.deepEqual(assignControllers(0), ['keyboard', 'keyboard2']);
  assert.deepEqual(assignControllers(1), ['keyboard', 'pad0']);
  assert.deepEqual(assignControllers(3), ['pad0', 'pad1']);
  assert.equal(combinedStrike(1, 0), true);
  assert.equal(combinedStrike(0, 0), false);
  assert.equal(combinedStrike(null, 1), false);
  let p = 0; for (let i = 0; i < 10; i++) p = reviveProgress(p, .1, true);
  assert.ok(p > .6 && p < 1);
  const paused = reviveProgress(p, .2, false); assert.ok(paused < p && paused > p - .2);
  for (let i = 0; i < 10; i++) p = reviveProgress(p, .1, true);
  assert.equal(p, 1);
  assert.ok(COOP_RULES.titans > 0 && COOP_RULES.time > 60);
});
