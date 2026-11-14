import { expect, openPopup, openStorePage, setEnabled, test } from './harness.ts';

const BUNNINGS = 'https://www.bunnings.com.au/search/products?page=1&q=cable+management&productranges=!Marketplace';
const WOOLWORTHS = 'https://www.woolworths.com.au/shop/search/products?searchTerm=xbox&isHideEverydayMarketProducts=true';

test('css store: enabled off shows every tile, back on hides marketplace tiles without reload', async ({ context }) => {
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  const tiles = page.locator('[data-search-product-tile]:visible');
  await expect(tiles).toHaveCount(2);
  await setEnabled(context, false);
  await expect(tiles).toHaveCount(4);
  await setEnabled(context, true);
  await expect(tiles).toHaveCount(2);
});

test('shadow store: enabled off shows every tile, back on hides marketplace tiles without reload', async ({ context }) => {
  const page = await openStorePage(context, { url: WOOLWORTHS, fixture: 'woolworths/search.html' });
  await expect(page.locator('#m1')).toBeHidden();
  await setEnabled(context, false);
  await expect(page.locator('#m1')).toBeVisible();
  await expect(page.locator('[data-never-market]')).toHaveCount(0);
  await page.evaluate(() => window.addTile({ market: true, id: 'while-off' }));
  await page.waitForTimeout(1200);
  await expect(page.locator('#while-off')).toBeVisible();
  await setEnabled(context, true);
  await expect(page.locator('#m1')).toBeHidden();
  await expect(page.locator('#while-off')).toBeHidden();
});

test('enabled off blocks the redirect', async ({ context }) => {
  await setEnabled(context, false);
  const url = 'https://www.bunnings.com.au/search/products?q=a';
  const page = await openStorePage(context, { url, fixture: 'bunnings/search.html' });
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(url);
});

test('popup enabled checkbox is checked by default and persists', async ({ context }) => {
  const popup = await openPopup(context);
  await expect(popup.locator('#enabled')).toBeChecked();
  await setEnabled(context, false);
  await popup.reload();
  await expect(popup.locator('#enabled')).not.toBeChecked();
});

declare global {
  interface Window {
    addTile(tile: { market: boolean; delayMs?: number; id?: string }): void;
  }
}
