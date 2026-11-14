import { expect, openPopupOver, openStorePage, setEnabled, test } from './harness.ts';
import type { BrowserContext, Page } from '@playwright/test';

const BUNNINGS = 'https://www.bunnings.com.au/search/products?page=1&q=cable+management&productranges=!Marketplace';

async function iconActive(context: BrowserContext, target: Page): Promise<unknown> {
  const popup = await openPopupOver(context, target);
  const active = await popup.evaluate(`(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return chrome.runtime.sendMessage({ type: 'getStatus', tabId: tab.id });
  })()`);
  await popup.close();
  return active;
}

test('icon is active on a store page, inactive elsewhere and when disabled', async ({ context }) => {
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  await expect.poll(() => iconActive(context, page)).toBe(true);

  await setEnabled(context, false);
  await page.bringToFront();
  await expect.poll(() => iconActive(context, page)).toBe(false);

  await setEnabled(context, true);
  await page.bringToFront();
  await expect.poll(() => iconActive(context, page)).toBe(true);

  const other = await openStorePage(context, { url: 'https://example.com/', fixture: 'empty.html' });
  expect(await iconActive(context, other)).toBe(false);
});

test('icon stays active after a reload, a hash change and a same-document navigation', async ({ context }) => {
  const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
  await expect.poll(() => iconActive(context, page)).toBe(true);

  await page.evaluate(() => (location.hash = 'top'));
  await page.waitForTimeout(500);
  expect(await iconActive(context, page)).toBe(true);

  await page.evaluate(() => history.pushState({}, '', '/search/products?q=other&productranges=!Marketplace'));
  await page.waitForTimeout(500);
  expect(await iconActive(context, page)).toBe(true);

  await page.reload();
  await page.waitForTimeout(1000);
  expect(await iconActive(context, page)).toBe(true);
});
