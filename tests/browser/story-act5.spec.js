import { test, expect } from '@playwright/test';

// Act V, the uprising (chapters 25–28), with several simulation steps
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

test('chapter 25: out of the bar before the blast, and a shotgun in the open finds Levi', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 25);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  // Hovering next to a gunman in plain sight: he aims and fires.
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('exposed')); return (await snap(page)).adapter.hitsTaken; }, { timeout: 60000, intervals: [500] }).toBeGreaterThan(0);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['event:kenny-enters', 'objective:fundos', 'event:blast', 'goal:telhados', 'event:wagon']));
  expect(errors).toEqual([]);
});

test('chapter 26: running in disguise fails the swap; Armin shoots whatever he chooses; the coup', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 26);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'walk' });
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW');
  await expect(page.locator('#story-fail')).toBeVisible({ timeout: 30000 });
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  await expect(page.locator('#story-fail-reason')).toContainText('correndo');
  await expect(page.locator('#story-fail-retry')).toBeEnabled({ timeout: 30000 });
  await page.locator('#story-fail-retry').dispatchEvent('click');
  const end = await playThrough(page, { option: 2 });
  expect(end.story.choices).toEqual({ jean: 'hesitar' });
  expect(end.story.log).toEqual(expect.arrayContaining(['objective:carroca', 'event:armin-shoots', 'objective:depoimento', 'objective:registro', 'objective:jornalista', 'fixed:golpe']));
  expect(end.adapter.shot).toBe(true);
  expect(errors).toEqual([]);
});

test('chapter 27: the altar, the syringe refused, and steady presses harden the cavern', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 27);
  await playThrough(page, { until: s => s.adapter?.control === 'lock' });
  await expect.poll(async () => { for (let i = 0; i < 4; i++) { await click(page); await page.waitForTimeout(60); } return (await snap(page)).adapter.hard.held; }, { timeout: 60000, intervals: [100] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:infiltracao', 'choice:seringa:recusar', 'event:rod-transforms', 'fixed:endurecimento', 'goal:cristal', 'event:cavern-holds']));
  expect(errors).toEqual([]);
});

test('chapter 28: a shove on a closed mouth bounces, the open mouth takes the barrels, Kenny and the crown', async ({ page }) => {
  test.setTimeout(360000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 28);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'lock' });
  // Wait for a closed mouth, push, then push again once it opens.
  await expect.poll(async () => page.evaluate(() => document.getElementById('story-objective-status').textContent), { timeout: 30000 }).toContain('fechada');
  await click(page);
  await expect.poll(async () => (await snap(page)).adapter.bounces, { timeout: 10000 }).toBeGreaterThan(0);
  await expect.poll(async () => page.evaluate(() => document.getElementById('story-objective-status').textContent), { timeout: 30000 }).toContain('ABERTA');
  await click(page);
  await expect.poll(async () => (await snap(page)).adapter.shoved, { timeout: 10000 }).toBe(true);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  await expect.poll(async () => { await page.evaluate(() => window.__STORY__.debug('nape')); return (await snap(page)).story.log.includes('goal:rainha'); }, { timeout: 30000, intervals: [600] }).toBe(true);
  const end = await playThrough(page, { goals: false });
  expect(end.story.log).toEqual(expect.arrayContaining(['interact:canhao-3', 'goal:barris', 'event:explosion', 'fixed:morte-rod', 'objective:arvore', 'fixed:morte-kenny', 'fixed:coroacao']));
  expect(end.adapter.coronated).toBe(true);
  await expect(page.locator('#story-end-rating')).toBeHidden();
  expect(errors).toEqual([]);
});
