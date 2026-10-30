import * as THREE from 'three';
import { segmentObstructed } from './collision.js';
import { aimOffsets } from './aim-assist.js';

const ray = new THREE.Raycaster();
// Side-specific reticles, with a small optional search area. Only the FIRST
// camera hit may become a candidate; rejection never exposes a wall behind it.
// bodies: moving roots (titans) searched recursively; a hit on one carries
// its mesh so the cable can follow it.
export function selectAnchor(camera, origin, side, anchors, colliders, assisted, otherPoint = null, bodies = []) {
  const offsets = aimOffsets(side, assisted === true ? 1 : Number(assisted) || 0);
  camera.updateMatrixWorld();
  for (const [dx, dy] of offsets) {
    ray.setFromCamera(new THREE.Vector2(side * .045 + dx, dy), camera); ray.far = 105;
    const fixed = ray.intersectObjects(anchors, false)[0];
    const body = bodies.length ? ray.intersectObjects(bodies, true).find(h => !h.object.userData.noAnchor) : null;
    const hit = body && (!fixed || body.distance < fixed.distance) ? body : fixed;
    if (!hit || hit.point.y < .5) continue;
    const distance = hit.point.distanceTo(origin);
    if (distance > 90 || distance < 2 || (otherPoint && otherPoint.distanceTo(hit.point) < .7)) continue;
    if (segmentObstructed(origin.toArray(), hit.point.toArray(), colliders)) continue;
    return { point: hit.point, distance, object: hit === body ? hit.object : null };
  }
  return null;
}
