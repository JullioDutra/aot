import { test, expect } from '@playwright/test';

// Battle of Trost chapters. The simulation runs several steps per rendered
// frame (timeScale) because software rendering draws ~5 frames per second.
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

test('chapter 6: a cable on the wall face survives the steam and the nape cut makes the Colossal vanish', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 6);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'vapor' });
  // Hold the left cable from the same instant Eren is thrown off the top.
  await page.evaluate(() => { window.__STORY__.debug('hook'); dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' })); });
  await expect.poll(async () => (await snap(page)).adapter.hooks[0], { timeout: 30000 }).toBe(true);
  await expect.poll(async () => (await snap(page)).story.log, { timeout: 90000 }).toContain('goal:vapor');
  await page.keyboard.up('KeyQ');
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'nuca' });
  await page.evaluate(() => window.__STORY__.debug('nape'));
  await expect.poll(async () => (await snap(page)).story.log, { timeout: 60000 }).toContain('goal:nuca');
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['event:colossal-return', 'fixed:colossal-some', 'event:squad-formed']));
  expect(end.adapter.vanished).toBe(true);
  await expect(page.locator('#story-next')).toHaveAttribute('href', './story.html?fase=7');
  expect(errors).toEqual([]);
});

test('chapter 7: losing the squad fails the sub-mission; Thomas, Mina and Eren are lost whatever Eren chooses', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 7);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await page.evaluate(() => window.__STORY__.debug('teleport', [200, 150]));
  await expect(page.locator('#story-fail')).toBeVisible({ timeout: 90000 });
  await expect(page.locator('#story-fail-reason')).toContainText('esquadrão');
  await expect(page.locator('#story-fail-retry')).toBeEnabled({ timeout: 30000 });
  await page.locator('#story-fail-retry').click();
  const end = await playThrough(page, { option: 2 });
  expect(end.story.choices).toEqual({ raiva: 'formacao' });
  expect(end.story.log).toEqual(expect.arrayContaining(['fixed:morte-thomas', 'fixed:morte-mina', 'interact:puxar', 'fixed:eren-engolido']));
  expect(end.adapter.thomas).toBe(false);
  expect(end.adapter.erenVisible).toBe(false);
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});

test('chapter 8: the abnormal falls to a real nape cut, the cabin flashback and the unknown titan', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 8);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'portao' });
  await page.evaluate(() => window.__STORY__.debug('abnormal'));
  await expect.poll(async () => (await snap(page)).adapter.abnormalAlive, { timeout: 60000 }).toBe(false);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:portao', 'event:traffickers', 'fixed:pais', 'interact:lute', 'goal:lute', 'event:gas-out', 'event:unknown-punch']));
  expect(end.adapter.unknown).toBe(true);
  expect(errors).toEqual([]);
});

test('chapter 9: Armin picks a route on the tactical view and Jean leaves a cadet behind', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 9);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'plan' });
  await page.keyboard.down('KeyD'); await page.waitForTimeout(600); await page.keyboard.up('KeyD');
  await expect.poll(async () => (await snap(page)).adapter.selected).toBe(1);
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await snap(page)).adapter.route).toBe('avenida');
  const end = await playThrough(page, { option: 2 });
  expect(end.story.choices).toEqual({ jean: 'seguir' });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:plano', 'goal:meio', 'event:jean-leaves', 'goal:jean', 'event:windows']));
  expect(end.adapter.squad).toBe(2);
  expect(errors).toEqual([]);
});
