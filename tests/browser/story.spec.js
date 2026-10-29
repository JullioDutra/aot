import { test, expect } from '@playwright/test';

const snap = page => page.evaluate(() => window.__STORY__.snapshot());

// Plays a chapter: advances lines, picks the given option, jumps to objectives
// and completes chapter goals through the test hooks.
async function playThrough(page, { option = 1, goals = true, until = s => s.mode === 'finished', limit = 900 } = {}) {
  for (let i = 0; i < limit; i++) {
    const s = await snap(page);
    if (until(s)) return s;
    const view = await page.evaluate(() => ({
      dialogue: !document.getElementById('story-dialogue').hidden,
      choice: !document.getElementById('story-choice').hidden,
      objective: !document.getElementById('story-objective').hidden,
      text: document.getElementById('story-objective-text').textContent,
    }));
    if (view.choice) await page.keyboard.press(`Digit${option}`);
    else if (view.dialogue) await page.keyboard.press('Space');
    else if (view.objective) {
      const beat = s.story.index;
      const target = await page.evaluate(i => { const b = window.__STORY_SCRIPT__?.[i]; return b ? { type: b.type, id: b.id, target: b.target } : null; }, beat);
      if (target?.type === 'goal' && goals) await page.evaluate(id => window.__STORY__.debug('goal', id), target.id);
      else if (target?.target) { await page.evaluate(t => window.__STORY__.debug('teleport', t), target.target); if (target.type === 'interact') await page.keyboard.press('KeyG'); }
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
}

test('chapter 1 opens under the tree and walks through the five sub-missions', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/story.html?fase=1');
  await expect(page.locator('#story-intro-title')).toHaveText('Um dia em Shiganshina');
  await expect(page.locator('#story-start')).toBeEnabled({ timeout: 60000 });
  await page.locator('#story-start').click();
  await expect(page.locator('#story-banner-title')).toHaveText('Sob a árvore');
  await expect(page.locator('#story-speaker')).toHaveText('Mikasa', { timeout: 15000 });
  const end = await playThrough(page, { option: 2 });
  expect(end.story.log.filter(e => e.startsWith('mission:'))).toEqual(['mission:arvore', 'mission:portao', 'mission:retorno', 'mission:casa', 'mission:canal']);
  expect(end.story.choices).toEqual({ tropa: 'calar' });
  await expect(page.locator('#story-end')).toBeVisible();
  await expect(page.locator('#story-end-rating')).toBeVisible();
  await expect(page.locator('#story-next')).toHaveAttribute('href', './story.html?fase=2');
  expect(end.progress.completed[1]).toBeTruthy();
  expect(errors).toEqual([]);
});

test('chapter 2: the Colossal kicks the gate, Carla dies whatever Hannes does and no score covers it', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 2);
  const midway = await playThrough(page, { until: s => s.adapter?.colossal !== null && s.adapter?.colossal > -40 });
  expect(midway.adapter.colossal).toBeGreaterThan(-40);
  const end = await playThrough(page, { option: 1 });
  expect(end.story.log).toContain('choice:hannes:lutar');
  expect(end.story.log).toContain('fixed:morte-carla');
  expect(end.adapter.collapsed).toBeGreaterThan(3);
  expect(end.adapter.devoured).toBe(true);
  await expect(page.locator('#story-end')).toBeVisible();
  await expect(page.locator('#story-end-rating')).toBeHidden();
  await expect(page.locator('#story-end-reflection')).toContainText('Hannes');
  expect(errors).toEqual([]);
});

test('chapter 32: the charge, Levi on the line of titans and the Beast taken apart part by part', async ({ page }) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 32);
  await expect(page.locator('#story-banner-title')).toHaveText('Os sonhos de Erwin');
  // Ride for real for a few seconds: the Beast throws and riders fall.
  const riding = await playThrough(page, { goals: false, until: s => s.adapter?.control === 'ride' });
  expect(riding.adapter.riders).toBeGreaterThan(15);
  await expect.poll(async () => (await snap(page)).adapter.barrages, { timeout: 60000 }).toBeGreaterThan(0);
  await page.evaluate(() => window.__STORY__.debug('goal', 'carga'));
  // Levi: cutting the nape before the limbs does nothing; each part counts.
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'linha' });
  await page.evaluate(() => window.__STORY__.debug('goal', 'linha'));
  await expect.poll(async () => (await snap(page)).story.mission?.id).toBe('bestial');
  for (const zone of ['braco-esq', 'braco-dir', 'olhos', 'perna-esq', 'perna-dir']) {
    await page.evaluate(z => { window.__STORY__.debug('place', z); window.__STORY__.debug('strike'); }, zone);
    await expect.poll(async () => (await snap(page)).adapter.cut).toContain(zone);
  }
  await page.evaluate(() => { window.__STORY__.debug('place', 'nuca'); window.__STORY__.debug('strike'); });
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:bestial', 'event:zeke-pulled', 'event:cart-rescue', 'fixed:morte-marlo']));
  expect(end.adapter.zekePulled).toBe(true);
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});
