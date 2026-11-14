# Popup

`popup/popup.html` and `popup/popup.ts`. It asks the active tab's content script for a count every second and on any storage change, and reads the two settings from `chrome.storage.local`.

## Toggles

Two checkboxes, both on by default, applied to every store:

| Toggle | Key | Description shown |
| --- | --- | --- |
| Hide marketplace listings | `enabled` | Turn off to see every listing and compare the page. |
| Use store filters | `useStoreFilters` | Ask the store for retailer-only results. Only works on pages the store can filter; elsewhere listings are hidden instead. |

Both are always shown on a supported store. "Use store filters" is not shown for a store with no `urlFilter` (the count response has `filterable: false`). On an unsupported page neither toggle is useful and the unsupported state shows.

## Count message

The popup sends `{ type: 'count' }`. The content script answers with `{ store, hidden, total, filtered, filterable, note }` (`CountResponse` in `src/types.ts`). `hidden` is the number of elements matching the hidden selector (0 when `enabled` is off). `total` is the number of `card` elements, or `null` when the rule has no card selector. Nothing is stored and the page is not changed.

## States

The popup shows one of four states, set as `data-state` on `main`.

- **on:** a bar and "N of M listings hidden" with a percentage. With no cards yet, "No listings found yet".
- **off:** "Hiding is off. M listings shown."
- **filtered:** "Store filter on. Listings are removed by the store, so there is nothing to count here." Plus "N more hidden by the extension" when cards slipped through. This state needs the page to carry the filter param. Other pages of the same store show the **on** state.
- **unsupported:** no content script answered. "Never Market is off on this site." and "It works on <store names>." The names are a plain comma-separated list from `dist/stores.json` (written by the build), not links.

## Note

A rule's `note` shows as a muted line under the count on that store's pages (Kmart's warning about Target and Officeworks).

## Appearance

Light and dark follow the system theme. The accent is a bright green. When "Use store filters" is not shown, no divider is left below the last toggle.
