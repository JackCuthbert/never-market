# never-market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Firefox and Chrome extension that hides marketplace listings on Bunnings, JB Hi-Fi and Woolworths.

**Architecture:** Per-store rules live in `sites/<store>.json`. A TypeScript build script (`scripts/build.ts`, run by Node's type stripping) uses esbuild to bundle one content script per store into `dist/rules/<store>.js` (engine plus that store's rule inlined) and writes the manifest. The generic engine, `src/engine.ts`, applies a rule: it appends the store's URL filter, and hides cards with an injected stylesheet or, for shadow-DOM stores, a scan that flags cards.

**Tech Stack:** TypeScript (strict), `esbuild` for bundling, `typescript` for `tsc --noEmit`, `@types/chrome`, `@types/node`, Node 26 via mise (runs `.ts` scripts and `node:test` files directly), npm, `@playwright/test` with Chromium for end-to-end tests.

**Spec:** `docs/superpowers/specs/2026-11-14-never-market-design.md`

## Global Constraints

- TypeScript only: no `.js` source files. `tsconfig.base.json` extends `@tsconfig/strictest`; `tsconfig.json` (extension code in `src/` and `popup/`, `lib: ["ES2023","DOM"]`, `types: ["chrome"]`) and `tsconfig.node.json` (`scripts/`, `test/`, `playwright.config.ts`, `types: ["node"]`) both extend the base. No `any`, no `@ts-ignore`.
- `npm run typecheck` (`tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit`) passes at every commit.
- Use the `chrome.*` API with promises (works in Chrome and Firefox MV3). No `browser ?? chrome` shim.
- Manifest V3. Firefox: `browser_specific_settings.gecko.id` set; minimum Firefox 121, Chrome 105 (CSS `:has()`).
- No background script or toolbar badge. The popup shows the hidden count for the active tab (`{type:'count'}` message answered by the content script, computed on demand); the page itself shows no trace.
- Hide with `display: none !important`. Never remove nodes, never use the `hidden` attribute.
- A `hide` selector (or `shadow.card`) matches the list's layout cell. No shared default selector.
- JB Hi-Fi's "Online Only" tag and Big W's `ONLINE ONLY` / `DELIVERY ONLY` labels are never signals.
- A store without `urlFilter` (Big W) is never redirected.
- The only settings are two popup toggles, `storage.local`, default on (missing key means on), all stores, applied live via `storage.onChanged`. "Hide marketplace listings" (`enabled`): off means nothing is hidden (stylesheet removed, `data-never-market` cleared, scan stopped) and no URL redirect. "Use store filters" (`useStoreFilters`): off means no URL changes; card hiding still runs.
- Content scripts run at `document_start`. The stylesheet goes into `document.documentElement` (no `<head>` yet).
- Rules are bundled. No remote fetching, no code in rules.
- Chrome automation only. Firefox is manual (README).

## Review Focus

- A retailer product whose name contains "Marketplace" (Bunnings `aria-label`) must stay visible. Task 3.
- A Woolworths tile node reused for a different product must be un-hidden when it stops being a marketplace tile. Task 4.
- A Woolworths shadow root that renders after the card is added must still be classified. Task 4.
- A search URL that already carries the filter param (any value) must not be redirected; other params and the hash are kept. Tasks 1 and 5.
- Non-search pages, and an empty results page, must not be redirected and must not throw. Tasks 1 and 3.

## File Structure

- `sites/{bunnings,jbhifi,woolworths}.json`: rules.
- `manifest.base.json`: manifest without `content_scripts`.
- `scripts/build.ts`: writes `dist/`.
- `src/url-filter.ts`: pure URL logic.
- `src/engine.ts`: DOM work, `NeverMarket.start(rule)`.
- `src/types.ts`: the `Rule` and `UrlFilter` types.
- `popup/popup.html`, `popup/popup.ts`: the toggles (bundled to `dist/popup/popup.js`).
- `tsconfig.base.json`, `tsconfig.json`, `tsconfig.node.json`.
- `fixtures/<store>/*.html`: synthetic pages from the supplied markup.
- `test/unit/`, `test/e2e/`: tests. `README.md`: build, install, runbook.

Rule shape (used by every task), exported from `src/types.ts`:
`Rule = { name: string, card?: string, hosts: string[], urlFilter?: { pathPrefix: string, param: string, value: string }, hide?: string, shadow?: { card: string, host: string, marketplace: string }, keep?: { badge: string, text: string }, note?: string }`

---

### Task 1: Project scaffold and `filteredUrl`

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules`, `dist`, `test-results`), `src/url-filter.ts`, `src/types.ts`, `tsconfig.base.json`, `tsconfig.json`, `tsconfig.node.json`, `test/unit/url-filter.test.ts`

**Interfaces:**
- Produces: `filteredUrl(filter: UrlFilter, href: string): string | null`. Returns the new URL, or `null` when no change is needed. Named export. `UrlFilter` and `Rule` are exported from `src/types.ts`.

- [ ] **Step 1: Write the failing tests** in `test/unit/url-filter.test.ts` (`node:test`, `import { filteredUrl } from '../../src/url-filter.ts'`). Filter used: `{ pathPrefix: '/search/products', param: 'productranges', value: '!Marketplace' }`, base `https://www.bunnings.com.au`.
  - `appends the param to a matching path`: `/search/products?page=1&q=cable+management&sort=BoostOrder` returns `...sort=BoostOrder&productranges=!Marketplace` (existing query untouched).
  - `adds ? when there is no query`.
  - `keeps the hash`: `/search/products?q=a#top` returns `...?q=a&productranges=!Marketplace#top`.
  - `returns null when the param is present with any value`, including `productranges=Other`.
  - `returns null when the path does not match` (`/p/123`, `/`).
  - `encodes with %20`: filter `{ pathPrefix: '/search', param: 'Sold by', value: 'JB Hi-Fi' }` on `https://www.jbhifi.com.au/search?query=phone%20case` returns `...?query=phone%20case&Sold%20by=JB%20Hi-Fi`.
  - `detects a param written with +`: `/search?Sold+by=Other` returns `null`.
- [ ] **Step 2: Run** `npm run test:unit` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement `filteredUrl`.** Parse with `new URL(href)`; match with `pathname.startsWith(pathPrefix)`; detect presence with `url.searchParams.has(param)`; build the output string by hand (`encodeURIComponent` for param and value, append to `url.search`) so existing params are not re-encoded. `package.json`: `"scripts": { "test:unit": "node --test \"test/unit/*.test.ts\"", "typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit" }`. Dev dependencies: `typescript`, `@tsconfig/strictest`, `@types/node`, `@types/chrome`. Imports use the `.ts` extension (`allowImportingTsExtensions`, `noEmit`).
- [ ] **Step 4: Run** `npm run test:unit && npm run typecheck` — Expected: all PASS, no type errors.
- [ ] **Step 5: Commit** `feat: add URL filter logic`.

### Task 2: Rules, build script, manifest

**Files:**
- Create: `sites/bunnings.json`, `sites/jbhifi.json`, `sites/woolworths.json`, `manifest.base.json`, `scripts/build.ts`, `test/unit/build.test.ts`
- Modify: `package.json` (`"build": "node scripts/build.ts"`)

**Interfaces:**
- Consumes: `src/url-filter.ts`, `src/engine.ts` (Task 3; Task 2 adds a stub), `popup/` (Task 5; bundled and copied if present).
- Produces: `dist/manifest.json`; `dist/rules/<store>.js`, an esbuild IIFE bundle (`format: 'iife'`, `target: 'chrome105'`) built from a generated entry `import { start } from '<abs>/src/engine.ts'; start(<rule JSON>);`; `dist/popup/popup.html` and `dist/popup/popup.js` (bundled from `popup/popup.ts` when it exists).

- [ ] **Step 1: Write the rule files** with the spec's values. `hide` selectors:
  - bunnings: hosts `["www.bunnings.com.au"]`; urlFilter `{ "/search/products", "productranges", "!Marketplace" }`; `hide`: `[data-search-product-tile]:has(a[aria-label*="Availability: Marketplace"])`. This narrows the spec's `*="Marketplace"` so a retailer product named "Marketplace …" stays visible (call to flag to the user).
  - jbhifi: hosts `["www.jbhifi.com.au"]`; urlFilter `{ "/search", "Sold by", "JB Hi-Fi" }`; `hide`: `.ProductCard:has([data-testid="marketplace-seller_callout_product-card"])`.
  - woolworths: hosts `["www.woolworths.com.au"]`; urlFilter `{ "/shop/search/products", "isHideEverydayMarketProducts", "true" }`; `shadow`: `{ card: ".product-grid-v2--tile", host: "wc-product-tile", marketplace: ".market-product-message-wrapper" }`.
  - bigw: hosts `["www.bigw.com.au"]`; no `urlFilter`; `hide`: `li:has(article[data-testid="product-tile"] img[alt="Marketplace Logo"])`. Add `sites/bigw.json` to the files created.
- [ ] **Step 2: Write the failing test** `test/unit/build.test.ts`: run the build into a temp out dir (build takes an optional out dir argument), then assert the manifest has `manifest_version: 3`, `permissions: ["storage"]`, no `background`, `browser_specific_settings.gecko.id`, and one `content_scripts` entry per site with `matches: ["https://<host>/*"]`, `run_at: "document_start"`, `js: ["rules/<store>.js"]`; and `dist/rules/bunnings.js` exists and contains `productranges`.
- [ ] **Step 3: Run** `npm run test:unit` — Expected: FAIL.
- [ ] **Step 4: Implement `scripts/build.ts`** and `manifest.base.json` (name, version, `action.default_popup: "popup/popup.html"`, `minimum_chrome_version: "105"`, gecko `strict_min_version: "121.0"`). Add dev dependency `esbuild`. Create a stub `src/engine.ts` (`export function start(_rule: Rule): void {}`) so the build bundles a real file. Rule JSON is read by the build with `readFileSync` and typed as `Rule`.
- [ ] **Step 5: Run** `npm run test:unit && npm run typecheck` — Expected: PASS.
- [ ] **Step 6: Commit** `feat: add site rules and build script`.

### Task 3: Chromium e2e harness and CSS hiding (Bunnings, JB Hi-Fi, Big W)

**Files:**
- Create: `playwright.config.ts`, `test/e2e/harness.ts`, `fixtures/bunnings/search.html`, `fixtures/jbhifi/search.html`, `test/e2e/hide.spec.ts`
- Modify: `src/engine.ts`, `package.json` (devDependency `@playwright/test`; script `"test:e2e": "npm run build && playwright test"`)

**Interfaces:**
- Produces: `harness.ts` exports `test` (Playwright `test` extended with fixture `context` = persistent Chromium context with `--disable-extensions-except=<dist>` and `--load-extension=<dist>`, `channel: 'chromium'`, headed or new headless) and `openStorePage(context, { url, fixture }): Promise<Page>` which routes `url` (and any URL on that origin) to the fixture file and returns the page.
- Produces: `export function start(rule: Rule): void` in `src/engine.ts`. For `rule.hide`, injects `<style>${hide}{display:none!important}</style>` into `document.documentElement` once.

- [ ] **Step 1: Install and check the browser.** `npm i -D @playwright/test`; if Chromium is missing run `npx playwright install chromium`. Check the extension loads: Task 3's first test must see its effect.
- [ ] **Step 2: Write fixtures.** Each is a grid page (`display:grid`, 3 columns) whose direct children are the layout cells; include a `.flex{display:flex}` rule on the Bunnings cells.
  - bunnings: 2 marketplace tiles (`<div class="flex" data-search-product-tile="true"><a aria-label="<name>, Availability: Marketplace | Online only, Price $199.00">`), 1 retailer tile (label `..., 4.1 stars from 41 reviews, Price $17.50`), 1 trap tile (retailer, label `Marketplace Pro Drill, 4.0 stars from 2 reviews, Price $9.00`).
  - jbhifi: 2 `.ProductCard` cells with `<p data-testid="marketplace-seller_callout_product-card">`, 1 plain `.ProductCard`, 1 plain `.ProductCard` with an "Online Only" promo tag.
  - bigw (`fixtures/bigw/search.html`): a `ul` grid of `li` cells, each holding `<article data-testid="product-tile">`. 2 marketplace cells with `<div class="MarketplacePill_container"><img alt="Marketplace Logo"></div>`, 1 plain cell, 1 plain cell with `ONLINE ONLY` and `DELIVERY ONLY` labels (trap).
- [ ] **Step 3: Write failing tests** in `hide.spec.ts`. URLs: `https://www.bunnings.com.au/search/products?page=1&q=cable+management&productranges=!Marketplace` (param present, so Task 5's redirect cannot interfere), `https://www.jbhifi.com.au/search?query=phone%20case&Sold%20by=JB%20Hi-Fi`.
  - `bunnings: marketplace tiles are not visible, retailer tiles are`: visible tile count is 2; the trap tile is visible.
  - `bunnings: hidden even though the cell has display:flex`.
  - `jbhifi: marketplace cards hidden, plain and Online Only cards visible`: visible count 2.
  - `bigw: marketplace cells hidden, plain and ONLINE ONLY cells visible`: visible count 2, using `https://www.bigw.com.au/search?text=chair+bath+seat`.
  - `bigw: the URL is never changed` (no `urlFilter`; also covered in Task 5).
  - `nodes are not removed`: total tile count unchanged.
  - `empty results page does not throw`: a fixture with the grid and no cards loads with no `pageerror`.
- [ ] **Step 4: Run** `npm run test:e2e -- hide` — Expected: FAIL.
- [ ] **Step 5: Implement `start`** hide path in `src/engine.ts`.
- [ ] **Step 6: Run** `npm run test:e2e -- hide` — Expected: PASS.
- [ ] **Step 7: Commit** `feat: hide marketplace cards with injected CSS`.

### Task 4: Woolworths shadow-DOM scan

**Files:**
- Create: `fixtures/woolworths/search.html`, `test/e2e/shadow.spec.ts`
- Modify: `src/engine.ts`

**Interfaces:**
- Consumes: `start`, the injected style from Task 3.
- Produces: for `rule.shadow`, the style also hides `[data-never-market]`; `scan()` sets or clears `data-never-market` on each `shadow.card` using `card.querySelector(shadow.host)?.shadowRoot?.querySelector(shadow.marketplace)`. `scan` runs on a `MutationObserver` (document, childList + subtree, coalesced with `requestAnimationFrame`), on a 500 ms interval, and an observer is attached to each newly seen shadow root.

- [ ] **Step 1: Write the fixture.** A 3-column grid of `.product-grid-v2--tile` cells, each containing `<wc-product-tile>`. An inline script attaches open shadow roots: marketplace roots contain `<div class="message-wrapper market-product-message-wrapper"><div id="vendor-information-tile">Sold by <span class="seller-name">The Gamesmen</span></div></div>`; retailer roots contain `<div class="message-wrapper"></div>`. The page exposes `window.addTile({ market, delayMs })` to add a tile whose shadow root attaches after `delayMs`, and `window.retarget(tile, market)` to rewrite a tile's shadow content.
- [ ] **Step 2: Write failing tests** in `shadow.spec.ts` (URL `https://www.woolworths.com.au/shop/search/products?searchTerm=xbox&isHideEverydayMarketProducts=true`):
  - `marketplace tiles are hidden, retailer tiles are visible`.
  - `a tile whose shadow root renders 300 ms late is hidden` (`expect.poll` until not visible, timeout 3000).
  - `a tile reused for a retailer product is shown again`: `retarget(tile, false)` then the tile is visible.
  - `a tile reused for a marketplace product is hidden`.
  - `a card with no shadow root yet is left visible and does not throw`.
- [ ] **Step 3: Run** `npm run test:e2e -- shadow` — Expected: FAIL.
- [ ] **Step 4: Implement** the scan in `src/engine.ts`. Use `toggleAttribute('data-never-market', matched)`.
- [ ] **Step 5: Run** `npm run test:e2e -- shadow` — Expected: PASS.
- [ ] **Step 6: Commit** `feat: hide marketplace cards inside shadow roots`.

### Task 5: URL redirect, navigation polling, toggle popup

**Files:**
- Create: `popup/popup.html`, `popup/popup.ts`, `test/e2e/filter.spec.ts`
- Modify: `src/engine.ts`, `test/e2e/harness.ts`

**Interfaces:**
- Consumes: `filteredUrl` (Task 1), `start`.
- Produces: `start` reads `useStoreFilters` from `storage.local` (`chrome.storage.local`; missing key means `true`), listens to `storage.onChanged`, and on every 500 ms tick compares `location.href`; when the toggle is on and `filteredUrl(rule.urlFilter, location.href)` is non-null it calls `location.replace(newUrl)`. Popup: checkboxes `#enabled` ("Hide marketplace listings") and `#use-store-filters` ("Use store filters") that read and write their keys. `enabled` off blocks the redirect and hiding; it is covered by `test/e2e/enabled.spec.ts`.
- Produces: `harness.ts` also exports `setToggle(context, boolean)` and `setEnabled(context, boolean)`, which write the keys through the popup page (`chrome-extension://<id>/popup/popup.html`).

- [ ] **Step 1: Write failing tests** in `filter.spec.ts`, using the Bunnings fixture routed for any URL on the origin and recording requested URLs:
  - `search URL without the param is redirected, other params kept`: ends at `...&productranges=!Marketplace` with `page=1&q=cable+management&sort=BoostOrder` intact.
  - `URL that already has the param is not redirected` (also with `productranges=Other`).
  - `non-search path is not redirected` (`/p/123`, `/`).
  - `bigw search URL is not redirected` (rule has no `urlFilter`; `start` must not throw).
  - `no redirect loop`: total requests for the search URL are at most 2.
  - `toggle off: the URL is never changed, cards are still hidden` (uses `setToggle(false)`; the page uses `hide`).
  - `in-app navigation is caught`: from `/` call `history.pushState({}, '', '/search/products?q=a')` in the page; within 2 s the URL gains the param.
  - `popup checkbox is checked by default and persists`.
- [ ] **Step 2: Run** `npm run test:e2e -- filter` — Expected: FAIL.
- [ ] **Step 3: Implement** the redirect, polling and storage listener in `src/engine.ts` (add `// shortcut: polling, replace with webNavigation if 500 ms lag is not acceptable`) and the popup.
- [ ] **Step 4: Run** `npm run test:e2e` — Expected: all e2e PASS.
- [ ] **Step 5: Commit** `feat: add URL filter redirect and settings toggle`.

### Task 6: Layout check, screenshots, live mode

**Files:**
- Create: `test/e2e/layout.ts`, `test/e2e/stores.spec.ts`
- Modify: `test/e2e/harness.ts`

**Interfaces:**
- Produces: `layout.ts` exports `layoutProblems(page: Page, containerSelector: string): Promise<string[]>` (`Page` from `@playwright/test`). It checks every visible child has a non-zero box and, per row (children grouped by `top`), no gap between neighbours exceeds one card width and the first card starts within one card width of the container. Empty array means no problems.
- Produces: `openStorePage` uses the real network when `process.env.LIVE` is set (no routing, headed). `plainPage(browser, { url, fixture })` opens the same page with no extension, for "before" screenshots.

- [ ] **Step 1: Write `stores.spec.ts`**, one test per store (list of `{ store, url, fixture, container, marketplace }` with the real container selector for each fixture, for all four stores including bigw): `<store>: no marketplace card visible`, `<store>: layout has no gaps` (`layoutProblems` equals `[]`), and saves `test-results/<store>/before.png` (plain page) and `after.png`. In LIVE mode only the first two assertions run, plus at least one retailer card visible.
- [ ] **Step 2: Add a unit-style check of `layoutProblems`** inside `stores.spec.ts`: a page with a hidden cell wrapped inside a still-sized `li` (an empty cell) returns a non-empty array.
- [ ] **Step 3: Run** `npm run test:e2e -- stores` — Expected: PASS; screenshots exist for all three stores.
- [ ] **Step 4: Commit** `test: add layout checks and screenshots`.

### Task 7: HAR recorder and README

**Files:**
- Create: `scripts/record-fixture.ts`, `README.md`

**Interfaces:**
- Produces: `node scripts/record-fixture.ts <store> <url> <name>` opens headed Chromium with no extension, records a HAR with `page.routeFromHAR(..., { update: true })`, waits for Enter in the terminal, and saves `fixtures/<store>/<name>.har`.

- [ ] **Step 1: Implement the recorder.** The spec test for HAR replay is added when the first HAR exists: `stores.spec.ts` reads `fixtures/<store>/*.har` and, if present, runs the same assertions against the replay and prints which stores had none.
- [ ] **Step 2: Write `README.md`:**
  - Build: `npm install`, `npm run build`. Type check: `npm run typecheck`.
  - Chrome: `chrome://extensions`, Developer mode, "Load unpacked", choose `dist/`.
  - Firefox: `npm run build`, open `about:debugging`, "This Firefox", "Load Temporary Add-on", choose `dist/manifest.json`. Optional: `web-ext run -s dist`.
  - Tests: `npm run test:unit`, `npm run test:e2e`, `LIVE=1 npm run test:e2e -- stores` (live runbook; failures mean "look").
  - Manual Firefox checklist: toggle on and off, marketplace cards gone, no layout gaps, URL filter on each store.
  - How to add a store: add `sites/<store>.json`, add a fixture, run the build.
- [ ] **Step 3: Verify** `npm run typecheck && npm run build && npm run test:unit && npm run test:e2e` — Expected: all PASS.
- [ ] **Step 4: Human check (user):** run `node scripts/record-fixture.ts` for one search page per store, confirm the layout in the screenshots, and report whether each `card` selector is the layout cell. Update rules if not.
- [ ] **Step 5: Commit** `docs: add README and fixture recorder`.
