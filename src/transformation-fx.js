import * as THREE from 'three';
import { lightningBolt, transformationPhase } from './transformation.js';

// Straight segments between the displaced points keep the bolt jagged.
class Polyline extends THREE.Curve {
  constructor(points) { super(); this.points = points; }
  getPoint(t, target = new THREE.Vector3()) {
    const n = this.points.length - 1, x = Math.min(n - 1e-6, t * n), i = Math.floor(x);
    return target.copy(this.points[i]).lerp(this.points[i + 1], x - i);
  }
}

// Visuals for a transformation: branching bolts from the sky, a core flash,
// a ground shock ring, a scorch mark and a steam column. update() takes the
// seconds since the wound so pause and restart stay in the caller's hands.
export function createTransformationFx(scene, { height = 15, duration = 2.2 } = {}) {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  // The core stays opaque-white so the bolt reads against a bright sky; the
  // additive halo gives the yellow glow of the anime's lightning.
  const glow = new THREE.MeshBasicMaterial({ color: '#fffbe8', transparent: true, depthWrite: false, fog: false });
  const halo = new THREE.MeshBasicMaterial({ color: '#ffc94a', transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const bolts = new THREE.Group(); group.add(bolts);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 64), new THREE.MeshBasicMaterial({ color: '#f3e3b9', transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .08; group.add(ring);
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#2d241d', transparent: true, depthWrite: false }));
  scorch.rotation.x = -Math.PI / 2; scorch.position.y = .05; group.add(scorch);
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glow); group.add(core);
  const steamMaterial = new THREE.MeshBasicMaterial({ color: '#efeee6', transparent: true, depthWrite: false });
  // A point light would add per-pixel cost to every material in the scene;
  // the page's screen flash and the additive halo carry the brightness.
  const puffs = Array.from({ length: 14 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), steamMaterial.clone()); m.userData.seed = i; group.add(m); return m;
  });
  let seed = 1;

  function rebuild(nextSeed) {
    seed = nextSeed;
    for (const child of [...bolts.children]) { child.geometry.dispose(); bolts.remove(child); }
    const sky = height * 3.2;
    // Two strikes: the main channel to the wound plus a secondary one nearby.
    const paths = [...lightningBolt(seed, [height * .1, sky, -height * .15], [0, 1.2, 0], { branches: 5 }),
      ...lightningBolt(seed + 7, [-height * .5, sky * .9, height * .3], [height * .12, 0, height * .08], { branches: 2, depth: 5 })];
    for (const path of paths) {
      const curve = new Polyline(path.points.map(p => new THREE.Vector3(...p)));
      const segments = path.points.length - 1;
      const radius = Math.max(.12, height * .026 * path.width);
      bolts.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 5), glow));
      bolts.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius * 2.3, 6), halo));
    }
  }

  return {
    group,
    start(position, nextSeed = Math.floor(Math.random() * 1e6)) { group.position.copy(position); rebuild(nextSeed); group.visible = true; },
    stop() { group.visible = false; },
    update(elapsed) {
      if (!group.visible) return null;
      const p = transformationPhase(elapsed, duration);
      bolts.visible = p.bolt > 0;
      // Flicker: the bolt strobes a few times like a real discharge.
      const flicker = p.bolt > 0 ? (Math.sin(elapsed * 90) > -.3 ? 1 : .25) : 0;
      glow.opacity = Math.min(1, p.bolt * 1.4) * flicker; halo.opacity = .45 * p.bolt * flicker;
      core.visible = p.flash > 0 || p.spark > 0; core.scale.setScalar(height * (.04 + p.flash * .3) + p.spark * .3); core.position.y = height * .1 + p.flash * height * .2;
      ring.visible = p.shock > 0 && p.shock < 1; ring.scale.setScalar(.5 + p.shock * height * 2.2); ring.material.opacity = (1 - p.shock) * .8;
      scorch.visible = p.shock > 0; scorch.scale.setScalar(height * .6); scorch.material.opacity = Math.min(.55, p.shock * 2) * (p.steam > 0 ? 1 : .5);
      for (const puff of puffs) {
        const i = puff.userData.seed, a = i * 2.4, rise = (elapsed * 3 + i * .7) % (height * 1.4);
        puff.visible = p.steam > 0;
        puff.position.set(Math.cos(a) * height * (.15 + (i % 5) * .05), rise, Math.sin(a) * height * (.15 + (i % 4) * .05));
        puff.scale.setScalar(height * (.06 + (i % 3) * .025) * (1 + rise / height));
        puff.material.opacity = p.steam * .2 * (1 - rise / (height * 1.4));
      }
      return p;
    },
    dispose() { this.stop(); for (const child of [...bolts.children]) child.geometry.dispose(); scene.remove(group); },
  };
}
