## 1. Shared release lookup

- [x] 1.1 Add `src/foundation/release/latest-release.ts` with channel selection from the running version, dist-tag parsing, a registry fetcher honouring `npm_config_registry` with a 3 s timeout, and a semver `isNewerRelease` that treats invalid versions as not newer.
- [x] 1.2 Add the user-level `<configDir>/update-check.json` cache with atomic writes, 24 h freshness per channel, and tolerant reads of missing, corrupt, or other-channel content.
- [x] 1.3 Keep development-build `a1 version` output unchanged; `src/cli/version-stats.ts` keeps its private dist-tag parsing so the dependency-light version leaf does not load the release owner (see design D3).
- [x] 1.4 Cover channel selection, comparison, cache freshness/corruption/channel mismatch, and fetch failure/timeout with unit tests.
- [x] 1.5 Make stable `a1 version` query dist-tags and print `Current: <installed>` then `Release: <latest>` without a `Develop` line; on discovery failure print `Release: unavailable` with one `A1` diagnostic and exit 0.
- [x] 1.6 Replace the stable no-query case in `test/cli/version-stats.test.ts` with stable success and failure cases, and update the stable-release rationale comment in `src/cli/version-stats.ts`.

## 2. Startup check wiring

- [x] 2.1 Evaluate the opt-outs (`PI_OFFLINE`, `A1_SKIP_VERSION_CHECK`, `CI`, non-TTY stdout, source-checkout version, bare-A1 `updateCheck`) before any cache read or network access.
- [x] 2.2 Start the check from the owned startup path next to the extension-package update probe so it is never awaited on the first-usable-frame path, and deliver a newer result to the session shell.
- [x] 2.3 Keep existing tests deterministic through the offline environments they already set, and add coverage proving no network or cache access when disabled.

## 3. Update-available notice

- [x] 3.1 Render the Pi-parity `Update Available` notice in the owned session shell with the channel-appropriate command and, for stable releases, the GitHub Release changelog hyperlink.
- [x] 3.2 Order it before the extension-package notice and append it with a render request when the result arrives after the first frame.
- [x] 3.3 Add rendering and ordering tests for stable, development, late-arrival, and combined-notice cases in both interactive profiles.
- [x] 3.4 Mark `document.update-notifications` implemented in `config/baselines/presenter-ownership-inventory.json`.

## 4. Update check setting

- [x] 4.1 Declare `updateCheck` (boolean, default `true`, `Update check`) in the Generic section after `Quit animation` and advance the settings migration.
- [x] 4.2 Cover default resolution, migration of older profiles, presentation order, invalid values, and absence from `a1 pi`.

## 5. Channel-head downgrade guard

- [x] 5.1 Report "already current" and skip the transaction in `runSelfUpdate` when a resolved channel head is not newer than the running version, leaving named previews unchanged.
- [x] 5.2 Add update tests for a lower `latest`, a lower `next`, and an older named preview.

## 6. Documentation

- [x] 6.1 Document the startup notice, `A1_SKIP_VERSION_CHECK`, and the `Update check` setting in the user docs.
