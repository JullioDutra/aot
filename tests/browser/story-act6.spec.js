import { test, expect } from '@playwright/test';

// Act VI, the return to Shiganshina (chapters 29–31, 33 and 34), with several simulation steps
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
const mash = async (page, until, timeout = 60000) => expect.poll(async () => { for (let i = 0; i < 4; i++) { await click(page); await page.waitForTimeout(60); } return until(await snap(page)); }, { timeout, intervals: [100] }).toBe(true);

test('chapter 29: running in the dark wakes the titans; the gate is hardened and the prologue landmarks found', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 29);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'walk' });
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW');
  await expect(page.locator('#story-fail')).toBeVisible({ timeout: 30000 });
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  await expect(page.locator('#story-fail-reason')).toContainText('barulho');
  await expect(page.locator('#story-fail-retry')).toBeEnabled({ timeout: 30000 });
  await page.locator('#story-fail-retry').dispatchEvent('click');
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'lock' });
  await mash(page, s => s.adapter.hard.held);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['objective:muralha', 'goal:portao', 'event:gate-sealed', 'objective:sino', 'objective:ponte', 'objective:barco']));
  expect(end.adapter.found).toHaveLength(3);
  expect(errors).toEqual([]);
});

test('chapter 30: the cracked wall hides Reiner, and herds led to cover survive the rocks', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 30);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('crack')); return (await snap(page)).adapter.crackHit; }, { timeout: 30000, intervals: [600] }).toBe(true);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'walk' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('herd')); await page.keyboard.press('KeyG'); return (await snap(page)).adapter.safe; }, { timeout: 30000, intervals: [500] }).toBeGreaterThan(1);
  const end = await playThrough(page, { goals: false, limit: 1200 });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:muralha', 'event:reiner-out', 'event:beast-wall', 'goal:cerco']));
  expect(end.adapter.safe).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('chapter 31: eyes cut, a spear planted and pulled with the squad opens the armor; Moblit dies', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 31);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  for (const side of [-1, 1]) await expect.poll(async () => { await page.evaluate(sd => window.__STORY__.debug('eye', sd), side); return (await snap(page)).adapter.eyes; }, { timeout: 30000, intervals: [600] }).toBeGreaterThan(side < 0 ? 0 : 1);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'lancas' });
  await expect.poll(async () => (await snap(page)).adapter.spears, { timeout: 30000 }).toBeGreaterThanOrEqual(5);
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('plant')); return (await snap(page)).adapter.mine; }, { timeout: 30000, intervals: [600] }).toBe(true);
  await expect.poll(async () => { await page.keyboard.press('KeyG'); return (await snap(page)).adapter.pulled; }, { timeout: 20000, intervals: [500] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.adapter.result.opened).toBe(true);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:cegar', 'goal:lancas', 'fixed:blindado-aberto', 'event:blast', 'fixed:morte-moblit']));
  expect(errors).toEqual([]);
});

test('chapter 33: the Colossal thins, Armin holds on through the heat and Eren cuts the nape', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 33);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => (await snap(page)).adapter.watched, { timeout: 60000 }).toBeGreaterThanOrEqual(10);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'lock' });
  await mash(page, s => s.adapter.grip.held, 90000);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'emboscada' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('nape')); return (await snap(page)).adapter.cut; }, { timeout: 30000, intervals: [600] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:vapor', 'fixed:armin-queimado', 'goal:segurar', 'goal:emboscada', 'fixed:bertholdt-capturado']));
  expect(end.adapter.thin).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('chapter 34: whichever way Levi leans, Erwin rests; the drawer, the books and the sea', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 34);
  const end = await playThrough(page, { option: 2, goals: false });
  expect(end.story.choices).toEqual({ soro: 'armin' });
  expect(end.story.log).toEqual(expect.arrayContaining(['fixed:morte-erwin', 'fixed:soro', 'fixed:morte-bertholdt', 'interact:gaveta', 'event:books', 'objective:agua']));
  expect(end.adapter.atSea).toBe(true);
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});
