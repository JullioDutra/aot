import * as THREE from 'three';
import { seeded } from '../transformation.js';

// Rules for chapter 32 kept apart from rendering so tests can check them.
export const BEAST_ORDER = Object.freeze(['braco-esq', 'braco-dir', 'olhos', 'perna-esq', 'perna-dir']);

// World positions of the parts Levi cuts: forearms, eyes, the back of the
// knees and the nape. Depth and position matter, not equipment rarity.
export function beastZones(beast) {
  const at = (object, offset = [0, 0, 0]) => { const v = new THREE.Vector3(...offset); object.localToWorld(v); return v; };
  beast.root.updateWorldMatrix(true, true);
  return [
    { id: 'braco-esq', position: at(beast.elbows[0], [0, -.12, 0]) },
    { id: 'braco-dir', position: at(beast.elbows[1], [0, -.12, 0]) },
    { id: 'olhos', position: at(beast.head, [0, .01, .06]) },
    { id: 'perna-esq', position: at(beast.knees[0], [0, 0, -.03]) },
    { id: 'perna-dir', position: at(beast.knees[1], [0, 0, -.03]) },
    { id: 'nuca', position: at(beast.nape) },
  ];
}

// Shrapnel targets for one barrage. The Beast aims at the formation and at
// the player; a flare fired during the windup blinds him and widens the
// spread, which is how the charge survives long enough.
export function barrageTargets({ seed, player, riders = [], flared = false, count = 24 }) {
  const rand = seeded(seed);
  const spread = flared ? 26 : 11;
  const targets = [];
  for (let i = 0; i < count; i++) {
    const aimAtPlayer = i % 4 === 0;
    const base = aimAtPlayer || !riders.length ? player : riders[Math.floor(rand() * riders.length)];
    const angle = rand() * Math.PI * 2, distance = Math.sqrt(rand()) * spread * (aimAtPlayer ? 1 : .6);
    targets.push([base[0] + Math.cos(angle) * distance, base[1] - 4 + Math.sin(angle) * distance]);
  }
  return targets;
}
