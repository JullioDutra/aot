import { test, expect } from '@playwright/test';
import { CHECKPOINT_KEY, createCheckpoint } from '../../src/trost-mission.js';

async function ready(page) {
  await page.goto('/'); await page.waitForFunction(() => window.__TROST__?.snapshot().drawCalls > 0);
  await page.click('#settings-button'); await page.selectOption('#quality', 'low'); await page.click('#close-settings');
}
async function walkTo(page, target, radius = 5) {
  // Mouse input through the same listener used by pointer lock; no state setter.
  await page.evaluate(([x, z]) => {
    const s = window.__TROST__.snapshot();
    const desired = Math.atan2(x - s.position[0], -(z - s.position[2]));
    const difference = Math.atan2(Math.sin(desired - s.yaw), Math.cos(desired - s.yaw));
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: difference / .0022, movementY: s.pitch / .0022 }));
  }, target);
  await page.keyboard.down('w');
  await page.waitForFunction(({ target, radius }) => { const p = window.__TROST__.snapshot().position; return Math.hypot(p[0] - target[0], p[2] - target[1]) < radius && p[1] < 3; }, { target, radius });
  await page.keyboard.up('w');
}

test('rescues civilians, recovers supplies and resumes the persisted operation', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page); await page.click('#start-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .2);
  await page.keyboard.press('g'); expect((await page.evaluate(() => window.__TROST__.snapshot())).stage).toBe('rescue');
  await walkTo(page, [-12, 29]); await page.keyboard.press('g');
  await page.waitForFunction(() => window.__TROST__.snapshot().stage === 'escort');
  await page.keyboard.press('Escape');
  const escortPaused = await page.evaluate(() => window.__TROST__.snapshot().civilianPosition);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__TROST__.snapshot().civilianPosition)).toEqual(escortPaused);
  await page.click('#resume-button');
  await walkTo(page, [10, 48]);
  await page.waitForFunction(() => window.__TROST__.snapshot().stage === 'supply');
  await expect(page.locator('#objective')).toContainText('abastecimento');
  expect((await page.evaluate(() => window.__TROST__.snapshot())).civilianPosition).toEqual([10, 0, 48]);
  await walkTo(page, [13, 42]); await page.keyboard.press('r');
  await page.waitForFunction(() => window.__TROST__.snapshot().stage === 'combat');
  const saved = await page.evaluate(() => window.__TROST__.snapshot());
  expect(saved.mission.rescued).toBe(true); expect(saved.mission.supplied).toBe(true); expect(saved.checkpointPersistent).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mission-checkpoint.png') });
  await page.reload(); await page.waitForFunction(() => window.__TROST__?.snapshot().drawCalls > 0);
  await expect(page.locator('#continue-button')).toBeVisible(); await page.click('#continue-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().stage === 'combat');
  const restored = await page.evaluate(() => window.__TROST__.snapshot());
  expect(restored.mission).toEqual(saved.mission); expect(restored.position[0]).toBeCloseTo(13); expect(restored.health).toBe(100);
  expect(errors).toEqual([]);
});

test('a saved cleared route restores defeated titans and still requires extraction', async ({ page }) => {
  const record = createCheckpoint({ rescued: true, supplied: true, defeated: [0, 1, 2], extracted: false }, 120);
  await page.addInitScript(({ key, record }) => {
    if (!sessionStorage.getItem('mission-fixture')) { localStorage.setItem(key, JSON.stringify(record)); sessionStorage.setItem('mission-fixture', '1'); }
  }, { key: CHECKPOINT_KEY, record });
  await ready(page); await page.click('#continue-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().stage === 'extraction');
  expect((await page.evaluate(() => window.__TROST__.snapshot())).titans.every(t => !t.alive)).toBe(true);
  await page.keyboard.press('g'); expect((await page.evaluate(() => window.__TROST__.snapshot())).mode).toBe('playing');
  await walkTo(page, [0, -139], 7); await page.keyboard.press('g');
  await expect(page.locator('#result')).toBeVisible();
  expect((await page.evaluate(() => window.__TROST__.snapshot())).stage).toBe('complete');
  await page.reload(); await page.waitForFunction(() => window.__TROST__?.snapshot().drawCalls > 0);
  await expect(page.locator('#continue-button')).toBeHidden();
});

test('blocked persistent storage still supports session checkpoints', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled for this test'); } }); });
  await ready(page); await page.click('#start-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().elapsed > .2);
  const s = await page.evaluate(() => window.__TROST__.snapshot());
  expect(s.checkpointPersistent).toBe(false); expect(s.checkpoint).not.toBeNull();
  await page.keyboard.press('Escape'); await page.click('#checkpoint-button');
  await page.waitForFunction(() => window.__TROST__.snapshot().mode === 'playing');
  expect((await page.evaluate(() => window.__TROST__.snapshot())).stage).toBe('rescue');
});
