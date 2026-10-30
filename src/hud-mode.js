// "Tela limpa": during play the player can hide the secondary HUD (titles,
// details, hints) and keep only what the action needs. The choice persists.
export const HUD_KEY = 'hud.minimal';

export function loadMinimalHud(storage) {
  try { return storage?.getItem(HUD_KEY) === '1'; } catch { return false; }
}

export function saveMinimalHud(storage, on) {
  try { storage?.setItem(HUD_KEY, on ? '1' : '0'); return true; } catch { return false; }
}

// Wires the toggle button to body.hud-minimal.
export function bindHudToggle(button, body, storage) {
  const apply = on => { body.classList.toggle('hud-minimal', on); button.setAttribute('aria-pressed', String(on)); button.title = on ? 'Mostrar tudo' : 'Tela limpa'; };
  apply(loadMinimalHud(storage));
  button.addEventListener('click', () => { const on = !body.classList.contains('hud-minimal'); apply(on); saveMinimalHud(storage, on); });
}
