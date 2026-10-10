## Why

A1's preferred installer is acquired through npm, but its documented command begins with `npx` while the rest of the package workflow is presented through `npm`. npm already exposes the equivalent short `npm x` alias, so using that form consistently removes an unnecessary command-name distinction without giving up the dependency-free installer, custom progress, exact target selection, or installation verification.

## What Changes

- Replace the preferred `npx` installer invocation with npm's short `npm x` form in current root, installer-package, and release-runbook guidance.
- Use an explicit `--` command boundary before `@timurproko/a1-install` so `--develop`, preview values, `--help`, and future installer-owned options are forwarded to the installer rather than interpreted by npm.
- Update the silent-installer contract and focused documentation coverage to require the same stable, development, numeric-preview, and exact-preview grammar through `npm x`.
- Preserve the installer package, target resolution, custom progress, activation, verification, diagnostics, and direct-global recovery behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `silent-installer`: the preferred package-manager invocation uses `npm x` with an explicit argument boundary instead of the separate `npx` executable.

## Impact

The change affects installation examples in `README.md`, `packages/a1-install/README.md`, and `docs/ci-release-runbook.md`, plus the canonical silent-installer specification and focused documentation/governance assertions. It does not change application or installer runtime code, package identities, published bytes, release channels, or update behavior.
