## Why

The sole package publisher is named `release.yml` even though it handles nightly and explicit development previews as well as stable releases. Naming it for publication makes its full responsibility clear and avoids implying that development packages are releases.

## What Changes

- Rename `.github/workflows/release.yml` to `.github/workflows/publish.yml` and rename its GitHub Actions display identity from `Release` to `Publish`.
- Update active dispatchers, nightly-triage integration, governance inventories, validation ownership, documentation, and tests to use the new workflow path and identity.
- Preserve compatibility when reading historical `Release`/`release.yml` provenance while emitting only the new `Publish`/`publish.yml` identity for future runs.
- Keep publication triggers, channels, package bytes, permissions, validation, registry gates, and release authority unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: the scheduled publication workflow and its triage provenance use the `Publish` identity instead of `Release`.

## Impact

The coordinated rename affects the publication workflow, release command dispatch, nightly regression triage and provenance readers, repository governance and validation path inventories, focused governance tests, and publication documentation. Historical OpenSpec archives remain unchanged as records of the paths and names that existed when those changes were delivered.
