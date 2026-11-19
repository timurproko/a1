## Why

Prompt history should be easy to find and back up alongside A1's existing `~/.a1/agent` profile rather than hidden in platform application-data directories. The current location already survives normal upgrades and npm uninstall/reinstall; this change improves organization and discoverability, not an existing durability defect.

## What Changes

- **BREAKING**: Change the default bare-A1 prompt-history location on Windows, Linux, and macOS to `<effective-home>/.a1/data/history/<profile-id>.sqlite3`, including adjacent SQLite sidecars. The effective home follows A1's existing launch-profile home policy, including `A1_PROFILE_HOME`.
- Preserve explicit `A1_DATA_DIR` behavior: history stays at `<A1_DATA_DIR>/history/<profile-id>.sqlite3` when configured, without accessing the home default.
- Keep the existing profile identity, SQLite schema, retention settings, asynchronous persistence, privacy protections, and editor behavior unchanged.
- Do not migrate, import, copy, merge, delete, or automatically fall back to history at the former default. The maintainer explicitly does not need migration for the current single-user deployment; a previously unused new location starts with no saved history. Removing the maintainer's old local database is a separate, one-time cleanup after all instances using it have stopped, not application behavior or a cleanup feature.
- Keep control metadata, settings, agent resources, releases, dependency layers, logs, runtime files, and caches at their existing locations. This is not a global change to `resolveProductPaths().dataDir`.
- Document the new default and the deliberate fresh start, and retain the rule that upgrades, ordinary npm uninstall/reinstall, rollback, and cache cleanup preserve saved history.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `persistent-prompt-history`: Change the default history root, define no-migration/no-fallback behavior, preserve explicit overrides and profile isolation, and clarify lifecycle preservation and home-directory privacy expectations.

## Impact

- Future implementation affects history path selection and its composition/launch wiring (`src/features/prompt-history/paths.ts`, `src/composition/owned-ui.ts`, and the existing launch-profile home resolver as needed). The worker/store format and profile digest algorithm need no change.
- Focused coverage will verify cross-platform defaults, effective-home and data-root overrides, unchanged profile identities, old-location non-access, comparison/disabled-mode isolation, permissions, and lifecycle preservation.
- Documentation updates belong in the subsequent implementation: `docs/features/prompt-history.md`, `docs/architecture/toolchain.md`, `docs/architecture/resource-and-data-policy.md`, `docs/architecture/boundaries.md`, and the root `README.md` where they describe the history location or ownership.
- No new dependency, environment variable, migration facility, CLI command, or settings surface is required. This proposal contains OpenSpec planning artifacts only.
