import { test, expect } from '@playwright/test';

const snapshot = page => page.evaluate(() => window.__TROST__.snapshot());

test('touch drives Trost through on-screen controls and prompts follow the last input', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#landing-input')).toHaveText('TECLADO + MOUSE');
  await page.locator('#start-button').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true });
  await page.locator('#start-button').dispatchEvent('click');
  await expect.poll(async () => (await snapshot(page)).mode).toBe('playing');
  await expect.poll(async () => (await snapshot(page)).touchVisible).toBe(true);
  expect((await snapshot(page)).inputProfile).toBe('touch');
  await expect(page.locator('#keyboard-controls')).toBeHidden();

  // Drag on the camera zone turns the view.
  const yaw = (await snapshot(page)).yaw;
  const look = page.locator('.touch-look-zone');
  await look.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 2, clientX: 900, clientY: 400 });
  await look.dispatchEvent('pointermove', { pointerType: 'touch', pointerId: 2, clientX: 1000, clientY: 400 });
  await look.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 2, clientX: 1000, clientY: 400 });
  await expect.poll(async () => (await snapshot(page)).yaw).toBeGreaterThan(yaw + .3);

  // A tap on the left cable button attaches it and it stays after the
  // finger lifts; the next tap lets go.
  const cable = page.locator('.touch-button[data-action="left"]');
  await cable.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 3 });
  await expect.poll(async () => (await snapshot(page)).hooks[0].active).toBe(true);
  await cable.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 3 });
  await page.waitForTimeout(500);
  expect((await snapshot(page)).hooks[0].active).toBe(true);
  await cable.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 5 });
  await cable.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 5 });
  await expect.poll(async () => (await snapshot(page)).hooks[0].active).toBe(false);

  // The on-screen pause button pauses and hides the overlay.
  await page.locator('.touch-button[data-action="menu"]').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 4 });
  await expect.poll(async () => (await snapshot(page)).mode).toBe('paused');
  expect((await snapshot(page)).touchVisible).toBe(false);
  await expect(page.locator('#touch-pause-help')).toBeVisible();

  // A key press returns to keyboard prompts.
  await page.keyboard.press('KeyW');
  await expect.poll(async () => (await snapshot(page)).inputProfile).toBe('keyboard');
  await expect(page.locator('#touch-pause-help')).toBeHidden();
  expect(errors).toEqual([]);
});

test('arena shows touch controls and maps the transform button', async ({ page }) => {
  await page.goto('/arena.html');
  await page.locator('#arena-start').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1 });
  await page.locator('#arena-start').dispatchEvent('click');
  await expect.poll(() => page.evaluate(() => window.__TITAN_ARENA__.snapshot().touchVisible)).toBe(true);
  await page.locator('.touch-button[data-action="transform"]').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 2 });
  await page.locator('.touch-button[data-action="transform"]').dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 2 });
  await expect.poll(() => page.evaluate(() => window.__TITAN_ARENA__.snapshot().form), { timeout: 15000 }).not.toBe('human');
  await expect(page.locator('#arena-fullscreen')).toBeVisible();
});
