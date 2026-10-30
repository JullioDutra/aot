import { emptyFrame } from './platform.js';

// On-screen controls for phones and tablets. The left thumb owns a floating
// analog stick, the right side of the screen turns the camera by dragging, and
// context buttons sit under the right thumb. sample() returns the same frame
// shape as gamepad-input.js so pages merge both sources without branching.
export const STICK_RADIUS = 56;

export function stickVector(origin, point, radius = STICK_RADIUS) {
  const dx = point[0] - origin[0], dy = point[1] - origin[1], length = Math.hypot(dx, dy);
  if (length < radius * .12) return [0, 0];
  const scale = Math.min(1, length / radius) / length;
  return [dx * scale, dy * scale];
}

// Latched buttons (the cables on touch): a tap fires and holds without the
// finger, a second tap lets go. Only the firing tap is a press, so letting go
// never asks the game to fire again.
export function latchTap(latched) { return { latched: !latched, press: !latched }; }
// The game drops a cable on its own (no anchor, gas out, titan dead); the
// button follows so the next tap fires again.
export function latchSync(latched, active) { return latched && !!active; }

// A finger that started on a drag button presses a slide target (the blade)
// when it enters one; staying on it or coming back to the start does not.
export function slideEntry(previous, current, targets) { return current !== previous && targets.includes(current) ? current : null; }

// Capture keeps a finger bound to its control when it slides off; it may fail
// for pointers the browser no longer tracks, which must not drop the input.
function capture(element, id) { try { element.setPointerCapture?.(id); } catch { /* Input still works without capture. */ } }
// Short haptic tick where the device supports it; silently ignored elsewhere.
function buzz(ms) { try { navigator.vibrate?.(ms); } catch { /* No vibration support. */ } }

// layout: 'odm' places the buttons for two thumbs (touch-controls.css);
// without it the buttons keep the compact grid (arena).
export function createTouchControls({ root, buttons, layout = '' }) {
  const element = document.createElement('div');
  element.className = `touch-controls${layout ? ` touch-${layout}` : ''}`; element.hidden = true; element.setAttribute('aria-hidden', 'true');
  const stickZone = document.createElement('div'); stickZone.className = 'touch-stick-zone';
  const base = document.createElement('div'); base.className = 'touch-stick'; base.hidden = true;
  const knob = document.createElement('i'); base.append(knob); stickZone.append(base);
  const lookZone = document.createElement('div'); lookZone.className = 'touch-look-zone';
  const pad = document.createElement('div'); pad.className = 'touch-buttons';
  element.append(lookZone, stickZone, pad);
  const held = new Set(), down = new Set(), latches = new Map(), context = new Map(), clearers = [], drags = new Map();
  let stick = null, look = null, move = [0, 0], lookDelta = [0, 0], previous = new Set();

  for (const spec of buttons) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `touch-button ${spec.className ?? ''}`; button.dataset.action = spec.action;
    button.textContent = spec.label;
    const pointers = new Set();
    if (spec.latch) latches.set(spec.action, button);
    // Context buttons show only while the page says they apply.
    if (spec.context) { context.set(spec.action, button); button.classList.add('off'); }
    // A clearing button (SOLTAR) lets go of latched cables and shows only while one holds.
    if (spec.clears) { clearers.push({ button, actions: spec.clears }); button.classList.add('off'); }
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); event.stopPropagation();
      // Drag buttons (GÁS, CABO ▶) keep their action and turn the camera as the finger slides.
      if (spec.drag) { capture(button, event.pointerId); drags.set(event.pointerId, { last: [event.clientX, event.clientY], over: spec.action }); }
      if (spec.clears) for (const action of spec.clears) { held.delete(action); latches.get(action)?.classList.remove('latched'); }
      if (spec.latch) {
        const tap = latchTap(held.has(spec.action));
        if (tap.press) { held.add(spec.action); down.add(spec.action); } else held.delete(spec.action);
        button.classList.toggle('latched', tap.latched); buzz(tap.press ? 10 : 6);
        return;
      }
      capture(button, event.pointerId);
      pointers.add(event.pointerId); held.add(spec.action); down.add(spec.action); button.classList.add('active'); buzz(10);
    });
    button.addEventListener('pointermove', event => {
      const drag = drags.get(event.pointerId); if (!drag) return;
      lookDelta[0] += event.clientX - drag.last[0]; lookDelta[1] += event.clientY - drag.last[1]; drag.last = [event.clientX, event.clientY];
      const over = document.elementFromPoint(event.clientX, event.clientY)?.closest('.touch-button')?.dataset.action ?? null;
      const press = slideEntry(drag.over, over, spec.slideTo ?? []); drag.over = over;
      if (press) { down.add(press); buzz(10); }
    });
    const up = event => {
      drags.delete(event.pointerId);
      if (spec.latch) return;
      pointers.delete(event.pointerId);
      if (!pointers.size) { held.delete(spec.action); button.classList.remove('active'); }
    };
    button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up);
    pad.append(button);
  }

  stickZone.addEventListener('pointerdown', event => {
    if (stick) return;
    event.preventDefault(); capture(stickZone, event.pointerId);
    const rect = stickZone.getBoundingClientRect();
    stick = { id: event.pointerId, origin: [event.clientX, event.clientY] };
    base.hidden = false; base.style.left = `${event.clientX - rect.left}px`; base.style.top = `${event.clientY - rect.top}px`;
  });
  stickZone.addEventListener('pointermove', event => {
    if (stick?.id !== event.pointerId) return;
    move = stickVector(stick.origin, [event.clientX, event.clientY]);
    knob.style.transform = `translate(${move[0] * STICK_RADIUS}px, ${move[1] * STICK_RADIUS}px)`;
  });
  const endStick = event => {
    if (stick?.id !== event.pointerId) return;
    stick = null; move = [0, 0]; base.hidden = true; knob.style.transform = '';
  };
  stickZone.addEventListener('pointerup', endStick); stickZone.addEventListener('pointercancel', endStick);

  lookZone.addEventListener('pointerdown', event => {
    if (look) return;
    event.preventDefault(); capture(lookZone, event.pointerId);
    look = { id: event.pointerId, last: [event.clientX, event.clientY] };
  });
  lookZone.addEventListener('pointermove', event => {
    if (look?.id !== event.pointerId) return;
    lookDelta[0] += event.clientX - look.last[0]; lookDelta[1] += event.clientY - look.last[1];
    look.last = [event.clientX, event.clientY];
  });
  const endLook = event => { if (look?.id === event.pointerId) look = null; };
  lookZone.addEventListener('pointerup', endLook); lookZone.addEventListener('pointercancel', endLook);

  root.append(element);
  return {
    element,
    setVisible(visible) { element.hidden = !visible; if (!visible) this.suspend(); },
    // One-frame press from another on-screen element (the finisher prompt).
    press(action) { if (element.hidden) return; down.add(action); buzz(25); },
    // active: { action: cable still hooked } from the page after each step.
    sync(active) {
      for (const [action, button] of latches) {
        if (!held.has(action) || latchSync(true, active?.[action])) continue;
        held.delete(action); button.classList.remove('latched');
      }
      for (const c of clearers) c.button.classList.toggle('off', !c.actions.some(a => held.has(a)));
    },
    setAvailable(map) { for (const [action, on] of Object.entries(map)) context.get(action)?.classList.toggle('off', !on); },
    suspend() {
      held.clear(); down.clear(); drags.clear(); previous = new Set(); stick = null; look = null; move = [0, 0]; lookDelta = [0, 0];
      base.hidden = true; knob.style.transform = '';
      for (const b of pad.children) b.classList.remove('active', 'latched');
    },
    sample() {
      const frame = emptyFrame();
      if (element.hidden) return frame;
      frame.armed = true; frame.move = [...move]; frame.lookDelta = lookDelta; lookDelta = [0, 0];
      for (const action of held) frame.held[action] = true;
      // A tap shorter than one frame still registers through the down set.
      for (const action of down) { frame.pressed[action] = true; if (!held.has(action) && !previous.has(action)) frame.held[action] = true; }
      down.clear(); previous = new Set(held);
      return frame;
    },
  };
}
