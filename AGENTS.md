# Never Market

Firefox and Chrome MV3 extension that hides marketplace listings on Australian retail sites. A store is a data file in `sites/<store>.json`; one generic engine in `src/engine.ts` runs it. Specs are in `docs/`. Read the one your task needs and no more.

## Commands

```
npm run build        # dist/
npm run typecheck
npm run test:unit
npm run test:e2e     # builds first
```

All three checks must pass before you commit.

## Rules

- A false positive (hiding a retailer product) is worse than a missed marketplace listing.
- Hide with CSS. Never remove page nodes.
- Make a new store work with a rule file first. Change `src/engine.ts` only when no mode fits.
- Selectors use stable hooks (`data-testid`, `aria-label`, `alt`), never generated class names.
- A card selector matches the layout cell, not an inner node.
- Test in Chromium and write the test before the fix. Firefox is manual.
- Commits: Conventional Commits, one change per commit, no AI attribution.

## Routing

| Task | Read |
| --- | --- |
| Add a store, make a new site work | `docs/adding-a-store.md`, then `docs/site-rules.md` |
| Fix a store after it changed its markup | `docs/stores.md`, `docs/site-rules.md` |
| Rule field, selector or hiding mode | `docs/site-rules.md`, `docs/hiding.md` |
| Shadow DOM or seller-badge store | `docs/hiding.md` |
| Store URL filter or redirect | `docs/store-filters.md` |
| Popup states, toggles, copy, note | `docs/popup.md` |
| Toolbar icon | `docs/toolbar-icon.md` |
| Build, manifest, package | `docs/build-and-release.md` |
| Release or CI workflow | `docs/build-and-release.md` |
| Write or run tests, fixtures | `docs/testing.md` |
| Why the project exists, non-goals | `docs/overview.md` |

## Files

| Path | Holds |
| --- | --- |
| `sites/*.json` | One rule per store |
| `src/engine.ts` | Styles, scanners, redirect, count |
| `src/url-filter.ts` | Pure URL logic |
| `src/types.ts` | `Rule` and message types |
| `src/background.ts` | Toolbar icon |
| `popup/` | Popup page and script |
| `scripts/build.ts` | Bundles rules, writes the manifest |
| `fixtures/<store>/` | Offline HTML for tests |
| `test/unit`, `test/e2e` | Tests |

## Keep docs current

A change to behaviour changes the spec in `docs/` in the same commit. Specs say what the application does and why. Code comments say only what the code cannot show.
