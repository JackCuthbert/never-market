# Site rules

One file per store: `sites/<store>.json`, typed as `Rule` in `src/types.ts`. The build script bundles the engine with the rule into `dist/rules/<store>.js`, one content script per store, and derives `host_permissions` and content script matches from `hosts`.

## Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | yes | Store name shown in the popup. |
| `hosts` | yes | Hostnames the rule runs on, for example `www.kmart.com.au`. |
| `card` | with `hide` or `keep` | Selector for the listing's layout cell. The popup counts it as the total. |
| `hide` | one mode | CSS selector for marketplace cells. See [hiding.md](hiding.md). |
| `shadow` | one mode | `{ card, host, marketplace }` for stores that render cards in a shadow root. Uses `shadow.card` instead of `card`. |
| `keep` | one mode | `{ badge, text }`. Hide every card except those whose seller badge is exactly `text`. Needs `card`. |
| `urlFilter` | no | `{ pathPrefix, param, value }`. See [store-filters.md](store-filters.md). `pathPrefix` is a string or a list. |
| `note` | no | Short warning the popup shows on that store's pages. |

A rule uses one hiding mode: `hide`, `shadow` or `keep`. The build fails if `keep` has no `card`.

## The layout cell

`card`, `hide` and `shadow.card` must match the direct child of the grid or flex container that owns the listing's space, not an inner node. Hiding an inner node leaves an empty cell and a gap. When a store has more than one list type (search grid, carousel), the selector lists each cell type.

A `hide` selector is the `card` selector plus a `:has(...)` for the marketplace signal.

## Selector rules

- Use stable hooks: `data-testid`, `aria-label`, `alt`, element names. Never use class names with generated suffixes.
- The signal must appear on marketplace cards only.
- Each store's selector is chosen and checked for that store alone. There is no shared default.
