import { test, expect } from '@playwright/test';

test('story hub lists the acts, opens chapter details and keeps planned chapters locked', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a.story-entry')).toHaveAttribute('href', './historia.html');
  await page.goto('/historia.html');
  await expect(page.locator('.hub-act')).toHaveCount(8);
  await expect(page.locator('#hub-stats')).toContainText('47');
  await expect(page.locator('.hub-card')).toHaveCount(5);

  await page.locator('.hub-act[data-act="6"]').click();
  await expect(page).toHaveURL(/ato=6/);
  await page.locator('.hub-card[data-chapter="32"]').click();
  const detail = page.locator('#hub-detail');
  await expect(detail).toBeVisible();
  await expect(detail.locator('h2')).toHaveText('A última carga');
  await expect(detail).toContainText('Levi contra o Bestial');
  await expect(detail).toContainText('o desfecho é o mesmo');
  await expect(detail.locator('li.death')).toHaveCount(1);

  await page.goto('/historia.html?fase=2');
  await expect(page.locator('#hub-detail h2')).toHaveText('O dia em que a muralha caiu');
  await expect(page.locator('#hub-detail li.death')).toContainText('Carla Yeager');
  expect(errors).toEqual([]);
});
