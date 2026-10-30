// Rules for fighting a titan from its own body: orbiting on a cable and the
// finisher window at the nape. Pure functions over plain [x, y, z] arrays.
export const FINISHER = Object.freeze({ reach: 9, height: 5, speed: 6, behind: 1 });
const ORBIT = 26, REEL = 10;

// move: [x, y] stick or WASD, y < 0 is forward. Sideways input becomes an
// acceleration tangent to the cable in the horizontal plane; forward/back
// becomes a reel rate (negative shortens the cable).
export function orbitControl(position, anchor, move) {
  const dx = position[0] - anchor[0], dz = position[2] - anchor[2], flat = Math.hypot(dx, dz);
  const reel = move[1] === 0 ? 0 : Math.sign(move[1]) * REEL * Math.min(1, Math.abs(move[1]));
  if (flat < .5 || move[0] === 0) return { acceleration: [0, 0, 0], reel };
  // Tangent = up × radial, so +x orbits counterclockwise seen from above.
  const tx = dz / flat, tz = -dx / flat, k = ORBIT * Math.max(-1, Math.min(1, move[0]));
  return { acceleration: [tx * k, 0, tz * k], reel };
}

// facing: unit vector the titan looks along. The window opens behind the
// neck, within reach and height, while moving fast or hanging on the titan.
export function finisherWindow(player, velocity, nape, facing, { blades = 100, guarded = false, onTitan = false } = {}) {
  const offset = player.map((v, i) => v - nape[i]);
  const distance = Math.hypot(...offset), speed = Math.hypot(...velocity);
  const behind = offset[0] * facing[0] + offset[2] * facing[2] < FINISHER.behind;
  const ready = blades > 0 && !guarded && behind && distance <= FINISHER.reach && Math.abs(offset[1]) <= FINISHER.height && (onTitan || speed >= FINISHER.speed);
  return { ready, distance, behind, speed };
}
