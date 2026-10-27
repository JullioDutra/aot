import { test, expect } from '@playwright/test';

async function enterArena(page) {
  await page.goto('/arena.html');
  await page.waitForFunction(() => window.__TITAN_ARENA__?.snapshot().drawCalls > 0);
  await page.selectOption('#arena-quality', 'low');
  await page.click('#arena-start');
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().mode === 'playing');
}

test('transforms, strikes the opponent, guards, returns to human and resets', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await enterArena(page);
  await expect(page.locator('#arena-form')).toHaveText('HUMANO');
  await page.keyboard.press('t');
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().form === 'transforming');
  await page.keyboard.press('Escape');
  await expect(page.locator('#arena-pause')).toBeVisible();
  const paused = await page.evaluate(() => window.__TITAN_ARENA__.snapshot().formClock);
  const pausedAudio = await page.evaluate(() => window.__TITAN_ARENA__.snapshot().audio);
  expect(pausedAudio.paused).toBe(true); expect(pausedAudio.activeVoices).toBe(0);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__TITAN_ARENA__.snapshot().formClock)).toBe(paused);
  await page.click('#arena-resume');
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().form === 'titan');
  await expect(page.locator('#arena-form')).toHaveText('TITÃ · 15 METROS');
  // These are ordinary game inputs; no state setters or teleports are exposed.
  await page.keyboard.down('w');
  await page.waitForFunction(() => { const s = window.__TITAN_ARENA__.snapshot(); return Math.hypot(s.player.x - s.enemy.x, s.player.z - s.enemy.z) < 8.5; });
  await page.keyboard.up('w');
  await page.keyboard.press('q');
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().enemy.health < 160);
  const attack = await page.evaluate(() => window.__TITAN_ARENA__.snapshot());
  expect(attack.stats.hits).toBe(1); expect(attack.stamina).toBeLessThan(100);
  expect(attack.audio.available).toBe(true); expect(attack.audio.played).toBeGreaterThan(0);
  await page.waitForFunction(() => !window.__TITAN_ARENA__.snapshot().action);
  await page.mouse.down({ button: 'right' });
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().guarding);
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().heroRig.elbows.every(angle => angle < -1));
  await page.screenshot({ path: testInfo.outputPath('titan-combat.png') });
  await page.mouse.up({ button: 'right' });
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().form === 'human');
  const exited = await page.evaluate(() => window.__TITAN_ARENA__.snapshot());
  expect(exited.fatigue).toBeGreaterThan(0); expect(exited.transforms).toBe(1); expect(exited.energy).toBeLessThan(85);
  await page.keyboard.press('Escape');
  await page.click('#arena-restart');
  const reset = await page.evaluate(() => window.__TITAN_ARENA__.snapshot());
  expect(reset.form).toBe('human'); expect(reset.transforms).toBe(0); expect(reset.health).toBe(100); expect(reset.enemy.health).toBe(160);
  expect(errors).toEqual([]);
});

test('audio and camera motion can be disabled before entering combat', async ({ page }) => {
  await page.goto('/arena.html');
  await page.waitForFunction(() => window.__TITAN_ARENA__?.snapshot().drawCalls > 0);
  await page.selectOption('#arena-quality', 'low');
  await page.uncheck('#arena-sound'); await page.uncheck('#arena-shake');
  await page.click('#arena-start'); await page.keyboard.press('t');
  await page.waitForFunction(() => window.__TITAN_ARENA__.snapshot().form === 'titan');
  const s = await page.evaluate(() => window.__TITAN_ARENA__.snapshot());
  expect(s.audio.enabled).toBe(false); expect(s.audio.activeVoices).toBe(0); expect(s.audio.played).toBe(0); expect(s.shakeEnabled).toBe(false);
});

test('Trost links to the separate arena and returning preserves access to the original game', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('a.arena-entry').click();
  await page.waitForFunction(() => window.__TITAN_ARENA__?.snapshot().drawCalls > 0);
  await expect(page.locator('#arena-intro')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('arena-intro.png') });
  await page.setViewportSize({ width: 760, height: 600 });
  await expect(page.locator('#arena-start')).toBeInViewport();
  await page.locator('.arena-brand').click();
  await page.waitForFunction(() => window.__TROST__?.snapshot().drawCalls > 0);
  await expect(page.locator('#start-button')).toBeVisible();
});
