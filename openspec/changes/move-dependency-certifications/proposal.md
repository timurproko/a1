## Why

Dependency-layer certification records currently clutter the data-directory root with long, repetitive filenames such as `dependency-layer-certification-dependencies-<hash>.json`. Grouping them in `dependency-certifications/` makes managed storage easier to inspect without changing dependency identities or weakening certification.

## What Changes

- Store new dependency certifications at `<dataDir>/dependency-certifications/<layerId>.json`, retaining the existing `dependencies-<32-hex>` layer identifier while dropping the redundant record-type prefix.
- Read and lazily migrate valid legacy root-level records without requiring users to move files manually or rehash an unchanged certified payload solely because its record moved.
- Preserve legacy evidence needed by retained releases, live cohorts, and their restart seals; remove superseded legacy copies when safe.
- Update restart-seal creation and bounded garbage collection to understand the dedicated directory and legacy transition.
- Keep certification contents, platform checks, dependency-layer directories, and release identities unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-supervision`: Define dedicated dependency-certification storage, validation-preserving legacy migration, restart compatibility, and ownership-safe cleanup across both layouts.

## Impact

- Affects `src/foundation/release/dependency-layer.ts`, `restart-certification.ts`, `release-gc.ts`, and their callers and focused tests.
- Changes managed on-disk record placement beneath the existing data root; it does not relocate `dependency-layers/`, release-certification records, settings, or session data.
- Existing installations remain readable through an explicit compatibility path. Older retained runtimes may continue to require their legacy records during the transition.
- No new runtime dependency, CLI option, or certification schema version is required.
