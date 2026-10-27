import test from 'node:test';
import assert from 'node:assert/strict';
import { completedEscort } from '../src/civilian-escort.js';
import { createMission, missionStage, missionObjective, advanceMission, LOCATIONS, createCheckpoint, parseCheckpoint, saveCheckpoint, loadCheckpoint, checkpointSpawn } from '../src/trost-mission.js';

test('full operation requires rescue, supply, three unique defeats and extraction', () => {
  let s = createMission(); assert.equal(missionStage(s), 'rescue');
  s = advanceMission(s, { type: 'rescue', position: LOCATIONS.rescue }).state;
  assert.equal(missionStage(s), 'escort');
  s.escort = completedEscort(); s = advanceMission(s, { type: 'escort-arrived' }).state;
  assert.equal(missionStage(s), 'supply');
  s = advanceMission(s, { type: 'supply', position: LOCATIONS.supply }).state;
  assert.equal(missionStage(s), 'combat');
  for (const id of [0, 1, 2]) s = advanceMission(s, { type: 'defeat', id }).state;
  assert.equal(missionStage(s), 'extraction'); assert.equal(s.extracted, false);
  s = advanceMission(s, { type: 'extract', position: LOCATIONS.extraction }).state;
  assert.equal(missionStage(s), 'complete'); assert.equal(missionObjective(s).order, 4);
});
test('interactions validate altitude, distance and stage rather than just key presses', () => {
  const s = createMission();
  assert.equal(advanceMission(s, { type: 'rescue', position: [-12, 30, 29] }).changed, false);
  assert.equal(advanceMission(s, { type: 'rescue', position: [0, 0, 0] }).changed, false);
  assert.equal(advanceMission(s, { type: 'supply', position: LOCATIONS.supply }).changed, false);
  assert.equal(advanceMission(s, { type: 'extract', position: LOCATIONS.extraction }).changed, false);
  assert.equal(advanceMission(s, { type: 'rescue', position: [NaN, 0, 29] }).changed, false);
});
test('early combat counts once without bypassing civilian objectives', () => {
  let s = createMission();
  for (const id of [2, 0, 2, 1, 3, -1, '1']) s = advanceMission(s, { type: 'defeat', id }).state;
  assert.deepEqual(s.defeated, [0, 1, 2]); assert.equal(missionStage(s), 'rescue');
  s = advanceMission(s, { type: 'rescue', position: LOCATIONS.rescue }).state;
  s.escort = completedEscort(); s = advanceMission(s, { type: 'escort-arrived' }).state;
  s = advanceMission(s, { type: 'supply', position: LOCATIONS.supply }).state;
  assert.equal(missionStage(s), 'extraction');
});
test('checkpoints are independent snapshots with safe spawn positions', () => {
  const s = { rescued: true, supplied: true, defeated: [0], extracted: false };
  const checkpoint = createCheckpoint(s, 42.5); s.defeated.push(1);
  assert.deepEqual(checkpoint.mission.defeated, [0]);
  const restored = parseCheckpoint(JSON.stringify(checkpoint));
  assert.deepEqual(restored, checkpoint); assert.deepEqual(checkpointSpawn(restored.mission), LOCATIONS.supply);
  assert.deepEqual(checkpointSpawn(createMission()), LOCATIONS.start);
});
test('malformed, old or inconsistent saves are ignored', () => {
  const valid = createCheckpoint(createMission(), 10);
  for (const value of ['no json', '{}', JSON.stringify({ ...valid, schema: 9 }), JSON.stringify({ ...valid, elapsed: -1 }), JSON.stringify({ ...valid, mission: { ...valid.mission, supplied: true } }), JSON.stringify({ ...valid, mission: { ...valid.mission, defeated: [1, 1] } }), JSON.stringify({ ...valid, mission: { ...valid.mission, extracted: true } })]) assert.equal(parseCheckpoint(value), null);
});
test('storage exceptions do not prevent in-memory checkpoints or gameplay', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  const checkpoint = createCheckpoint(createMission(), 0);
  assert.equal(loadCheckpoint(storage), null); assert.equal(saveCheckpoint(storage, checkpoint), false);
  assert.equal(saveCheckpoint(undefined, checkpoint), false); assert.equal(checkpoint.mission.rescued, false);
});

test('schema 1 checkpoints migrate without discarding completed rescues', () => {
  const old = { schema: 1, elapsed: 31, mission: { rescued: true, supplied: true, defeated: [1], extracted: false } };
  const migrated = parseCheckpoint(JSON.stringify(old));
  assert.equal(migrated.schema, 2); assert.equal(migrated.mission.rescued, true);
  assert.deepEqual(migrated.mission.escort, completedEscort()); assert.deepEqual(migrated.mission.defeated, [1]);
});
test('arrival cannot complete rescue before the escort reaches shelter', () => {
  let s = advanceMission(createMission(), { type: 'rescue', position: LOCATIONS.rescue }).state;
  assert.equal(advanceMission(s, { type: 'escort-arrived' }).changed, false);
  assert.equal(advanceMission(s, { type: 'supply', position: LOCATIONS.supply }).changed, false);
  const checkpoint = createCheckpoint(s, 20); checkpoint.mission.escort.distance = 999;
  assert.equal(parseCheckpoint(JSON.stringify(checkpoint)), null);
});
