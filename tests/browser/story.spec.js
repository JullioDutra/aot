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

async function begin(page, number, timeScale = 1) {
  await page.goto(`/story.html?fase=${number}`);
  await expect(page.locator('#story-start')).toBeEnabled({ timeout: 60000 });
  await page.locator('#story-start').click();
  await expect.poll(async () => (await snap(page)).mode).toBe('playing');
  // Several simulation steps per rendered frame: software rendering runs at ~5 fps.
  await page.evaluate(scale => { window.__STORY__.timeScale = scale; }, timeScale);
}

test('chapter 1 opens under the tree and walks through the five sub-missions', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/story.html?fase=1');
  await expect(page.locator('#story-intro-title')).toHaveText('Um dia em Shiganshina');
  await expect(page.locator('#story-start')).toBeEnabled({ timeout: 60000 });
  await page.locator('#story-start').click();
  await expect(page.locator('#story-banner-title')).toHaveText('Sob a árvore');
  // The opening shot lasts 3.5 s of game time, ~17 s with software rendering.
  await expect(page.locator('#story-speaker')).toHaveText('Mikasa', { timeout: 60000 });
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

test('chapter 3: a titan grab sends you back to the dock, then the Armored breaks the inner gate', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 3, 4);
  await playThrough(page, { goals: false, until: s => s.story.log.includes('event:dock-arrival') && s.adapter.bell < 100 });
  // Walk into a titan's reach: the failure screen offers the sub-mission again.
  await page.evaluate(() => window.__STORY__.debug('teleport', [-20, -27]));
  await expect(page.locator('#story-fail')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#story-fail-reason')).toContainText('titã');
  await expect(page.locator('#story-fail-retry')).toBeEnabled({ timeout: 30000 });
  await page.locator('#story-fail-retry').click();
  await expect.poll(async () => (await snap(page)).adapter.bell).toBeGreaterThan(90);
  const end = await playThrough(page);
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:cais', 'event:gate-burst', 'fixed:maria-cai', 'objective:pao', 'interact:dividir']));
  expect(end.adapter.gateBroken).toBe(true);
  expect(end.adapter.place).toBe('shelter');
  await expect(page.locator('#story-end-rating')).toBeVisible();
  await expect(page.locator('#story-next')).toHaveAttribute('href', './story.html?fase=4');
  expect(errors).toEqual([]);
});

test('chapter 4: the broken belt flips Eren on its own and the drills run in order', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 4, 4);
  // No help from the test hooks: the faulty belt must throw him by itself.
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'balance' });
  await expect.poll(async () => (await snap(page)).story.log, { timeout: 120000 }).toContain('goal:equilibrio-1');
  const end = await playThrough(page);
  expect(end.story.log.filter(e => e.startsWith('mission:'))).toEqual(['mission:chegada', 'mission:equilibrio', 'mission:cabos', 'mission:mao']);
  expect(end.story.log).toEqual(expect.arrayContaining(['fixed:cinto', 'goal:reiner', 'goal:annie', 'event:annie-flip']));
  await expect(page.locator('#story-end')).toBeVisible();
  expect(errors).toEqual([]);
});

test('chapter 4: the sparring reads its tell, Reiner falls to three real counters and Annie ends the drill', async ({ page }) => {
  test.setTimeout(900000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 4, 4);
  await playThrough(page, { until: s => s.adapter?.control === 'duel' && s.adapter.opponent === 'reiner' && s.story.mission?.id === 'mao' && !s.story.log.includes('goal:reiner') });
  expect((await snap(page)).adapter.gap).toBeLessThan(1.5);
  await page.evaluate(() => { window.__STORY__.timeScale = 1; });
  // Counter only on AGORA!: three disarms, no test hooks.
  for (const end = Date.now() + 480000; Date.now() < end && (await snap(page)).adapter.wins < 3;) {
    if ((await snap(page)).adapter.cue === 'now') await page.keyboard.press('KeyG');
    await page.waitForTimeout(40);
  }
  expect((await snap(page)).adapter.wins).toBe(3);
  await expect.poll(async () => (await snap(page)).story.log, { timeout: 60000 }).toContain('goal:reiner');
  // Annie takes over the ring and the drill moves on after her throw.
  await page.evaluate(() => { window.__STORY__.timeScale = 4; });
  await playThrough(page, { goals: false, until: s => s.adapter?.opponent === 'annie' && s.adapter?.control === 'duel' && !s.story.log.includes('goal:annie') });
  await page.keyboard.press('KeyG');
  await expect.poll(async () => (await snap(page)).story.log, { timeout: 60000 }).toContain('goal:annie');
  expect(errors).toEqual([]);
});

test('chapter 4: practice tanks refill on the ground and a hoop counts near its rim', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 4, 4);
  await playThrough(page, { until: s => s.adapter?.control === 'odm' && s.story.mission?.id === 'cabos' });
  // Out of gas on the ground: the tanks come back instead of locking the course.
  await page.evaluate(() => { window.__STORY__.debug('fly', [48, 0, -6]); window.__STORY__.debug('gas', 0); });
  await expect.poll(async () => (await snap(page)).adapter.gas, { timeout: 60000 }).toBeGreaterThan(30);
  // Flying 4 m off the first hoop's centre (inside its 3.6 m rim plus margin) counts it.
  const hoop = (await snap(page)).adapter.hoop;
  await page.evaluate(() => window.__STORY__.debug('fly', [70, 13, -10]));
  await expect.poll(async () => (await snap(page)).adapter.hoop, { timeout: 30000 }).toBe(hoop + 1);
  expect(errors).toEqual([]);
});

test('a reload continues from the last sub-mission instead of the first line', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 7, 4);
  // Play into the second sub-mission: its checkpoint is saved in the browser.
  await playThrough(page, { until: s => s.story.log.filter(e => e.startsWith('mission:')).length >= 2 });
  const before = await snap(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('aot.story.resume.v1')));
  expect(saved.number).toBe(7); expect(saved.mission.id).toBe(before.story.mission.id);
  await page.reload();
  await expect(page.locator('#story-continue')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#story-continue')).toContainText(before.story.mission.title.toUpperCase());
  await expect(page.locator('#story-start')).toHaveText('COMEÇAR DO INÍCIO');
  await page.locator('#story-continue').click();
  await expect.poll(async () => (await snap(page)).mode).toBe('playing');
  const after = await snap(page);
  expect(after.resumed).toBe(true);
  expect(after.story.mission.id).toBe(before.story.mission.id);
  expect(after.story.index).toBe(saved.index);
  // The hub's Continuar points at the chapter and sub-mission in progress.
  await page.goto('/historia.html');
  await expect(page.locator('#hub-continue')).toHaveAttribute('href', './story.html?fase=7');
  await expect(page.locator('#hub-continue')).toContainText(before.story.mission.title);
  expect(errors).toEqual([]);
});

test('chapter 5: wooden napes score only from behind, then the graduation table choice', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page, 5, 4);
  await playThrough(page, { goals: false, until: s => s.adapter?.control === 'odm' });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => window.__STORY__.debug('behindTarget'));
    await expect.poll(async () => (await snap(page)).adapter.cuts, { timeout: 30000 }).toBe(i + 1);
  }
  expect((await snap(page)).adapter.score).toBeGreaterThan(0);
  const end = await playThrough(page, { option: 3 });
  expect(end.story.choices).toEqual({ formatura: 'reiner' });
  expect(end.story.log).toEqual(expect.arrayContaining(['goal:rota', 'goal:rival', 'objective:mesa', 'event:eren-speech']));
  await expect(page.locator('#story-end-reflection')).toContainText('Reiner');
  expect(errors).toEqual([]);
});
