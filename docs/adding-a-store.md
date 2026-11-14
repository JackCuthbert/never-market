# Adding a store

Adding a store is a rule file, a fixture and tests. Change engine code only when no existing mode fits.

## Steps

1. **Capture markup.** Get one marketplace card and one retailer card, plus the list container, for each list type (search grid, category grid, carousels). Ask the user if you only have a card: the layout cell may be a wrapper. Record a page with `node scripts/record-fixture.ts <store> <url> <name>`, which opens Chromium with no extension and saves `fixtures/<store>/<name>.har` on Enter.
2. **Find the signal** that appears on marketplace cards only. Reject labels retailer products also carry. Prefer stable attributes over classes. See [stores.md](stores.md) for what each store uses.
3. **Pick the mode.**
   - Signal is in page markup: `hide`.
   - Signal is inside a shadow root: `shadow`.
   - Signal is the seller, and everything not sold by the retailer must go: `keep`.
4. **Find the layout cell** (the direct child of the grid or flex container). See [site-rules.md](site-rules.md).
5. **Check for a URL filter.** Only add `urlFilter` if the param really narrows results to the retailer's own. Test with the param on and off. A param that still shows other sellers is not a filter (Kmart's `f.Shops`).
6. **Write `sites/<store>.json`.** Add `note` only for a warning the shopper needs.
7. **Add a fixture** to `fixtures/<store>/`: trimmed HTML with at least one marketplace card, one retailer card and the list container, plus the CSS needed for a real layout.
8. **Add the store to the tests.** See [testing.md](testing.md). Add an entry to `stores` in `test/e2e/stores.spec.ts` for the no-marketplace-card and no-gaps checks. Add a spec for any mode-specific behaviour.
9. **Run** `npm run build`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`.
10. **Update docs.** Add the store to [stores.md](stores.md), and the store names in the README and the manifest description.

`npm run build` picks up the new file: it adds the content script, the host permission and the popup's store list.

## Check by hand

Firefox is not automated. Load the extension in Firefox and check: both toggles, a page with the store's filter and one without, no gaps, carousels still scroll, and the popup counts. A live run (`LIVE=1 npm run test:e2e -- stores`) opens the real site in a headed browser. A live failure means "look", not "broken".
