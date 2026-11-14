import { mkdirSync } from 'node:fs';
import { expect, openPopup, openPopupOver, openStorePage, setEnabled, setToggle, test } from './harness.ts';

const BUNNINGS = 'https://www.bunnings.com.au/search/products?page=1&q=cable+management&productranges=!Marketplace';

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`popup screenshots (${scheme})`, () => {
    const shot = async (popup: Awaited<ReturnType<typeof openPopup>>, state: string) => {
      mkdirSync('test-results/popup', { recursive: true });
      await popup.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await popup.locator('main').screenshot({ path: `test-results/popup/${state}-${scheme}.png` });
    };

    test('on with counts', async ({ context }) => {
      await setToggle(context, false);
      const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
      const popup = await openPopupOver(context, page);
      await popup.locator('#stats').filter({ hasText: 'hidden' }).waitFor();
      await expect(popup.locator('#enabled')).toBeVisible();
      await expect(popup.locator('#use-store-filters')).toBeVisible();
      await shot(popup, 'on');
    });

    test('filtered by store', async ({ context }) => {
      const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
      const popup = await openPopupOver(context, page);
      await popup.locator('main[data-state="filtered"]').waitFor();
      await expect(popup.locator('#enabled')).toBeVisible();
      await expect(popup.locator('#use-store-filters')).toBeVisible();
      await shot(popup, 'filtered');
    });

    test('master off', async ({ context }) => {
      await setEnabled(context, false);
      const page = await openStorePage(context, { url: BUNNINGS, fixture: 'bunnings/search.html' });
      const popup = await openPopupOver(context, page);
      await popup.locator('main[data-state="off"]').waitFor();
      await expect(popup.locator('#enabled')).toBeVisible();
      await expect(popup.locator('#use-store-filters')).toBeVisible();
      await shot(popup, 'off');
    });

    test('unsupported page', async ({ context }) => {
      const popup = await openPopup(context);
      await popup.locator('#store-list').filter({ hasText: 'Kmart' }).waitFor();
      await expect(popup.locator('#enabled')).toBeHidden();
      await expect(popup.locator('#use-store-filters')).toBeHidden();
      await shot(popup, 'unsupported');
    });
  });
}
