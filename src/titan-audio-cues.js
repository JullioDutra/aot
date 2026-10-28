// Stereo relative to the player's view; distance includes elevation.
export function titanAudioMix(source, listener, yaw, occluded = false) {
  const delta = source.map((v, i) => v - listener[i]);
  const distance = Math.hypot(...delta), horizontal = Math.hypot(delta[0], delta[2]);
  return { distance, pan: horizontal < .001 ? 0 : Math.max(-1, Math.min(1,
    (delta[0] * Math.cos(yaw) + delta[2] * Math.sin(yaw)) / horizontal)),
    level: distance >= 80 ? 0 : (1 - distance / 80) * (occluded ? .25 : 1) };
}

// Actual travel drives footsteps: a stopped titan cannot stomp in place.
export function titanAudioCues(previous, next, height, stride = 0) {
  const cues = [];
  const travel = Math.hypot(next.position[0] - previous.position[0], next.position[2] - previous.position[2]);
  const stepLength = height * .16;
  let remainder = stride + travel;
  if (remainder >= stepLength) { cues.push('step'); remainder %= stepLength; }
  if (previous.phase !== next.phase) {
    if (next.phase === 'windup') cues.push('warning');
    if (previous.phase === 'windup' && next.phase === 'recover') cues.push('heavy');
    if (next.phase === 'guardPrepare') cues.push('dodge');
  }
  return { cues, stride: remainder };
}
