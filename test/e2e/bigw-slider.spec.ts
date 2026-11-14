import { expect, openPopupOver, openStorePage, test } from './harness.ts';
import { layoutProblems } from './layout.ts';

const URL = 'https://www.bigw.com.au/product/black-decker-18v-powerseries-premier-stick-vacuum/p/6059292';
const open = (context: Parameters<typeof openStorePage>[0]) =>
  openStorePage(context, { url: URL, fixture: 'bigw/product.html' });

test('bigw slider: the marketplace slide is hidden, the others are visible', async ({ context }) => {
  const page = await open(context);
  await expect(page.locator('#market')).toBeHidden();
  for (const id of ['plain', 'sponsored', 'online']) await expect(page.locator(`#${id}`)).toBeVisible();
});

test('bigw slider: nodes are not removed', async ({ context }) => {
  const page = await open(context);
  await expect(page.locator('.keen-slider__slide:visible')).toHaveCount(3);
  await expect(page.locator('.keen-slider__slide')).toHaveCount(4);
});

test('bigw slider: remaining slides leave no gap', async ({ context }) => {
  const page = await open(context);
  await expect(page.locator('#market')).toBeHidden();
  expect(await layoutProblems(page, '#slider')).toEqual([]);
});

test('bigw slider: popup reports 1 hidden and not filtered', async ({ context }) => {
  const page = await open(context);
  const popup = await openPopupOver(context, page);
  await expect(popup.locator('main')).toHaveAttribute('data-state', 'on');
  await expect(popup.locator('#stats')).toHaveText('1 of 4 listings hidden');
});

test('bigw slider: the URL is never changed', async ({ context }) => {
  const page = await open(context);
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(URL);
});
