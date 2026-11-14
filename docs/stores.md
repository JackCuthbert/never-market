# Store signals

What marks a marketplace listing on each store, taken from supplied markup. When a store changes its markup, start here. The rule is in `sites/<store>.json`.

## Bunnings

- URL filter: `productranges=!Marketplace` on paths starting `/search/products` and `/products/`. Product pages and `/` do not match. Not verified: whether the bare landing page `/products/assisted-living` honours it. The carousel rule below covers it.
- Signal: the tile link's `aria-label` contains `Availability: Marketplace` (full text `Availability: Marketplace | Online only`). Only marketplace tiles carry it, so a retailer product named "Marketplace ..." stays visible.
- Cells: `[data-search-product-tile]` on search, `.embla-slide` (direct child of `.embla-track`) on category and landing pages.
- `card` also requires `Availability:` text on a slide, so a slide without it is not counted in the total.
- Not used: the `text-identity-marketplace` class (styling).

## JB Hi-Fi

- URL filter: `Sold by=JB Hi-Fi` on paths starting `/search`. Less reliable than Bunnings'.
- Signal: `[data-testid="marketplace-seller_callout_product-card"]` inside `.ProductCard`. The callout reads "JB Hi-Fi Marketplace: Sold and sent by ...".
- Not used: the "Online Only" tag. It also marks JB's own online-only products.

## Woolworths

- Marketplace is called Everyday Market.
- URL filter: `isHideEverydayMarketProducts=true` on `/shop/search/products`.
- Mode: `shadow`. The light DOM is identical for both kinds of card. The cell is `.product-grid-v2--tile` holding `<wc-product-tile>`. The signal `.market-product-message-wrapper` is inside that element's open shadow root. The alternatives `#vendor-information-tile` and `.seller-name` risk false positives if retailer tiles ever show vendor text.
- The class `product-tile_component_product-tile__rcGmj` has a generated suffix and is not used.

## Big W

- No URL filter. The menu filter does not change the URL.
- Signal: `img[alt="Marketplace Logo"]` inside `article[data-testid="product-tile"]`.
- Cells: `li` holding the article on search and category pages, `.keen-slider__slide` holding the same article in "Similar Products" and "Recently Viewed" sliders.
- Class names have generated suffixes and are not used.
- Not used: `ONLINE ONLY`, `DELIVERY ONLY`, `NEW`, `Sponsored`, `NOT AVAILABLE IN STORE`.
- keen-slider positions slides with inline transforms and counted them before hiding, so drag range or dots can be out of sync.

## Kmart

- Mode: `keep`. Only Kmart-sold listings stay. Target, Officeworks ("+3 sellers"), Marketplace and any badge not exactly "Kmart" are hidden. "Kmart + Target" cards stay, because Kmart is among the sellers.
- No URL filter. The `f.Shops` parameter does not narrow results: with it, Target, Officeworks and other sellers still show.
- Cells: `li[data-testid$='-grid-item']` (`slp-` on `/search/`, `plp-` on `/category/`).
- Badge: `[aria-label='seller badge'] span`, text `Kmart`. The `aria-hidden` duplicate is harmless.
- "Online only" is never a signal.
- Note shown in the popup: Kmart's own marketplace filter still shows Target and Officeworks items as if Kmart sold them.
