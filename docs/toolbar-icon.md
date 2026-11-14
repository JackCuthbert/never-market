# Toolbar icon

`src/background.ts` sets a per-tab toolbar icon. The icon has a green dot (`icons/on-*.png`) on a store page with hiding on, and a grey dot (`icons/off-*.png`) everywhere else. The extension-list icon has no dot. There is no badge.

- Content scripts send `{ type: 'status', active }` after settings load, on `pageshow`, and when `enabled` changes. `active` is the `enabled` setting.
- The background keeps `active` per tab and sets the icon with `chrome.action.setIcon({ tabId, path })`.
- On a tab update to `loading`, a tab whose URL is not a store URL is reset to grey. A store tab keeps its state, because the content script reports again on its own page loads. Store URLs come from the manifest's content script matches. On `complete` an active tab is set green again.
- The popup can ask for a tab's state with `{ type: 'getStatus', tabId }`.
- The manifest declares both `background.service_worker` (Chrome) and `background.scripts` (Firefox) for the same `background.js`. No `tabs` permission is used.

## Icons

`assets/icon.svg` is the logo. `npm run icons` renders the PNGs into `assets/icons/` (needs Playwright Chromium) and previews into `test-results/logo/`. The PNGs are committed.
