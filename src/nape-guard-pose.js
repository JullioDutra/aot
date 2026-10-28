import * as THREE from 'three';

// Two-bone reach in body coordinates. Hands cover either side of the nape;
// elbows bend outward so the silhouette communicates the protection.
export function applyNapeGuard(titan, weight) {
  if (weight <= 0) return;
  titan.arms.forEach((arm, i) => {
    const side = i === 0 ? -1 : 1;
    const target = new THREE.Vector3(side * .25, 4.65, -.65);
    const delta = target.sub(arm.position);
    const distance = delta.length(), direction = delta.clone().normalize();
    const upper = 1.95, lower = Math.hypot(1.8, .04);
    const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    const bend = new THREE.Vector3(side, 1, 0);
    bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    const elbow = direction.clone().multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
    const shoulderRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), elbow.clone().normalize());
    const forearmDirection = delta.sub(elbow).normalize().applyQuaternion(shoulderRotation.clone().invert());
    const elbowRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1.8, .04).normalize(), forearmDirection);
    arm.quaternion.slerp(shoulderRotation, weight);
    titan.elbows[i].quaternion.slerp(elbowRotation, weight);
  });
}
