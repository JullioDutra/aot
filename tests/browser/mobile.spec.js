import { test, expect } from '@playwright/test';

// Touch play: the finisher prompt is a button of its own and the blade glows
// while the window is open; cables search a wider area around the reticle.
const snap = page => page.evaluate(() => window.__TROST__.snapshot());

test('on touch, tapping the FINALIZAR marker kills the titan and the blade button glows', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#start-button').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true });
  await page.locator('#start-button').dispatchEvent('click');
  await expect.poll(async () => (await snap(page)).touchVisible).toBe(true);
  await page.evaluate(() => window.__TROST__.debug.hold(0));
  const n = await page.evaluate(() => window.__TROST__.debug.nape(0));
  const yaw = (await snap(page)).titans[0].yaw;
  await page.evaluate(([x, y, z, sx, sz]) => { window.__TROST__.debug.place(x - sx * 4, y - 1, z - sz * 4, [sx * 9, 2, sz * 9]); window.__TROST__.debug.face(x, y, z); }, [...n, Math.sin(yaw), Math.cos(yaw)]);
  await expect.poll(async () => (await snap(page)).finisher, { timeout: 10000 }).toBe(true);
  await expect(page.locator('body.finisher-ready .touch-button[data-action="attack"]')).toBeVisible();
  await page.locator('#nape-marker').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 5 });
  await page.waitForFunction(() => !window.__TROST__.snapshot().titans[0].alive, null, { timeout: 15000 });
  expect(errors).toEqual([]);
});

test('story on touch: the finisher prompt is tappable and kills the titan', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const story = () => page.evaluate(() => window.__STORY__.snapshot());
  await page.goto('/story.html?fase=7');
  await expect(page.locator('#story-start')).toBeEnabled({ timeout: 60000 });
  await page.locator('#story-start').click();
  for (let i = 0; i < 300; i++) {
    const s = await story();
    if (s.adapter?.control === 'odm' && s.adapter.titans > 0 && !(await page.locator('#story-dialogue').isVisible())) break;
    if (await page.locator('#story-choice').isVisible()) await page.keyboard.press('Digit1');
    else if (await page.locator('#story-dialogue').isVisible()) await page.keyboard.press('Space');
    await page.waitForTimeout(150);
  }
  // A touch on the screen switches the profile to touch.
  await page.locator('#story-canvas').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true });
  await expect.poll(async () => (await story()).inputProfile).toBe('touch');
  // A tap latches the left cable: it holds after the finger is up and the
  // next tap lets go.
  const left = page.locator('.touch-button[data-action="left"]');
  for (let i = 0; i < 20 && !(await story()).cables[0]; i++) {
    await left.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 20 + i }); await left.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 20 + i });
    await page.waitForTimeout(700);
    if (!(await story()).cables[0]) await expect(left).not.toHaveClass(/latched/);
    else break;
  }
  expect((await story()).cables[0]).toBe(true);
  await page.waitForTimeout(800);
  expect((await story()).cables[0]).toBe(true);
  await expect(left).toHaveClass(/latched/);
  await left.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 60 }); await left.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 60 });
  await expect.poll(async () => (await story()).cables[0]).toBe(false);
  await expect(left).not.toHaveClass(/latched/);

  const before = (await story()).adapter.kills;
  await page.evaluate(() => window.__STORY__.debug('finisher'));
  await expect(page.locator('#story-finisher')).toBeVisible({ timeout: 10000 });
  await page.locator('#story-finisher').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 7 });
  await expect.poll(async () => (await story()).adapter.kills, { timeout: 10000 }).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});

// A touch tap on an on-screen button: pointerdown then pointerup, like a thumb.
async function tap(page, selector, pointerId) {
  const target = page.locator(selector);
  await target.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId, isPrimary: false });
  await target.dispatchEvent('pointerup', { pointerType: 'touch', pointerId, isPrimary: false });
}

test('on touch, a cable stays hooked to the titan without the finger and the blade finishes from there', async ({ page }) => {
  test.setTimeout(240000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.click('#settings-button'); await page.selectOption('#quality', 'low'); await page.click('#close-settings');
  await page.locator('#start-button').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true });
  await page.locator('#start-button').dispatchEvent('click');
  await expect.poll(async () => (await snap(page)).touchVisible).toBe(true);
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .2);
  // Stand behind titan 0 and aim at its shoulders, as in titan-hook.spec.js.
  const titan = (await snap(page)).titans[0].position;
  const nape = await page.evaluate(() => window.__TROST__.debug.nape(0));
  await page.evaluate(([x, z]) => { window.__TROST__.debug.hold(0); window.__TROST__.debug.place(x, 0, z + 16); }, titan);
  await page.evaluate(([x, y, z]) => window.__TROST__.debug.face(x, y - 2, z), nape);
  // Wait until the left marker shows an anchor on the settled camera.
  await expect(page.locator('#anchor-left')).toBeVisible({ timeout: 15000 });
  const settled = (await snap(page)).elapsed;
  await page.waitForFunction(t => window.__TROST__.snapshot().elapsed > t + .3, settled);

  // One tap fires the left cable into the titan; the finger is already up.
  await tap(page, '.touch-button[data-action="left"]', 11);
  await page.waitForFunction(() => window.__TROST__.snapshot().hooks[0].titan === 0, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  expect((await snap(page)).hooks[0].active).toBe(true);
  await expect(page.locator('.touch-button[data-action="left"]')).toHaveClass(/latched/);

  // The other cable: one tap hooks, the next tap lets go; the left one stays.
  await tap(page, '.touch-button[data-action="right"]', 12);
  await page.waitForFunction(() => window.__TROST__.snapshot().hooks[1].active, null, { timeout: 15000 });
  await tap(page, '.touch-button[data-action="right"]', 13);
  await page.waitForFunction(() => !window.__TROST__.snapshot().hooks[1].active, null, { timeout: 15000 });
  await expect(page.locator('.touch-button[data-action="right"]')).not.toHaveClass(/latched/);
  expect((await snap(page)).hooks[0].active).toBe(true);

  // Still hanging on the titan, behind the nape: the finisher opens without
  // speed and the blade tap no longer drops the cable.
  const n = await page.evaluate(() => window.__TROST__.debug.nape(0));
  const yaw = (await snap(page)).titans[0].yaw;
  await page.evaluate(([x, y, z, sx, sz]) => { window.__TROST__.debug.place(x - sx * 4, y - 1, z - sz * 4); window.__TROST__.debug.face(x, y, z); }, [...n, Math.sin(yaw), Math.cos(yaw)]);
  await expect.poll(async () => (await snap(page)).finisher, { timeout: 15000 }).toBe(true);
  expect((await snap(page)).hooks[0].titan).toBe(0);
  await tap(page, '.touch-button[data-action="attack"]', 14);
  await page.waitForFunction(() => !window.__TROST__.snapshot().titans[0].alive, null, { timeout: 15000 });
  // The dead titan drops the cable and the button follows.
  await expect(page.locator('.touch-button[data-action="left"]')).not.toHaveClass(/latched/);
  expect((await snap(page)).hooks[0].active).toBe(false);
  expect(errors).toEqual([]);
});
