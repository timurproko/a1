## Why

On Windows, `a1 update` fails with `EPERM: operation not permitted, rename` and rolls back whenever any program holds a single file under the installed package tree at the instant the updater checks that the tree is free. The check is one rename of the package directory with no second attempt, so a scanner pass, an indexer, a file browser open in the folder, or a session still finishing its exit turns a routine update into a failure the user has to diagnose and retry by hand. A verified field failure arrived sixteen seconds after a session ended and cleared on its own before the user tried again.

## What Changes

- Keep checking that the package tree is free for a bounded window instead of failing on the first held rename, pausing longer between checks so a brief holder costs little and a persistent one is not hammered.
- Fail only after the window closes, with a diagnostic that names the package path, the kinds of program that hold it, and that nothing was changed, so the user knows what to close and that retrying is safe.
- Distinguish a held tree from a wrong tree: a rename error that is not a lock still fails at once.
- Put the tree back under its own name with the same patience if a holder appears while it wears the probe name, and name where the tree is if that never succeeds.
- Cover the wait schedule, the diagnostics, and the real Windows held-file condition with deterministic tests, including one that stages an open handle and releases it mid-wait.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Verify that the package is free with bounded patience rather than one attempt, and make the persistent-lock failure actionable.

## Impact

The change affects the self-update lifecycle coordinator's package unlock check, its test seams, and the release index exports. It introduces no dependency, command, package identity, user-data migration, transaction schema, or ownership-release policy change. The rename-based check itself is retained because it is the one operation that reliably detects a held tree on Windows.
