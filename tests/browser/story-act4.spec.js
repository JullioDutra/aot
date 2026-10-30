import { test, expect } from '@playwright/test';

// Act IV, the clash of the titans (chapters 19–24), with several simulation steps
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

const click = page => page.evaluate(() => document.getElementById('story-canvas').dispatchEvent(new MouseEvent('mousedown', { button: 0 })));

test('chapter 19: Mike falls before the Beast, an arrow blinds the titan and Ragako is empty', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 19);
  await playThrough(page, { until: s => s.adapter?.control === 'walk' && s.story.mission?.id === 'sasha' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('shoot')); return (await snap(page)).adapter.arrows; }, { timeout: 30000, intervals: [800] }).toBeGreaterThan(0);
  expect((await snap(page)).adapter.hunter).toBe('idle');
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:mike', 'event:beast', 'fixed:morte-mike', 'goal:sasha', 'objective:casa', 'event:mother']));
  expect(end.adapter.mike).toBe(false);
  expect(errors).toEqual([]);
});

test('chapter 20: the tower holds 40 s of stabbing, then Ymir bites as a titan', async ({ page }) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 20);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'walk' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('stabWorst')); return (await snap(page)).story.log.includes('goal:torre'); }, { timeout: 200000, intervals: [600] }).toBe(true);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'titan' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('biteAll')); return (await snap(page)).adapter.bites; }, { timeout: 120000, intervals: [700] }).toBeGreaterThan(0);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:torre', 'fixed:morte-nanaba', 'fixed:ymir-tita', 'goal:ymir', 'event:dawn']));
  expect(end.adapter.stabs).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('chapter 21: the confession on the wall, both transform and a punch clangs on the armor', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 21);
  await playThrough(page, { option: 2, goals: false, until: s => s.adapter?.control === 'titan' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('charge')); return (await snap(page)).adapter.punched; }, { timeout: 60000, intervals: [900] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.choices).toEqual({ reiner: 'perguntar' });
  expect(end.story.log).toEqual(expect.arrayContaining(['fixed:revelacao', 'interact:morder', 'goal:investida', 'event:armored-answers']));
  expect(errors).toEqual([]);
});

test('chapter 22: a sidestep and grab take the Armored down, knees cut from behind, then the arm lock', async ({ page }) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 22);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'titan' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('takedown')); await page.keyboard.press('KeyG'); return (await snap(page)).adapter.duel.takedowns; }, { timeout: 60000, intervals: [700] }).toBeGreaterThan(0);
  await playThrough(page, { until: s => s.adapter?.control === 'odm' });
  for (const knee of [0, 1]) await expect.poll(async () => { await page.evaluate(k => window.__STORY__.debug('knee', k), knee); return (await snap(page)).adapter.knees; }, { timeout: 30000, intervals: [600] }).toBeGreaterThan(knee);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'lock' });
  await expect.poll(async () => { for (let i = 0; i < 4; i++) { await click(page); await page.waitForTimeout(60); } return (await snap(page)).adapter.lock.torn; }, { timeout: 60000, intervals: [100] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:tecnica', 'goal:juntas', 'goal:chave', 'event:colossal-falls', 'fixed:colossal-cai']));
  expect(errors).toEqual([]);
});

test('chapter 23: riding behind Erwin to the Armored, his arm lost, and Eren cut loose', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 23);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'ride' });
  await page.evaluate(() => window.__STORY__.debug('autopilot', true));
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('reach')); return (await snap(page)).story.log.includes('goal:extracao'); }, { timeout: 30000, intervals: [700] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:carga', 'fixed:braco-erwin', 'goal:extracao', 'event:eren-free']));
  expect(end.adapter.armless).toBe(true);
  expect(errors).toEqual([]);
});

test('chapter 24: Hannes is eaten, the scream turns the titans and the ride home reaches the wall', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 24);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'ride' });
  await page.evaluate(() => window.__STORY__.debug('autopilot', true));
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['fixed:morte-hannes', 'interact:punho', 'event:scream', 'fixed:morte-dina', 'fixed:ymir-parte', 'goal:fuga']));
  expect(end.adapter.hits).toBeGreaterThan(0);
  expect(end.adapter.swarm).toBe(true);
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});
