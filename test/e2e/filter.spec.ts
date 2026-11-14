import type { BrowserContext } from '@playwright/test';
import { expect, openPopup, openStorePage, setToggle, test } from './harness.ts';

const ORIGIN = 'https://www.bunnings.com.au';
const SEARCH = `${ORIGIN}/search/products?page=1&q=cable+management&sort=BoostOrder`;
const open = (context: BrowserContext, url: string) => openStorePage(context, { url, fixture: 'bunnings/search.html' });

test('search URL without the param is redirected, other params kept', async ({ context }) => {
  const page = await open(context, SEARCH);
  await expect(page).toHaveURL(`${SEARCH}&productranges=!Marketplace`);
});

test('URL that already has the param is not redirected', async ({ context }) => {
  for (const url of [`${SEARCH}&productranges=!Marketplace`, `${SEARCH}&productranges=Other`]) {
    const page = await open(context, url);
    await page.waitForTimeout(1200);
    expect(page.url()).toBe(url);
  }
});

test('non-search path is not redirected', async ({ context }) => {
  for (const url of [`${ORIGIN}/p/123`, `${ORIGIN}/`]) {
    const page = await open(context, url);
    await page.waitForTimeout(1200);
    expect(page.url()).toBe(url);
  }
});

test('bigw search URL is not redirected', async ({ context }) => {
  const url = 'https://www.bigw.com.au/search?text=chair+bath+seat';
  const errors: string[] = [];
  const page = await openStorePage(context, { url, fixture: 'bigw/search.html' });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(1200);
  expect(page.url()).toBe(url);
  expect(errors).toEqual([]);
});

test('no redirect loop', async ({ context }) => {
  const requested: string[] = [];
  context.on('request', (r) => requested.push(r.url()));
  const page = await open(context, SEARCH);
  await expect(page).toHaveURL(/productranges/);
  await page.waitForTimeout(1500);
  expect(requested.filter((u) => u.startsWith(`${ORIGIN}/search/products`)).length).toBeLessThanOrEqual(2);
});

test('toggle off: the URL is never changed, cards are still hidden', async ({ context }) => {
  await setToggle(context, false);
  const page = await open(context, SEARCH);
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(SEARCH);
  await expect(page.locator('[data-search-product-tile]:visible')).toHaveCount(2);
});

test('in-app navigation is caught', async ({ context }) => {
  const page = await open(context, `${ORIGIN}/`);
  await page.evaluate(() => history.pushState({}, '', '/search/products?q=a'));
  await expect.poll(() => page.url(), { timeout: 2000 }).toContain('productranges=!Marketplace');
});

test('popup checkbox is checked by default and persists', async ({ context }) => {
  const popup = await openPopup(context);
  await expect(popup.locator('#use-store-filters')).toBeChecked();
  await setToggle(context, false);
  await popup.reload();
  await expect(popup.locator('#use-store-filters')).not.toBeChecked();
});
