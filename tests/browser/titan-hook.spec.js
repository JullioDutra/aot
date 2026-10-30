import { test, expect } from '@playwright/test';

const snap = page => page.evaluate(() => window.__TROST__.snapshot());

test('Trost cables hook a titan body, follow it, swing around it and open the finisher at the nape', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForFunction(() => window.__TROST__?.snapshot().drawCalls > 0);
  await page.click('#settings-button'); await page.selectOption('#quality', 'low'); await page.click('#close-settings');
  await page.click('#start-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .2);
  // Titan 0 looks toward -z; stand behind it on its back side and aim at the shoulders.
  const titan = (await snap(page)).titans[0].position;
  const nape = await page.evaluate(() => window.__TROST__.debug.nape(0));
  await page.evaluate(([x, z]) => { window.__TROST__.debug.hold(0); window.__TROST__.debug.place(x, 0, z + 16); }, titan);
  await page.evaluate(([x, y, z]) => window.__TROST__.debug.face(x, y - 2, z), nape);
  // Let the camera settle behind the cadet before firing the cable.
  await page.waitForFunction(() => { const s = window.__TROST__.snapshot(); return s.elapsed > 0; });
  await page.waitForTimeout(1200);
  await page.keyboard.down('q');
  await page.waitForFunction(() => window.__TROST__.snapshot().hooks[0].titan === 0, null, { timeout: 15000 });
  // The hooked point rides along when the titan moves.
  const before = (await snap(page)).hooks[0].point;
  await page.evaluate(() => { window.__TROST__.debug.hold(0, false); });
  await page.waitForFunction(p => { const h = window.__TROST__.snapshot().hooks[0]; return h.active && Math.hypot(h.point[0] - p[0], h.point[2] - p[2]) > .3; }, before, { timeout: 20000 });
  // Swinging with D on the cable moves the cadet sideways around the anchor.
  await page.keyboard.down('d');
  await page.waitForFunction(() => { const s = window.__TROST__.snapshot(); return !s.grounded && Math.hypot(s.velocity[0], s.velocity[2]) > 2; }, null, { timeout: 15000 });
  await page.keyboard.up('d'); await page.keyboard.up('q');
  // Close and fast behind the nape: the finisher opens and the cut kills in slow motion.
  await page.evaluate(() => window.__TROST__.debug.hold(0));
  const n = await page.evaluate(() => window.__TROST__.debug.nape(0));
  const yaw = (await snap(page)).titans[0].yaw;
  await page.evaluate(([x, y, z, sx, sz]) => { window.__TROST__.debug.place(x - sx * 4, y - 1, z - sz * 4, [sx * 9, 2, sz * 9]); window.__TROST__.debug.face(x, y, z); }, [...n, Math.sin(yaw), Math.cos(yaw)]);
  await expect.poll(async () => (await snap(page)).finisher, { timeout: 10000 }).toBe(true);
  await expect(page.locator('#nape-marker.finisher')).toBeVisible();
  await page.evaluate(() => { const c = document.getElementById('game'); c.dispatchEvent(new MouseEvent('mousedown', { button: 0 })); c.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); });
  await page.waitForFunction(() => !window.__TROST__.snapshot().titans[0].alive, null, { timeout: 15000 });
  expect(errors).toEqual([]);
});
