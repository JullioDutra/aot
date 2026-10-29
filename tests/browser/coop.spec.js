import { test, expect } from '@playwright/test';

const snap = page => page.evaluate(() => window.__COOP__.snapshot());

test('co-op splits the screen, shares the keyboard and lets a partner revive the other', async ({ page }) => {
  // Two viewports with software rendering run at a few frames per second.
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/coop.html');
  await page.locator('#coop-p1').selectOption('levi');
  await page.locator('#coop-p2').selectOption('mikasa');
  await page.locator('#coop-start').click();
  await expect.poll(async () => (await snap(page)).state).toBe('playing');
  const start = await snap(page);
  expect(start.players.map(p => p.id)).toEqual(['levi', 'mikasa']);
  expect(start.titans).toBe(12);
  await expect(page.locator('#coop-sources')).toContainText('teclado (IJKL)');

  // Player 2 walks on IJKL while player 1 stays put.
  const before = (await snap(page)).players[1].position;
  await page.keyboard.down('KeyI');
  await expect.poll(async () => (await snap(page)).players[1].position[2], { timeout: 30000 }).toBeLessThan(before[2] - .5);
  await page.keyboard.up('KeyI');

  // Player 1 goes down; player 2 holds H nearby until the bar fills.
  await page.evaluate(() => { window.__COOP__.debugDown(0); window.__COOP__.debugMove(1, window.__COOP__.snapshot().players[0].position); });
  await expect.poll(async () => (await snap(page)).players[0].state).toBe('down');
  await page.keyboard.down('KeyH');
  await expect.poll(async () => (await snap(page)).players[0].state, { timeout: 90000 }).toBe('active');
  await page.keyboard.up('KeyH');
  expect((await snap(page)).players[0].health).toBe(50);
  expect(errors).toEqual([]);
});
