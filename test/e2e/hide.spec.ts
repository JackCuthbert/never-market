import type { Page } from '@playwright/test';
import { expect, openPopupOver, openStorePage, setToggle, test } from './harness.ts';

const BUNNINGS = 'https://www.bunnings.com.au/search/products?page=1&q=cable+management&productranges=!Marketplace';
const JBHIFI = 'https://www.jbhifi.com.au/search?query=phone%20case&Sold%20by=JB%20Hi-Fi';
const BIGW = 'https://www.bigw.com.au/search?text=chair+bath+seat';

const visibleCount = (page: Page, selector: string): Promise<number> =>
  page.locator(selector).evaluateAll((els) => els.filter((e) => e.getClientRects().length).length);

test('bunnings: marketplace tiles are not visible, retailer tiles are', async ({ context }) => {
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  await expect.poll(() => visibleCount(page, '[data-search-product-tile]')).toBe(2);
  await expect(page.locator('#trap')).toBeVisible();
});

test('bunnings: hidden even though the cell has display:flex', async ({ context }) => {
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  const first = page.locator('[data-search-product-tile]').first();
  await expect(first).toHaveClass('flex');
  await expect(first).toBeHidden();
});

test('jbhifi: marketplace cards hidden, plain and Online Only cards visible', async ({ context }) => {
  const page = await openStorePage(context, { url: JBHIFI, fixture: 'jbhifi/search.html' });
  await expect.poll(() => visibleCount(page, '.ProductCard')).toBe(2);
  await expect(page.getByText('Online only case')).toBeVisible();
});

test('bigw: marketplace cells hidden, plain and ONLINE ONLY cells visible', async ({ context }) => {
  const page = await openStorePage(context, { url: BIGW, fixture: 'bigw/search.html' });
  await expect.poll(() => visibleCount(page, '#grid > li')).toBe(2);
  await expect(page.getByText('ONLINE ONLY')).toBeVisible();
});

test('bigw: the URL is never changed', async ({ context }) => {
  const page = await openStorePage(context, { url: BIGW, fixture: 'bigw/search.html' });
  await page.waitForTimeout(1000);
  expect(page.url()).toBe(BIGW);
});

test('nodes are not removed', async ({ context }) => {
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  await expect(page.locator('[data-search-product-tile]:visible')).toHaveCount(2);
  await expect(page.locator('[data-search-product-tile]')).toHaveCount(4);
});

test('empty results page does not throw', async ({ context }) => {
  const errors: string[] = [];
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'empty.html' });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('jbhifi: loading placeholders are hidden and not counted', async ({ context }) => {
  await setToggle(context, false);
  const page = await openStorePage(context, { url: JBHIFI, fixture: 'jbhifi/search.html' });
  await page.evaluate(() => {
    const skeleton = document.createElement('div');
    skeleton.dataset['testid'] = 'product-card-skeleton';
    skeleton.textContent = 'loading';
    document.querySelector('#grid')?.append(skeleton);
  });
  await expect(page.locator('[data-testid="product-card-skeleton"]')).toBeHidden();
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('#stats')).toHaveText('2 of 4 listings hidden');
});
