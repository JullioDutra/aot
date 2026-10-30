import { test, expect } from '@playwright/test';

// Act VIII, the end (chapters 43–47), with several simulation steps
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

test('chapter 43: a blade from behind disarms, the runners stopped and Floch at the hull', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 43);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('behind')); return (await snap(page)).adapter.disarmed; }, { timeout: 60000, intervals: [700] }).toBeGreaterThanOrEqual(5);
  expect((await snap(page)).adapter.killed).toBe(0);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'aviao' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('runner')); const a = (await snap(page)).adapter; return a.runners === 4 && a.stopped === 4; }, { timeout: 120000, intervals: [700] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:cais', 'goal:aviao', 'event:floch', 'fixed:morte-floch']));
  expect(errors).toEqual([]);
});

test('chapter 44: Magath and Shadis blow the ship, a Colossal topples and Hange burns', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 44);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('ankle', 0, 0)); await page.waitForTimeout(500); await page.evaluate(() => window.__STORY__.debug('ankle', 0, 1)); return (await snap(page)).adapter.felled; }, { timeout: 60000, intervals: [800] }).toBeGreaterThan(0);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['fixed:morte-magath', 'fixed:morte-shadis', 'goal:hange', 'fixed:morte-hange']));
  expect(end.adapter.launched).toBe(true);
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});

test('chapter 45: landing on the spine and cutting the titans of the Paths', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 45);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await page.evaluate(() => window.__STORY__.debug('land'));
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'ondas' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('nearest')); return (await snap(page)).adapter.kills; }, { timeout: 120000, intervals: [600] }).toBeGreaterThanOrEqual(8);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:pouso', 'event:wave', 'goal:ondas']));
  expect(errors).toEqual([]);
});

test('chapter 46: flying straight into the spine crashes; Zeke and Eren', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 46);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'fly' });
  await expect(page.locator('#story-fail')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#story-fail-reason')).toContainText('coluna');
  await expect(page.locator('#story-fail-retry')).toBeEnabled({ timeout: 30000 });
  await page.locator('#story-fail-retry').dispatchEvent('click');
  await page.evaluate(() => window.__STORY__.debug('arrive'));
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('mouth')); return (await snap(page)).adapter.cut; }, { timeout: 30000, intervals: [700] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:voo', 'fixed:morte-zeke', 'goal:boca', 'fixed:morte-eren']));
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});

test('chapter 47: the hill, the envoys and the years', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 47);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['event:hill', 'objective:colina', 'event:envoys', 'event:years']));
  expect(end.adapter.grown).toBeGreaterThan(1);
  await expect(page.locator('#story-next')).toBeHidden();
  expect(errors).toEqual([]);
});
