// Pure rules for Act VI (chapters 29–34): the silent night march, the Beast's
// rocks on the horses, the thunder spears and Armin holding on to the
// Colossal. Covered by tests/act6-rules.test.js.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Chapter 29: the march without torches ───────────────────────────────────
// Running makes noise; walking lets it fade. Too much noise wakes the titans.
export const NOISE = Object.freeze({ run: .32, walk: -.12, still: -.2, limit: 1 });
export function noiseStep(noise, dt, pace) { return clamp(noise + NOISE[pace] * dt, 0, 1.2); }
export const tooLoud = noise => noise >= NOISE.limit;

// ── Chapter 30: rocks on the horses ─────────────────────────────────────────
// Every few seconds the Beast picks a herd; its shadow warns before the rock
// lands. A herd led into cover in time is safe.
export const ROCKS = Object.freeze({ every: 5, warning: 3 });
export function rockPlan(herds, time) {
  const n = Math.floor(time / ROCKS.every), herd = (n * 7 + 3) % herds;
  const landsAt = n * ROCKS.every + ROCKS.warning;
  return { herd, landsAt, warning: time >= n * ROCKS.every && time < landsAt };
}

// ── Chapter 31: thunder spears ──────────────────────────────────────────────
// Spears stuck in the nape go off when the cord is pulled. The armor opens if
// enough of them detonate inside one window.
export const SPEARS = Object.freeze({ needed: 6, window: 1.5 });
export function detonate(times) {
  if (times.length < SPEARS.needed) return { opened: false, together: false };
  const sorted = [...times].sort((a, b) => a - b), spread = sorted.at(-1) - sorted[0];
  return { opened: true, together: spread <= SPEARS.window };
}

// ── Chapter 33: holding on ──────────────────────────────────────────────────
// The heat loosens Armin's grip; each press tightens it. He has to last
// until Eren is in position.
export const GRIP = Object.freeze({ loosen: .18, press: .07, hold: 18 });
export function createGrip() { return { grip: 1, time: 0, fell: false, held: false }; }
export function gripStep(state, dt, press = false) {
  if (state.fell || state.held) return state;
  const grip = clamp(state.grip - GRIP.loosen * dt + (press ? GRIP.press : 0), 0, 1), time = state.time + dt;
  return { grip, time, fell: grip <= 0, held: grip > 0 && time >= GRIP.hold };
}
