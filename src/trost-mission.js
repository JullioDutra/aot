import { createEscort, completedEscort, escortComplete, validEscort, escortPosition } from './civilian-escort.js';
export const CHECKPOINT_KEY = 'trost.operation.v1';
export const LOCATIONS = Object.freeze({ rescue: [-12, 0, 29], supply: [13, 0, 42], extraction: [0, 0, -139], start: [-25, 17, 65] });
export const createMission = () => ({ rescued: false, supplied: false, defeated: [], extracted: false, escort: null });
const near = (p, target, radius) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite) && Math.hypot(...p.map((v, i) => v - target[i])) < radius;

export function missionStage(s) {
  if (s.extracted) return 'complete';
  if (!s.rescued) return s.escort ? 'escort' : 'rescue';
  if (!s.supplied) return 'supply';
  if (s.defeated.length < 3) return 'combat';
  return 'extraction';
}
export function missionObjective(s) {
  const stage = missionStage(s);
  return {
    rescue: { title: 'Resgate os civis da praça', order: 1, detail: 'Aproxime-se do grupo e pressione G.', position: LOCATIONS.rescue, key: 'G' },
    escort: { title: 'Escolte os civis até o abrigo', order: 1, detail: 'Mantenha-se perto do grupo e afaste titãs da rota.', position: escortPosition(s.escort), key: 'ESCOLTA' },
    supply: { title: 'Recupere o abastecimento', order: 2, detail: 'Use R junto à caixa azul para preparar a retirada.', position: LOCATIONS.supply, key: 'R' },
    combat: { title: `Abra a rota · ${s.defeated.length} / 3 titãs`, order: 3, detail: 'Alcance a nuca por trás. O marcador acompanha o próximo alvo.', position: null, key: 'NUCA' },
    extraction: { title: 'Alcance o ponto de retirada', order: 4, detail: 'Chegue ao sinal verde diante do portão e pressione G.', position: LOCATIONS.extraction, key: 'G' },
    complete: { title: 'Operação concluída', order: 4, detail: 'Os civis foram encaminhados e a rota está livre.', position: null, key: '' },
  }[stage];
}

// Mission progression consumes validated gameplay events, never UI clicks alone.
export function advanceMission(state, event) {
  const next = structuredClone(state);
  if (state.extracted) return { state: next, changed: false, message: 'Operação já concluída.' };
  let message = '';
  if (event.type === 'rescue') {
    if (state.rescued) message = 'Os civis já foram encaminhados à evacuação.';
    else if (state.escort) message = 'O grupo já está em movimento. Acompanhe até o abrigo.';
    else if (!near(event.position, LOCATIONS.rescue, 9)) message = 'Aproxime-se dos civis na praça para usar G.';
    else { next.escort = createEscort(); message = 'Grupo reunido. Acompanhe os civis até o abrigo ao sul da praça.'; }
  } else if (event.type === 'escort-arrived') {
    if (!state.rescued && validEscort(state.escort) && escortComplete(state.escort)) { next.rescued = true; message = 'Três civis no abrigo. Prepare o equipamento na caixa azul.'; }
  } else if (event.type === 'supply') {
    if (!near(event.position, LOCATIONS.supply, 10)) message = 'Aproxime-se da caixa azul para reabastecer.';
    else if (!state.rescued) message = 'Equipamento pronto. Resgate os civis antes de preparar a retirada.';
    else if (!state.supplied) { next.supplied = true; message = 'Abastecimento recuperado. Abra a rota eliminando os titãs.'; }
    else message = 'Gás, lâminas e vitalidade restaurados.';
  } else if (event.type === 'defeat') {
    if (Number.isInteger(event.id) && event.id >= 0 && event.id < 3 && !state.defeated.includes(event.id)) {
      next.defeated.push(event.id); next.defeated.sort(); message = `Nuca atingida · ${next.defeated.length} / 3 titãs abatidos.`;
    }
  } else if (event.type === 'extract') {
    if (missionStage(state) !== 'extraction') message = 'Complete o resgate, o abastecimento e a limpeza da rota.';
    else if (!near(event.position, LOCATIONS.extraction, 9)) message = 'Chegue ao ponto de retirada diante do portão.';
    else { next.extracted = true; message = 'Retirada confirmada. Operação concluída.'; }
  }
  const changed = JSON.stringify(next) !== JSON.stringify(state);
  if (changed && missionStage(next) === 'extraction') message = 'Rota livre. Siga até o sinal verde diante do portão.';
  return { state: next, changed, message };
}

export function checkpointSpawn(mission) {
  if (!mission.rescued) {
    if (mission.escort) { const p = escortPosition(mission.escort); return [p[0] + 4, 0, p[2] + 3]; }
    return [...LOCATIONS.start];
  }
  if (missionStage(mission) === 'extraction' || mission.extracted) return [0, 0, -128];
  return [...LOCATIONS.supply];
}
export function createCheckpoint(mission, elapsed) {
  return { schema: 2, mission: { ...structuredClone(mission), escort: mission.escort ? { ...mission.escort } : mission.rescued ? completedEscort() : null }, elapsed };
}
export function parseCheckpoint(text) {
  try {
    if (typeof text !== 'string' || text.length > 2048) return null;
    const s = JSON.parse(text), m = s.mission;
    if (![1, 2].includes(s.schema) || !m || !Number.isFinite(s.elapsed) || s.elapsed < 0) return null;
    if (typeof m.rescued !== 'boolean' || typeof m.supplied !== 'boolean' || typeof m.extracted !== 'boolean') return null;
    if (!Array.isArray(m.defeated) || m.defeated.length > 3 || new Set(m.defeated).size !== m.defeated.length || !m.defeated.every(n => Number.isInteger(n) && n >= 0 && n < 3)) return null;
    if ((m.supplied && !m.rescued) || (m.extracted && (!m.supplied || m.defeated.length !== 3))) return null;
    const escort = s.schema === 1 ? (m.rescued ? completedEscort() : null) : m.escort;
    if (escort !== null && !validEscort(escort)) return null;
    if (m.rescued !== escortComplete(escort)) return null;
    return createCheckpoint({ escort, rescued: m.rescued, supplied: m.supplied, extracted: m.extracted, defeated: [...m.defeated].sort() }, s.elapsed);
  } catch { return null; }
}
export function loadCheckpoint(storage) {
  try { return parseCheckpoint(storage?.getItem(CHECKPOINT_KEY)); } catch { return null; }
}
export function saveCheckpoint(storage, checkpoint) {
  try {
    if (!storage || !parseCheckpoint(JSON.stringify(checkpoint))) return false;
    storage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint)); return true;
  } catch { return false; }
}
