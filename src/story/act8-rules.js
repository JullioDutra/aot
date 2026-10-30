// Pure rules for Act VIII (chapters 39–47): Pieck's artillery, disarming the
// Yeagerists, the heat of the Colossals, the bone anchors on the Founder and
// Falco's flight. Covered by tests/act8-rules.test.js.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Chapter 40: Pieck's artillery ───────────────────────────────────────────
// A shell lands where the target was when Pieck took aim; moving after the
// warning is enough to dodge it.
export const SHELL = Object.freeze({ every: 4, warning: 1.6, radius: 7, damage: 18 });
export function shellPhase(time) {
  const t = ((time % SHELL.every) + SHELL.every) % SHELL.every;
  return t < SHELL.warning ? 'aim' : t < SHELL.warning + .3 ? 'impact' : 'reload';
}
export const shellHits = (aim, position) => Math.hypot(aim[0] - position[0], aim[1] - position[1]) <= SHELL.radius;

// ── Chapter 43: disarm, don't kill ──────────────────────────────────────────
// A blade from behind (more than 100° off the gunman's facing) knocks the
// rifle away; from the front it is a killing blow.
export function strikeOutcome(facingYaw, gunman, attacker) {
  const fx = Math.sin(facingYaw), fz = Math.cos(facingYaw), dx = attacker[0] - gunman[0], dz = attacker[1] - gunman[1], d = Math.hypot(dx, dz) || 1;
  const angle = Math.acos(clamp((fx * dx + fz * dz) / d, -1, 1));
  return angle > (100 * Math.PI) / 180 ? 'disarm' : 'kill';
}

// ── Chapter 44: the heat of the Colossals ───────────────────────────────────
// Steam scalds anyone close to a Colossal's body; the feet are the coolest
// part. Damage per second from the horizontal distance and the height.
export function heatDamage(distance, height) {
  if (distance > 30) return 0;
  const near = 1 - distance / 30, up = clamp(height / 60, 0, 1);
  return Math.round((near * 30 + near * up * 40) * 10) / 10;
}
// A Colossal topples once both ankles are cut.
export const toppled = ankles => ankles.left && ankles.right;

// ── Chapter 45: bone anchors ────────────────────────────────────────────────
// On the Founder only bone holds a cable; flesh tears away.
export const holdsCable = tag => tag === 'bone';

// ── Chapter 46: Falco's flight ──────────────────────────────────────────────
// Steering eases the heading; climbing costs speed and diving gains it.
export function flightStep(state, dt, { turn = 0, pitch = 0 } = {}) {
  const yaw = state.yaw + clamp(turn, -1, 1) * 1.4 * dt;
  const speed = clamp(state.speed - clamp(pitch, -1, 1) * 9 * dt, 18, 42);
  const climb = clamp(pitch, -1, 1) * speed * .5;
  return { ...state, yaw, speed, y: clamp(state.y + climb * dt, 8, 160) };
}
