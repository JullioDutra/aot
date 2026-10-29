import { test, expect } from '@playwright/test';

// Act III, the Female Titan (chapters 13–15), with several simulation steps
// per rendered frame because software rendering draws ~5 frames per second.
const snap = page => page.evaluate(() => window.__STORY__.snapshot());

async function playThrough(page, { option = 1, goals = true, until = s => s.mode === 'finished', limit = 900 } = {}) {
  for (let i = 0; i < limit; i++) {
    const s = await snap(page);
    if (until(s)) return s;
    const view = await page.evaluate(() => ({
      dialogue: !document.getElementById('story-dialogue').hidden,
      choice: !document.getElementById('story-choice').hidden,
      objective: !document.getElementById('story-objective').hidden,
    }));
    if (view.choice) await page.keyboard.press(`Digit${option}`);
    else if (view.dialogue) await page.keyboard.press('Space');
    else if (view.objective) {
      const target = await page.evaluate(i => { const b = window.__STORY_SCRIPT__?.[i]; return b ? { type: b.type, id: b.id, target: b.target } : null; }, s.story.index);
      if (target?.type === 'goal' && goals) await page.evaluate(id => window.__STORY__.debug('goal', id), target.id);
      else if (target?.type !== 'goal' && target?.target) { await page.evaluate(t => window.__STORY__.debug('teleport', t), target.target); if (target.type === 'interact') await page.keyboard.press('KeyG'); }
    }
    await page.waitForTimeout(120);
  }
  throw new Error('chapter did not finish');
}

async function begin(page, number) {
  await page.goto(`/story.html?fase=${number}`);
  await expect(page.locator('#story-start')).toBeEnabled({ timeout: 60000 });
  await page.locator('#story-start').click();
  await expect.poll(async () => (await snap(page)).mode).toBe('playing');
  await page.evaluate(() => { window.__STORY__.timeScale = 4; });
}

test('chapter 13: smoke signals are relayed by colour on horseback and the black smoke reaches the flank', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 13);
  await page.evaluate(() => window.__STORY__.debug('autopilot', true));
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'ride' });
  // A wrong colour counts as a mistake.
  await expect.poll(async () => (await snap(page)).adapter.signal, { timeout: 60000 }).not.toBeNull();
  const color = (await snap(page)).adapter.signal;
  if (color === 'red') await page.keyboard.press('KeyG');
  else await page.evaluate(() => document.getElementById('story-canvas').dispatchEvent(new MouseEvent('mousedown', { button: 0 })));
  await expect.poll(async () => (await snap(page)).adapter.mistakes, { timeout: 20000 }).toBeGreaterThan(0);
  // Then relay for real until the formation goal completes.
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('relay')); return (await snap(page)).story.log.includes('goal:formacao'); }, { timeout: 200000, intervals: [400] }).toBe(true);
  // The black smoke, then the autopilot rides to the messenger for real.
  await playThrough(page, { goals: false, until: s => s.story.log.includes('event:black-smoke') && s.adapter.control === 'ride' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('relay')); return (await snap(page)).story.log.includes('goal:negra'); }, { timeout: 60000, intervals: [400] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.adapter.warned).toBe(true);
  expect(end.adapter.relayed).toBeGreaterThanOrEqual(9);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:formacao', 'event:black-smoke', 'goal:negra', 'goal:alerta', 'event:flank-warned']));
  expect(errors).toEqual([]);
});

test('chapter 14: patterns are observed from horseback before the Female throws Armin and leaves', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 14);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'ride' });
  // Trotting alongside her keeps the right distance: the first pattern is seen for real.
  await expect.poll(async () => (await snap(page)).adapter.seen.length, { timeout: 120000 }).toBeGreaterThan(0);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:padroes', 'event:armin-thrown', 'event:hood', 'goal:distrair', 'event:reiner-grabbed', 'event:female-leaves']));
  expect(end.adapter.thrown).toBe(true);
  expect(errors).toEqual([]);
});

test('chapter 15: riding between the giant trees behind Levi leads the Female into the trap', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 15);
  await page.evaluate(() => window.__STORY__.debug('autopilot', true));
  const end = await playThrough(page, { goals: false, limit: 1500 });
  expect(end.story.choices).toEqual({ confianca: 'confiar' });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:troncos', 'choice:confianca:confiar', 'goal:armadilha', 'event:trap-sprung']));
  expect(end.adapter.pinned).toBe(true);
  expect(end.adapter.fallen).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
