export function stick(x = 0, y = 0, deadzone = .18) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [0, 0];
  const length = Math.hypot(x, y);
  if (length <= deadzone) return [0, 0];
  const scale = (Math.min(1, length) - deadzone) / (1 - deadzone) / length;
  return [x * scale, y * scale];
}
const bindings = { jump: 0, release: 1, attack: 2, interact: 3, supply: 5, left: 6, right: 7, checkpoint: 8, menu: 9 };
const empty = () => ({ connected: false, armed: false, move: [0, 0], look: [0, 0], held: {}, pressed: {}, lost: false });

export function createGamepadInput() {
  let identity = null, previous = {}, armed = false;
  return {
    suspend() { armed = false; },
    sample(pads = []) {
      const pad = Array.from(pads ?? []).find(p => p && p.connected !== false && p.mapping === 'standard');
      const nextIdentity = pad ? `${pad.index}:${pad.id}` : null;
      const lost = identity !== null && identity !== nextIdentity;
      if (identity !== nextIdentity) { armed = false; previous = {}; identity = nextIdentity; }
      if (!pad) return { ...empty(), lost };
      const move = stick(pad.axes?.[0], pad.axes?.[1]), look = stick(pad.axes?.[2], pad.axes?.[3]);
      const buttons = Object.fromEntries(Object.entries(bindings).map(([name, index]) => [name, !!pad.buttons?.[index]?.pressed || (pad.buttons?.[index]?.value ?? 0) > .5]));
      const pressed = Object.fromEntries(Object.entries(buttons).map(([name, down]) => [name, down && !previous[name]]));
      previous = buttons;
      if (!Object.values(buttons).some(Boolean) && [...move, ...look].every(n => n === 0)) armed = true;
      const frame = { connected: true, armed, lost, move: armed ? move : [0, 0], look: armed ? look : [0, 0], held: armed ? buttons : {}, pressed: armed ? pressed : {} };
      // Menu actions remain available while gameplay waits for neutral controls.
      frame.pressed.menu = pressed.menu; frame.pressed.checkpoint = pressed.checkpoint;
      return frame;
    },
  };
}
