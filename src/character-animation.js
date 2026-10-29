// Procedural poses for the toon cast. Each pose returns joint rotations so the
// values can be tested without rendering; applyPose writes them to a rig.
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp01(x); return t * t * (3 - 2 * t); };

export const POSES = ['idle', 'walk', 'run', 'odm', 'strike', 'carried', 'reach', 'grief', 'ride', 'salute', 'fall', 'guard', 'punch', 'sit', 'bench', 'lie'];

export function characterPose(kind, time = 0, { speed = 1, progress = 0, side = 1 } = {}) {
  const pose = { hips: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], arms: [[0, 0, -.08], [0, 0, .08]], elbows: [0, 0], legs: [0, 0], knees: [0, 0], rise: 0, cloak: 0 };
  const breathe = Math.sin(time * 1.6) * .02;
  switch (kind) {
    case 'walk': case 'run': {
      const run = kind === 'run', f = (run ? 9 : 5.5) * speed, s = Math.sin(time * f), amp = run ? .75 : .42;
      pose.legs = [s * amp, -s * amp];
      pose.knees = [Math.max(0, -s) * amp * 1.4 + .05, Math.max(0, s) * amp * 1.4 + .05];
      pose.arms = [[-s * amp * .8, 0, -.12], [s * amp * .8, 0, .12]];
      pose.elbows = [-.35 - (run ? .6 : 0), -.35 - (run ? .6 : 0)];
      pose.spine[0] = run ? .22 : .04; pose.rise = Math.abs(Math.cos(time * f)) * (run ? .05 : .025); pose.cloak = run ? .5 : .15;
      pose.hips[1] = s * .08; pose.spine[1] = -s * .1;
      break;
    }
    case 'odm': {
      // Airborne: legs tucked, arms forward holding the triggers, body leaning
      // into the cable direction.
      pose.spine[0] = .55; pose.legs = [-.9, -.6]; pose.knees = [1.3, 1.0];
      pose.arms = [[-1.1, 0, -.35], [-1.1, 0, .35]]; pose.elbows = [-.6, -.6]; pose.head[0] = -.45; pose.cloak = 1;
      pose.hips[2] = Math.sin(time * 3) * .06;
      break;
    }
    case 'strike': {
      // Spinning two-blade cut: windup, sweep, follow-through.
      const wind = smooth(progress / .3), cut = smooth((progress - .3) / .25), rest = smooth((progress - .7) / .3);
      const sweep = wind * -1.9 + cut * 3.4 - rest * 1.5;
      pose.arms = [[-1.3 + cut * .4, sweep * .25, -1.0 + cut * 1.6], [-1.3 + cut * .4, -sweep * .25, 1.0 - cut * 1.6]];
      pose.elbows = [-.4, -.4]; pose.spine = [.35, sweep * .35 * side, 0]; pose.legs = [-.8, -.4]; pose.knees = [1.1, .9]; pose.cloak = .8;
      break;
    }
    case 'carried':
      pose.spine[0] = -.3; pose.arms = [[-2.4, 0, -.3], [-2.2, 0, .5]]; pose.elbows = [-.3, -.6]; pose.legs = [-.4, -.2]; pose.knees = [.6, .4]; pose.head[0] = -.3;
      break;
    case 'reach':
      pose.spine[0] = .25; pose.arms = [[-1.5, 0, -.1], [-1.6, 0, .1]]; pose.elbows = [-.1, -.1]; pose.head[0] = -.25;
      pose.arms[0][0] += Math.sin(time * 9) * .06; pose.arms[1][0] -= Math.sin(time * 9) * .06;
      break;
    case 'grief':
      pose.rise = -.38; pose.legs = [-1.5, -1.5]; pose.knees = [2.3, 2.3]; pose.spine[0] = .6; pose.head[0] = .5;
      pose.arms = [[-.5, 0, -.2], [-.5, 0, .2]]; pose.elbows = [-1.2, -1.2];
      pose.spine[0] += Math.sin(time * 7) * .02;
      break;
    case 'ride': {
      const s = Math.sin(time * 7 * speed);
      pose.legs = [-1.2, -1.2]; pose.knees = [1.2, 1.2]; pose.hips[2] = 0; pose.spine[0] = .25 + s * .05; pose.rise = s * .03;
      pose.arms = [[-.8, 0, -.2], [-.8, 0, .2]]; pose.elbows = [-1, -1]; pose.cloak = .9;
      break;
    }
    case 'salute':
      // Right fist over the heart, left arm behind the back.
      pose.arms = [[.4, 0, -.2], [-1.25, -.2, -.65]]; pose.elbows = [-1.2, -1.9]; pose.spine[0] = -.05;
      break;
    case 'fall':
      pose.spine[0] = -.6 + Math.sin(time * 5) * .1; pose.arms = [[-2.6, 0, -.8], [-2.4, 0, .9]]; pose.legs = [.4, -.3]; pose.knees = [.6, .9]; pose.cloak = 1;
      break;
    case 'guard':
      // Hand-to-hand stance: fists up, knees bent, weight forward.
      pose.arms = [[-1.2, 0, -.35], [-1.5, 0, .3]]; pose.elbows = [-1.7, -1.5]; pose.legs = [-.35, .2]; pose.knees = [.45, .3]; pose.spine[0] = .18 + breathe; pose.rise = -.06;
      break;
    case 'punch': {
      const hit = Math.sin(Math.min(1, progress) * Math.PI);
      pose.arms = [[-1.2, 0, -.35], [-1.5 - hit * .2, 0, .3 - hit * .3]]; pose.elbows = [-1.7, -1.5 + hit * 1.4]; pose.legs = [-.5, .3]; pose.knees = [.5, .2]; pose.spine = [.25, -hit * .5, 0]; pose.rise = -.06;
      break;
    }
    case 'sit':
      // Seated on the floor; benches lift the root instead.
      pose.rise = -.41; pose.legs = [-1.45, -1.35]; pose.knees = [.35, .5]; pose.arms = [[-.5, 0, -.15], [-.5, 0, .15]]; pose.elbows = [-.9, -.9]; pose.spine[0] = .1 + breathe;
      break;
    case 'bench':
      // Seated on a bench or chair; the caller lifts the root to the seat.
      pose.rise = -.5; pose.legs = [-1.5, -1.5]; pose.knees = [1.5, 1.5]; pose.arms = [[-.7, 0, -.15], [-.7, 0, .15]]; pose.elbows = [-1, -1]; pose.spine[0] = .08 + breathe;
      break;
    case 'lie':
      // Limp body; the caller lays the root on its back.
      pose.legs = [.05, -.1]; pose.knees = [.15, .3]; pose.arms = [[.2, 0, -.5], [.1, 0, .6]]; pose.elbows = [-.2, -.5]; pose.head[1] = .4;
      break;
    default:
      pose.spine[0] = breathe; pose.arms = [[breathe, 0, -.1], [breathe, 0, .1]]; pose.elbows = [-.12, -.12];
  }
  return pose;
}

export function applyPose(rig, pose) {
  rig.hips.rotation.set(...pose.hips);
  rig.hips.position.y = rig.proportions.hipY + pose.rise * rig.proportions.H;
  rig.spine.rotation.set(...pose.spine);
  rig.head.rotation.set(...pose.head);
  rig.arms.forEach((arm, i) => arm.rotation.set(...pose.arms[i]));
  rig.elbows.forEach((elbow, i) => { elbow.rotation.x = pose.elbows[i]; });
  rig.legs.forEach((leg, i) => { leg.rotation.x = pose.legs[i]; });
  rig.knees.forEach((knee, i) => { knee.rotation.x = pose.knees[i]; });
  if (rig.cloak) rig.cloak.rotation.x = -pose.cloak * .7;
}
