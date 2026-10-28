import { test, expect } from '@playwright/test';

test('standard gamepad drives cables and camera, resumes safely and pauses on disconnect', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('trost.graphics.v1', 'low');
    window.testPad = { index: 0, id: 'test standard controller', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => window.testPad ? [window.testPad] : [] });
  });
  const input = async (buttons = [], axes = [0, 0, 0, 0]) => page.evaluate(async ({ buttons, axes }) => {
    window.testPad.buttons.forEach((b, i) => { b.pressed = buttons.includes(i); b.value = b.pressed ? 1 : 0; }); window.testPad.axes = axes;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, { buttons, axes });
  await page.goto('/');
  await page.waitForFunction(() => window.__TROST__?.snapshot().controller.armed);
  await input([9]); await page.waitForFunction(() => window.__TROST__.snapshot().mode === 'playing');
  await input(); await page.waitForFunction(() => window.__TROST__.snapshot().controller.armed);
  await expect(page.locator('#gamepad-controls')).toBeVisible();
  await input([6]); await page.waitForFunction(() => window.__TROST__.snapshot().hooks[0].active);
  const initial = await page.evaluate(() => window.__TROST__.snapshot());
  await input([0, 6]);
  await page.waitForFunction(t => window.__TROST__.snapshot().elapsed > t + .4, initial.elapsed);
  expect((await page.evaluate(() => window.__TROST__.snapshot())).gas).toBeLessThan(initial.gas);
  await input([], [.7, -.7, .8, 0]);
  await page.waitForFunction(yaw => window.__TROST__.snapshot().yaw > yaw + .1, initial.yaw);
  expect((await page.evaluate(() => window.__TROST__.snapshot())).hooks[0].active).toBe(false);
  await input([2]); await page.waitForFunction(() => window.__TROST__.snapshot().blades === 95);
  await page.screenshot({ path: testInfo.outputPath('gamepad-flight.png') });
  await input([9]); await page.waitForFunction(() => window.__TROST__.snapshot().mode === 'paused');
  await input([6]); await input([6, 9]);
  await page.waitForFunction(() => window.__TROST__.snapshot().mode === 'playing');
  let s = await page.evaluate(() => window.__TROST__.snapshot());
  expect(s.hooks[0].active).toBe(false); expect(s.controller.armed).toBe(false);
  await input(); await page.waitForFunction(() => window.__TROST__.snapshot().controller.armed);
  await page.evaluate(() => { window.testPad = null; });
  await page.waitForFunction(() => window.__TROST__.snapshot().mode === 'paused');
  s = await page.evaluate(() => window.__TROST__.snapshot());
  expect(s.controller.connected).toBe(false); expect(s.hooks.every(h => !h.active)).toBe(true);
  expect(errors).toEqual([]);
});
