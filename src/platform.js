// Input profile, frame merging and fullscreen helpers shared by every page.
// Pure functions receive capabilities instead of reading globals, so the
// rules stay testable in Node.

export const PROFILES = Object.freeze(['keyboard', 'gamepad', 'touch']);

export function initialProfile({ coarsePointer = false, maxTouchPoints = 0, hover = true } = {}) {
  return coarsePointer && maxTouchPoints > 0 && !hover ? 'touch' : 'keyboard';
}

// The most recent input source wins, so a player can pick up a controller or
// touch the screen mid-session and the prompts follow immediately.
export function nextProfile(current, event) {
  if (event === 'touch') return 'touch';
  if (event === 'gamepad') return 'gamepad';
  if (event === 'keyboard' || event === 'mouse') return 'keyboard';
  return PROFILES.includes(current) ? current : 'keyboard';
}

export function emptyFrame() {
  return { connected: false, armed: false, lost: false, move: [0, 0], look: [0, 0], lookDelta: [0, 0], held: {}, pressed: {} };
}

// Combines a physical controller frame with the on-screen touch frame.
// Analog vectors are summed and clamped; buttons are OR-ed.
export function mergeFrames(pad, touch) {
  const a = { ...emptyFrame(), ...pad }, b = { ...emptyFrame(), ...touch };
  const sum = (u, v) => {
    const x = u[0] + v[0], y = u[1] + v[1], length = Math.hypot(x, y);
    return length > 1 ? [x / length, y / length] : [x, y];
  };
  const or = (u, v) => {
    const out = { ...u };
    for (const [name, value] of Object.entries(v)) out[name] = !!(out[name] || value);
    return out;
  };
  return {
    connected: a.connected, armed: a.armed || b.armed, lost: a.lost,
    move: sum(a.move, b.move), look: sum(a.look, b.look),
    lookDelta: [a.lookDelta[0] + b.lookDelta[0], a.lookDelta[1] + b.lookDelta[1]],
    held: or(a.held, b.held), pressed: or(a.pressed, b.pressed),
  };
}

// Touch devices start on the performance profile unless the player saved
// another choice; desktop keeps the existing default.
export function defaultQuality(profile, saved) {
  if (saved) return saved;
  return profile === 'touch' ? 'low' : 'high';
}

export function fullscreenState(doc) {
  const supported = !!(doc?.fullscreenEnabled || doc?.webkitFullscreenEnabled);
  const active = !!(doc?.fullscreenElement || doc?.webkitFullscreenElement);
  return { supported, active };
}

export async function toggleFullscreen(doc, element) {
  const { supported, active } = fullscreenState(doc);
  if (!supported) return false;
  try {
    if (active) await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    else await (element.requestFullscreen?.({ navigationUI: 'hide' }) ?? element.webkitRequestFullscreen?.());
    return true;
  } catch {
    return false;
  }
}

// Short, consistent prompt labels per profile. Pages pick the action names
// they use; unknown actions fall back to the keyboard label.
export const PROMPTS = Object.freeze({
  keyboard: { move: 'WASD', look: 'Mouse', left: 'Q', right: 'E', jump: 'Espaço', attack: 'Clique', interact: 'G', supply: 'R', release: 'Q+E', menu: 'Esc', fullscreen: 'F',
    transform: 'T', light: 'Clique', heavy: 'Q', guard: 'Botão dir.', dodge: 'Espaço', grab: 'F', regenerate: 'R', exit: 'E', lock: 'Tab', advance: 'Espaço', choose: '1 / 2 / 3', run: 'Shift' },
  gamepad: { move: 'LS', look: 'RS', left: 'LT/L2', right: 'RT/R2', jump: 'A/×', attack: 'X/□', interact: 'Y/△', supply: 'RB/R1', release: 'B/○', menu: 'Start', fullscreen: '—',
    transform: 'RB/R1', light: 'X/□', heavy: 'Y/△', guard: 'LT/L2', dodge: 'A/×', grab: 'LB/L1', regenerate: 'RT/R2', exit: 'B/○', lock: 'R3', advance: 'A/×', choose: 'Direcional + A/×', run: 'B/○' },
  touch: { move: 'Analógico esq.', look: 'Arrastar à direita', left: '◀ Cabo', right: 'Cabo ▶', jump: 'Gás', attack: 'Lâmina', interact: 'Agir', supply: 'Abastecer', release: 'Soltar', menu: 'Ⅱ', fullscreen: '⛶',
    transform: 'Titã', light: 'Soco', heavy: 'Forte', guard: 'Defesa', dodge: 'Esquiva', grab: 'Agarrar', regenerate: 'Regenerar', exit: 'Sair', lock: 'Alvo', advance: 'Toque', choose: 'Toque na opção', run: 'Correr' },
});

export function prompt(profile, action) {
  return PROMPTS[profile]?.[action] ?? PROMPTS.keyboard[action] ?? action;
}

// Trost texts were written with keyboard keys; other profiles get their own
// labels without duplicating every message.
export function localizeKeys(text, profile) {
  if (profile === 'keyboard' || !PROMPTS[profile]) return text;
  const p = action => PROMPTS[profile][action];
  const verb = v => ({ pressione: 'use', Pressione: 'Use' })[v] ?? v;
  return text
    .replace(/\b(pressione|Pressione|com|Use|use) G\b/g, (_, v) => `${verb(v)} ${p('interact')}`)
    .replace(/\b(pressione|Pressione|com|Use|use) R\b/g, (_, v) => `${verb(v)} ${p('supply')}`)
    .replace(/\bQ\/E\b/g, `${p('left')} / ${p('right')}`);
}
