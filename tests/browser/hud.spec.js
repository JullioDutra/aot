import { test, expect } from '@playwright/test';

// "Tela limpa" hides the secondary HUD during play and is remembered.
test('the clean screen button hides secondary HUD in Trost and persists across reloads', async ({ page }) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.click('#settings-button'); await page.selectOption('#quality', 'low'); await page.click('#close-settings');
  await page.click('#start-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .2);
  await expect(page.locator('#hud .mission h2')).toBeVisible();
  await page.locator('#hud-toggle').dispatchEvent('click');
  await expect(page.locator('#hud .mission h2')).toBeHidden();
  await expect(page.locator('#objective')).toBeVisible();
  await expect(page.locator('#hud-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await page.waitForFunction(() => window.__TROST__?.snapshot().drawCalls > 0);
  await page.click('#start-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .2);
  await expect(page.locator('#hud .mission h2')).toBeHidden();
  await page.locator('#hud-toggle').dispatchEvent('click');
  await expect(page.locator('#hud .mission h2')).toBeVisible();
  expect(errors).toEqual([]);
});
