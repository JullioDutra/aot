import { test, expect } from '@playwright/test';

// Act VIII, the war for Paradis (chapters 39–42), with several simulation steps
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

test('chapter 39: the soldiers turned by the wine, the Beast taken apart and the spear Zeke pulls', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 39);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('nearest')); return (await snap(page)).adapter.kills; }, { timeout: 60000, intervals: [600] }).toBeGreaterThan(0);
  await playThrough(page, { until: s => s.story.mission?.id === 'bestial' });
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  for (const part of ['braco-e', 'braco-d', 'olho-e', 'olho-d', 'nuca']) await expect.poll(async () => { await page.evaluate(p => window.__STORY__.debug('part', p), part); return (await snap(page)).adapter.cuts.includes(part); }, { timeout: 30000, intervals: [600] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['event:zeke-screams', 'goal:companheiros', 'goal:bestial', 'event:cart-blast', 'fixed:explosao']));
  expect(errors).toEqual([]);
});

test('chapter 40: soldiers on the wall, the Jaw caught in the air and Pieck aiming at Eren', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 40);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('raider')); return (await snap(page)).adapter.kills; }, { timeout: 60000, intervals: [600] }).toBeGreaterThanOrEqual(5);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'titan' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('catchJaw')); return (await snap(page)).adapter.caught; }, { timeout: 60000, intervals: [1200] }).toBeGreaterThanOrEqual(2);
  // Standing still under Pieck's aim gets shelled.
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'titan' && s.story.mission?.id === 'zeke' });
  await expect.poll(async () => (await snap(page)).adapter.shellsTaken, { timeout: 60000 }).toBeGreaterThan(0);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:muralha', 'goal:mandibula', 'goal:zeke', 'fixed:colt-falco']));
  expect(errors).toEqual([]);
});

test('chapter 41: the wine scream, the memories in the Paths and the Rumbling', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 41);
  const end = await playThrough(page, { option: 2, goals: false });
  expect(end.story.choices).toEqual({ caminhos: 'continuar' });
  expect(end.story.log).toEqual(expect.arrayContaining(['fixed:morte-colt', 'fixed:morte-pixis', 'fixed:morte-porco', 'objective:lembranca-1', 'objective:lembranca-2', 'objective:ymir', 'fixed:estrondo']));
  expect(end.adapter.inPaths).toBe(true);
  expect(end.adapter.colossi).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('chapter 42: the campfire, Jean and Reiner, and the gear taken to the horses', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 42);
  const end = await playThrough(page, { option: 2, goals: false });
  expect(end.story.choices).toEqual({ reiner: 'ouvir' });
  expect(end.story.log).toEqual(expect.arrayContaining(['event:punch', 'interact:equipamento', 'objective:cavalos']));
  expect(end.adapter.punched).toBe(1);
  expect(errors).toEqual([]);
});
