export const BLADE_IMPACT = .16;
export const BLADE_DURATION = .52;
export const createBladeStrike = () => ({ active: false, time: 0 });
export function beginBladeStrike(state, blades) {
  if (state.active || blades <= 0) return { state, accepted: false, cost: 0 };
  return { state: { active: true, time: 0 }, accepted: true, cost: Math.min(5, blades) };
}
export function stepBladeStrike(state, dt) {
  if (!state.active || !Number.isFinite(dt) || dt <= 0) return { state: { ...state }, impact: false };
  const time = Math.min(BLADE_DURATION, state.time + dt);
  return { state: { active: time < BLADE_DURATION, time }, impact: state.time < BLADE_IMPACT && time >= BLADE_IMPACT };
}
export function bladeStrikePhase(state) {
  if (!state.active) return 'ready';
  return state.time < BLADE_IMPACT ? 'prepare' : state.time < .25 ? 'cut' : 'recover';
}
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function bladeStrikePose(state, side, restingX = -.3) {
  if (!state.active) return { x: restingX, z: 0, trail: 0 };
  const t = state.time;
  let x, z;
  if (t < .1) { const a = smooth(t / .1); x = restingX + (-2.3 - restingX) * a; z = side * .8 * a; }
  else if (t < BLADE_IMPACT) { const a = smooth((t - .1) / (BLADE_IMPACT - .1)); x = -2.3 + 1.6 * a; z = side * (.8 - 1.25 * a); }
  else { const a = smooth((t - BLADE_IMPACT) / (BLADE_DURATION - BLADE_IMPACT)); x = -.7 + (restingX + .7) * a; z = -side * .45 * (1 - a); }
  return { x, z, trail: t >= .1 && t < .25 ? Math.sin((t - .1) / .15 * Math.PI) * .45 : 0 };
}
