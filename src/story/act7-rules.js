// Pure rules for Act VII (chapters 35–38): machine-gun nests that wear a
// titan down, the War Hammer Titan's spikes and the flesh cord that leads to
// its user. Covered by tests/act7-rules.test.js.

// ── Chapter 35: the Jaw against machine guns ────────────────────────────────
// Each nest in range chips the titan's body every second; a titan that keeps
// moving takes half the fire.
export const NEST = Object.freeze({ range: 60, dps: 6 });
export function nestDamage(nests, position, dt, moving = false) {
  const inRange = nests.filter(n => n.alive && Math.hypot(n.x - position[0], n.z - position[1]) <= NEST.range).length;
  return inRange * NEST.dps * dt * (moving ? .5 : 1);
}

// ── Chapter 37: the War Hammer Titan ────────────────────────────────────────
// Spikes burst from the ground under the target after a short warning.
export const SPIKE = Object.freeze({ every: 3.2, warning: 1.1, radius: 5, damage: 20 });
export function spikePhase(time) {
  const t = ((time % SPIKE.every) + SPIKE.every) % SPIKE.every;
  return t < SPIKE.warning ? 'warning' : t < SPIKE.warning + .4 ? 'strike' : 'rest';
}
export const spikeHits = (spike, position) => Math.hypot(spike[0] - position[0], spike[1] - position[1]) <= SPIKE.radius;

// The user is not in the nape: a flesh cord runs underground to a crystal.
// Standing on the cord reveals it; following it leads to the crystal.
export function distanceToSegment(p, a, b) {
  const abx = b[0] - a[0], abz = b[1] - a[1], len = abx * abx + abz * abz;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * abz) / len)) : 0;
  return Math.hypot(p[0] - (a[0] + abx * t), p[1] - (a[1] + abz * t));
}
export const onCord = (p, a, b) => distanceToSegment(p, a, b) <= 4;
// The crystal breaks after enough hardened punches.
export const CRYSTAL_HITS = 3;
