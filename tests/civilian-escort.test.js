import test from 'node:test';
import assert from 'node:assert/strict';
import { createEscort, stepEscort, escortPosition, escortComplete, escortProgress, validEscort, ESCORT_ROUTE } from '../src/civilian-escort.js';
import { createMission, advanceMission, createCheckpoint, parseCheckpoint, LOCATIONS } from '../src/trost-mission.js';

test('civilians traverse every route segment and stop exactly in shelter', () => {
  let e = createEscort(), reached = 0;
  for (let i = 0; i < 1200 && !escortComplete(e); i++) {
    const result = stepEscort(e, 1 / 60, escortPosition(e)); e = result.escort;
    if (result.reachedWaypoint) reached++;
  }
  assert.equal(reached, ESCORT_ROUTE.length - 1); assert.equal(escortComplete(e), true);
  assert.deepEqual(escortPosition(e), ESCORT_ROUTE.at(-1)); assert.equal(escortProgress(e), 1);
  assert.deepEqual(stepEscort(e, 20, [0, 0, 0]).escort, e);
});
test('escort waits for a distant player and resumes without losing progress', () => {
  let e = stepEscort(createEscort(), 1, [-12, 0, 29]).escort;
  const paused = stepEscort(e, 10, [100, 40, 100]);
  assert.equal(paused.reason, 'waiting'); assert.deepEqual(paused.escort, e);
  const resumed = stepEscort(e, 1, escortPosition(e)); assert.ok(escortProgress(resumed.escort) > escortProgress(e));
});
test('a nearby threat blocks the group until the route is clear', () => {
  const e = createEscort();
  const blocked = stepEscort(e, 10, [-12, 0, 29], [[-10, 0, 30]]);
  assert.equal(blocked.reason, 'danger'); assert.deepEqual(blocked.escort, e);
  assert.equal(stepEscort(e, 1, [-12, 0, 29], []).reason, 'moving');
});
test('route integration is consistent across frame rates and large steps', () => {
  const run = (dt, frames) => { let e = createEscort(); for (let i = 0; i < frames; i++) e = stepEscort(e, dt, escortPosition(e)).escort; return escortPosition(e); };
  const a = run(1 / 30, 210), b = run(1 / 120, 840), c = run(7, 1);
  a.forEach((v, i) => { assert.ok(Math.abs(v - b[i]) < 1e-8); assert.ok(Math.abs(v - c[i]) < 1e-8); });
});
test('mid-route checkpoint restores exact progress and still requires arrival', () => {
  let mission = advanceMission(createMission(), { type: 'rescue', position: LOCATIONS.rescue }).state;
  mission.escort = stepEscort(mission.escort, 4, LOCATIONS.rescue).escort;
  const saved = parseCheckpoint(JSON.stringify(createCheckpoint(mission, 30)));
  assert.deepEqual(saved.mission.escort, mission.escort); assert.equal(saved.mission.rescued, false);
  assert.equal(validEscort(saved.mission.escort), true);
  assert.equal(advanceMission(saved.mission, { type: 'escort-arrived' }).changed, false);
});
