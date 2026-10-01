## Why

`npm run develop` dispatches `develop.yml`, but GitHub rejects the reusable `publish.yml` call before creating any job. The caller grants only `contents: read`, while the reusable workflow contains stable-only `approval` and `complete` jobs that declare `contents: write`; GitHub validates the full reusable-workflow permission envelope even when those jobs would be skipped in development mode. Run 36857604265 therefore ended with `startup_failure` and no package was built or published.

## What Changes

- Grant the trusted default-branch development wrapper the `contents: write` ceiling required to instantiate the reusable publisher, matching the existing candidate and stable wrappers.
- Keep effective development-job authority least-privileged: `publish.yml` continues to grant only `contents: read` by default, and its write-scoped stable jobs remain skipped in development mode.
- Add focused workflow-policy coverage that rejects a publication wrapper whose caller permission ceiling cannot satisfy the reusable publisher's declared nested jobs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Publication wrappers must supply a permission ceiling compatible with every declared job in the reusable publisher so an authorized dispatch can start, while each executing job retains its narrower reusable-workflow permissions.

## Impact

This changes `.github/workflows/develop.yml`, its declarative repository-governance permission inventory, focused release workflow policy tests, and the publication permission contract. It does not change publication source/version selection, validation lanes, npm authority, package bytes, stable release behavior, or the maintainer command interface.
