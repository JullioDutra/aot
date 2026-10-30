import * as THREE from 'three';
import { cableAcceleration, clamp } from '../mechanics.js';
import { resolveMotion } from '../collision.js';
import { orbitControl } from '../titan-hook.js';
import { aimOffsets } from '../aim-assist.js';

// Omni-directional mobility gear for story chapters. Same physics as Trost
// (pull-only cables, gas boost, drag, collisions) with one addition: a cable
// can hook a moving object, such as a titan, and follows it every frame.
const raycaster = new THREE.Raycaster();
// Hidden parents (a titan off stage) hide their meshes from the cables too.
// Cables of the rig that flew since the last call, so the touch layer knows
// which latched cable buttons still hold something.
let flown = null;
export function takeFlownHooks() { const hooks = flown; flown = null; return hooks; }
const shown = object => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };

export function createOdm({ scene, camera, colliders = [], anchorRoots = [], gas = 100, blades = 100, bounds = 300 }) {
  const player = { position: new THREE.Vector3(), velocity: new THREE.Vector3(), grounded: true, gas, blades, health: 100 };
  const hooks = [-1, 1].map(side => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#efe6c8' }));
    line.frustumCulled = false; line.visible = false; scene.add(line);
    return { side, active: false, point: new THREE.Vector3(), local: null, object: null, length: 0, line };
  });
  const hookWorld = new THREE.Vector3();

  function origin(side, yaw) { return player.position.clone().add(new THREE.Vector3(Math.cos(yaw) * side * .3, 1.1, Math.sin(yaw) * side * .3)); }

  // Aim through the screen slightly left/right of center for each cable.
  function aim(side, assisted = 1) {
    camera.updateMatrixWorld();
    const offsets = aimOffsets(side, assisted === true ? 1 : Number(assisted) || 0);
    for (const [dx, dy] of offsets) {
      raycaster.setFromCamera(new THREE.Vector2(side * .05 + dx, dy), camera); raycaster.far = 95;
      const hit = raycaster.intersectObjects(anchorRoots, true).find(h => shown(h.object) && !h.object.userData.noAnchor);
      if (!hit || hit.point.y < .4) continue;
      const distance = hit.point.distanceTo(player.position);
      if (distance < 2 || distance > 90) continue;
      return hit;
    }
    return null;
  }

  function attach(side, yaw, assist = 1) {
    const hook = hooks[side === -1 ? 0 : 1];
    if (hook.active || player.gas < 1) return null;
    const hit = aim(side, assist);
    if (!hit) return null;
    hook.active = true; hook.object = hit.object; hook.local = hit.object.worldToLocal(hit.point.clone());
    hook.point.copy(hit.point); hook.length = Math.max(3, player.position.distanceTo(hit.point) * .65); hook.line.visible = true; player.gas -= .5;
    return hit;
  }
  function release(side) { const hook = hooks[side === -1 ? 0 : 1]; hook.active = false; hook.line.visible = false; hook.object = null; }
  function releaseAll() { release(-1); release(1); }

  // input: { move: [x, y], boost, jump, yaw, pitch }
  function step(dt, input) {
    const yaw = input.yaw; flown = hooks;
    for (const hook of hooks) if (hook.active) {
      if (!hook.object?.parent || !hook.object.visible) { hook.active = false; hook.line.visible = false; continue; }
      hook.object.updateWorldMatrix(true, false); hook.point.copy(hook.local).applyMatrix4(hook.object.matrixWorld);
    }
    const attached = hooks.some(h => h.active), boost = input.boost && attached && player.gas > 0;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)), right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const move = new THREE.Vector3().addScaledVector(right, input.move[0]).addScaledVector(forward, -input.move[1]);
    if (move.lengthSq() > 1) move.normalize();
    // On a cable in the air, sideways input swings around the anchor and
    // forward/back reels the cable; otherwise input steers relative to the camera.
    const swinging = attached && !player.grounded, anchor = new THREE.Vector3();
    if (swinging) { let n = 0; for (const hook of hooks) if (hook.active) { anchor.add(hook.point); n++; } anchor.divideScalar(n); }
    const orbit = swinging ? orbitControl(player.position.toArray(), anchor.toArray(), input.move) : null;
    const acc = new THREE.Vector3(0, -22, 0);
    if (orbit) acc.add(new THREE.Vector3(...orbit.acceleration)); else acc.addScaledVector(move, player.grounded ? 55 : 14);
    if (input.jump && player.grounded) { player.velocity.y = 10; player.grounded = false; }
    for (const hook of hooks) {
      if (!hook.active) continue;
      if (player.gas <= 0) { releaseAll(); break; }
      hook.length = Math.max(2.5, hook.length - dt * (boost ? 16 : 8) + dt * (orbit?.reel ?? 0));
      acc.add(new THREE.Vector3(...cableAcceleration(player.position.toArray(), player.velocity.toArray(), hook.point.toArray(), hook.length, boost)));
    }
    if (attached) { player.gas = Math.max(0, player.gas - dt * (boost ? 5 : 1.2)); if (boost) acc.addScaledVector(new THREE.Vector3(Math.sin(yaw) * Math.cos(input.pitch), Math.sin(input.pitch), -Math.cos(yaw) * Math.cos(input.pitch)), 16); }
    // Gas burst without cables only nudges the trajectory, never free flight.
    if (!attached && input.boost && !player.grounded && player.gas > 0) { acc.addScaledVector(move, 10); player.gas = Math.max(0, player.gas - dt * 3); }
    player.velocity.addScaledVector(acc, dt);
    const drag = Math.exp(-(player.grounded && !attached ? 7 : .28) * dt); player.velocity.x *= drag; player.velocity.z *= drag;
    if (player.velocity.length() > 58) player.velocity.setLength(58);
    const previous = player.position.clone(); player.position.addScaledVector(player.velocity, dt);
    const resolved = resolveMotion(previous.toArray(), player.position.toArray(), player.velocity.toArray(), colliders, player.grounded);
    player.position.fromArray(resolved.position); player.velocity.fromArray(resolved.velocity); player.grounded = resolved.grounded;
    if (player.position.y <= 0) { player.position.y = 0; if (player.velocity.y < 0) player.velocity.y = 0; player.grounded = true; }
    player.position.x = clamp(player.position.x, -bounds, bounds); player.position.z = clamp(player.position.z, -bounds, bounds);
    for (const hook of hooks) if (hook.active) {
      const from = origin(hook.side, yaw);
      hook.line.geometry.setFromPoints([from, hook.point]); hook.line.geometry.attributes.position.needsUpdate = true;
    } else hook.line.visible = false;
    return { attached, boost };
  }

  // True when an active cable is hooked somewhere inside root (a titan).
  function hookedTo(root) { return hooks.some(h => { if (!h.active) return false; for (let o = h.object; o; o = o.parent) if (o === root) return true; return false; }); }

  return { player, hooks, aim, attach, release, releaseAll, step, hookWorld, hookedTo };
}
