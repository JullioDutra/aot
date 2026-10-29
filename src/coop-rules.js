// Rules for the local co-op mode, kept free of rendering for tests.
export const COOP_RULES = Object.freeze({ time: 240, titans: 12, comboBonus: 8, reviveTime: 1.6, reviveRadius: 2.8, grabTime: 6 });

// Two controllers: one each. One controller: player 1 on keyboard and mouse,
// player 2 on the controller. None: both share the keyboard (WASD and IJKL).
export function assignControllers(connected) {
  if (connected >= 2) return ['pad0', 'pad1'];
  if (connected === 1) return ['keyboard', 'pad0'];
  return ['keyboard', 'keyboard2'];
}

// Distraction and cut: a kill counts as combined when the titan was chasing
// the partner of the soldier who cut its nape.
export function combinedStrike(targetIndex, killerIndex) {
  return targetIndex !== null && targetIndex !== undefined && targetIndex !== killerIndex;
}

// Holding the action button near a downed partner fills the bar; letting go
// drains it slowly so a short interruption does not erase the effort.
export function reviveProgress(progress, dt, holding) {
  return holding ? Math.min(1, progress + dt / COOP_RULES.reviveTime) : Math.max(0, progress - dt * .5);
}
