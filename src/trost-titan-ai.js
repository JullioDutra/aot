const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const TITAN_MEMORY_SECONDS = 5;

// Only observed positions enter memory. Search stays on the authored avenue;
// it is not pathfinding through buildings or knowledge of an occluded player.
export function stepTrostTitan(state, input, dt) {
  const next = { ...state, position: [...input.position], moving: false, hit: false,
    lastSeen: state.lastSeen ? [...state.lastSeen] : null, memory: state.memory ?? 0, awareness: state.awareness ?? 'idle' };
  if (!Number.isFinite(dt) || dt <= 0) return next;
  const { player, position, height, index, visible } = input;
  const dx = player[0] - position[0], dz = player[2] - position[2];
  const distance = Math.hypot(dx, dz), altitude = player[1] - position[1];
  const detected = visible && distance < 42 && altitude < height + 9 && altitude >= -2;
  if (detected) {
    next.lastSeen = [...player]; next.memory = TITAN_MEMORY_SECONDS; next.awareness = 'tracking';
  } else {
    next.memory = Math.max(0, next.memory - dt);
    if (!next.memory) next.lastSeen = null;
    next.awareness = next.lastSeen ? 'searching' : 'idle';
  }
  const facing = () => distance < .001 ? 1 : (dx * Math.sin(next.yaw) + dz * Math.cos(next.yaw)) / distance;
  if (next.phase === 'windup') {
    next.attackTimer = Math.max(0, next.attackTimer - dt);
    if (next.attackTimer === 0) {
      next.hit = visible && distance < 9 && altitude >= -2 && altitude < height * .85 && facing() > .25;
      next.phase = 'recover'; next.attackTimer = 1.4;
    }
    return next;
  }
  if (next.phase === 'recover') {
    next.attackTimer = Math.max(0, next.attackTimer - dt);
    if (next.attackTimer === 0) next.phase = 'walk';
    return next;
  }
  if (!next.lastSeen) return next;
  // Hidden targets contribute no current position, distance or heading here.
  const target = detected ? player : [clamp(next.lastSeen[0], -9, 9), position[1], clamp(next.lastSeen[2], -125, 68)];
  const tx = target[0] - position[0], tz = target[2] - position[2];
  const targetDistance = Math.hypot(tx, tz);
  if (targetDistance < .001 && !detected) return next;
  const targetYaw = targetDistance < .001 ? next.yaw : Math.atan2(tx, tz);
  const difference = Math.atan2(Math.sin(targetYaw - next.yaw), Math.cos(targetYaw - next.yaw));
  next.yaw += clamp(difference, -dt * .55, dt * .55);
  const alignment = (tx * Math.sin(next.yaw) + tz * Math.cos(next.yaw)) / targetDistance;
  if (detected && distance < 8 && altitude < height * .8 && facing() > .6) {
    next.phase = 'windup'; next.attackTimer = .9;
  } else {
    const stopDistance = detected ? 7 : .5;
    if (targetDistance > stopDistance && alignment > .2) {
      const travel = Math.min(targetDistance - stopDistance, dt * (index === 2 ? 3.3 : 2));
      next.position[0] = clamp(position[0] + tx / targetDistance * travel, -9, 9);
      next.position[2] = clamp(position[2] + tz / targetDistance * travel, -125, 68);
      next.moving = next.position[0] !== position[0] || next.position[2] !== position[2];
    }
  }
  return next;
}
