import { resolveDecision } from '../campaign/canon.js';

// Pure script runner for story chapters. A script is a list of beats:
//   { type: 'mission', id, title }            sub-mission banner
//   { type: 'line', speaker, text, hold? }    dialogue; advances on input or after `hold` seconds
//   { type: 'objective', id, text, target: [x, z], radius }
//   { type: 'interact', id, text, target, radius, presses }   repeated action (e.g. lifting a beam)
//   { type: 'goal', id, text }                completed when the chapter reports the goal id
//   { type: 'choice', decision }              decision from the chapter data; options may add branch beats
//   { type: 'event', id, duration }           world event (camera shots, collapses, titans…)
//   { type: 'control', mode }                 'walk' | 'run' | 'none' | 'carried'
//   { type: 'fixed', id }                     marks a canonical, unpreventable event
//   { type: 'wait', duration }
//   { type: 'end' }
// The world executes events and reports the player position; the runner only
// decides what comes next.

export function createStoryState(script) {
  return { script, index: 0, timer: 0, presses: 0, choices: {}, log: [], control: 'walk', mission: null, finished: false, pending: [], started: null };
}

function beatAt(state) {
  return state.pending.length ? state.pending[0] : state.script[state.index];
}

function next(state) {
  if (state.pending.length) state.pending.shift(); else state.index++;
  state.timer = 0; state.presses = 0;
}

// input: { position: [x, z], advance: bool, interact: bool, choose: optionId|null }
// Returns { events: [...], ui } where ui describes what the page should show.
export function stepStory(state, dt, input = {}, decisions = {}) {
  const events = [];
  for (let guard = 0; guard < 64 && !state.finished; guard++) {
    const beat = beatAt(state);
    if (!beat) { state.finished = true; events.push({ kind: 'end' }); break; }
    state.timer += guard === 0 ? dt : 0;
    if (beat.type === 'mission') { state.mission = { id: beat.id, title: beat.title }; events.push({ kind: 'mission', id: beat.id, title: beat.title }); state.log.push(`mission:${beat.id}`); next(state); continue; }
    if (beat.type === 'control') { state.control = beat.mode; events.push({ kind: 'control', mode: beat.mode }); next(state); continue; }
    if (beat.type === 'fixed') { events.push({ kind: 'fixed', id: beat.id }); state.log.push(`fixed:${beat.id}`); next(state); continue; }
    if (beat.type === 'event') {
      if (state.started !== beat) { state.started = beat; events.push({ kind: 'event', id: beat.id, ...beat.params }); state.log.push(`event:${beat.id}`); }
      if (state.timer >= (beat.duration ?? 0)) { state.started = null; next(state); continue; }
      return { events, ui: { kind: 'event', id: beat.id, mission: state.mission } };
    }
    if (beat.type === 'wait') {
      if (state.timer >= beat.duration) { next(state); continue; }
      return { events, ui: { kind: 'wait', mission: state.mission } };
    }
    if (beat.type === 'line') {
      const minimum = Math.min(.35, beat.hold ?? .35);
      if ((input.advance && state.timer >= minimum) || (beat.hold !== undefined && state.timer >= beat.hold)) { state.log.push(`line:${beat.speaker}`); next(state); input = { ...input, advance: false }; continue; }
      return { events, ui: { kind: 'line', speaker: beat.speaker, text: beat.text, mission: state.mission, auto: beat.hold !== undefined } };
    }
    if (beat.type === 'objective') {
      const [x, z] = input.position ?? [Infinity, Infinity];
      if (Math.hypot(x - beat.target[0], z - beat.target[1]) <= beat.radius) { events.push({ kind: 'objective-complete', id: beat.id }); state.log.push(`objective:${beat.id}`); next(state); continue; }
      return { events, ui: { kind: 'objective', id: beat.id, text: beat.text, target: beat.target, mission: state.mission } };
    }
    if (beat.type === 'goal') {
      // Completed by the chapter itself (survive a charge, bring a boss down).
      if (input.goals?.has?.(beat.id)) { events.push({ kind: 'objective-complete', id: beat.id }); state.log.push(`goal:${beat.id}`); next(state); continue; }
      return { events, ui: { kind: 'goal', id: beat.id, text: beat.text, target: beat.target ?? null, mission: state.mission } };
    }
    if (beat.type === 'interact') {
      const [x, z] = input.position ?? [Infinity, Infinity];
      const near = Math.hypot(x - beat.target[0], z - beat.target[1]) <= beat.radius;
      if (near && input.interact) { state.presses++; events.push({ kind: 'interact', id: beat.id, presses: state.presses }); input = { ...input, interact: false }; }
      if (state.presses >= (beat.presses ?? 1)) { state.log.push(`interact:${beat.id}`); next(state); continue; }
      return { events, ui: { kind: 'interact', id: beat.id, text: beat.text, target: beat.target, near, presses: state.presses, needed: beat.presses ?? 1, mission: state.mission } };
    }
    if (beat.type === 'choice') {
      const decision = decisions[beat.decision];
      if (!decision) { next(state); continue; }
      if (input.choose) {
        const result = resolveDecision(decision, input.choose);
        state.choices[decision.id] = result.option; state.log.push(`choice:${decision.id}:${result.option}`);
        events.push({ kind: 'choice', id: decision.id, option: result.option, reflection: result.reflection, outcome: result.outcome });
        const branch = beat.branches?.[result.option] ?? [];
        next(state); state.pending.push(...branch); input = { ...input, choose: null };
        continue;
      }
      return { events, ui: { kind: 'choice', id: decision.id, prompt: decision.prompt, options: decision.options.map(o => ({ id: o.id, label: o.label })), mission: state.mission } };
    }
    if (beat.type === 'end') { state.finished = true; events.push({ kind: 'end' }); break; }
    next(state);
  }
  return { events, ui: { kind: state.finished ? 'end' : 'none', mission: state.mission } };
}

// Static checks used by tests: every choice references a decision of the
// chapter, all branches rejoin the main script and the script ends.
export function validateScript(script, chapter) {
  const errors = [];
  const decisionIds = new Set(chapter.decisions.map(d => d.id));
  const used = new Set();
  for (const beat of script) {
    if (beat.type === 'choice') {
      if (!decisionIds.has(beat.decision)) errors.push(`decisão desconhecida ${beat.decision}`);
      used.add(beat.decision);
      for (const branch of Object.values(beat.branches ?? {})) if (branch.some(b => ['choice', 'end'].includes(b.type))) errors.push(`ramo de ${beat.decision} não pode decidir nem encerrar`);
    }
    if (beat.type === 'line' && (!beat.speaker || !beat.text)) errors.push('fala sem personagem ou texto');
  }
  for (const id of decisionIds) if (!used.has(id)) errors.push(`decisão ${id} sem uso no roteiro`);
  if (script.at(-1)?.type !== 'end') errors.push('roteiro sem fim');
  const fixedDeaths = chapter.fixed.filter(f => f.kind === 'death').map(f => f.who);
  for (const who of fixedDeaths) if (!script.some(b => b.type === 'fixed' && b.id === `morte-${who}`)) errors.push(`morte de ${who} não encenada no roteiro`);
  return errors;
}
