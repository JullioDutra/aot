// Pure rules for Act V (chapters 25–28): the anti-personnel squad's
// shotguns and cover, Eren's hardening in the collapsing cavern and the
// timing of the powder barrels in Rod Reiss's mouth. Covered by
// tests/act5-rules.test.js.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Cover ───────────────────────────────────────────────────────────────────
// Does the segment a→b ([x, y, z]) pass through an axis-aligned box
// { minX, maxX, minZ, maxZ, top, bottom? }? Slab test.
export function segmentHitsBox(a, b, box) {
  let t0 = 0, t1 = 1;
  const axes = [[0, box.minX, box.maxX], [1, box.bottom ?? 0, box.top ?? Infinity], [2, box.minZ, box.maxZ]];
  for (const [i, lo, hi] of axes) {
    const d = b[i] - a[i];
    if (Math.abs(d) < 1e-9) { if (a[i] < lo || a[i] > hi) return false; continue; }
    let u0 = (lo - a[i]) / d, u1 = (hi - a[i]) / d; if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 > t1) return false;
  }
  return true;
}
export const lineOfSight = (a, b, boxes) => !boxes.some(box => segmentHitsBox(a, b, box));

// ── Shotguns ────────────────────────────────────────────────────────────────
// A gunman aims (the telegraph), fires and reloads. The shot only lands if the
// target is in range and in sight at the moment of firing.
export const GUN = Object.freeze({ aim: 1.1, reload: 1.8, range: 42, damage: 34 });
export function createGunman(delay = 0) { return { phase: 'reload', t: -delay, shots: 0 }; }
export function gunStep(state, dt, { inRange = false, visible = false } = {}) {
  const s = { ...state, t: state.t + dt, fired: false, hit: false };
  if (s.phase === 'reload') return s.t >= GUN.reload && inRange ? { ...s, phase: 'aim', t: 0 } : s;
  if (s.t < GUN.aim) return s;
  return { ...s, phase: 'reload', t: 0, fired: true, hit: inRange && visible, shots: s.shots + 1 };
}

// ── Chapter 27: hardening ───────────────────────────────────────────────────
// Each press grows the crystal that holds the ceiling; the collapse keeps
// pressing down. The cavern holds when the crystal is complete before the
// ceiling reaches the floor.
export const HARDEN = Object.freeze({ press: .06, collapse: .045 });
export function createHardening() { return { crystal: 0, ceiling: 0, held: false, crushed: false }; }
export function hardenStep(state, dt, press = false) {
  if (state.held || state.crushed) return state;
  const crystal = clamp(state.crystal + (press ? HARDEN.press : 0), 0, 1);
  const ceiling = clamp(state.ceiling + HARDEN.collapse * dt * (1 - crystal * .8), 0, 1);
  return { crystal, ceiling, held: crystal >= 1, crushed: crystal < 1 && ceiling >= 1 };
}

// ── Chapter 28: the powder barrels ──────────────────────────────────────────
// Rod's titan drags itself with its mouth opening in a slow cycle; a barrel
// shoved in while the mouth is open goes in, otherwise it bounces off.
export const MOUTH = Object.freeze({ period: 4, open: 1.3 });
export const mouthOpen = t => ((t % MOUTH.period) + MOUTH.period) % MOUTH.period < MOUTH.open;
