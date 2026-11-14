import { expect, openPopupOver, openStorePage, setToggle, test } from './harness.ts';
import { layoutProblems } from './layout.ts';

const URL = 'https://www.bunnings.com.au/products/assisted-living';
const SUB = 'https://www.bunnings.com.au/products/assisted-living/bathroom-safety';
const open = (context: Parameters<typeof openStorePage>[0], url = URL) =>
  openStorePage(context, { url, fixture: 'bunnings/category.html' });

test('bunnings category: marketplace slides are hidden, retailer and trap slides are visible', async ({ context }) => {
  const page = await open(context);
  await expect(page.locator('.embla-slide:visible')).toHaveCount(2);
  await expect(page.locator('#retailer')).toBeVisible();
  await expect(page.locator('#trap')).toBeVisible();
});

test('bunnings category: nodes are not removed', async ({ context }) => {
  const page = await open(context);
  await expect(page.locator('.embla-slide:visible')).toHaveCount(2);
  await expect(page.locator('.embla-slide')).toHaveCount(5);
});

test('bunnings category: remaining slides leave no gap', async ({ context }) => {
  const page = await open(context);
  await expect(page.locator('.embla-slide:visible')).toHaveCount(2);
  expect(await layoutProblems(page, '#track')).toEqual([]);
});

test('bunnings category: popup reports 3 hidden and not filtered when the filter is off', async ({ context }) => {
  await setToggle(context, false);
  const page = await open(context);
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'on');
  await expect(popup.locator('#count')).toHaveText('3');
});

test('bunnings category: a URL without the param is redirected, params and hash kept', async ({ context }) => {
  const page = await open(context, `${SUB}?page=1#top`);
  await expect(page).toHaveURL(`${SUB}?page=1&productranges=!Marketplace#top`);
});

test('bunnings category: a URL that has the param is not redirected', async ({ context }) => {
  for (const url of [`${SUB}?productranges=!Marketplace&page=1`, `${SUB}?productranges=Other`]) {
    const page = await open(context, url);
    await page.waitForTimeout(1200);
    expect(page.url()).toBe(url);
  }
});

test('bunnings category: product detail pages and the home page are not redirected', async ({ context }) => {
  for (const url of ['https://www.bunnings.com.au/walking-frame_p0123456', 'https://www.bunnings.com.au/']) {
    const page = await open(context, url);
    await page.waitForTimeout(1200);
    expect(page.url()).toBe(url);
  }
});

test('bunnings category: no redirect loop', async ({ context }) => {
  const requested: string[] = [];
  context.on('request', (r) => requested.push(r.url()));
  const page = await open(context, SUB);
  await expect(page).toHaveURL(/productranges/);
  await page.waitForTimeout(1500);
  expect(requested.filter((u) => u.startsWith(SUB)).length).toBeLessThanOrEqual(2);
});

test('bunnings category: toggle off means no redirect and hiding still runs', async ({ context }) => {
  await setToggle(context, false);
  const page = await open(context, SUB);
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(SUB);
  await expect(page.locator('.embla-slide:visible')).toHaveCount(2);
});

test('bunnings category: popup is filtered with the param, not filtered with the toggle off', async ({ context }) => {
  const url = `${SUB}?productranges=!Marketplace&page=1`;
  const page = await open(context, url);
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'filtered');
  await setToggle(context, false);
  await page.bringToFront();
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'on');
});
