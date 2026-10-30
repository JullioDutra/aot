import { test, expect } from '@playwright/test';

test('home shows Eren and Mikasa, the 47-chapter summary and how to play, then hides on start', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__HOME__?.snapshot().scenes === 3, null, { timeout: 60000 });
  await expect(page.locator('.home-scene')).toHaveCount(3);
  await expect(page.locator('.home-scene').first()).toBeInViewport();
  const painted = await page.evaluate(() => [...document.querySelectorAll('.home-scene canvas')].map(c => {
    const d = c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data; return d[3] > 0 && d[0] + d[1] + d[2] > 0;
  }));
  expect(painted).toEqual([true, true, true]);
  await expect(page.locator('#home-acts .home-act')).toHaveCount(8);
  await expect(page.locator('#home-acts li')).toHaveCount(47);
  await expect(page.locator('#home-acts a[href="./story.html?fase=47"]')).toHaveText('Depois da batalha');
  await expect(page.locator('#home-inputs .home-input')).toHaveCount(3);
  await page.click('.home-more');
  await expect(page.locator('#home-summary h2')).toBeInViewport();
  await page.evaluate(() => document.getElementById('home').scrollTo(0, 0));
  await page.click('#start-button');
  await expect(page.locator('#home')).toBeHidden();
  await expect(page.locator('#hud')).toBeVisible();
  expect(errors).toEqual([]);
});

test('short landscape screens show one home scene at a time beside the title', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.waitForFunction(() => window.__HOME__?.snapshot().scenes === 3, null, { timeout: 60000 });
  await expect(page.locator('#start-button')).toBeInViewport();
  await expect(page.locator('.home-scene.active')).toHaveCount(1);
  await expect(page.locator('.home-scene.active')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
