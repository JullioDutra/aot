import { test, expect } from '@playwright/test';

// The finisher in the story mode: behind a horde titan's nape, close and
// fast, the prompt appears over the nape and the next cut kills it.
const snap = page => page.evaluate(() => window.__STORY__.snapshot());

test('chapter 7: the finisher prompt opens behind a nape and the cut kills the titan', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/story.html?fase=7');
  await expect(page.locator('#story-start')).toBeEnabled({ timeout: 60000 });
  await page.locator('#story-start').click();
  await expect.poll(async () => (await snap(page)).mode).toBe('playing');
  for (let i = 0; i < 300; i++) {
    const s = await snap(page);
    if (s.adapter?.control === 'odm' && s.adapter.titans > 0 && !(await page.locator('#story-dialogue').isVisible())) break;
    if (await page.locator('#story-choice').isVisible()) await page.keyboard.press('Digit1');
    else if (await page.locator('#story-dialogue').isVisible()) await page.keyboard.press('Space');
    await page.waitForTimeout(150);
  }
  const before = (await snap(page)).adapter.kills;
  expect(await page.evaluate(() => window.__STORY__.debug('finisher'))).toBe(true);
  await expect.poll(async () => (await snap(page)).adapter.finisher, { timeout: 10000 }).toBe(true);
  await expect(page.locator('#story-finisher')).toBeVisible();
  await page.mouse.click(640, 400);
  await expect.poll(async () => (await snap(page)).adapter.kills, { timeout: 10000 }).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});
