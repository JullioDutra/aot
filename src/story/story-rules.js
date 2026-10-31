// Pure rules shared by the story chapters: how pure titans pick prey, the
// training minigames of chapter 4, scoring in the forest exercise, the
// synchronized cut of the supply depot and the weight of the Trost boulder.
// Everything here is deterministic and covered by tests/story-rules.test.js.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Pure titans ─────────────────────────────────────────────────────────────
// Reach of a titan's grab, in metres, from its height.
export const grabReach = height => Math.max(2.2, height * .42);

// A titan walks toward the nearest visible prey. Abnormals ignore the nearest
// and go for the largest crowd, as in the anime. Returns the index of the
// chosen target and whether it is close enough to grab.
// titan: { position: [x, y, z], height, kind }; targets: [{ position: [x, y, z] }]
export function titanIntent(titan, targets, sight = 70) {
  let best = -1, bestScore = Infinity;
  targets.forEach((t, i) => {
    const d = Math.hypot(t.position[0] - titan.position[0], t.position[2] - titan.position[2]);
    if (d > sight) return;
    let score = d;
    if (titan.kind === 'abnormal') {
      const crowd = targets.filter(o => Math.hypot(o.position[0] - t.position[0], o.position[2] - t.position[2]) < 12).length;
      score = d - crowd * 25;
    }
    if (score < bestScore) { bestScore = score; best = i; }
  });
  if (best < 0) return { target: null, grab: false };
  const t = targets[best].position;
  const d = Math.hypot(t[0] - titan.position[0], t[2] - titan.position[2]);
  // Prey higher than the titan's shoulders is out of reach.
  const grab = d < grabReach(titan.height) && t[1] < titan.height * .9;
  return { target: best, grab, distance: d };
}

// Walking speed of a pure titan: big ones stride farther, abnormals sprint.
export const titanSpeed = (height, kind) => (kind === 'abnormal' ? 9 : 1.6 + height * .16);

// ── Chapter 4: balance rig ──────────────────────────────────────────────────
// tilt in [-1, 1]; |tilt| ≥ 1 flips the cadet upside down. A faulty belt adds
// a growing pull to one side that no steering can hold for long. Steering
// leans the body: pushing left counters a fall to the right.
export function createBalance() { return { tilt: 0, velocity: 0, time: 0, fallen: false, worst: 0 }; }
export function balanceStep(state, steer, dt, { faulty = false } = {}) {
  if (state.fallen) return state;
  const time = state.time + dt;
  const drift = Math.sin(time * 1.7) * .55 + Math.sin(time * 3.1 + 1) * .3 + (faulty ? .6 + time * .5 : 0);
  let velocity = state.velocity + (drift + state.tilt * 1.4 + clamp(steer, -1, 1) * 2.6) * dt;
  velocity *= Math.exp(-1.6 * dt);
  const tilt = clamp(state.tilt + velocity * dt, -1, 1);
  return { tilt, velocity, time, fallen: Math.abs(tilt) >= 1, worst: Math.max(state.worst, Math.abs(tilt)) };
}

// ── Chapter 4: hand-to-hand drill ───────────────────────────────────────────
// The partner loops idle → tell → strike → recover. Countering during the end
// of the tell or the strike disarms; countering early leaves an opening; a
// strike that lands counts as a hit taken.
export const DUEL = Object.freeze({ idle: 1.1, tell: .7, strike: .3, recover: .8, window: .45 });
export function createDuel() { return { phase: 'idle', t: 0, wins: 0, hits: 0, whiffs: 0, misses: 0, last: null }; }
export function duelStep(state, dt, counter = false) {
  const s = { ...state, t: state.t + dt, last: null };
  const late = (s.phase === 'tell' && s.t >= DUEL.tell - DUEL.window) || s.phase === 'strike';
  if (counter) {
    if (late) return { ...s, phase: 'recover', t: 0, wins: s.wins + 1, misses: 0, last: 'disarm' };
    if (s.phase === 'idle' || s.phase === 'tell') return { ...s, phase: 'strike', t: 0, whiffs: s.whiffs + 1, misses: (s.misses ?? 0) + 1, last: 'whiff' };
  }
  if (s.t < DUEL[s.phase]) return s;
  if (s.phase === 'strike') return { ...s, phase: 'recover', t: 0, hits: s.hits + 1, misses: (s.misses ?? 0) + 1, last: 'hit' };
  const order = { idle: 'tell', tell: 'strike', recover: 'idle' };
  return { ...s, phase: order[s.phase], t: 0 };
}

// What the player should read: 'now' inside the counter window, 'tell' while
// the partner winds up before it, 'wait' otherwise.
export function duelCue(s) {
  if (s.phase === 'strike' || (s.phase === 'tell' && s.t >= DUEL.tell - DUEL.window)) return 'now';
  return s.phase === 'tell' ? 'tell' : 'wait';
}
// After two misses in a row the partner slows down until the next disarm.
export const duelPace = s => ((s.misses ?? 0) >= 2 ? .6 : 1);

// ── Chapter 5: forest exercise ──────────────────────────────────────────────
// A clean, fast nape cut scores more; a hidden target is worth double.
// Training cable course (chapters 4 and 5): a hoop counts a little past its
// rim, practice tanks drain at half the field rate and refill on the ground,
// so running dry costs time, never the chapter.
export const HOOP_PASS = 4.6;
export const TRAINING_GAS = Object.freeze({ rate: .5, refill: 25 });
export function passesHoop(position, hoop, radius = HOOP_PASS) { return Math.hypot(...position.map((v, i) => v - hoop[i])) < radius; }
export function trainingGas(gas, dt, { grounded = false, attached = false } = {}) {
  return grounded && !attached ? Math.min(100, gas + TRAINING_GAS.refill * dt) : gas;
}
export function cutScore(speed, hidden = false) { return (10 + Math.min(15, Math.round(speed * .4))) * (hidden ? 2 : 1); }
// Jean's score after `seconds` of the timed race: steady and good, not
// perfect — 75 points over the 80 s race, about five clean cuts.
export const rivalScore = seconds => Math.floor(seconds / 14) * 15;
// Final ranking from a score: the top ten need 160 points.
export const rankFor = score => (score >= 220 ? 5 : score >= 160 ? 9 : score >= 100 ? 14 : 22);

// ── Chapter 11: synchronized cut ────────────────────────────────────────────
export function syncGrade(offset) { const a = Math.abs(offset); return a <= .25 ? 'perfeito' : a <= .7 ? 'bom' : 'falhou'; }

// ── Chapter 12: the boulder ─────────────────────────────────────────────────
// Carrying the boulder slows the titan and fatigue makes it worse; a titan
// hanging on its legs halves the pace.
export function carrySpeed(base, { load = 1, fatigue = 0, blocked = 0 } = {}) {
  return base * clamp(1 - load * .55, .2, 1) * clamp(1 - fatigue * .4, .5, 1) * (blocked ? .5 : 1);
}

// ── Chapter 9: routes to the supply depot ───────────────────────────────────
// Each route crosses some titans and offers some cover; the distraction of the
// unknown titan removes the titans along the routes that pass near it.
export const ROUTES = Object.freeze([
  { id: 'telhados', name: 'Pelos telhados altos', titans: 4, cover: 3, nearUnknown: true, length: 140 },
  { id: 'avenida', name: 'Pela avenida do mercado', titans: 6, cover: 1, nearUnknown: false, length: 110 },
  { id: 'canal', name: 'Pelo canal ao sul', titans: 3, cover: 2, nearUnknown: false, length: 180 },
]);
export function routeRisk(route, distraction = true) {
  const titans = route.titans - (distraction && route.nearUnknown ? 3 : 0);
  return Math.max(0, titans * 2 - route.cover + Math.round(route.length / 60));
}
