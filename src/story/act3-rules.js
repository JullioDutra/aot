// Pure rules for Act III (chapters 13–18): smoke signals in the long-range
// formation, riding, the Female Titan's reactions, the titan duel and Levi's
// rescue cuts. Covered by tests/act3-rules.test.js.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Chapter 13: smoke signals ───────────────────────────────────────────────
// Red: titan sighted. Green: new heading. Black: abnormal. A relay is good when
// the colour matches and goes up within the window.
export const FLARES = Object.freeze({ red: '#d8342b', green: '#3f9a4a', black: '#1c1a1a' });
export const RELAY_WINDOW = 6;
export function relaySignal(expected, fired, age) {
  if (fired !== expected) return 'wrong';
  return age <= RELAY_WINDOW ? 'ok' : 'late';
}

// ── Riding ──────────────────────────────────────────────────────────────────
// Throttle in [-1, 1] eases speed toward a target; trunks and titans are
// outside this rule. Returns the new speed.
export const HORSE = Object.freeze({ trot: 7, gallop: 17, sprint: 22, accel: 9, brake: 14 });
export function rideSpeed(speed, throttle, dt, sprint = false) {
  const target = throttle > .1 ? (sprint ? HORSE.sprint : HORSE.gallop) * throttle : throttle < -.1 ? 0 : HORSE.trot;
  const rate = target > speed ? HORSE.accel : HORSE.brake;
  return speed + clamp(target - speed, -rate * dt, rate * dt);
}
// Distance to an assigned slot in the formation; a rider within `tolerance`
// keeps position.
export function formationGap(position, slot) { return Math.hypot(position[0] - slot[0], position[1] - slot[1]); }
export const inFormation = (gap, tolerance = 14) => gap <= tolerance;

// ── The Female Titan ────────────────────────────────────────────────────────
// She reads where the attacker comes from. `rel` is the attacker position in
// her frame ([right, up, forward], metres) and `height` her height.
//   'guard'  an attacker behind and close: a hand covers the nape (hardened)
//   'swat'   an attacker in front, within arm's reach: a sweeping blow
//   'kick'   an attacker low and close at her feet
//   'chase'  otherwise she keeps running toward her goal
export function femaleReaction(rel, height = 14) {
  const [x, y, z] = rel, flat = Math.hypot(x, z);
  if (flat < height * .5 && y < height * .25) return 'kick';
  if (z < 0 && flat < height * 1.6) return 'guard';
  if (z >= 0 && flat < height * .9 && y < height * 1.1) return 'swat';
  return 'chase';
}
// A cut on the nape only works while it is not hardened; she hardens when
// guarding, so cuts from behind need her hand to be busy.
export const napeOpen = (reaction, handBusy = false) => reaction !== 'guard' || handBusy;

// ── Titan duel (chapters 17 and 18) ─────────────────────────────────────────
// Annie loops stance → tell → strike → recover. A punch lands only during the
// recover window; a punch during the stance hits hardened forearms and costs
// the attacker; dodging (stepping back) during the strike avoids the blow.
export const ANNIE = Object.freeze({ stance: 1.2, tell: .8, strike: .35, recover: .9, damage: 22, blocked: 6 });
export function createTitanDuel(health = 100) { return { phase: 'stance', t: 0, health, landed: 0, blocked: 0, taken: 0, last: null }; }
export function titanDuelStep(state, dt, { punch = false, dodge = false, pace = 1 } = {}) {
  const s = { ...state, t: state.t + dt * pace, last: null };
  if (punch) {
    if (s.phase === 'recover') return { ...s, landed: s.landed + 1, phase: 'stance', t: 0, last: 'landed' };
    if (s.phase === 'stance') return { ...s, health: s.health - ANNIE.blocked, blocked: s.blocked + 1, phase: 'tell', t: 0, last: 'blocked' };
  }
  if (s.phase === 'strike' && dodge) return { ...s, phase: 'recover', t: 0, last: 'dodged' };
  if (s.t < ANNIE[s.phase]) return s;
  if (s.phase === 'strike') return { ...s, health: s.health - ANNIE.damage, taken: s.taken + 1, phase: 'recover', t: 0, last: 'hit' };
  const order = { stance: 'tell', tell: 'strike', recover: 'stance' };
  return { ...s, phase: order[s.phase], t: 0 };
}

// ── Chapter 17: Levi's rescue ───────────────────────────────────────────────
// Eyes first so she cannot see, then the shoulders so she cannot guard, then
// the mouth. A cut out of order glances off.
export const RESCUE_ORDER = Object.freeze(['olho-e', 'olho-d', 'braco-e', 'braco-d', 'boca']);
export function rescueCut(done, point) {
  const stage = point.startsWith('olho') ? 0 : point.startsWith('braco') ? 1 : 2;
  const needed = { 0: [], 1: ['olho-e', 'olho-d'], 2: ['olho-e', 'olho-d', 'braco-e', 'braco-d'] }[stage];
  if (done.includes(point)) return { ok: false, reason: 'feito' };
  if (!needed.every(p => done.includes(p))) return { ok: false, reason: stage === 1 ? 'ela ainda vê' : 'ela ainda protege' };
  return { ok: true, done: [...done, point] };
}

// ── Chapter 18: Stohess ─────────────────────────────────────────────────────
// Annie climbs the wall with hardened fingers: each cut hand drops her a few
// metres; both hands cut at once make her fall.
export function climbStep(climb, dt, { cut = [], height = 50 } = {}) {
  const hands = { left: climb.hands.left && !cut.includes('left'), right: climb.hands.right && !cut.includes('right') };
  if (!hands.left && !hands.right) return { ...climb, hands, falling: true };
  const slip = cut.length ? 4 : 0;
  const y = clamp(climb.y + dt * (hands.left && hands.right ? 2.2 : .9) - slip, 0, height);
  return { ...climb, y, hands, escaped: y >= height - 1 };
}
export const createClimb = () => ({ y: 6, hands: { left: true, right: true }, falling: false, escaped: false });
