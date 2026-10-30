// Pure rules for Act IV (chapters 19–24): Sasha's bow, the siege of the
// Utgard tower, the duel against the Armored Titan and the arm lock.
// Covered by tests/act4-rules.test.js.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Chapter 19: the bow ─────────────────────────────────────────────────────
// The arrow flies at the nearest target inside a narrow cone ahead.
// forward follows the story convention: (sin yaw, -cos yaw).
export function aimTarget(from, yaw, targets, { range = 40, cone = .35 } = {}) {
  let best = -1, bestD = Infinity;
  targets.forEach((t, i) => {
    const dx = t[0] - from[0], dz = t[1] - from[1], d = Math.hypot(dx, dz);
    if (d > range || d < .5) return;
    const angle = Math.acos(clamp((dx * Math.sin(yaw) - dz * Math.cos(yaw)) / d, -1, 1));
    if (angle <= cone && d < bestD) { best = i; bestD = d; }
  });
  return best;
}
// An arrow in the eye blinds a titan for a moment; a second one adds less.
export const blindTime = hits => (hits <= 1 ? 3.5 : 2);

// ── Chapter 20: the Utgard tower ────────────────────────────────────────────
// Titans climb the tower from several sides; a stab on the hands drops the
// climber back down. One reaching the top breaks the defense.
export function createSiege(sides = 4) { return { climbers: Array.from({ length: sides }, (_, i) => ({ progress: i * .12, rate: .055 + i * .012 })), time: 0, breached: -1, stabs: 0 }; }
export function siegeStep(state, dt, stab = -1) {
  const climbers = state.climbers.map((c, i) => (i === stab ? { ...c, progress: Math.max(0, c.progress - .55) } : { ...c, progress: clamp(c.progress + c.rate * dt, 0, 1) }));
  const breached = climbers.findIndex(c => c.progress >= 1);
  return { ...state, climbers, time: state.time + dt, breached, stabs: state.stabs + (stab >= 0 ? 1 : 0) };
}

// ── Chapter 22: Eren against the Armored Titan ──────────────────────────────
// Reiner loops stance → tell → charge → recover. Punches on the armor only
// clang (they count against the challenge). Sidestepping the charge leaves him
// overextended; grabbing then is a takedown. A charge that connects hurts.
export const ARMORED = Object.freeze({ stance: 1.3, tell: .8, charge: .5, recover: 1, overextended: 1, damage: 18 });
export function createArmoredDuel(health = 100) { return { phase: 'stance', t: 0, health, takedowns: 0, clangs: 0, last: null }; }
export function armoredStep(state, dt, { punch = false, dodge = false, grab = false } = {}) {
  const s = { ...state, t: state.t + dt, last: null };
  if (grab && s.phase === 'overextended') return { ...s, phase: 'recover', t: 0, takedowns: s.takedowns + 1, last: 'takedown' };
  if (punch && s.phase !== 'overextended') return { ...s, clangs: s.clangs + 1, last: 'clang' };
  if (dodge && s.phase === 'charge') return { ...s, phase: 'overextended', t: 0, last: 'sidestep' };
  if (s.t < ARMORED[s.phase]) return s;
  if (s.phase === 'charge') return { ...s, health: s.health - ARMORED.damage, phase: 'recover', t: 0, last: 'hit' };
  const order = { stance: 'tell', tell: 'charge', recover: 'stance', overextended: 'stance' };
  return { ...s, phase: order[s.phase], t: 0 };
}

// The arm lock: each press tightens it, letting go loosens it; Reiner screams
// for help when the timer runs out.
export const ARMLOCK = Object.freeze({ press: .085, slip: .14, time: 12 });
export function createArmlock() { return { progress: 0, left: ARMLOCK.time, torn: false, screamed: false }; }
export function armlockStep(state, dt, press = false) {
  if (state.torn || state.screamed) return state;
  const progress = clamp(state.progress + (press ? ARMLOCK.press : 0) - ARMLOCK.slip * dt, 0, 1);
  const left = state.left - dt;
  return { progress, left, torn: progress >= 1, screamed: progress < 1 && left <= 0 };
}
