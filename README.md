# never-market

Firefox and Chrome extension that hides marketplace listings on Bunnings, JB Hi-Fi, Woolworths and Big W, and non-Kmart listings on Kmart.

## Build

```
npm install
npm run build
npm run typecheck
```

## Icons

`assets/icon.svg` is the logo. `npm run icons` renders the PNGs in `assets/icons/` (needs Playwright Chromium) and previews in `test-results/logo/`. Commit the PNGs. The toolbar icon has a green dot on a store page with hiding on, and a grey dot otherwise; a small background script sets it.

## Install

Releases are on GitHub. Each release has `never-market-firefox-<tag>.xpi` and `never-market-chrome-<tag>.zip`. The Chrome zip is the contents of `dist/`: unzip it and use "Load unpacked". The Firefox `.xpi` is unsigned, so Firefox installs it only as a temporary add-on (`about:debugging`) or in Developer Edition, Nightly and ESR with `xpinstall.signatures.required` set to `false`.

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
- The "Use store filters" toggle works on and off. Turning it off (or turning hiding off) removes `productranges=!Marketplace` (or the store's param) from the URL and reloads the page; turning it on adds it back.
- Marketplace cards are gone, and the popup shows how many are hidden on the page. Counts need "Use store filters" off (or Big W): with the store filter active the popup says "Store filter on" instead. Pages outside the store filter's path (for example a Bunnings landing page) always get a real count. The popup shows "Hiding is off" with the master toggle off, and elsewhere only a plain line naming the supported stores.
- The layout has no gaps. On Big W, check a product page's "Similar Products" and "Recently Viewed" sliders: marketplace tiles are gone, and drag range and dots still work (keen-slider may be out of sync after hiding). On Bunnings, `/products/...` category pages are redirected to add `productranges=!Marketplace`. Unverified: whether the bare landing page `/products/assisted-living` honours that param; if it ignores it, the carousel hide rule is what removes the cards there. Also check a category page such as `/products/assisted-living`: the carousel arrows and scroll position still work, and a carousel of only marketplace items leaves an empty section with its heading.
- The URL filter is applied on each store that has one (with the toggle on). Kmart has none: only Kmart-sold cards stay on /search/ and /category/ pages, and the popup has no "Use store filters" toggle there.

## Rule format

`sites/<store>.json`: `name` (shown in the popup), `hosts`, optional `urlFilter` (`pathPrefix`, `param`, `value`), `card` (the listing's layout cell, used for the popup's total), and one of `hide` (CSS selector for marketplace cells), `shadow` (`card`, `host`, `marketplace`) for shadow-DOM stores, or `keep` (`badge`, `text`) to hide every card whose badge text is not exactly `text`. Optional `note` is shown in the popup on that store's pages.

## Add a store

1. Add `sites/<store>.json`.
2. Add a fixture in `fixtures/<store>/`.
3. Run `npm run build`.

## Releases

release-please runs in `.github/workflows/release.yml` on GitHub, after the Forgejo push mirror delivers `main`. Commits must follow Conventional Commits. The workflow runs the checks, then opens or updates a release PR that bumps `package.json` and `manifest.base.json` and writes `CHANGELOG.md`. Merging that PR tags the release and attaches the Firefox and Chrome packages. Forgejo runs only `.forgejo/workflows/ci.yml`.
