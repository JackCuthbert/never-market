# Overview

## Intent

Never Market is a Manifest V3 extension for Firefox and Chrome. It hides third-party marketplace listings on Australian retail sites. Marketplace listings are easy to mistake for the retailer's own range, and the shopper wants to see only what the retailer sells.

## Goals

- One codebase and one extension for both browsers.
- One generic engine and one data file per store. A new store is a rule file, not engine code. See [site-rules.md](site-rules.md).
- Hidden listings leave no trace on the page and no gaps in the layout.
- Rules are plain data, easy to fix when a store changes its markup.

## Anti-goals

- Hiding a retailer's own product. A false positive is worse than a missed marketplace item. Labels that retailer products also carry ("Online only", "Delivery only", "New", "Sponsored") are never a signal.
- Breaking the store's own scripts. Nodes are hidden with CSS, never removed.
- Visible damage: empty grid cells, gaps, leftover borders, rows that no longer fill.

## Constraints

- Manifest V3. Firefox needs `browser_specific_settings.gecko.id` (`never-market@jckcthbrt.io`, minimum Firefox 121). Chrome minimum is 105.
- CSS `:has()` is required, which sets those minimum versions.
- Stores render with JavaScript. Cards appear after load and navigation changes the URL without a page load. Nothing may assume the page is complete.
- Rules are data only. Chrome allows remote data but not remote code, which keeps remote rule updates possible later.
- TypeScript in strict mode. esbuild bundles the extension. Node 26 runs the build script and unit tests directly as `.ts`.

## Non-goals

- Per-site toggles. The two popup toggles apply to every store.
- Remote rule updates. Rules are bundled.
- A code escape hatch in rules. Add one when a store needs it.
- Driving a store's own filter menu when it does not put the filter in the URL (Big W).
- Closed shadow roots. Woolworths' root is open. A store with a closed root would need `openOrClosedShadowRoot`.

## Parts

| Part | File | Spec |
| --- | --- | --- |
| Rule files | `sites/<store>.json` | [site-rules.md](site-rules.md) |
| Hiding engine | `src/engine.ts` | [hiding.md](hiding.md) |
| URL filter | `src/url-filter.ts`, `src/engine.ts` | [store-filters.md](store-filters.md) |
| Popup | `popup/` | [popup.md](popup.md) |
| Toolbar icon | `src/background.ts` | [toolbar-icon.md](toolbar-icon.md) |
| Per-store signals | `sites/`, `fixtures/` | [stores.md](stores.md) |
| Adding a store | | [adding-a-store.md](adding-a-store.md) |
| Build, package, release | `scripts/`, `.github/`, `.forgejo/` | [build-and-release.md](build-and-release.md) |
| Tests | `test/`, `fixtures/` | [testing.md](testing.md) |
