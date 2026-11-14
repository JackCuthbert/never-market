# never-market: design

## Intent

A Firefox and Chrome extension that removes third-party marketplace listings
from Australian retail sites (Bunnings and JB Hi-Fi first, then Woolworths).
Marketplace listings are misleading to shoppers and push drop-shipped products
over the retailer's own range. The extension shows shoppers only what the
retailer itself sells.

## Goals

- One codebase, one Manifest V3 extension, runs on Firefox and Chrome.
- A generic engine that runs per-site rules. Adding a store adds a data file,
  not engine code.
- Marketplace items are gone from the page with no visible trace.
- Rules are easy to fix when a store changes its markup.

## Non-goals (v1)

- A toolbar badge or hidden-item count.
- Any setting other than the one URL filter toggle. No per-site toggle; the
  user can disable the extension.
- Remote rule updates. Rules are bundled with the extension.
- A code escape hatch in rules. Add one when a store needs it.
- Woolworths, until its markup is supplied.

## Anti-goals

- Hiding retailer-owned products by mistake. A false positive is worse than a
  missed marketplace item. For this reason JB Hi-Fi's "Online Only" tag is not
  used as a signal: it also marks JB's own online-only products.
- Breaking the store's own page scripts. Nodes are hidden, not removed.
- Breaking the page layout: empty grid cells, gaps, leftover borders or
  padding, or a list that no longer fills its rows.

## Constraints

- Manifest V3. Firefox needs `browser_specific_settings.gecko.id`.
- Chrome allows remote data but not remote code. This keeps a later remote
  rules file possible if rules stay plain data.
- Stores, and future stores, render with JavaScript (React or similar).
  Cards appear after load, and navigation changes the URL without a page
  load. Rules must not depend on the page being complete at any moment.
- CSS `:has()` is required: Chrome 105+, Firefox 121+.

## Approaches considered

- **A. Rules as data (JSON) plus one generic engine.** Chosen.
- B. One JS module per site. Most flexible, but every store is code to
  maintain and remote updates are impossible.
- C. Data-first with a code escape hatch. Adds a second mechanism before any
  store needs it.

Each store has up to two actions, used together:

1. **URL filter.** Both stores let the search URL ask the server for
   retailer-only results. This keeps pages full and pagination and sorting
   correct. It only covers search pages, and JB Hi-Fi's filter is less
   reliable.
2. **Hide rule.** A CSS selector that matches marketplace cards. It covers
   every page that shows a card and backs up the URL filter.

## Decisions

Made with the user:

- Approach A.
- No visible trace on the page.
- A per-page count is not important.
- Bunnings and JB Hi-Fi first, each with a URL filter and a card rule.
- A toggle turns off the URL filter. With it off, the extension never changes
  the URL and only hides cards with CSS.

My calls (not yet agreed):

- TypeScript in strict mode. `tsconfig.base.json` extends `@tsconfig/strictest`; extension code and Node code (scripts, tests) get separate configs that extend it. esbuild bundles one content script per store (engine plus rule) and the popup; Node 26 runs the build script and unit tests as `.ts` directly. Changed by the user from "plain JavaScript, no build step".
- A hide rule is a single CSS selector. The engine injects a stylesheet that
  sets `display: none !important` on it. There is no scanning code and no
  `MutationObserver`; the browser handles cards that load later. `display:
  none !important` is used because Bunnings' tile root has the `flex` class,
  which overrides the `hidden` attribute.
- No background script and no toolbar badge in v1.
- The toggle is one checkbox in a toolbar popup ("Use store filters"), stored
  with `storage.local` under the `storage` permission. It is on by default and
  applies to all stores.

## Rule format

One file per store in `sites/<store>.json`:

- `hosts`: hostnames the rule applies to.
- `urlFilter` (optional): `{ pathPrefix, param, value }`. On a matching path,
  if the param is missing, replace the URL with the param added and the other
  parameters kept.
- `hide`: a CSS selector for the marketplace cards. It must match the
  element that is the list's layout cell (the direct child of the grid or flex
  container), not an inner node. Hiding an inner node leaves an empty cell.
  Each store's `hide` selector is chosen and checked for that store alone;
  there is no shared default selector.

- `shadow` (optional, instead of `hide`): for stores that render card content
  inside a shadow root, where a page-level CSS selector cannot see it:
  `{ card, host, marketplace }`.
  - `card`: selector for the layout cell, same rule as `hide`.
  - `host`: selector, inside the card, for the element that owns the shadow
    root.
  - `marketplace`: CSS selector run inside that element's shadow root.
  The engine marks matching cards with a `data-never-market` attribute. The
  injected stylesheet hides `[data-never-market]`. This mode needs the
  engine to scan: on load, on new cards, and when a shadow root fills in
  after the card is added (a `MutationObserver`). Until a card's content has
  rendered it cannot be classified, so a marketplace card can show briefly.
  That is a known limit of this mode; the URL filter avoids it when on.

## Bunnings rule (from supplied markup)

- `urlFilter`: path prefix `/search/products`, param `productranges`, value
  `!Marketplace`.
- `hide`: `[data-search-product-tile]:has(a[aria-label*="Marketplace"])`.
  `data-search-product-tile` is a testing hook. The tile link's `aria-label`
  contains `Availability: Marketplace | Online only` on marketplace tiles
  only.
- Not used: the `text-identity-marketplace` class, which is styling.

## JB Hi-Fi rule (from supplied markup)

- `urlFilter`: path prefix `/search`, param `Sold by`, value `JB Hi-Fi`. The
  user reports this filter is less reliable than Bunnings'.
- `hide`:
  `.ProductCard:has([data-testid="marketplace-seller_callout_product-card"])`.
  Marketplace cards have a "JB Hi-Fi Marketplace: Sold and sent by …"
  callout; retailer cards have none.

## Big W rule (from supplied markup)

- No `urlFilter`. Big W has a marketplace filter in its menus, but it does not
  change the URL, so the extension cannot use it. This store is card hiding
  only; with no server filter, a page can show fewer cards than usual and the
  page's own result count and pagination include hidden items. Driving the
  menu filter from the extension is out of scope for v1.
- Cards are `<li class="ProductGrid_ProductTileWrapper__LkYlE">` holding an
  `<article data-testid="product-tile">`. The `li` looks like the layout cell
  (unconfirmed). Class names have generated suffixes, so the rule uses none.
- Marketplace cards contain `<div class="MarketplacePill_container__j__fT">`
  with `<img alt="Marketplace Logo">`. Retailer cards have neither.
- `hide`: `li:has(article[data-testid="product-tile"] img[alt="Marketplace
  Logo"])`.
- Not used: the `ONLINE ONLY`, `DELIVERY ONLY`, `NEW` and
  `NOT AVAILABLE IN STORE` labels. Retailer products can carry the first
  three.

## Woolworths rule (partly known)

- `urlFilter`: path prefix `/shop/search/products`, param
  `isHideEverydayMarketProducts`, value `true`. Woolworths calls its
  marketplace "Everyday Market".
- Cards are `<div class="product-tile_component_product-tile__rcGmj
  product-grid-v2--tile ..."><wc-product-tile></wc-product-tile></div>`. The
  light DOM is identical for marketplace and retailer cards. The seller line
  ("Sold by BTPL Store", with a marketplace logo) appears only on marketplace
  cards and sits inside the shadow root of `wc-product-tile`. So this store
  uses the `shadow` mode.
- From the supplied shadow roots (one retailer tile, one marketplace tile):
  - The marketplace tile's `.message-wrapper` also has the class
    `market-product-message-wrapper`, and holds a `#vendor-information-tile`
    with "Sold by <span class="seller-name">The Gamesmen</span>" and an
    `edmIcon` roundel. The retailer tile's `.message-wrapper` has none of
    these.
  - The signal is in the tile's own shadow root, with no nested component, so
    one `shadow` rule covers it.
- `shadow` rule: `host` is `wc-product-tile`; `marketplace` is
  `.market-product-message-wrapper`. This class names the market product
  directly. `#vendor-information-tile` and `.seller-name` are alternatives if
  it changes; they would be false positives if retailer tiles ever show vendor
  text, which one sample cannot rule out.
- `card`: `.product-grid-v2--tile`. The sibling class
  `product-tile_component_product-tile__rcGmj` has a generated suffix and is
  not used. Whether this element is the layout cell is unconfirmed.
- The shadow root is open (confirmed in DevTools), so `element.shadowRoot`
  is enough on Woolworths.

## Engine behaviour

- A content script runs at `document_start` on the hosts in the rule files.
- If the toggle is on, the rule has a `urlFilter`, and the URL matches its
  path but lacks the param, the script replaces the URL. If the toggle is off,
  it never changes the URL.
- It reads the toggle from `storage.local` and reacts when it changes.
- It re-runs the URL filter check on every in-app navigation, not only on page
  load. A content script cannot see the page's own `history.pushState` calls,
  so the builder picks how to detect navigation (see below).
- For a `shadow` rule it also scans cards and sets `data-never-market` as
  described under Rule format.
- It injects a stylesheet containing the `hide` selector. A stylesheet applies
  to cards added later, so hiding needs no hooks into the page's rendering.
  At `document_start` there is no `<head>` yet, so the style goes into
  `document.documentElement`.

## Testing

Two layers, both in a real browser with the built extension loaded. My calls.

**1. Offline snapshot tests (automatic, run on every change).**
- Record each store's results page once (Playwright HAR, with CSS and
  scripts), saved under `fixtures/<store>/`. Tests replay it with
  `page.route`, so they need no network and do not change when the store
  changes. A snapshot has real CSS, so layout can be checked.
- Per store and per rule, assert:
  - No visible element matches the marketplace signal.
  - At least one retailer card is still visible (the rule hides nothing it
    should not).
  - The count of hidden cards equals the marketplace cards in the snapshot.
  - Layout: every visible child of the list container has a non-zero box,
    and no row has a gap larger than one card width.
  - URL filter on: a snapshot URL without the param ends with it, other
    params kept. Toggle off: the URL is unchanged.
- Each test saves a before and after screenshot to `test-results/<store>/`.

**2. Live smoke runbook (manual or agent, run before a release and when a
store's rule breaks).**
- Same assertions against the real site, headed, on a short list of URLs per
  store (search, category, a page with a carousel). Stores may block
  automation or change content, so failures here mean "look", not "fail the
  build".
- Human check: open the screenshots, or run the browser with the extension
  loaded and compare with the toggle on and off.
- Agent check: read the saved screenshots with an image tool and confirm no
  gaps, empty cells or marketplace cards.

**Browsers.**
- Chrome: Playwright Chromium is already cached on this machine. Load the
  extension with a persistent context and `--load-extension`. Chrome's own
  branded builds may block that flag, so use Playwright Chromium, not
  installed Chrome.
- Firefox: manual only, by decision. No automatic Firefox tests. The repo
  documents how to build the extension and load it in Firefox: build it, then
  in Firefox open `about:debugging`, choose "This Firefox", then "Load
  Temporary Add-on" and select `manifest.json`. `web-ext run` is an optional
  shortcut (not installed here; installing needs the user's permission). The
  README carries these steps and a short manual checklist: toggle on and off,
  marketplace cards gone, no layout gaps, and the URL filter on each store.

Not verified: that `--load-extension` works with the cached Chromium
version. The first build step checks it. `:has()` in Firefox is checked by
hand.

## Left to the builder

- For each store, find the list container and the layout cell, and make the
  `hide` selector match the cell. The supplied markup is the card only, so
  the Bunnings `[data-search-product-tile]` and JB Hi-Fi `.ProductCard`
  selectors are unconfirmed as layout cells. They may sit inside a wrapper
  that must be hidden instead (for example `li:has(...)`).
- Check each store in a real browser with the rule on, for: empty cells or
  gaps, leftover borders or padding, rows that no longer fill, virtualized or
  absolutely positioned lists, skeleton placeholders, and the result count and
  pagination text. Fixtures with jsdom cannot check layout. Ask the user for a
  list container's markup or a screenshot when needed.
- A page's own "N results" text will still count hidden items. This is a
  known limit when the URL filter is off.
- Read shadow roots with `element.shadowRoot` (Woolworths' root is open).
  A future store with a closed root would need
  `element.openOrClosedShadowRoot` in Firefox and
  `chrome.dom.openOrClosedShadowRoot(element)` in Chrome. Do not build that
  until a store needs it.
- Detect in-app navigation in both browsers. Options: poll `location.href`
  with `popstate`, or a background script using
  `webNavigation.onHistoryStateUpdated`. Pick the smallest that works in
  Chrome and Firefox. The second option adds a background script.
- Check the injected style survives the page replacing parts of the DOM.
- Guard against redirect loops (for example if a site's own filter UI removes
  the param).
- Check URL encoding for `!Marketplace` and `Sold by=JB Hi-Fi`.
- Check category and collection pages, and carousels, for the same cards and
  the same filters. Check `.ProductCard` is used only for product tiles.
- Save trimmed fixtures to `fixtures/<store>/` (one marketplace card and one
  retailer card each) and test each `hide` selector against them.
- Choose test tooling, kept as small as possible.
- Capture Woolworths markup before writing its rule.
