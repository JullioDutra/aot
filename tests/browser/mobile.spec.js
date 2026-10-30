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
  const before = (await story()).adapter.kills;
  await page.evaluate(() => window.__STORY__.debug('finisher'));
  await expect(page.locator('#story-finisher')).toBeVisible({ timeout: 10000 });
  await page.locator('#story-finisher').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 7 });
  await expect.poll(async () => (await story()).adapter.kills, { timeout: 10000 }).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});
