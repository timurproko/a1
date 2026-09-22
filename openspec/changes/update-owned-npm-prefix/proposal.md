## Why

A1 currently refuses self-update when the invoked package is a valid npm global installation under a prefix that differs from the active npm default, a common result of adopting or switching Node version managers such as FNM. Users should be able to update the A1 installation they actually invoked without manually uninstalling and reinstalling it, while source checkouts, npm links, and other package-manager contexts remain protected.

## What Changes

- Recognize an invoked A1 package as npm-owned when its canonical path exactly matches the package location under a global root that active npm independently confirms for an inferred prefix and that prefix's complete launcher set targets the package.
- Pin package replacement to that confirmed prefix so a default-prefix mismatch updates the invoked installation in place rather than creating or mutating a different installation.
- Bind cancellation-safe recovery to the selected package root, global root, launcher set, npm executable, and explicit prefix arguments while retaining compatibility with valid in-flight recovery evidence.
- Preserve refusal for local checkouts, npm links, malformed package layouts, unconfirmed roots, and different package-manager contexts, with no package or launcher mutation.
- Add deterministic cross-platform coverage for ordinary active-prefix updates, confirmed non-default-prefix updates, rejection cases, and interrupted replacement recovery.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Permit safe in-place self-update from a confirmed npm-owned non-default prefix and bind replacement/recovery to that prefix without weakening unmanaged-installation refusal.

## Impact

The change affects self-update installation discovery, npm process arguments, protected replacement/recovery evidence and validation, update transaction tests, and exact-package Windows/Unix fixtures. It introduces no dependency, command, package identity, user-data migration, or stable-launcher redesign. The postponed `introduce-stable-a1-launcher` change remains postponed and is not resumed by this narrower fix.
