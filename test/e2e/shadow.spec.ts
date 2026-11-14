import type { BrowserContext } from '@playwright/test';
import { expect, openStorePage, test } from './harness.ts';

const URL = 'https://www.woolworths.com.au/shop/search/products?searchTerm=xbox&isHideEverydayMarketProducts=true';
const open = (context: BrowserContext) => openStorePage(context, { url: URL, fixture: 'woolworths/search.html' });

test('marketplace tiles are hidden, retailer tiles are visible', async ({ context }) => {
  const page = await open(context);
  await expect(page.locator('#m1')).toBeHidden();
  await expect(page.locator('#r1')).toBeVisible();
});

test('a tile whose shadow root renders 300 ms late is hidden', async ({ context }) => {
  const page = await open(context);
  await page.evaluate(() => window.addTile({ market: true, delayMs: 300, id: 'late' }));
  await expect(page.locator('#late')).toBeVisible();
  await expect.poll(() => page.locator('#late').isVisible(), { timeout: 3000 }).toBe(false);
});

test('a tile reused for a retailer product is shown again', async ({ context }) => {
  const page = await open(context);
  await expect(page.locator('#m1')).toBeHidden();
  await page.evaluate(() => window.retarget('m1', false));
  await expect(page.locator('#m1')).toBeVisible();
});

test('a tile reused for a marketplace product is hidden', async ({ context }) => {
  const page = await open(context);
  await page.evaluate(() => window.retarget('r1', true));
  await expect(page.locator('#r1')).toBeHidden();
});

test('a card with no shadow root yet is left visible and does not throw', async ({ context }) => {
  const errors: string[] = [];
  const page = await open(context);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluate(() => window.addTile({ market: true, delayMs: 60000, id: 'pending' }));
  await page.waitForTimeout(1200);
  await expect(page.locator('#pending')).toBeVisible();
  expect(errors).toEqual([]);
});

declare global {
  interface Window {
    addTile(tile: { market: boolean; delayMs?: number; id?: string }): void;
    retarget(id: string, market: boolean): void;
  }
}
