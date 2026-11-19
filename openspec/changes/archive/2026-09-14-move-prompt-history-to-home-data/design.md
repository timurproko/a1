## Context

See `proposal.md` for motivation and the explicit decision not to migrate history.

`composeOwnedUi` currently passes `resolveProductPaths().dataDir` into `PromptHistoryService`. `resolvePromptHistoryPath` appends `history/<profile-id>.sqlite3`; its digest depends on the normalized effective agent-profile path, not the data root. The worker/store already handles directory creation, SQLite sidecars, retention, permissions, and asynchronous failures.

`resolveLaunchProfilePaths` already resolves A1's effective home using its explicit test input, `A1_PROFILE_HOME`, an injectable home reader, or `os.homedir()`. Its managed root is `<home>/.a1`. The general product-data resolver deliberately has separate platform defaults for control and release state.

## Goals / Non-Goals

**Goals:**
- Make this a root-selection and wiring change, reusing the existing history service and store.
- Use the same effective-home decision as the agent profile, without deriving the default from a custom agent-profile directory.
- Keep the root decision pure and testable; do not introduce filesystem discovery during selection.

**Non-Goals:**
- Migration, old-path probes, fallback reads, import/export, automatic deletion, or a new cleanup command.
- Changes to the profile digest, SQLite schema, history settings, editor behavior, or background-worker lifecycle.
- Relocating any other product data or changing the meaning of existing explicit overrides.

## Decisions

### 1. Resolve a history-specific root at the composition boundary

Use the existing resolved `A1_DATA_DIR` when explicitly configured. Otherwise supply `<effective-home>/.a1/data` as the history service's data root. Reuse the launch-profile home resolver or its already-resolved value through supported composition wiring; pass plain resolved paths into the history feature rather than making it depend directly on another feature's internals.

Keep `resolveProductPaths().dataDir` and startup compile-cache selection unchanged. Reuse the existing override normalization rather than creating a second interpretation of relative or invalid overrides.

Alternative rejected: change the global product data default. That would also relocate control metadata, releases, and caches, far beyond this request. Deriving the history root from `dirname(adapter.agentDir)` is also rejected: a custom profile should affect the history identity, not move the default storage root.

### 2. Keep the existing filename and storage implementation

Continue calling `resolvePromptHistoryPath` with the selected root and effective agent profile. The resulting layout is:

```text
<effective-home>/.a1/
  agent/
  data/
    history/
      <profile-id>.sqlite3
      <profile-id>.sqlite3-wal   (when present)
      <profile-id>.sqlite3-shm   (when present)
```

The existing creation, owner-permission, failure, and queue policies remain in effect. Verify the home-based location does not weaken supported file protections; do not assume it inherits the same ACLs as AppData. Changing the root does not require a database format revision or a new identity salt.

Alternative rejected: a single shared history file or history directly inside `agent/`. Both discard the existing storage/profile separation for no benefit.

### 3. Start fresh; do not add transition logic

When the selected store is absent, ordinary store initialization creates it empty. Do not inspect the old platform default, even to show a notice or decide whether cleanup is needed. If opening the selected location fails, retain the current sanitized failure and local-recall behavior rather than trying another root. Keep the existing disabled-history and comparison guards ahead of storage initialization.

Alternative rejected: automatic copy, merge, or deletion. The maintainer explicitly requested none of these, so there is no migration implementation or migration task.

## Risks / Trade-offs

- **Old prompts do not appear at the new default** -> This is intentional and accepted; explain the fresh start in the storage documentation. An explicitly configured `A1_DATA_DIR` still selects its own store normally.
- **Different releases can use different defaults** -> Do not claim history synchronization between old and new releases. Neither location is automatically deleted by the application.
- **A home directory may have customized permissions or be backed up** -> Preserve existing supported owner restrictions and the warning that history is unencrypted sensitive text. Verify both default and overridden roots.
- **An accidental global path change relocates unrelated state** -> Add root-selection/composition coverage asserting control, runtime, release, and cache paths remain unchanged.

## One-time local cleanup

The maintainer confirmed removal of the old database is a separate local operation, not product behavior. Defer it until the new implementation is in use and every instance using the old profile store is closed; otherwise the old release can continue using or recreate that store. Identify the exact old profile database and remove only it and its matching `-wal`/`-shm` sidecars. Do not delete the entire AppData root, other profile databases, or either `.a1/cache` or `.pi/cache`.

No local history files are removed by preparing this proposal, and no cleanup script or automatic deletion path belongs in the implementation.
