export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// A cable pulls only: it must never push the cadet away from an anchor.
export function cableAcceleration(position, velocity, anchor, restLength, boost = false) {
  const delta = anchor.map((v, i) => v - position[i]);
  const distance = Math.hypot(...delta);
  if (distance < 0.001) return [0, 0, 0];
  const direction = delta.map(v => v / distance);
  const radialSpeed = velocity.reduce((sum, v, i) => sum + v * direction[i], 0);
  const force = clamp((distance - restLength) * 5 + (boost ? 32 : 9) - radialSpeed * 2, 0, 95);
  return direction.map(v => v * force);
}

export function canStrikeNape(player, nape, forward, blades, alive) {
  if (!alive || blades <= 0) return false;
  const offset = player.map((v, i) => v - nape[i]);
  const distance = Math.hypot(...offset);
  const behind = offset[0] * forward[0] + offset[2] * forward[2] < 0.8;
  return distance <= 7 && Math.abs(offset[1]) <= 4.3 && behind;
}

export function insideSupplyRadius(position, supply) {
  return Math.hypot(...position.map((v, i) => v - supply[i])) < 10;
}

export function formatTime(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
