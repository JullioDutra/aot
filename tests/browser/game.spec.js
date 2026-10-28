import { test, expect } from '@playwright/test';

test('renders the district, flies with cables, consumes resources, pauses and resets', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__TROST__?.snapshot().drawCalls > 0);
  await expect(page.locator('#landing')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('menu.png') });
  await page.click('#settings-button');
  await page.selectOption('#quality', 'low');
  await page.click('#close-settings');
  await page.click('#start-button');
  await expect(page.locator('#hud')).toBeVisible();
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .2);
  await expect(page.locator('#anchor-left')).toBeVisible();
  const initial = await page.evaluate(() => window.__TROST__.snapshot());
  await page.keyboard.down('q');
  await page.waitForFunction(() => window.__TROST__.snapshot().hooks[0].active);
  await page.keyboard.down(' ');
  await page.waitForFunction(t => window.__TROST__.snapshot().elapsed > t + .7, initial.elapsed);
  const flight = await page.evaluate(() => window.__TROST__.snapshot());
  expect(flight.gas).toBeLessThan(99);
  expect(Math.hypot(...flight.position.map((v, i) => v - initial.position[i]))).toBeGreaterThan(1);
  expect(Math.hypot(...flight.velocity)).toBeGreaterThan(3);
  await page.keyboard.up(' ');
  await page.keyboard.up('q');
  await page.waitForFunction(() => !window.__TROST__.snapshot().hooks[0].active);
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => window.__TROST__.snapshot().blades < 100);
  expect((await page.evaluate(() => window.__TROST__.snapshot())).kills).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('flight.png') });
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  const paused = await page.evaluate(() => window.__TROST__.snapshot().elapsed);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__TROST__.snapshot().elapsed)).toBe(paused);
  await page.click('#restart-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().mode === 'playing');
  const reset = await page.evaluate(() => window.__TROST__.snapshot());
  expect(reset.gas).toBe(100); expect(reset.blades).toBe(100); expect(reset.health).toBe(100); expect(reset.kills).toBe(0); expect(reset.rescued).toBe(false);
  expect(errors).toEqual([]);
});

test('viewport resizes without losing the renderer and settings remain usable', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__TROST__?.snapshot().drawCalls > 0);
  await page.setViewportSize({ width: 760, height: 600 });
  await page.click('#settings-button');
  await expect(page.locator('#settings')).toBeVisible();
  await page.selectOption('#quality', 'low');
  await page.uncheck('#audio-enabled');
  await page.click('#close-settings');
  await expect(page.locator('#start-button')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.click('#start-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#resume-button')).toBeVisible();
});

test('blade preparation spends once, freezes on pause and finishes after resuming', async ({ page }) => {
  await page.goto('/');
  await page.click('#settings-button'); await page.selectOption('#quality', 'low'); await page.click('#close-settings');
  await page.click('#start-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .1);
  // Same input handlers as real clicks; dispatch together to pause before a render tick.
  await page.evaluate(() => {
    const canvas = document.getElementById('game');
    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
  });
  const pending = await page.evaluate(() => window.__TROST__.snapshot());
  expect(pending.blades).toBe(95); expect(pending.bladePhase).toBe('prepare'); expect(pending.kills).toBe(0);
  await page.waitForTimeout(250);
  expect((await page.evaluate(() => window.__TROST__.snapshot())).bladeStrike).toEqual(pending.bladeStrike);
  await page.click('#resume-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().bladePhase === 'ready');
  expect((await page.evaluate(() => window.__TROST__.snapshot())).blades).toBe(95);
  await expect(page.locator('#blade-action')).toContainText('PRONTAS');
});
