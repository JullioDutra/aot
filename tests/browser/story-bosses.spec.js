import { test, expect } from '@playwright/test';

// Boss fights: telegraphed attacks that land, blindness that stops them and
// a nape that opens only after the other parts.
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


test('chapter 31: the Armored stomps a pilot at its feet and stops attacking once blind', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 31);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('feet')); return (await snap(page)).adapter.boss.hits; }, { timeout: 30000, intervals: [400] }).toBeGreaterThan(0);
  expect((await snap(page)).adapter.health).toBeLessThan(100);
  for (const side of [-1, 1]) await expect.poll(async () => { await page.evaluate(sd => window.__STORY__.debug('eye', sd), side); return (await snap(page)).adapter.eyes; }, { timeout: 30000, intervals: [400] }).toBeGreaterThan(side < 0 ? 0 : 1);
  await expect.poll(async () => (await snap(page)).adapter.boss.blind).toBe(true);
  expect(errors).toEqual([]);
});

test('chapter 39: the Beast nape stays shut until both arms and eyes are cut', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 39);
  await playThrough(page, { until: s => s.story.mission?.id === 'bestial' });
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__STORY__.debug('part', 'nuca')); await page.waitForTimeout(500); }
  expect((await snap(page)).adapter.cuts).not.toContain('nuca');
  for (const part of ['braco-e', 'braco-d', 'olho-e', 'olho-d', 'nuca']) await expect.poll(async () => { await page.evaluate(p => window.__STORY__.debug('part', p), part); return (await snap(page)).adapter.cuts.includes(part); }, { timeout: 30000, intervals: [600] }).toBe(true);
  expect(errors).toEqual([]);
});
