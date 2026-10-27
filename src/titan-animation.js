import { MOVES } from './titan-combat.js';
import { clamp } from './mechanics.js';

const smooth = t => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;
export function combatPose({ time = 0, walking = false, guard = false, action = null, strikeSide = 0, hit = 0 } = {}) {
  const walk = walking ? Math.sin(time * 4) : 0;
  const pose = { shoulders: [-.14 + walk * .15, -.14 - walk * .15], spread: [.08, -.08], elbows: [-.13, -.13], hips: [walk * .26, -walk * .26], knees: [Math.max(0, -walk) * .4, Math.max(0, walk) * .4], torso: [0, 0, 0], head: 0 };
  if (guard) { pose.shoulders = [-1.12, -1.12]; pose.elbows = [-1.35, -1.35]; pose.spread = [-.2, .2]; pose.torso[0] = .1; }
  if (action?.kind === 'stun') { pose.torso[0] = .28; pose.head = .2; }
  else if (action && MOVES[action.kind]) {
    const spec = MOVES[action.kind], elapsed = action.elapsed;
    const windup = smooth(elapsed / spec.windup);
    const recovery = smooth((elapsed - spec.windup) / spec.recovery);
    // The extension reaches its peak at the gameplay hit time, then recovers.
    const extension = elapsed < spec.windup ? smooth((windup - .65) / .35) : 1 - recovery;
    const coil = Math.sin(Math.PI * Math.min(1, windup / .7)) * (1 - extension);
    const indices = action.kind === 'grab' ? [0, 1] : [strikeSide];
    for (const i of indices) {
      pose.shoulders[i] = mix(-.25 + coil * .4, -1.55, extension);
      pose.elbows[i] = mix(-1.65 * (elapsed < spec.windup ? windup : 1 - recovery), -.08, extension);
      pose.spread[i] = (i === 0 ? 1 : -1) * (action.kind === 'grab' ? .22 : .32 * coil);
    }
    pose.torso[1] = (strikeSide ? -1 : 1) * (coil * .28 - extension * (action.kind === 'heavy' ? .32 : .18));
    pose.torso[0] = extension * (action.kind === 'heavy' ? .18 : .07);
  }
  pose.torso[0] -= Math.sin(clamp(hit / .35, 0, 1) * Math.PI) * .2;
  return pose;
}

export function applyCombatPose(model, pose) {
  model.arms.forEach((arm, i) => { arm.rotation.set(pose.shoulders[i], 0, pose.spread[i]); model.elbows[i].rotation.x = pose.elbows[i]; });
  model.legs.forEach((leg, i) => { leg.rotation.x = pose.hips[i]; model.knees[i].rotation.x = pose.knees[i]; });
  model.body.rotation.set(...pose.torso); model.head.rotation.x = pose.head;
}
