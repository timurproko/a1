## Context

See `proposal.md` for motivation. The current cleanup engine already has strong remote evidence, ownership, identity, journaling, and non-force removal primitives, but its public procedure is a sequence of `register`, `release`, `enable`, `once`, and `disable` commands. Disposable paths are caller-selected, so forgetting flags blocks routine generated content. Content traversal also rejects every file named `.gitmodules`, including the repository's tracked empty vendor file, without checking whether a submodule or nested repository exists.

## Goals / Non-Goals

**Goals:**
- Give agents one exact-candidate command for post-merge local cleanup.
- Centralize safe generated-path handling and remove per-agent disposal choices.
- Preserve fail-closed handling for user content and real nested repositories/submodules.
- Reuse the current evidence, ownership, journaling, and non-force removal engine.
- Make success, retention, and idempotent retry machine-readable.

**Non-Goals:**
- Automatically deleting every ignored path.
- Cleaning unmanaged worktrees in bulk or adopting work from another session.
- Installing a background service or deleting remote branches.
- Force-removing dirty, locked, replaced, or partially removed worktrees.

## Decisions

### Add an exact-candidate `complete` command over the existing engine

Extend the repository cleanup CLI with a `complete` operation accepting `--repo`, `--path`, `--change`, and `--pr` (with source/candidate overrides retained for legacy roles). For an unregistered exact path, the command creates an owned registration with an internal per-invocation token, applies central disposable defaults, immediately releases it after leaving the target directory, and runs one reconciliation filtered to that registration. Existing compatible released/completed registrations are reused idempotently; conflicting ownership or identity remains blocking.

The command itself is explicit local cleanup authorization for that exact candidate. It does not persist broad watcher authority, evaluate unrelated registrations, or require agents to call `enable`/`disable`; the disabled sentinel continues to govern queue/watch execution, while a later explicit `complete` invocation remains separately authorized. Under the hood it uses the same state lock and reconcile transaction so there is one removal implementation.

Alternative considered: document the existing five commands more strongly. This was rejected because it still leaves token handling, disposable selection, state restoration, and error interpretation to every agent.

### Centralize a narrow generated-path policy

Define repository-owned defaults for `node_modules`, ignored build-output roots already recognized by cleanup policy, and `.artifacts/openspec-archive`. The exact list is versioned in code and documentation. The inspector confirms each encountered path is ignored and beneath the worktree before allowing it; tracked modifications and any untracked or unknown ignored data remain blockers. The normal non-force Git worktree removal remains responsible for removing an eligible checkout, so no recursive fallback is introduced.

Alternative considered: allow every ignored path. This was rejected because `.gitignore` commonly covers user-local data that cleanup has no authority to discard.

### Detect nested repositories from Git structure, not filenames alone

Keep nested `.git` files/directories as blockers and query the index for gitlink entries plus configured submodule paths/status. A tracked regular `.gitmodules` file is ordinary repository content when it declares no active path backed by a gitlink and there is no nested Git metadata. Untracked `.gitmodules` is already blocked by status inspection.

Alternative considered: special-case the current empty vendor path. This was rejected because structural detection is safer and works for future vendored metadata without path-specific exceptions.

### Keep one-shot cleanup scoped and state-preserving

Candidate-scoped reconciliation will process only the requested registration and will not toggle persistent watcher enablement. The operation records the same journal transitions and emits a final JSON result. If interrupted, the existing journal permits a repeated `complete` invocation to finish or report `already-absent`. Existing preview/watch commands and registrations remain compatible.

## Risks / Trade-offs

- **[Risk] Central defaults accidentally authorize user data** → Keep an exact narrow list, require Git to classify each path as ignored, reject links/special files/nested metadata, and test near-match paths.
- **[Risk] One command weakens explicit ownership** → Treat invocation parameters as explicit candidate registration authority, reject conflicting existing ownership, and retain exact filesystem/HEAD/ref binding.
- **[Risk] Candidate filtering bypasses global bounds or journals** → Implement filtering inside the existing bounded reconciler and reuse its lock, state transitions, evidence reader, and reports.
- **[Risk] Structural submodule detection misses a malformed repository** → Combine index gitlinks, configured submodule paths, status output, and filesystem `.git` detection; uncertainty remains blocking.
- **[Trade-off] Unknown generated tools still block** → Require repository policy updates rather than letting agents improvise deletion flags.

## Migration Plan

1. Add the candidate-scoped completion command and central disposable policy without removing existing low-level commands.
2. Update temporary-repository fixtures for generated content, tracked empty `.gitmodules`, real nested repositories/submodules, ownership conflicts, interruption, and idempotency.
3. Update delivery guidance so new agents use only the standard command after verified merge; retain low-level commands for diagnostics and legacy registrations.
4. Use the new command to complete this change's own worktree cleanup after its authorized merge, verifying the bootstrap path from the updated primary checkout.
5. Roll back by restoring the prior guidance and command routing; existing state records remain version-compatible and no completed tombstone is rewritten.
