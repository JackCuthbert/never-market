import { expect, openPopup, openPopupOver, openStorePage, setEnabled, setToggle, test } from './harness.ts';

const BUNNINGS = 'https://www.bunnings.com.au/search/products?page=1&q=cable+management&productranges=!Marketplace';
const WOOLWORTHS = 'https://www.woolworths.com.au/shop/search/products?searchTerm=xbox&isHideEverydayMarketProducts=true';

test('css store: popup shows the number of marketplace tiles', async ({ context }) => {
  await setToggle(context, false);
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('#store')).toHaveText('Bunnings');
  await expect(popup.locator('#stats')).toHaveText('2 of 4 listings hidden');
  await expect(popup.locator('#percent')).toHaveText('50%');
});

test('shadow store: popup counts a late-rendered marketplace tile', async ({ context }) => {
  await setToggle(context, false);
  const page = await openStorePage(context, { url: WOOLWORTHS, fixture: 'woolworths/search.html' });
  await page.evaluate(() => window.addTile({ market: true, delayMs: 300, id: 'late' }));
  await expect(page.locator('#late')).toBeHidden();
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('#stats')).toHaveText('2 of 3 listings hidden');
});

test('count updates while the popup is open', async ({ context }) => {
  await setToggle(context, false);
  const page = await openStorePage(context, { url: WOOLWORTHS, fixture: 'woolworths/search.html' });
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('#stats')).toContainText('1 of');
  await page.evaluate(() => window.addTile({ market: true, id: 'more' }));
  await expect(popup.locator('#stats')).toContainText('2 of', { timeout: 3000 });
});

test('master toggle off shows Off and greys the stats', async ({ context }) => {
  await setEnabled(context, false);
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'off');
  await expect(popup.locator('#stats')).toHaveText('Hiding is off. 4 listings shown.');
});

test('filtered by the store: no count, a note, and a button that turns the filter off', async ({ context }) => {
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'empty.html' });
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'filtered');
  await expect(popup.locator('#stats')).toContainText('Bunnings is filtering for you');
  await expect(popup.locator('#extra')).toBeHidden();
  await popup.locator('#unfilter').click();
  await expect(popup.locator('#use-store-filters')).not.toBeChecked();
  await expect(popup.locator('#stats')).toHaveText('No listings found yet');
  await expect(popup.locator('#stats')).toHaveText('No listings found yet');
});

test('filtered Bunnings page with marketplace tiles still shows the extension count', async ({ context }) => {
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('#extra')).toHaveText('2 more hidden by the extension');
});

test('filtered but some cards slipped through: shows how many the extension hid', async ({ context }) => {
  const url = 'https://www.jbhifi.com.au/search?query=phone%20case&Sold%20by=JB%20Hi-Fi';
  const page = await openStorePage(context, { url, fixture: 'jbhifi/search.html' });
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('#extra')).toHaveText('2 more hidden by the extension');
});

test('a store without a urlFilter is never filtered', async ({ context }) => {
  const page = await openStorePage(context, { url: 'https://www.bigw.com.au/search?text=chair', fixture: 'bigw/search.html' });
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('#stats')).toHaveText('2 of 4 listings hidden');
});

test('a page without the content script shows the unsupported message', async ({ context }) => {
  const popup = await openPopup(context);
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'unsupported');
  await expect(popup.locator('#status')).toBeHidden();
  await expect(popup.locator('#store-list a')).toHaveText(['Big W', 'Bunnings', 'JB Hi-Fi', 'Woolworths']);
  await expect(popup.locator('#store-list a').first()).toHaveAttribute('href', 'https://www.bigw.com.au/');
  await expect(popup.locator('#store-list a').first()).toHaveAttribute('target', '_blank');
});

declare global {
  interface Window {
    addTile(tile: { market: boolean; delayMs?: number; id?: string }): void;
  }
}
