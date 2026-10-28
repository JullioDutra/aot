const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Pure encounter rules; visibility is supplied by the world's collision query.
// Windup and recovery finish even when the player leaves detection range.
export function stepTrostTitan(state, input, dt) {
  const next = { ...state, position: [...input.position], moving: false, hit: false };
  if (!Number.isFinite(dt) || dt <= 0) return next;
  const { player, position, height, index, visible } = input;
  const dx = player[0] - position[0], dz = player[2] - position[2];
  const distance = Math.hypot(dx, dz), altitude = player[1] - position[1];
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
  if (!visible || distance >= 42 || altitude >= height + 9 || altitude < -2) return next;
  const targetYaw = Math.atan2(dx, dz);
  const difference = Math.atan2(Math.sin(targetYaw - next.yaw), Math.cos(targetYaw - next.yaw));
  next.yaw += clamp(difference, -dt * .55, dt * .55);
  if (distance < 8 && altitude < height * .8 && facing() > .6) {
    next.phase = 'windup'; next.attackTimer = .9;
  } else if (distance > 7 && facing() > .2) {
    const travel = Math.min(distance - 7, dt * (index === 2 ? 3.3 : 2));
    next.position[0] = clamp(position[0] + dx / distance * travel, -9, 9);
    next.position[2] = clamp(position[2] + dz / distance * travel, -125, 68);
    next.moving = next.position[0] !== position[0] || next.position[2] !== position[2];
  }
  return next;
}
