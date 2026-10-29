// Story progress stored in this browser only. Invalid or foreign data is
// ignored instead of breaking the chapter select.
export const PROGRESS_KEY = 'aot.story.v1';

export function emptyProgress() {
  return { version: 1, completed: {}, decisions: {}, challenges: {}, survivors: {} };
}

export function loadProgress(storage) {
  try {
    const data = JSON.parse(storage?.getItem(PROGRESS_KEY) ?? 'null');
    if (!data || data.version !== 1 || typeof data.completed !== 'object') return emptyProgress();
    return { ...emptyProgress(), ...data };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(storage, progress) {
  try { storage?.setItem(PROGRESS_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}

export function completeChapter(progress, number, { time = 0, rating = 'C', decisions = {}, challenges = [], survivors = [] } = {}) {
  const previous = progress.completed[number];
  const better = !previous || rank(rating) > rank(previous.rating) || (rank(rating) === rank(previous.rating) && time < previous.time);
  return {
    ...progress,
    completed: { ...progress.completed, [number]: better ? { time, rating } : previous },
    decisions: { ...progress.decisions, [number]: decisions },
    challenges: { ...progress.challenges, [number]: [...new Set([...(progress.challenges[number] ?? []), ...challenges])] },
    survivors: { ...progress.survivors, [number]: survivors },
  };
}

const RATINGS = ['C', 'B', 'A', 'S'];
const rank = rating => RATINGS.indexOf(rating);

// Execution rating: never shown over a fixed death (the story page hides the
// rating screen in those chapters until the epilogue of the chapter).
export function rateRun({ time, par, damage = 0, challenges = 0 }) {
  let score = 1;
  if (time > par * 1.5) score--;
  if (time <= par) score++;
  if (damage > 60) score--;
  score += Math.min(1, challenges);
  return RATINGS[Math.max(0, Math.min(3, score))];
}

// In this production build, implemented chapters stay open for selection;
// planned chapters are visible but cannot be started.
export function chapterAvailability(chapter) {
  if (chapter.status === 'playable') return 'open';
  if (chapter.status === 'prototype') return 'prototype';
  return 'locked';
}
