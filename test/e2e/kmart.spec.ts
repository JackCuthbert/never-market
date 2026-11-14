import { mkdirSync } from 'node:fs';
import type { BrowserContext } from '@playwright/test';
import { expect, openPopupOver, openStorePage, setEnabled, test } from './harness.ts';

const ORIGIN = 'https://www.kmart.com.au';
const SEARCH = `${ORIGIN}/search/?searchTerm=towel`;
const CATEGORY = `${ORIGIN}/category/towels/`;
const KEPT = ['#kmart', '#both', '#online'];
const HIDDEN = ['#target', '#officeworks', '#market', '#kmartish'];

const search = (context: BrowserContext, url = SEARCH) => openStorePage(context, { url, fixture: 'kmart/search.html' });
const category = (context: BrowserContext) => openStorePage(context, { url: CATEGORY, fixture: 'kmart/category.html' });

test('search: only cards sold by Kmart are visible', async ({ context }) => {
  const page = await search(context);
  for (const id of KEPT) await expect(page.locator(id)).toBeVisible();
  for (const id of HIDDEN) await expect(page.locator(id)).toBeHidden();
});

test('category: only cards sold by Kmart are visible, URL is untouched', async ({ context }) => {
  const page = await category(context);
  for (const id of KEPT) await expect(page.locator(id)).toBeVisible();
  for (const id of HIDDEN) await expect(page.locator(id)).toBeHidden();
  await page.waitForTimeout(1200);
  expect(page.url()).toBe(CATEGORY);
});

test('a card added later is hidden unless Kmart sells it', async ({ context }) => {
  const page = await category(context);
  await page.evaluate(() => {
    window.addCard({ id: 'late-other', seller: 'Target' });
    window.addCard({ id: 'late-kmart', seller: 'Kmart' });
  });
  await expect(page.locator('#late-kmart')).toBeVisible();
  await expect(page.locator('#late-other')).toBeHidden();
});

test('search URL is never changed', async ({ context }) => {
  const page = await search(context);
  await page.waitForTimeout(1200);
  expect(page.url()).toBe(SEARCH);
});

test('turning the master toggle off shows every card', async ({ context }) => {
  const page = await search(context);
  await setEnabled(context, false);
  await page.bringToFront();
  await expect(page.locator('#grid > li:visible')).toHaveCount(7);
});

test('popup: counts on a search page, never filtered, no store filters toggle', async ({ context }) => {
  const page = await search(context);
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'on');
  await expect(popup.locator('#stats')).toHaveText('4 of 7 listings hidden');
  await expect(popup.locator('#use-store-filters')).toBeHidden();
  await expect(popup.locator('#enabled')).toBeVisible();
});

test('popup: count on a category page', async ({ context }) => {
  const page = await category(context);
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('#store')).toHaveText('Kmart');
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'on');
  await expect(popup.locator('#stats')).toHaveText('4 of 7 listings hidden');
  await expect(popup.locator('#percent')).toHaveText('57%');
});

const NOTE =
  "Kmart's own marketplace filter still shows Target and Officeworks items as if Kmart sold them. Never Market hides every listing not sold by Kmart instead.";

for (const scheme of ['light', 'dark'] as const) {
  test(`popup: Kmart shows the seller note (${scheme})`, async ({ context }) => {
    const page = await category(context);
    const popup = await openPopupOver(context, page);
    await expect(popup.locator('#note')).toHaveText(NOTE);
    await expect(popup.locator('#use-store-filters')).toBeHidden();
    expect(await popup.locator('.settings .row').evaluateAll((rows) => rows.filter((r) => r.getClientRects().length).length)).toBe(1);
    expect(await popup.locator('#enabled').evaluate((el) => getComputedStyle(el.closest('.row')!).borderBottomWidth)).toBe('0px');
    mkdirSync('test-results/popup', { recursive: true });
    await popup.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await popup.locator('main').screenshot({ path: `test-results/popup/kmart-${scheme}.png` });
  });
}

declare global {
  interface Window {
    addCard(card: { id: string; seller: string }): void;
  }
}
