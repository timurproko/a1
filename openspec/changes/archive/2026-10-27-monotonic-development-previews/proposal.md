## Why

A development preview is versioned `X.Y.Z-dev.<pull-request-number>`. Pull request numbers are assigned when a PR opens, not when it merges, so a PR that stays open longer than its neighbours publishes a lower version after a higher one. On 2026-10-27, #828 merged after #835, #837, #841, and #842 and published `0.2.7-dev.828` while installs already ran `0.2.7-dev.835`. The `next` dist-tag then pointed below every installed build: `a1 update --develop` reported "up to date", `a1 version` showed a develop head below `Current`, and the startup update check compared against a cached head that was no longer the newest build. A named preview install (`a1 update --develop 828`) got through, but the next launch's automatic update, reading the 24-hour cache that still said `0.2.7-dev.835`, replaced it again; that worker died midway and left a lease and transaction that refused every later manual update with "update already in progress for 0.2.7-dev.835", a version nobody had asked for.

## What Changes

- A development publication is versioned `X.Y.Z-dev.<count>`, where `<count>` is the first-parent commit count of the selected `develop` commit. The count rises with every merge, so a later publication always sorts above an earlier one under semver precedence. The merged pull request number and the source commit are recorded in the published application and installer manifests as publication metadata instead of being encoded in the version.
- `a1 update --develop <pr>` and the installer's `--develop <pr>` resolve a preview by the pull request recorded in the registry's published manifests, falling back to the version suffix for previews published before this change; the full-version selector, channel detection, and the candidate evidence check are unchanged because the version keeps one decimal identifier.
- `a1 version` appends the recorded pull request to the `Current` and `Develop` lines, as `0.2.7-dev.1218 (#828)`, and omits it when none is recorded or reachable.
- An explicit `a1 update` that finds the update lease held by a dead process whose durable transaction names a different target settles that transaction first through the existing rollback path, reclaims the lease, and installs the requested target, reporting the interrupted target it settled. It no longer reports a dead attempt as "in progress".
- A completed explicit update invalidates the startup release-check cache, so the next interactive launch compares the installed version against the registry's current channel head rather than a result recorded before the update.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `continuous-integration`: preview versions use the monotonic develop commit count; the merged pull request and source commit are recorded in the published manifests.
- `cli-self-update`: a numbered preview is resolved by recorded pull request; a dead owner's foreign transaction is settled before a manual update; an explicit update invalidates the release-check cache.
- `a1-shell`: `a1 update --develop <pr>` selects by recorded pull request; `a1 version` shows the recorded pull request beside development versions.

## Impact

- **Publication:** `.github/workflows/publish.yml` version derivation and manifest stamping, `scripts/release/publication-client.mjs`.
- **CLI:** `src/foundation/release/update.ts` named-preview resolution, lease handling, and cache invalidation; `src/foundation/release/update-execution-lease.ts` dead-owner reconciliation; `src/foundation/release/latest-release.ts` cache helper; `src/cli/version-stats.ts` display.
- **Installer:** `packages/a1-install/bin/a1-install.js` named-preview resolution.
- **Documentation:** the version form where `docs/` describes `-dev.N`.
- No dependency changes. Existing installs on `0.2.7-dev.<pr>` update to the first `0.2.7-dev.<count>` publication because the develop commit count (1218 today) already exceeds every published pull request number.
