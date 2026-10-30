import { test, expect } from '@playwright/test';

// Act VII, across the sea (chapters 35–38), with several simulation steps
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

test('chapter 35: grenades on the train, the Jaw bites the nests under fire, the battleship and the Beast', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 35);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'titan' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('bite')); return (await snap(page)).adapter.ruined; }, { timeout: 60000, intervals: [700] }).toBeGreaterThan(0);
  expect((await snap(page)).adapter.health).toBeLessThan(100);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['interact:granadas', 'event:train-blows', 'event:jaw-drops', 'goal:mandibula', 'event:beast-drops']));
  expect(errors).toEqual([]);
});

test('chapter 36: the market talks, the letters for Kruger and Reiner remembering', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 36);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'walk' });
  // Walking down the market for real: the first stall talks.
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await snap(page)).adapter.heard, { timeout: 60000 }).toBeGreaterThan(0);
  await page.keyboard.up('KeyW');
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['objective:feira', 'objective:kruger', 'event:flashback', 'event:present']));
  expect(errors).toEqual([]);
});

test('chapter 37: Willy taken on the stage, spikes, the flesh cord and the crystal', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 37);
  await playThrough(page, { option: 2, goals: false, until: s => s.adapter?.control === 'titan' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('willy')); return (await snap(page)).adapter.willyTaken; }, { timeout: 30000, intervals: [800] }).toBe(true);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'titan' && s.story.mission?.id === 'martelo' });
  await page.evaluate(() => window.__STORY__.debug('cord'));
  await expect.poll(async () => (await snap(page)).adapter.found, { timeout: 20000 }).toBe(true);
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('crystal')); return (await snap(page)).adapter.cracks; }, { timeout: 60000, intervals: [900] }).toBeGreaterThanOrEqual(3);
  const end = await playThrough(page, { goals: false });
  expect(end.story.choices).toEqual({ reiner: 'seguir' });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:palco', 'fixed:morte-willy', 'event:war-hammer', 'goal:martelo', 'fixed:morte-lara']));
  expect(errors).toEqual([]);
});

test('chapter 38: lances cut before they fire, the harbor blast, the airship and Sasha', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 38);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('cut', 'lances')); return (await snap(page)).adapter.cut.descida; }, { timeout: 90000, intervals: [600] }).toBeGreaterThanOrEqual(6);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'porto' });
  await page.evaluate(() => window.__STORY__.debug('harbor'));
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'retirada' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('cut', 'riflemen')); return (await snap(page)).adapter.cut.retirada; }, { timeout: 60000, intervals: [600] }).toBeGreaterThanOrEqual(4);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:descida', 'goal:porto', 'event:harbor-blast', 'goal:retirada', 'event:gunshot', 'fixed:morte-sasha']));
  expect(end.adapter.sasha).toBe('lie');
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});
