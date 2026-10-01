## Why

The three npm trusted-publisher callers are currently named `develop.yml`, `publish.yml`, and `finalize-release.yml`. The stable wrapper is triggered by native GitHub Release publication, so `release.yml` describes its role more directly and makes the externally configured caller names consistent: development, release, and shared/scheduled publication.

## What Changes

- Rename `.github/workflows/finalize-release.yml` to `.github/workflows/release.yml` without changing its `release.published` trigger, jobs, permissions, rollback, or reopening behavior.
- Update the reusable publisher's trusted caller identity, repository-governance inventory and inference, active documentation, comments, and focused tests to the new path.
- Preserve exact historical `Release`/`release.yml` provenance compatibility while identifying the active stable wrapper by its distinct `Publish stable release` workflow name and native release trigger.
- Coordinate the npm trusted-publisher setting for both packages from `finalize-release.yml` to `release.yml`; do not publish a stable draft between repository integration and both npm updates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Native stable publication uses the `release.yml` caller identity while historical workflow provenance remains readable and development/nightly publication identities remain unchanged.

## Impact

The coordinated rename affects the stable wrapper, `publish.yml` caller authorization, GitHub governance inventory/inference, release runbook, focused release/governance tests, and npm trusted-publisher settings for `@timurproko/a1` and `@timurproko/a1-install`. Existing archived OpenSpec records and historical Actions runs remain unchanged. The current development-preview recovery still requires `develop.yml` to be trusted independently; this rename does not alter run 36860638548.
