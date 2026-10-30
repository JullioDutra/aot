import { test, expect } from '@playwright/test';

// End of the battle of Trost (chapters 10–12), with several simulation steps
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

test('chapter 10: the unknown titan kills on its own, Eren fights inside it and comes out of the nape', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 10);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => (await snap(page)).adapter.unknownKills, { timeout: 90000 }).toBeGreaterThan(0);
  await playThrough(page, { goals: true, until: s => s.adapter?.control === 'titan' });
  // Punch for real until the first titan in reach is crushed.
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('punchAll')); return (await snap(page)).adapter.crushed; }, { timeout: 120000 }).toBeGreaterThan(0);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:observar', 'event:inside-titan', 'goal:despertar', 'fixed:revelacao']));
  expect(end.adapter.erenOut).toBe(true);
  expect(errors).toEqual([]);
});

test('chapter 11: an early drop from the beam fails, the synchronized cut works and Marco is found', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 11);
  // Real time from the volley on, so the press lands before the signal.
  const volley = await playThrough(page, { goals: false, until: s => s.story.log.includes('event:volley') });
  expect(volley.story.log).toContain('interact:alavanca');
  await page.evaluate(() => { window.__STORY__.timeScale = 1; });
  await expect.poll(async () => (await snap(page)).adapter.control, { timeout: 60000 }).toBe('sync');
  await page.evaluate(() => document.getElementById('story-canvas').dispatchEvent(new MouseEvent('mousedown', { button: 0 })));
  await expect(page.locator('#story-fail')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#story-fail-reason')).toContainText('antes do sinal');
  await expect(page.locator('#story-fail-retry')).toBeEnabled({ timeout: 30000 });
  await page.locator('#story-fail-retry').dispatchEvent('click');
  await page.evaluate(() => { window.__STORY__.timeScale = 4; });
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['event:volley', 'goal:sete', 'event:two-miss', 'fixed:morte-marco']));
  expect(end.adapter.marcoShown).toBe(true);
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});

test('chapter 12: the boulder, Ian and Mitabi lost whatever Ian chooses, the gate sealed and the tribunal', async ({ page }) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 12);
  await playThrough(page, { until: s => s.adapter?.control === 'carry' });
  // Walk the boulder for real for a moment: it moves, slowly.
  const before = (await snap(page)).adapter.titan;
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3000); await page.keyboard.up('KeyW');
  const after = (await snap(page)).adapter;
  expect(after.carrying).toBe(true);
  expect(Math.hypot(after.titan[0] - before[0], after.titan[2] - before[2])).toBeGreaterThan(1);
  const end = await playThrough(page, { option: 2 });
  expect(end.story.choices).toEqual({ ian: 'recuar' });
  expect(end.story.log).toEqual(expect.arrayContaining(['event:eren-transforms', 'goal:descontrole', 'interact:lamina', 'goal:pedra', 'fixed:morte-ian', 'fixed:morte-mitabi', 'goal:escolta', 'fixed:portao-selado', 'event:levi-kicks']));
  expect(end.adapter.sealed).toBe(true);
  expect(end.adapter.kicks).toBeGreaterThan(0);
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});
