## Why

The product already uses `a1` as its primary command, while the npm package and an obsolete public command still use `addone`. Because the old package has no users, the project can make a clean registry cutover now instead of carrying permanent alias and package-migration complexity.

## What Changes

- **BREAKING** Replace the npm package `@timurproko/addone` with a new package, `@timurproko/a1`, whose fresh release lineage starts at stable version `0.1.0`.
- **BREAKING** Publish only the `a1` executable; remove the public `addone` alias and the public `addone-supervisor` executable.
- Make version reporting, self-update, immutable release identity, package validation, release evidence, and publication automation authoritative for `@timurproko/a1`.
- Keep the AddOne product name, `.a1` profile roots, existing state-path conventions, and internal `ADDONE_*` identifiers unless a rename is independently required for correctness.
- Do not implement compatibility, data migration, or a bridge release for `@timurproko/addone`; this is an approved clean cut with no installed-user migration requirement.
- Publish and verify `@timurproko/a1@0.1.0` as npm `latest`, then permanently unpublish all versions of `@timurproko/addone` and verify that its registry endpoint no longer resolves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `launch-profiles`: Make `a1` the sole installed public command for every launch profile and remove all `addone` alias behavior.
- `cli-self-update`: Expose update only through `a1` and resolve/install releases exclusively from `@timurproko/a1`.
- `addone-shell`: Define the sole-command installed surface, fresh package identity, version reporting, and release behavior under `@timurproko/a1`.

## Impact

This affects the root npm manifest and lockfile, CLI metadata lookup and diagnostics, update/version queries, immutable release identity validation, public-bin packaging, release tests, package-content gates, GitHub npm publication workflows, registry evidence, user documentation, architecture documentation, and active OpenSpec changes that still require both aliases. The registry operation creates `@timurproko/a1@0.1.0` and destructively removes `@timurproko/addone`; historical repository evidence remains unchanged as historical fact.
