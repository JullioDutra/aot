import { clamp } from './mechanics.js';

export function surfaceHeight(collider, x) {
  if (!collider.roofRise) return collider.top;
  const center = (collider.minX + collider.maxX) / 2;
  const halfWidth = (collider.maxX - collider.minX) / 2;
  return collider.top + collider.roofRise * Math.max(0, 1 - Math.abs(x - center) / halfWidth);
}

// Collider numbers for a gabled roof (ridge along z) drawn from the wall top h
// to h + rise, with eaves overhanging the walls by overhang on each side: the
// surface over the walls follows the drawn slope, so actors stand on it.
export function gableCollider(h, halfWidth, rise, overhang = 0) {
  const edge = rise * overhang / (halfWidth + overhang);
  return { top: h + edge, roofRise: rise - edge };
}

const within = (c, x, z) => x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ;

// Called at <= 1/120 s with a maximum speed of 55 m/s. The player is a
// vertical body; gabled roofs use their actual two-plane height profile.
export function resolveMotion(previous, proposed, velocity, colliders, wasGrounded = false) {
  const position = [...proposed], speed = [...velocity];
  const radius = .45, height = 1.9;
  let grounded = false;
  for (const c of colliders) {
    if (position[0] + radius < c.minX || position[0] - radius > c.maxX || position[2] + radius < c.minZ || position[2] - radius > c.maxZ) continue;
    const bottom = c.bottom ?? 0;
    const top = surfaceHeight(c, clamp(position[0], c.minX, c.maxX));
    const previousTop = surfaceHeight(c, clamp(previous[0], c.minX, c.maxX));
    const supported = wasGrounded && within(c, previous[0], previous[2]) && Math.abs(previous[1] - previousTop) < .15;
    const landing = previous[1] >= previousTop - .02 && speed[1] <= 0 && position[1] <= top;
    if (within(c, position[0], position[2]) && (landing || (supported && speed[1] <= 0 && position[1] <= top + .3))) {
      position[1] = top; speed[1] = 0; grounded = true; continue;
    }
    if (position[1] >= top || position[1] + height <= bottom) continue;
    if (previous[1] + height <= bottom && speed[1] > 0) {
      position[1] = bottom - height; speed[1] = 0; continue;
    }
    const distances = [Math.abs(position[0] - (c.minX - radius)), Math.abs(position[0] - (c.maxX + radius)), Math.abs(position[2] - (c.minZ - radius)), Math.abs(position[2] - (c.maxZ + radius))];
    const side = distances.indexOf(Math.min(...distances));
    if (side === 0) { position[0] = c.minX - radius; speed[0] = Math.min(speed[0], 0); }
    if (side === 1) { position[0] = c.maxX + radius; speed[0] = Math.max(speed[0], 0); }
    if (side === 2) { position[2] = c.minZ - radius; speed[2] = Math.min(speed[2], 0); }
    if (side === 3) { position[2] = c.maxZ + radius; speed[2] = Math.max(speed[2], 0); }
  }
  if (position[1] <= 0) { position[1] = 0; speed[1] = Math.max(0, speed[1]); grounded = true; }
  return { position, velocity: speed, grounded };
}

// Clip the finite segment against a convex building, including both roof
// planes. A miss over the eaves must not become a hit on an invisible box.
export function segmentEntry(start, end, c) {
  const delta = end.map((value, i) => value - start[i]);
  const planes = [[1, 0, 0, c.maxX], [-1, 0, 0, -c.minX], [0, 0, 1, c.maxZ], [0, 0, -1, -c.minZ], [0, -1, 0, -(c.bottom ?? 0)]];
  if (c.roofRise) {
    const center = (c.minX + c.maxX) / 2, slope = c.roofRise / ((c.maxX - c.minX) / 2);
    planes.push([slope, 1, 0, c.top + c.roofRise + slope * center], [-slope, 1, 0, c.top + c.roofRise - slope * center]);
  } else planes.push([0, 1, 0, c.top]);
  let enter = 0, leave = 1;
  for (const [nx, ny, nz, limit] of planes) {
    const origin = nx * start[0] + ny * start[1] + nz * start[2] - limit;
    const direction = nx * delta[0] + ny * delta[1] + nz * delta[2];
    if (Math.abs(direction) < 1e-9) { if (origin > 1e-7) return null; continue; }
    const t = -origin / direction;
    if (direction < 0) enter = Math.max(enter, t); else leave = Math.min(leave, t);
    if (enter > leave) return null;
  }
  return enter <= 1 && leave >= 0 ? { enter, leave } : null;
}

export function segmentObstructed(start, end, colliders, endpointMargin = .25) {
  const length = Math.hypot(...end.map((v, i) => v - start[i]));
  if (length < .001) return false;
  return colliders.some(c => {
    const hit = segmentEntry(start, end, c);
    return hit !== null && hit.leave * length > .04 && hit.enter * length < length - endpointMargin;
  });
}
