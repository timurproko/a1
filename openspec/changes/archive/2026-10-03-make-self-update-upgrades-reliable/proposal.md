## Why

The stable `0.2.3` package contains the Windows npm-entry fix, but a user on `0.2.2` cannot benefit from target code that has not been installed yet: `a1 update` performs protected package replacement with the already-installed updater. In the reported user-prefix/Program-Files split, that predecessor fails while preparing recovery authority, briefly flashes progress, rolls back, and leaves the user unable to reach the release that contains the fix.

The release gates did not catch this delivery failure. Candidate recovery tests exercised candidate code, while published-predecessor coverage began after replacement by materializing and warming an already installed candidate. A target-side updater fix could therefore pass every gate without proving that the source release could install it.

## What Changes

- Treat self-update reachability as a predecessor-owned compatibility contract: a release is not update-safe merely because its own updater works after installation.
- Resolve and validate npm replacement authority during a non-mutating preflight, before visible progress, ownership release, transaction creation, or rollback is needed.
- Make the dependency-free official installer a supported repair bridge for valid existing installations by passing its canonical npm execution context into the installed cancellation-safe updater; it must never replace an owned installation directly.
- Add deterministic and exact-package coverage that drives real published predecessor replacement in the Windows split-root layout and proves both ordinary direct update and the bounded installer bridge for already-published affected releases.
- Give a concise official recovery command when an update cannot establish replacement authority, without suggesting user-data deletion or an unguarded package overwrite.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Require pre-mutation replacement-authority preflight, predecessor-to-target reachability, and an actionable safe bridge for an already-published defective predecessor.
- `silent-installer`: Let the official installer repair a valid existing installation by normalizing npm execution context while continuing to delegate all mutation to that installation's protected updater.
- `isolated-regression-testing`: Exercise protected replacement with published predecessor code rather than treating post-install materialization and warmup as complete update evidence.

## Impact

The implementation affects self-update preflight/recovery preparation, existing-install delegation in `@timurproko/a1-install`, focused update/installer tests, published-predecessor fixtures, and release validation selection. It does not change package identity, channels, target grammar, destination-prefix ownership, recovery capsule authority, launcher postconditions, activation, user data, or the rule that an existing valid installation is never directly overwritten by the installer.

No repository change can rewrite the already published `0.2.2` executable. Its one-time supported bridge is the official installer invocation; after the fixed release is installed, ordinary `a1 update` uses the corrected updater and remains protected by the new predecessor gate.
