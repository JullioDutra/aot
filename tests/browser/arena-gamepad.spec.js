import { test, expect } from '@playwright/test';

test('arena gamepad transforms, attacks, guards, resumes safely and returns to human', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.arenaTestPad = { index: 0, id: 'arena test controller', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => window.arenaTestPad.connected ? [window.arenaTestPad] : [] });
  });
  const input = async (buttons = [], axes = [0, 0, 0, 0]) => page.evaluate(async ({ buttons, axes }) => {
    window.arenaTestPad.buttons.forEach((b, i) => { b.pressed = buttons.includes(i); b.value = b.pressed ? 1 : 0; }); window.arenaTestPad.axes = axes;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, { buttons, axes });
  await page.goto('/arena.html'); await page.selectOption('#arena-quality', 'low');
  await page.waitForFunction(() => window.__TITAN_ARENA__?.snapshot().controller.armed);
  await input([9]); await input();
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().controller.armed);
  await expect(page.locator('#arena-gamepad-controls')).toBeVisible();
  await input([5]); await input();
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().form === 'titan');
  await input([], [0, -1, 0, 0]);
  await page.waitForFunction(() => { const s = window.__TITAN_ARENA__.snapshot(); return Math.hypot(s.player.x - s.enemy.x, s.player.z - s.enemy.z) < 8.5; });
  await input([3]); await input();
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().enemy.health < 160);
  await page.waitForFunction(() => !window.__TITAN_ARENA__.snapshot().action);
  await input([6]); await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().guarding);
  await page.screenshot({ path: testInfo.outputPath('arena-gamepad-guard.png') });
  await input([6, 9]); await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().mode === 'paused');
  const paused = await page.evaluate(() => window.__TITAN_ARENA__.snapshot());
  expect(paused.guarding).toBe(false); expect(paused.regenerating).toBe(false);
  await input([6]); await input([6, 9]);
  expect((await page.evaluate(() => window.__TITAN_ARENA__.snapshot())).guarding).toBe(false);
  await input(); await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().controller.armed);
  await input([11]); await input(); expect((await page.evaluate(() => window.__TITAN_ARENA__.snapshot())).lock).toBe(false);
  await input([1]); await input(); await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().form === 'human');
  await page.evaluate(() => { window.arenaTestPad.connected = false; });
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().mode === 'paused');
  expect((await page.evaluate(() => window.__TITAN_ARENA__.snapshot())).controller.connected).toBe(false);
  await page.evaluate(() => { window.arenaTestPad.connected = true; }); await input(); await input([8]);
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().transforms === 0);
  expect((await page.evaluate(() => window.__TITAN_ARENA__.snapshot())).health).toBe(100);
  expect(errors).toEqual([]);
});
