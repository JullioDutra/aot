import { CHARACTERS, aliveIn, powerAvailable } from './characters.js';

export const MISSION_KINDS = Object.freeze(['narrative', 'explore', 'escape', 'escort', 'tutorial', 'odm', 'combat', 'titan', 'boss', 'puzzle', 'ride', 'chase', 'defense', 'stealth']);
export const STATUSES = Object.freeze(['playable', 'prototype', 'planned']);
// Wording that would promise to change a fixed outcome.
const FALSE_RESCUE = /\b(salvar|impedir|evitar)\b.*\b(morte|morrer|devorad)/i;

// Returns a list of human-readable problems; an empty list means the plan
// respects the fidelity commitments: who is alive, what they know how to do,
// fixed deaths staged where they happen and decisions that always converge.
export function validateCampaign(chapters, acts, roster = CHARACTERS) {
  const errors = [];
  const fail = (chapter, message) => errors.push(`Fase ${chapter.number} (${chapter.id}): ${message}`);
  const actIds = new Set(acts.map(a => a.id));
  let previousAct = 0;
  chapters.forEach((chapter, index) => {
    if (chapter.number !== index + 1) fail(chapter, `numeração fora de ordem (esperado ${index + 1})`);
    if (!actIds.has(chapter.act)) fail(chapter, `ato ${chapter.act} inexistente`);
    if (chapter.act < previousAct) fail(chapter, 'ato anterior ao da fase precedente');
    previousAct = chapter.act;
    if (!STATUSES.includes(chapter.status)) fail(chapter, `status inválido ${chapter.status}`);
    const present = new Set(chapter.present);
    const flashback = new Set(chapter.flashback ?? []);
    for (const id of chapter.present) {
      if (!roster[id]) fail(chapter, `personagem desconhecido ${id}`);
      else if (!aliveIn(id, chapter.number, flashback.has(id))) fail(chapter, `${id} já morreu e não está em flashback`);
    }
    for (const id of chapter.pov) if (!present.has(id)) fail(chapter, `ponto de vista ${id} não está presente`);
    for (const [id, powers] of Object.entries(chapter.powers)) {
      if (!present.has(id)) fail(chapter, `${id} usa poderes sem estar presente`);
      for (const power of powers) if (!powerAvailable(id, power, chapter.number)) fail(chapter, `${id} não possui ${power} nesta fase`);
    }
    const missionIds = new Set();
    if (!chapter.missions.length) fail(chapter, 'sem sub-fases');
    for (const mission of chapter.missions) {
      if (missionIds.has(mission.id)) fail(chapter, `sub-fase repetida ${mission.id}`);
      missionIds.add(mission.id);
      if (!MISSION_KINDS.includes(mission.kind)) fail(chapter, `tipo de sub-fase inválido ${mission.kind}`);
    }
    const deaths = chapter.fixed.filter(f => f.kind === 'death');
    for (const d of deaths) {
      if (!roster[d.who]) fail(chapter, `morte de personagem desconhecido ${d.who}`);
      else if (roster[d.who].death !== chapter.number) fail(chapter, `morte de ${d.who} fora da fase canônica (${roster[d.who].death})`);
      if (!present.has(d.who)) fail(chapter, `${d.who} morre sem estar presente`);
      if (!d.staging) fail(chapter, `morte de ${d.who} sem encenação`);
    }
    for (const decision of chapter.decisions) {
      if (decision.options.length < 2) fail(chapter, `decisão ${decision.id} com menos de duas opções`);
      if (!decision.resolves) fail(chapter, `decisão ${decision.id} sem desfecho único`);
      for (const option of decision.options) {
        if (!option.label || !option.reflection) fail(chapter, `opção ${option.id} sem texto ou reflexão`);
        if (deaths.length && FALSE_RESCUE.test(option.label)) fail(chapter, `opção ${option.id} promete evitar uma morte fixa`);
      }
    }
  });
  for (const [id, character] of Object.entries(roster)) {
    if (character.death === undefined) continue;
    const staged = chapters.find(c => c.number === character.death)?.fixed.some(f => f.kind === 'death' && f.who === id);
    if (!staged) errors.push(`Personagem ${id}: morte canônica na fase ${character.death} sem encenação`);
  }
  return errors;
}

// Every option of a decision leads to the same next state.
export function resolveDecision(decision, optionId) {
  const option = decision.options.find(o => o.id === optionId) ?? decision.options[0];
  return { option: option.id, reflection: option.reflection, outcome: decision.resolves };
}

export function campaignStats(chapters) {
  const count = key => chapters.reduce((sum, c) => sum + c[key].length, 0);
  return {
    chapters: chapters.length, missions: count('missions'), challenges: count('challenges'), decisions: count('decisions'),
    fixedDeaths: chapters.reduce((sum, c) => sum + c.fixed.filter(f => f.kind === 'death').length, 0),
    playable: chapters.filter(c => c.status === 'playable').length,
  };
}
