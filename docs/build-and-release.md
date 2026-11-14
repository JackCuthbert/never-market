# Build and release

## Build

`npm run build` runs `scripts/build.ts`:

- Reads `manifest.base.json` and every `sites/*.json`.
- Bundles one content script per store (`dist/rules/<store>.js`, engine plus rule), the popup (`dist/popup/`) and `dist/background.js`, with esbuild (IIFE, target Chrome 105).
- Writes `content_scripts` (run at `document_start`) and `host_permissions` from the rules' hosts, `dist/stores.json` (store names for the popup) and `dist/manifest.json`.
- Copies `assets/icons/` to `dist/icons/`.

The manifest `version` comes from `manifest.base.json`.

`npm run package` builds, then zips `dist/` into `never-market.xpi`. Firefox in a Flatpak or Snap sandbox (for example Zen) cannot load `dist/` from the file picker, which exposes only `manifest.json`, so it loads the `.xpi` as a temporary add-on.

## Repositories and CI

Code lives first on Forgejo and is push-mirrored to GitHub. Releases happen on GitHub.

- Forgejo runs `.forgejo/workflows/ci.yml`: typecheck, unit tests, e2e. Forgejo reads `.github/workflows/` only when `.forgejo/workflows/` is missing, and each GitHub job also has `if: github.server_url == 'https://github.com'`, so the release workflow does not run there.
- GitHub runs `.github/workflows/release.yml`.

## Release

On GitHub, `release.yml` runs the same checks on every push and pull request. On a push to `main`, after the checks pass, release-please opens or updates a release PR. Commits must follow Conventional Commits. The PR bumps `version` in `package.json` and `manifest.base.json` (`release-please-config.json`, `.release-please-manifest.json`) and writes `CHANGELOG.md`.

Merging the release PR tags the release. A final job builds from that tag and uploads:

- `never-market-firefox-<tag>.xpi`, from `npm run package`.
- `never-market-chrome-<tag>.zip`, the contents of `dist/`.

The `.xpi` is unsigned. Firefox installs it as a temporary add-on, or permanently on Developer Edition, Nightly and ESR with `xpinstall.signatures.required` off. Signing through AMO is not set up.

GitHub must allow Actions to create pull requests (Settings, Actions, General).
