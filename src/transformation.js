import { powerAvailable } from './campaign/characters.js';

// Rules and timeline for shifter transformations. A transformation is a
// physical and narrative event: the character must hold the power at that
// point of the story, needs intent and a wound, is limited by fatigue and by
// the space around them. The timeline drives the lightning, flash, shock wave
// and the body forming inside the steam.

export const TITAN_POWER = Object.freeze({ eren: 'attackTitan', armin: 'colossalTitan', annie: 'femaleTitan', reiner: 'armoredTitan', bertholdt: 'colossalTitan', ymir: 'jawTitan', porco: 'jawTitan', falco: 'jawTitan', zeke: 'beastTitan', pieck: 'cartTitan', lara: 'warHammerTitan' });

export function canTransform({ character, chapter, wounded = false, intent = false, fatigue = 0, used = 0, limit = 2, space = 'open', scripted = false }) {
  const reasons = [];
  const power = TITAN_POWER[character];
  if (!power || !powerAvailable(character, power, chapter)) reasons.push('Este personagem não possui um poder de titã nesta fase da história.');
  if (!scripted && !intent) reasons.push('Falta um objetivo claro: a transformação depende da intenção.');
  if (!scripted && !wounded) reasons.push('É preciso ferir-se para iniciar a transformação.');
  if (fatigue > 0) reasons.push('Exausto: o corpo ainda não se recuperou da última transformação.');
  if (used >= limit) reasons.push('Limite de transformações desta missão atingido.');
  if (space === 'interior') reasons.push('Espaço fechado: a transformação destruiria a estrutura e quem está dentro.');
  return { allowed: reasons.length === 0, reasons };
}

// Seconds from the wound. `duration` lets pages compress the sequence (the
// arena keeps its 2.2 s gameplay timing).
export const TIMELINE = Object.freeze({ wound: 0, spark: .3, bolt: .55, flash: .8, form: 1.0, done: 2.2 });

export function transformationPhase(elapsed, duration = TIMELINE.done) {
  const t = Math.max(0, elapsed) * TIMELINE.done / duration;
  const phase = t < TIMELINE.spark ? 'wound' : t < TIMELINE.bolt ? 'spark' : t < TIMELINE.flash ? 'bolt' : t < TIMELINE.form ? 'flash' : t < TIMELINE.done ? 'form' : 'done';
  const between = (a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  return {
    phase,
    bolt: t >= TIMELINE.bolt && t < TIMELINE.form + .25 ? 1 - between(TIMELINE.flash, TIMELINE.form + .25) * .85 : 0,
    flash: t >= TIMELINE.flash && t < TIMELINE.form + .3 ? 1 - between(TIMELINE.flash, TIMELINE.form + .3) : 0,
    shock: between(TIMELINE.flash, TIMELINE.done),
    growth: between(TIMELINE.form, TIMELINE.done) ** .7,
    steam: t >= TIMELINE.flash ? 1 - between(TIMELINE.done, TIMELINE.done + 2.5) : 0,
    spark: t >= TIMELINE.spark && t < TIMELINE.flash ? 1 : 0,
  };
}

// Deterministic branching lightning: midpoint displacement for the main
// channel plus forks that fade toward the ground. Returns polylines in world
// space so the renderer only builds tubes.
export function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

export function lightningBolt(seed, start, end, { depth = 6, jitter = .22, branches = 4 } = {}) {
  const rand = seeded(seed);
  let points = [start, end];
  const length = Math.hypot(...end.map((v, i) => v - start[i]));
  for (let level = 0; level < depth; level++) {
    const next = [points[0]];
    const amount = length * jitter / 2 ** level;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const mid = a.map((v, k) => (v + b[k]) / 2 + (k === 1 ? 0 : (rand() - .5) * amount * 2));
      next.push(mid, b);
    }
    points = next;
  }
  const paths = [{ points, width: 1 }];
  for (let i = 0; i < branches; i++) {
    const from = points[Math.floor(points.length * (.15 + rand() * .55))];
    const reach = length * (.15 + rand() * .25);
    const to = [from[0] + (rand() - .5) * reach, from[1] - reach * (.6 + rand() * .4), from[2] + (rand() - .5) * reach];
    paths.push({ points: lightningBolt(seed * 31 + i + 1, from, to, { depth: 4, jitter: .3, branches: 0 })[0].points, width: .45 });
  }
  return paths;
}
