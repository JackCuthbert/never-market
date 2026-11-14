import { chromium, expect, test as base } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '../../dist');

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    const userDataDir = mkdtempSync(join(tmpdir(), 'never-market-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: !process.env['LIVE'],
      args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
    });
    await use(context);
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  },
});

export { expect };

export async function openStorePage(
  context: BrowserContext,
  { url, fixture }: { url: string; fixture: string },
): Promise<Page> {
  const page = await context.newPage();
  if (!process.env['LIVE']) {
    const html = resolve(import.meta.dirname, '../../fixtures', fixture);
    await context.route(`${new URL(url).origin}/**`, (route) =>
      route.fulfill({ path: html, contentType: 'text/html' }),
    );
  }
  await page.goto(url);
  return page;
}

// Chrome derives an unpacked extension's id from the sha256 of its path.
function extensionId(): string {
  const hex = createHash('sha256').update(dist).digest('hex').slice(0, 32);
  return [...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
}

export async function openPopup(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId()}/popup/popup.html`);
  return page;
}

// Opens the popup page in the background so the active tab stays `target`, as in a real popup.
export async function openPopupOver(context: BrowserContext, target: Page): Promise<Page> {
  const popup = await context.newPage();
  await target.bringToFront();
  await popup.goto(`chrome-extension://${extensionId()}/popup/popup.html`);
  return popup;
}

async function setCheckbox(context: BrowserContext, id: string, key: string, value: boolean): Promise<void> {
  const page = await openPopup(context);
  await page.locator(id).setChecked(value);
  await expect.poll(() => page.evaluate(`chrome.storage.local.get("${key}").then((s) => s.${key})`)).toBe(value);
  await page.close();
}

export const setToggle = (context: BrowserContext, value: boolean): Promise<void> =>
  setCheckbox(context, '#use-store-filters', 'useStoreFilters', value);

export const setEnabled = (context: BrowserContext, value: boolean): Promise<void> =>
  setCheckbox(context, '#enabled', 'enabled', value);

export async function plainPage(
  browser: Browser,
  { url, fixture }: { url: string; fixture: string },
): Promise<Page> {
  const page = await browser.newPage();
  if (!process.env['LIVE']) {
    const html = resolve(import.meta.dirname, '../../fixtures', fixture);
    await page.route(`${new URL(url).origin}/**`, (route) => route.fulfill({ path: html, contentType: 'text/html' }));
  }
  await page.goto(url);
  return page;
}
