# Store filters

Some stores accept a URL parameter that makes the server return retailer-only results. That keeps pages full, and sorting and pagination correct. Hiding (see [hiding.md](hiding.md)) still runs on every page and covers pages the filter does not.

A rule opts in with `urlFilter: { pathPrefix, param, value }`. Stores without one (Big W, Kmart) are hiding only.

## Redirect

`src/url-filter.ts` has the pure URL logic; `createRedirect` in `src/engine.ts` applies it.

- `filteredUrl`: on a path that starts with any `pathPrefix`, when `param` is missing, returns the URL with `param=value` appended. Other parameters and the hash are kept. Encoding is per `encodeURIComponent` (`!Marketplace`, `Sold by`). Otherwise `null`.
- `hasFilterParam`: the path matches and the param is present.
- `unfilteredUrl`: removes the pair only when the decoded name and value equal the rule's. Other parameters, their encoding and the hash are kept.

The redirect uses `location.replace`, so history is not polluted. It runs when settings load, when settings change, and every 500 ms, to catch navigation without a page load. A content script cannot see the page's own `history.pushState`, so polling is the chosen detection.

The redirect runs only when settings have loaded, `enabled` is on and `useStoreFilters` is on. A loop guard in `sessionStorage` (`never-market-redirect`) skips a redirect to the same target within 5 seconds, in case a store removes the param itself. Any settings change clears the guard.

## Toggle behaviour

- **Use store filters** (`useStoreFilters`, default true) off: the extension stops redirecting and removes its param from the current URL (reload with `location.replace`).
- **Hide marketplace listings** (`enabled`) off: same cleanup, so the page is the raw store page and the extension never changes the URL.
- Turning either back on adds the param and reloads to the filtered URL.

## Counting

The page is `filtered` when the rule has a `urlFilter`, `enabled` and `useStoreFilters` are on, and the URL carries the param. The store already removed marketplace listings, so the popup counts nothing there (see [popup.md](popup.md)). On any other page of the same store the count and hiding work normally.
