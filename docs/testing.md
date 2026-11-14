# Testing

| Command | What it runs |
| --- | --- |
| `npm run typecheck` | `tsc` on the extension and Node configs, strict. |
| `npm run test:unit` | `node:test` on `test/unit/*.test.ts`: URL filter logic and the build output. |
| `npm run test:e2e` | Builds, then Playwright Chromium with the built extension, on offline fixtures. |
| `LIVE=1 npm run test:e2e -- stores` | The `stores` checks against the real sites, headed. |

## Offline e2e

`test/e2e/harness.ts` launches a persistent Chromium context with `--load-extension=dist/` (Playwright Chromium, not branded Chrome, which can block the flag) and routes a store's origin to a fixture HTML file.

Per store, `stores.spec.ts` asserts that no marketplace card is visible, a retailer card is, and the layout has no gaps (`layout.ts`: every visible child of the container has a non-zero box and no row has a gap over one card width). Other specs cover:

- `hide`, `shadow`, `category`, `bigw-slider`, `kmart`: each hiding mode and list type.
- `filter`: redirect with the param added, other params kept, no change when a toggle is off, removal when turned off, reload when turned on.
- `enabled`: the master toggle live.
- `count`, `popup`: counts, states, toggles, note, screenshots in light and dark.
- `icon`: the toolbar dot.

Screenshots go to `test-results/<store>/before.png` and `after.png`.

## Live runs

Stores may block automation or change content, so a live failure means "look". Read the screenshots to confirm no gaps, empty cells or marketplace cards.

## Firefox

Not automated. Use the manual steps in [adding-a-store.md](adding-a-store.md) and load the build as described in the README. Firefox needs the site-access permission turned on per store before the content script runs.

## Fixtures

`fixtures/<store>/*.html`, trimmed to one marketplace card, one retailer card and the container, with CSS for a real layout. Fixtures replay with no network and do not change when the store changes.
