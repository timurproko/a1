## Why

A development preview is versioned `X.Y.Z-dev.<pull-request-number>`. Pull request numbers are assigned when a PR opens, not when it merges, so a PR that stays open longer than its neighbours publishes a lower version after a higher one. On 2026-10-27, #828 merged after #835, #837, #841, and #842 and published `0.2.7-dev.828` while installs already ran `0.2.7-dev.835`. The `next` dist-tag then pointed below every installed build: `a1 update --develop` reported "up to date", `a1 version` showed a develop head below `Current`, and the startup update check compared against a cached head that was no longer the newest build. A named preview install (`a1 update --develop 828`) got through, but the next launch's automatic update, reading the 24-hour cache that still said `0.2.7-dev.835`, replaced it again; that worker died midway and left a lease and transaction that refused every later manual update with "update already in progress for 0.2.7-dev.835", a version nobody had asked for.

## What Changes

- A development publication stamps `X.Y.Z-dev.<count>.<pr>`, where `<count>` is the first-parent commit count of the selected `develop` commit and `<pr>` is the merged pull request number. The count rises with every merge, so a later publication always sorts above an earlier one under semver precedence, and the pull request stays visible as the last identifier.
- Every consumer of the preview grammar accepts both the published `-dev.<pr>` form and the new `-dev.<count>.<pr>` form: `a1 update --develop <pr>` resolves by the trailing pull request identifier, and the full-version selector, channel detection, the installer package, and the candidate evidence check accept both shapes.
- An explicit `a1 update` that finds the update lease held by a dead process whose durable transaction names a different target settles that transaction first through the existing rollback path, reclaims the lease, and installs the requested target, reporting the interrupted target it settled. It no longer reports a dead attempt as "in progress".
- A completed explicit update invalidates the startup release-check cache, so the next interactive launch compares the installed version against the registry's current channel head rather than a result recorded before the update.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `continuous-integration`: preview versions carry a monotonic develop commit count before the pull request number.
- `cli-self-update`: the preview grammar accepts the two-part suffix; a dead owner's foreign transaction is settled before a manual update; an explicit update invalidates the release-check cache.
- `a1-shell`: `a1 update --develop <pr>` and the full-version form select previews published in either shape.

## Impact

- **Publication:** `.github/workflows/publish.yml` version derivation and `scripts/release/publication-client.mjs`; `scripts/governance/candidate-evidence.mjs` preview check.
- **CLI:** `src/cli/dispatch.ts` selector grammar, `src/foundation/release/latest-release.ts` channel detection and cache, `src/foundation/release/update.ts` named-preview resolution, lease handling, and cache invalidation, `src/foundation/release/update-execution-lease.ts` dead-owner reconciliation.
- **Installer:** `packages/a1-install/bin/a1-install.js` version patterns and named-preview match.
- **Documentation:** the version form where `docs/` describes `-dev.N`.
- No dependency changes. Existing installs on `0.2.7-dev.<pr>` update to the first `0.2.7-dev.<count>.<pr>` publication because the develop commit count (1218 today) already exceeds every published pull request number.
