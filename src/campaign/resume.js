// Where the player stopped inside a story chapter, kept in this browser so a
// reload or a closed tab picks up at the last sub-mission instead of the
// chapter's first line. Pure: storage is passed in and invalid data is ignored.
export const RESUME_KEY = 'aot.story.resume.v1';

// checkpoint: { index, mission, snapshot } as the story page records it.
export function createResume(number, checkpoint, choices = {}, elapsed = 0) {
  return {
    version: 1, number, index: checkpoint.index, mission: checkpoint.mission ?? null,
    snapshot: checkpoint.snapshot ?? null, choices: { ...choices }, elapsed: Math.max(0, Math.round(elapsed)),
  };
}

export function loadResume(storage) {
  try {
    const r = JSON.parse(storage?.getItem(RESUME_KEY) ?? 'null');
    if (!r || r.version !== 1 || !Number.isInteger(r.number) || r.number < 1 || r.number > 47) return null;
    if (!Number.isInteger(r.index) || r.index < 0 || typeof r.choices !== 'object' || r.choices === null) return null;
    if (r.mission !== null && (typeof r.mission?.id !== 'string' || typeof r.mission?.title !== 'string')) return null;
    if (r.snapshot !== null && typeof r.snapshot !== 'object') return null;
    return { ...r, elapsed: Number.isFinite(r.elapsed) ? Math.max(0, r.elapsed) : 0 };
  } catch {
    return null;
  }
}

export function saveResume(storage, resume) {
  try { storage?.setItem(RESUME_KEY, JSON.stringify(resume)); return true; } catch { return false; }
}

export function clearResume(storage) {
  try { storage?.removeItem(RESUME_KEY); return true; } catch { return false; }
}

// World beats before the resume point, replayed so the chapter's world (a
// broken gate, collapsed houses) matches; and the control mode in force there.
export function replayBeats(script, index) {
  return script.slice(0, index).filter(b => b.type === 'event' || b.type === 'fixed' || b.type === 'control')
    .map(b => (b.type === 'event' ? { kind: 'event', id: b.id, ...b.params } : b.type === 'fixed' ? { kind: 'fixed', id: b.id } : { kind: 'control', mode: b.mode }));
}

export function controlAt(script, index) {
  let mode = 'walk';
  for (const b of script.slice(0, index)) if (b.type === 'control') mode = b.mode;
  return mode;
}

// The chapter the "Continuar" link should open: the one in progress, else the
// first open chapter not yet completed, else the first chapter.
export function continueTarget(resume, progress, chapters) {
  if (resume) return { number: resume.number, mission: resume.mission?.title ?? null };
  const next = chapters.find(c => c.status === 'playable' && !progress.completed?.[c.number]);
  return { number: next?.number ?? chapters[0]?.number ?? 1, mission: null };
}
