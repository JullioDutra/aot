// Touch-only settings: button size, opacity, left-handed mirror and whether
// a cable tap latches. Pure load/save plus the small panel both pages show
// in their settings while the touch profile is active.
export const TOUCH_SETTINGS_KEY = 'touch.settings.v1';
export const TOUCH_DEFAULTS = Object.freeze({ size: 'm', opacity: 1, leftHanded: false, latch: true });
export const SIZE_SCALE = Object.freeze({ s: .86, m: 1, l: 1.14 });

export function normalizeTouchSettings(value) {
  const v = value && typeof value === 'object' ? value : {};
  const opacity = Number(v.opacity);
  return {
    size: Object.hasOwn(SIZE_SCALE, v.size) ? v.size : TOUCH_DEFAULTS.size,
    opacity: Number.isFinite(opacity) ? Math.min(1, Math.max(.4, opacity)) : TOUCH_DEFAULTS.opacity,
    leftHanded: typeof v.leftHanded === 'boolean' ? v.leftHanded : TOUCH_DEFAULTS.leftHanded,
    latch: typeof v.latch === 'boolean' ? v.latch : TOUCH_DEFAULTS.latch,
  };
}

export function loadTouchSettings(storage) {
  try { return normalizeTouchSettings(JSON.parse(storage?.getItem(TOUCH_SETTINGS_KEY) ?? 'null')); } catch { return { ...TOUCH_DEFAULTS }; }
}

export function saveTouchSettings(storage, settings) {
  try { storage?.setItem(TOUCH_SETTINGS_KEY, JSON.stringify(normalizeTouchSettings(settings))); return true; } catch { return false; }
}

// Builds the panel inside container and applies every change to controls.
export function mountTouchSettings(container, controls, storage) {
  let settings = loadTouchSettings(storage);
  controls.configure(settings);
  const panel = document.createElement('div'); panel.className = 'touch-settings';
  panel.innerHTML = `<span class="eyebrow">CONTROLES DE TOQUE</span>
    <label class="setting">Tamanho dos botões<select data-key="size"><option value="s">Pequeno</option><option value="m">Médio</option><option value="l">Grande</option></select></label>
    <label class="setting">Transparência<input data-key="opacity" type="range" min="0.4" max="1" step="0.1"/></label>
    <label class="setting">Canhoto (analógico à direita)<input data-key="leftHanded" type="checkbox"/></label>
    <label class="setting">Cabo fixo (tocar prende, tocar de novo solta)<input data-key="latch" type="checkbox"/></label>`;
  const field = key => panel.querySelector(`[data-key="${key}"]`);
  field('size').value = settings.size; field('opacity').value = String(settings.opacity);
  field('leftHanded').checked = settings.leftHanded; field('latch').checked = settings.latch;
  panel.addEventListener('input', () => {
    settings = normalizeTouchSettings({ size: field('size').value, opacity: field('opacity').value, leftHanded: field('leftHanded').checked, latch: field('latch').checked });
    controls.configure(settings); saveTouchSettings(storage, settings);
  });
  container.append(panel);
  return panel;
}
