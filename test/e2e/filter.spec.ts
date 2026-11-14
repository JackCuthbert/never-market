import type { BrowserContext } from '@playwright/test';
import { expect, openPopup, openStorePage, setEnabled, setToggle, test } from './harness.ts';

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

const FILTERED = `${SEARCH}&productranges=!Marketplace`;
const documentRequests = (context: BrowserContext, base: string): string[] => {
  const urls: string[] = [];
  context.on('request', (r) => {
    if (r.resourceType() === 'document' && r.url().startsWith(base)) urls.push(r.url());
  });
  return urls;
};

test('turning store filters off removes the param, reloads once and keeps history', async ({ context }) => {
  const page = await open(context, FILTERED);
  const lengthBefore = await page.evaluate(() => history.length);
  const requested = documentRequests(context, `${ORIGIN}/search/products`);
  await setToggle(context, false);
  await page.bringToFront();
  await expect(page).toHaveURL(SEARCH);
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(SEARCH);
  expect(requested).toEqual([SEARCH]);
  expect(await page.evaluate(() => history.length)).toBe(lengthBefore);
  await expect(page.locator('[data-search-product-tile]:visible')).toHaveCount(2);
});

test('turning store filters back on adds the param again', async ({ context }) => {
  const page = await open(context, FILTERED);
  await setToggle(context, false);
  await page.bringToFront();
  await expect(page).toHaveURL(SEARCH);
  await setToggle(context, true);
  await page.bringToFront();
  await expect(page).toHaveURL(FILTERED);
});

test('turning the master toggle off strips the param and shows every tile', async ({ context }) => {
  const page = await open(context, FILTERED);
  await setEnabled(context, false);
  await page.bringToFront();
  await expect(page).toHaveURL(SEARCH);
  await expect(page.locator('[data-search-product-tile]:visible')).toHaveCount(4);
});

test('a category page loses the param when store filters are turned off', async ({ context }) => {
  const url = `${ORIGIN}/products/assisted-living?productranges=!Marketplace`;
  const page = await openStorePage(context, { url, fixture: 'bunnings/category.html' });
  await setToggle(context, false);
  await page.bringToFront();
  await expect(page).toHaveURL(`${ORIGIN}/products/assisted-living`);
});

test('bigw never navigates when store filters are turned off', async ({ context }) => {
  const url = 'https://www.bigw.com.au/search?text=chair';
  const page = await openStorePage(context, { url, fixture: 'bigw/search.html' });
  const requested = documentRequests(context, 'https://www.bigw.com.au');
  await setToggle(context, false);
  await page.bringToFront();
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(url);
  expect(requested).toEqual([]);
});

test('turning store filters on adds the param to a page loaded with them off', async ({ context }) => {
  await setToggle(context, false);
  const page = await open(context, SEARCH);
  await page.waitForTimeout(800);
  expect(page.url()).toBe(SEARCH);
  await setToggle(context, true);
  await page.bringToFront();
  await expect(page).toHaveURL(FILTERED);
});

test('turning the master toggle back on adds the param', async ({ context }) => {
  await setEnabled(context, false);
  const page = await open(context, SEARCH);
  await page.waitForTimeout(800);
  expect(page.url()).toBe(SEARCH);
  await setEnabled(context, true);
  await page.bringToFront();
  await expect(page).toHaveURL(FILTERED);
});

test('off then on again straight away still re-adds the param', async ({ context }) => {
  const page = await open(context, SEARCH);
  await expect(page).toHaveURL(FILTERED);
  await setToggle(context, false);
  await page.bringToFront();
  await expect(page).toHaveURL(SEARCH);
  await setToggle(context, true);
  await page.bringToFront();
  await expect(page).toHaveURL(FILTERED);
});

for (const [store, url, fixture, param] of [
  ['jbhifi', 'https://www.jbhifi.com.au/search?query=phone%20case', 'jbhifi/search.html', 'Sold%20by=JB%20Hi-Fi'],
  [
    'woolworths',
    'https://www.woolworths.com.au/shop/search/products?searchTerm=xbox',
    'woolworths/search.html',
    'isHideEverydayMarketProducts=true',
  ],
] as const) {
  test(`${store}: turning store filters on adds the param`, async ({ context }) => {
    await setToggle(context, false);
    const page = await openStorePage(context, { url, fixture });
    await page.waitForTimeout(800);
    expect(page.url()).toBe(url);
    await setToggle(context, true);
    await page.bringToFront();
    await expect(page).toHaveURL(`${url}&${param}`);
  });
}
