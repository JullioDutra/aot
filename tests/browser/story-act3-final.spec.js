import { test, expect } from '@playwright/test';

// Act III, the end of the Female Titan arc (chapters 16–18), with several simulation steps
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

test('chapter 16: titans cut away from the harpoon crews, then the scream and her escape', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 16);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  // Cut a nape for real.
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('nearest')); return (await snap(page)).adapter.kills.arpoes; }, { timeout: 90000, intervals: [600] }).toBeGreaterThan(0);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['event:pinned', 'goal:arpoes', 'event:nape-hard', 'event:scream', 'goal:grito', 'event:devoured', 'fixed:fuga-femea']));
  expect(end.adapter.gone).toBe(true);
  expect(errors).toEqual([]);
});

test('chapter 17: the squad falls, Eren lands a punch and loses, Levi cuts in order and frees him', async ({ page }) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 17);
  await playThrough(page, { until: s => s.adapter?.control === 'titan' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('landed')); return (await snap(page)).adapter.duel.landed; }, { timeout: 90000, intervals: [700] }).toBeGreaterThan(0);
  await playThrough(page, { until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'resgate' });
  // Out of order the blade glances off; in order every cut lands.
  await page.evaluate(() => window.__STORY__.debug('cut', 'boca'));
  await page.waitForTimeout(800);
  expect((await snap(page)).adapter.cuts).toEqual([]);
  for (const id of ['olho-e', 'olho-d', 'braco-e', 'braco-d', 'boca']) {
    await expect.poll(async () => { await page.evaluate(i => window.__STORY__.debug('cut', i), id); return (await snap(page)).adapter.cuts.includes(id); }, { timeout: 30000, intervals: [500] }).toBe(true);
  }
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['fixed:morte-gunther', 'fixed:morte-eld', 'fixed:morte-petra', 'fixed:morte-oluo', 'goal:duelo', 'event:eren-loses', 'goal:resgate', 'event:eren-freed']));
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});

test('chapter 18: Annie transforms in Stohess, climbs the wall and falls when both hands are cut', async ({ page }) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 18);
  await playThrough(page, { until: s => s.adapter?.control === 'titan' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('landed')); return (await snap(page)).adapter.duel.landed; }, { timeout: 90000, intervals: [700] }).toBeGreaterThan(0);
  await playThrough(page, { until: s => s.story.mission?.id === 'muralha' });
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => (await snap(page)).adapter.climb, { timeout: 60000 }).not.toBeNull();
  await page.evaluate(() => window.__STORY__.debug('cutHand', 'left'));
  await expect.poll(async () => (await snap(page)).adapter.climb.hands.left, { timeout: 20000 }).toBe(false);
  await page.evaluate(() => window.__STORY__.debug('cutHand', 'right'));
  await expect.poll(async () => (await snap(page)).adapter.climb.falling, { timeout: 20000 }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['objective:descer', 'event:annie-transforms', 'goal:cidade', 'goal:muralha', 'fixed:cristal', 'event:wall-face']));
  expect(end.adapter.crystal).toBe(true);
  expect(end.adapter.face).toBe(true);
  expect(errors).toEqual([]);
});
