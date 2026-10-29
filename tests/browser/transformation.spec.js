import { test, expect } from '@playwright/test';

const fx = page => page.evaluate(() => window.__TITAN_ARENA__.snapshot().transformFx);

test('arena transformation strikes lightning, freezes on pause and clears after the form appears', async ({ page }) => {
  // Software rendering runs the arena at ~5 fps; the 5 s effect takes ~20 s.
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/arena.html');
  await page.locator('#arena-start').click();
  await expect.poll(async () => (await fx(page)).visible).toBe(false);
  await page.keyboard.press('KeyT');
  await expect.poll(async () => (await fx(page)).visible).toBe(true);
  await expect.poll(async () => (await fx(page)).clock).toBeGreaterThan(.4);
  await page.keyboard.press('Escape');
  await expect(page.locator('#arena-pause')).toBeVisible();
  const frozen = (await fx(page)).clock;
  await page.waitForTimeout(400);
  expect((await fx(page)).clock).toBe(frozen);
  await page.locator('#arena-resume').click();
  await expect.poll(async () => (await fx(page)).clock, { timeout: 60000 }).toBeNull();
  expect(errors).toEqual([]);
});
