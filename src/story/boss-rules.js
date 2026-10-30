// Rules for the shifter bosses (Female, Beast, Armored): which attack they
// pick against the pilot and whether it lands. Distances are measured in
// titan heights so one table serves every scale.
export const BOSSES = Object.freeze({
  female: { swat: { reach: .95, windup: .7, damage: 34 }, stomp: { reach: .3, windup: .55, damage: 40 }, harden: { radius: .75, duration: 3.2, cooldown: 7 }, cooldown: 1.9, turn: 2.2 },
  beast: { swat: { reach: .9, windup: .8, damage: 40 }, throw: { min: .9, max: 6, windup: 1.2, radius: 7, damage: 45, cooldown: 5 }, cooldown: 2.1, turn: 1.4 },
  armored: { swat: { reach: .85, windup: .6, damage: 45 }, stomp: { reach: .32, windup: .5, damage: 50 }, cooldown: 1.6, turn: 1.1 },
});

// Pilot position in the titan frame: front > 0 ahead of the face, side > 0
// to the titan's left, up from the feet; all divided by the height.
export function relative(titan, yaw, height, player) {
  const dx = player[0] - titan[0], dz = player[2] - titan[2], s = Math.sin(yaw), c = Math.cos(yaw);
  const front = (dx * s + dz * c) / height, side = (dx * c - dz * s) / height, up = (player[1] - titan[1]) / height;
  return { front, side, up, distance: Math.hypot(front, side) };
}

// state: { cooldown, throwCooldown, hardenCooldown, blind }
export function chooseAttack(kind, rel, state) {
  const boss = BOSSES[kind];
  if (!boss || state.blind || state.cooldown > 0) return null;
  if (boss.harden && state.hardenCooldown <= 0 && rel.front < 0 && rel.distance < boss.harden.radius && rel.up > .55) return 'harden';
  if (boss.stomp && rel.up < .15 && rel.distance < boss.stomp.reach) return 'stomp';
  if (boss.swat && rel.distance < boss.swat.reach && rel.front > -.2 && rel.up < 1.1) return rel.side > 0 ? 'swat-left' : 'swat-right';
  if (boss.throw && state.throwCooldown <= 0 && rel.distance > boss.throw.min && rel.distance < boss.throw.max) return 'throw';
  return null;
}

// Whether a swat or stomp connects at the moment of impact. A swat sweeps the
// space in front of the titan on the arm's side; dodging behind or above
// the head, or to the other side, avoids it.
export function attackHits(kind, attack, rel) {
  const boss = BOSSES[kind];
  if (attack === 'stomp') return rel.up < .12 && rel.distance < boss.stomp.reach;
  if (attack === 'swat-left' || attack === 'swat-right') {
    const sideOk = attack === 'swat-left' ? rel.side > -.15 : rel.side < .15;
    return sideOk && rel.distance < boss.swat.reach && rel.front > -.25 && rel.up > .12 && rel.up < 1.05;
  }
  return false;
}

// A thrown rock lands where the pilot was heading when it left the hand.
export function throwTarget(player, velocity, flight) {
  return [player[0] + velocity[0] * flight, 0, player[2] + velocity[2] * flight];
}
