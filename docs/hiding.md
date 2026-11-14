# Hiding listings

The content script (`src/engine.ts`, `start(rule)`) runs at `document_start` on the store's hosts. Listings are hidden with an injected stylesheet that sets `display: none !important`. `!important` is needed because some tile roots carry a `flex` class that overrides the `hidden` attribute. At `document_start` there is no `<head>`, so the style element goes into `document.documentElement`.

A stylesheet applies to cards added later, so hiding needs no hooks into the page's rendering.

## Modes

**`hide`.** The stylesheet hides the rule's `hide` selector. No scanning.

**`shadow`.** For stores where the marketplace signal is inside a shadow root, which a page-level selector cannot see. A scanner finds each `shadow.card`, reads `card.querySelector(host).shadowRoot`, and sets `data-never-market` on the card when `marketplace` matches inside the root. The stylesheet hides `[data-never-market]`. The scanner runs on load, on new cards (`MutationObserver` on the document), when a shadow root fills in late (observer on each root) and every 500 ms. A card whose root has not rendered cannot be classified and stays visible, so a marketplace card can show briefly. A reused tile has its attribute set or removed on the next scan.

**`keep`.** For a store where the seller is the signal. The scanner sets `data-never-market-keep` on each `card` that contains a `badge` element whose trimmed text equals `keep.text`. The stylesheet hides every `card` without that attribute, so cards are hidden from the start and shown when the scan finds the badge. There is no flash of unwanted cards. A card whose badge never renders stays hidden.

## Settings

`enabled` (default true) comes from `chrome.storage.local`. When it is off the stylesheet is removed, scanner attributes are cleared and scanning stops. When it turns on again, everything applies live with no reload.

## Known limits

- Carousels (Bunnings Embla, Big W keen-slider) measured their slides before hiding. Scroll range and dots can be out of sync, and a carousel of only marketplace items leaves an empty section with its heading.
- A page's own result count and pagination include hidden items when no store filter is in use.
