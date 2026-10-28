export const GRAPHICS_KEY = 'trost.graphics.v1';
export const GRAPHICS_PROFILES = Object.freeze({
  high: Object.freeze({ pixelRatio: 1.6, shadows: 2048, bump: true, anisotropy: 8 }),
  medium: Object.freeze({ pixelRatio: 1.1, shadows: 1024, bump: true, anisotropy: 4 }),
  low: Object.freeze({ pixelRatio: .8, shadows: 0, bump: false, anisotropy: 1 }),
});
const valid = value => Object.hasOwn(GRAPHICS_PROFILES, value);
export function loadGraphicsQuality(storage) {
  try { const value = storage?.getItem(GRAPHICS_KEY); return valid(value) ? value : 'high'; } catch { return 'high'; }
}

export function createGraphicsQuality({ renderer, scene, light, storage, pixelRatio = () => 1 }) {
  const originalBumps = new WeakMap();
  let current = loadGraphicsQuality(storage), persisted = false, bumpMaterials = 0;
  try { persisted = storage?.getItem(GRAPHICS_KEY) === current; } catch { /* Session settings remain usable. */ }
  function apply(value = current, save = true) {
    current = valid(value) ? value : 'high';
    const profile = GRAPHICS_PROFILES[current];
    const ratio = Math.min(Math.max(.5, pixelRatio() || 1), profile.pixelRatio);
    if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
    const shadowChanged = renderer.shadowMap.enabled !== !!profile.shadows;
    renderer.shadowMap.enabled = !!profile.shadows;
    const resizeShadow = profile.shadows && light.shadow.mapSize.x !== profile.shadows;
    if (!profile.shadows || resizeShadow) {
      light.shadow.map?.dispose(); light.shadow.map = null;
      light.shadow.mapPass?.dispose(); light.shadow.mapPass = null;
    }
    if (profile.shadows) light.shadow.mapSize.set(profile.shadows, profile.shadows);
    const materials = new Set(), textures = new Set();
    scene.traverse(object => {
      if (object.material) for (const m of Array.isArray(object.material) ? object.material : [object.material]) materials.add(m);
    });
    bumpMaterials = 0;
    for (const material of materials) {
      if (!originalBumps.has(material)) originalBumps.set(material, material.bumpMap ?? null);
      const original = originalBumps.get(material);
      if (original) {
        const map = profile.bump ? original : null;
        if (material.bumpMap !== map) { material.bumpMap = map; material.needsUpdate = true; }
        if (map) bumpMaterials++;
        textures.add(original);
      }
      if (material.map) textures.add(material.map);
      if (shadowChanged) material.needsUpdate = true;
    }
    const anisotropy = Math.min(profile.anisotropy, renderer.capabilities.getMaxAnisotropy());
    for (const texture of textures) if (texture.anisotropy !== anisotropy) { texture.anisotropy = anisotropy; texture.needsUpdate = true; }
    if (save) {
      try { storage?.setItem(GRAPHICS_KEY, current); persisted = !!storage; } catch { persisted = false; }
    }
    return snapshot();
  }
  function snapshot() {
    return { quality: current, persisted, pixelRatio: renderer.getPixelRatio(), shadows: renderer.shadowMap.enabled,
      shadowSize: renderer.shadowMap.enabled ? light.shadow.mapSize.x : 0, bumpMaterials };
  }
  apply(current, false);
  return { apply, snapshot };
}
