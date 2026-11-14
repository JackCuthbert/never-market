import type { Page } from '@playwright/test';
import { expect, openStorePage, plainPage, test } from './harness.ts';
import { layoutProblems } from './layout.ts';

type Store = {
  store: string;
  url: string;
  fixture: string;
  container: string;
  cells: string;
  signal: string;
  host?: string;
};

const stores: Store[] = [
  {
    store: 'bunnings',
    url: 'https://www.bunnings.com.au/search/products?q=cable&productranges=!Marketplace',
    fixture: 'bunnings/search.html',
    container: '#grid',
    cells: '[data-search-product-tile]',
    signal: 'a[aria-label*="Availability: Marketplace"]',
  },
  {
    store: 'jbhifi',
    url: 'https://www.jbhifi.com.au/search?query=phone%20case&Sold%20by=JB%20Hi-Fi',
    fixture: 'jbhifi/search.html',
    container: '#grid',
    cells: '.ProductCard',
    signal: '[data-testid="marketplace-seller_callout_product-card"]',
  },
  {
    store: 'woolworths',
    url: 'https://www.woolworths.com.au/shop/search/products?searchTerm=xbox&isHideEverydayMarketProducts=true',
    fixture: 'woolworths/search.html',
    container: '#grid',
    cells: '.product-grid-v2--tile',
    signal: '.market-product-message-wrapper',
    host: 'wc-product-tile',
  },
  {
    store: 'bigw',
    url: 'https://www.bigw.com.au/search?text=chair+bath+seat',
    fixture: 'bigw/search.html',
    container: '#grid',
    cells: '#grid > li',
    signal: 'img[alt="Marketplace Logo"]',
  },
];

const countVisible = (page: Page, { cells, signal, host }: Store, marketplaceOnly: boolean): Promise<number> =>
  page.locator(cells).evaluateAll(
    (els, args) =>
      els.filter((el) => {
        if (!el.getClientRects().length) return false;
        const root = args.host ? el.querySelector(args.host)?.shadowRoot : el;
        return !args.marketplaceOnly || Boolean(root?.querySelector(args.signal));
      }).length,
    { signal, host: host ?? '', marketplaceOnly },
  );

for (const entry of stores) {
  const { store, url, fixture, container } = entry;

  test.describe(store, () => {
    test(`${store}: no marketplace card visible`, async ({ context, browser }) => {
      const before = await plainPage(browser, { url, fixture });
      expect(await countVisible(before, entry, true)).toBeGreaterThan(0);
      await before.screenshot({ path: `test-results/${store}/before.png` });
      const page = await openStorePage(context, { url, fixture });
      await expect.poll(() => countVisible(page, entry, true)).toBe(0);
      expect(await countVisible(page, entry, false)).toBeGreaterThan(0);
      await page.screenshot({ path: `test-results/${store}/after.png` });
    });

    test(`${store}: layout has no gaps`, async ({ context }) => {
      const page = await openStorePage(context, { url, fixture });
      await expect.poll(() => countVisible(page, entry, true)).toBe(0);
      expect(await layoutProblems(page, container)).toEqual([]);
    });
  });
}

test('layoutProblems reports an empty cell', async ({ page }) => {
  await page.setContent(`
    <style>ul{display:grid;grid-template-columns:repeat(3,100px);list-style:none;padding:0}li{align-self:start}</style>
    <ul id="l"><li>A</li><li><div style="display:none">hidden</div></li><li>C</li></ul>`);
  expect((await layoutProblems(page, '#l')).length).toBeGreaterThan(0);
});
