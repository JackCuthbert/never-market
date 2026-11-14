import { chromium, expect, test as base } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
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
