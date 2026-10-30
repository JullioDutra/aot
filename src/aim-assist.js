// Screen offsets tried around each cable's reticle, nearest first. Level 0
// is the bare reticle, 1 the small mouse/controller search and 2 the wide
// touch search, where a thumb cannot aim as finely.
export const AIM_LEVELS = Object.freeze({ off: 0, assisted: 1, touch: 2 });

export function aimOffsets(side, level = 1) {
  if (!level) return [[0, 0]];
  if (level === 1) return [[0, 0], [0, .035], [side * .035, 0], [0, -.035], [side * .035, .035]];
  const offsets = [[0, 0]];
  for (const radius of [.04, .08, .13]) for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    offsets.push([Math.cos(a) * radius * side, Math.sin(a) * radius]);
  }
  return offsets;
}
