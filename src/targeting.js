import * as THREE from 'three';
import { segmentObstructed } from './collision.js';

const ray = new THREE.Raycaster();
// Side-specific reticles, with a small optional search area. Only the FIRST
// camera hit may become a candidate; rejection never exposes a wall behind it.
export function selectAnchor(camera, origin, side, anchors, colliders, assisted, otherPoint = null) {
  const offsets = assisted ? [[0, 0], [0, .035], [side * .035, 0], [0, -.035], [side * .035, .035]] : [[0, 0]];
  camera.updateMatrixWorld();
  for (const [dx, dy] of offsets) {
    ray.setFromCamera(new THREE.Vector2(side * .045 + dx, dy), camera); ray.far = 105;
    const hit = ray.intersectObjects(anchors, false)[0];
    if (!hit || hit.point.y < .5) continue;
    const distance = hit.point.distanceTo(origin);
    if (distance > 90 || distance < 2 || (otherPoint && otherPoint.distanceTo(hit.point) < .7)) continue;
    if (segmentObstructed(origin.toArray(), hit.point.toArray(), colliders)) continue;
    return { point: hit.point, distance };
  }
  return null;
}
