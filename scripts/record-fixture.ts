import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const [store, url, name] = process.argv.slice(2);
if (!store || !url || !name) {
  console.error('usage: node scripts/record-fixture.ts <store> <url> <name>');
  process.exit(1);
}

const dir = join(import.meta.dirname, '../fixtures', store);
mkdirSync(dir, { recursive: true });
const har = join(dir, `${name}.har`);

const browser = await chromium.launch({ channel: 'chromium', headless: false });
const page = await browser.newPage();
await page.routeFromHAR(har, { update: true });
await page.goto(url);

const rl = createInterface({ input: process.stdin, output: process.stdout });
await rl.question('Press Enter to save the HAR and exit. ');
rl.close();
await browser.close();
console.log(`saved ${har}`);
