import { test, expect } from '@playwright/test';

const snapshot = page => page.evaluate(() => window.__GALLERY__.snapshot());

test('gallery renders the cast lineup, single characters, poses and the titan forms', async ({ page }) => {
  test.setTimeout(150000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/galeria.html');
  await expect.poll(async () => (await snapshot(page)).actors.length, { timeout: 60000 }).toBe(15);
  expect((await snapshot(page)).drawCalls).toBeGreaterThan(50);

  await page.locator('#gallery-list button[data-id="levi"]').click();
  await expect.poll(async () => (await snapshot(page)).actors).toEqual(['levi']);
  await page.locator('#gallery-pose').selectOption('odm');
  await expect.poll(async () => (await snapshot(page)).pose).toBe('odm');
  await expect(page.locator('#gallery-caption')).toContainText('Levi Ackerman · 1.6 m');

  await page.locator('[data-mode="titans"]').click();
  await expect.poll(async () => (await snapshot(page)).mode).toBe('titans');
  await page.locator('#gallery-list button[data-id="colossal"]').click();
  await expect(page.locator('#gallery-caption')).toContainText('60 m');
  await page.goto('/galeria.html?modo=titas&id=ataque');
  await expect(page.locator('#gallery-caption')).toContainText('Titã de Ataque');
  expect(errors).toEqual([]);
});
