# Never Market

A Firefox and Chrome extension that hides third-party marketplace listings on Australian retail sites, so you see only what the retailer sells itself.

Supported: Big W, Bunnings, JB Hi-Fi, Kmart, Woolworths.

## Why

Marketplace listings sit among a retailer's own products with little to tell them apart. They are often drop-shipped, with different delivery, returns and support. Never Market removes them from the page and leaves a layout with no gaps.

Kmart is the odd one: it also lists Target and Officeworks items as if Kmart sold them. Never Market hides everything not sold by Kmart.

## How it works

- Listings that come from a marketplace are hidden on search and category pages. Nothing is removed from the page, only hidden, so the store's own scripts keep working.
- Where a store can filter its own results, the extension adds that filter to the URL as well, so pages stay full and sorting and pagination stay correct. Elsewhere it hides the listings.
- The toolbar popup shows how many listings are hidden on the current page and has two toggles:
  - **Hide marketplace listings**: turn off to see the page as the store serves it.
  - **Use store filters**: add the store's own filter to the URL where it has one.
- The toolbar icon has a green dot on a supported store with hiding on, and a grey dot otherwise.

## Install

Download a package from the GitHub releases page.

- **Chrome:** unzip `never-market-chrome-<tag>.zip`, open `chrome://extensions`, turn on Developer mode, choose "Load unpacked" and pick the folder.
- **Firefox:** the `never-market-firefox-<tag>.xpi` is unsigned. Open `about:debugging`, "This Firefox", "Load Temporary Add-on" and pick the file. Load it again after each restart. Developer Edition, Nightly and ESR can install it permanently with `xpinstall.signatures.required` set to `false`.
- **Firefox site access:** Firefox does not run the extension on a site until you allow it. Open the Extensions (puzzle) menu, the gear next to Never Market, "Manage Extension", then Permissions, and turn on site access for each store. Reload the store page.

## Build from source

```
npm install
npm run build      # unpacked extension in dist/
npm run package    # never-market.xpi, for Firefox in a Flatpak or Snap sandbox
```

Contributors and agents: see [AGENTS.md](AGENTS.md) and [docs/](docs/).
