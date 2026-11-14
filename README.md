# never-market

Firefox and Chrome extension that hides marketplace listings on Bunnings, JB Hi-Fi, Woolworths and Big W.

## Build

```
npm install
npm run build
npm run typecheck
```

## Install

- Chrome: `chrome://extensions`, turn on Developer mode, "Load unpacked", choose `dist/`.
- Firefox: run `npm run build`, open `about:debugging`, "This Firefox", "Load Temporary Add-on", choose `dist/manifest.json`. Optional: `web-ext run -s dist`.
- Firefox in a Flatpak or Snap sandbox (for example Zen): the file picker exposes only `manifest.json`, so loading `dist/` fails. Run `npm run package`, then load `never-market.xpi` with "Load Temporary Add-on". Load it again after every rebuild.
- Firefox site access: Firefox MV3 does not run content scripts until the site is allowed. Open the Extensions (puzzle) button, click the gear next to never-market, choose "Manage Extension", open Permissions and turn on the site access toggles (or "Always allow" on each store). Reload the store page.

## Tests

```
npm run test:unit
npm run test:e2e
LIVE=1 npm run test:e2e -- stores
```

`test:e2e` runs Playwright Chromium with the built extension and offline fixtures from `fixtures/`. `LIVE=1` runs the `stores` checks against the real sites in a headed browser. A live failure means "look", not "broken".

Screenshots are saved to `test-results/<store>/before.png` and `after.png`.

## Record a fixture

```
node scripts/record-fixture.ts <store> <url> <name>
```

Opens Chromium with no extension, records a HAR, and saves `fixtures/<store>/<name>.har` when you press Enter.

## Manual Firefox checklist

Firefox is not automated. After loading the extension:

- The "Hide marketplace listings" toggle shows every listing when off and hides marketplace listings again when on, without a reload; with it off the URL is never changed.
- The "Use store filters" toggle works on and off.
- Marketplace cards are gone, and the popup shows how many are hidden on the page. Counts need "Use store filters" off (or Big W): with the store filter active the popup says "Filtered by <store>" instead. The popup shows "Off" with the master toggle off and "Not a supported store page" elsewhere.
- The layout has no gaps.
- The URL filter is applied on each store (with the toggle on).

## Rule format

`sites/<store>.json`: `name` (shown in the popup), `hosts`, optional `urlFilter` (`pathPrefix`, `param`, `value`), `card` (the listing's layout cell, used for the popup's total), and either `hide` (CSS selector for marketplace cells) or `shadow` (`card`, `host`, `marketplace`) for shadow-DOM stores.

## Add a store

1. Add `sites/<store>.json`.
2. Add a fixture in `fixtures/<store>/`.
3. Run `npm run build`.
