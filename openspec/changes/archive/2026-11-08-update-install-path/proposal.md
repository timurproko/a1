# Proposal

## Why

`runSelfUpdate` (`src/foundation/release/update.ts`, 197 lines) decides its production control flow from which test hooks were injected:

- **Preflight.** It resolves npm's CLI entry only when a test injected neither `runner` nor `packageReplacement`, or did inject `npmCliResolver`.
- **Recovery release.** It records an approved recovery release only when no `runner` was injected.
- **Install.** A second install path, a plain `npm install` through the injected `runner`, is reached only by tests. Production always takes protected package replacement.
- **Prior release.** With an injected `packageReplacement`, it invents an `"injected-prior-release"` record with a zero digest.
- **Maintenance and rollback.** An injected `lifecycle` turns release cleanup off and replaces rollback with the string `"previous test lifecycle retained"`.

So most update tests exercise a path production never runs, and the production path's ordering (preflight, recovery release, protected replacement, rollback) is covered only where a test happens to inject the right combination. The only production caller, the automatic update, injects none of these hooks.

## What Changes

- **One installer port.**
  - The steps that touch npm and release storage — preflight, protecting the prior release, replacing the package, rolling back, and post-activation maintenance — become one `UpdateInstaller` port in `update-installer.ts`.
  - The production implementation is the protected path the update already uses.
- **One install path.**
  - `runSelfUpdate` always runs preflight, prior-release protection, package replacement, activation and maintenance through the installer, and rolls back through it on failure.
  - It no longer branches on `runner`, `lifecycle` or `packageReplacement`.
  - `SelfUpdateOptions` drops `packageReplacement`, `npmCliResolver` and `maintenance` in favour of `installer`. `runner` remains for the npm registry and global-root queries; `lifecycle` remains for activation.
- **A readable update body.** `runSelfUpdate` splits into resolving the target and installation, running the transaction, and activating, so none of them is over the long-function threshold.
- **Tests use an explicit fake.**
  - The update tests get a fake installer whose package replacement issues the same `npm install` through the scripted runner, so their recorded npm calls and exit codes stay the same.
  - The preflight, maintenance and replacement-outcome tests set the matching installer step.
- **Unchanged.** Every update outcome, message, exit code, progress step and transaction phase in production.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cli-self-update`: self-update has one install path, and its test doubles replace whole steps instead of switching the update to a different path.

## Impact

- `src/foundation/release/update.ts`, new `update-installer.ts`, and `index.ts` exports.
- `test/foundation/release/update.test.ts` and `update-process-exit.test.ts`.
- The size ratchet drops `runSelfUpdate` from the long-function list.
