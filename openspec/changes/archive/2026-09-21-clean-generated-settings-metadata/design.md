## Context

`test/support/pi-settings-metadata-setup.ts` invokes `writePiSettingsMetadata("src")` before Vitest suites load the settings bridge. The generated JSON is intentionally ignored and untracked. It remains available for the worktree's test processes, including overlapping Vitest invocations that may load it at different times.

Completed-delivery cleanup recognizes only exact paths in `COMPLETION_DISPOSABLE_PATHS`, and its persisted schema and purge implementation currently permit directories only. This fail-closed policy correctly refuses the generated JSON. PR #529 is merged, archived, remotely pruned, and otherwise eligible, but its released worktree remains blocked solely by this artifact.

## Goals / Non-Goals

**Goals:**

- Recognize only the exact generated metadata file in the central disposable policy.
- Support exact regular-file disposables while preserving existing inspection, retry, and non-force removal safeguards.
- Prove exact-match deletion and continued rejection of near matches or unrelated ignored content.
- Allow the standard cleanup command to remove PR #529's retained worktree after this policy is merged.

**Non-Goals:**

- Treating `src/`, arbitrary JSON, or arbitrary ignored files as disposable.
- Removing shared metadata at individual Vitest teardown, which can race another test process in the same worktree.
- Weakening worktree identity, ownership, acceptance, archive, remote-ref, path-boundary, link, special-file, nested-repository, or non-force deletion checks.
- Deleting PR #529's worktree before this policy change is reviewed and merged.

## Decisions

### 1. Preserve the generated metadata through the test run

Keep the existing setup-only lifecycle. Independent Vitest processes can overlap in one worktree; removing the shared file when one process exits can make another process fail while loading settings modules. Worktree completion, rather than process teardown, is the safe lifecycle boundary for this ignored artifact.

A global teardown was tested and rejected because concurrent focused Vitest invocations reproduced that deletion race.

### 2. Add one exact regular file to the central disposable policy

Add `src/integrations/pi/engine/pi-settings-metadata.json` to `COMPLETION_DISPOSABLE_PATHS`, extend persisted disposable-path validation to permit that exact value, and let purge remove either a verified directory or verified regular file. Existing cleanup validation still requires the approved path to be ignored and within the worktree, rejects links and special files, bounds traversal, and purges approved content before non-force Git worktree removal.

A broad `src/` or filename-pattern allowance was rejected because arbitrary source-adjacent ignored content must remain protected. Manually deleting the current residue was rejected because delivery policy requires the repository-owned cleanup command to own generated-content deletion.

### 3. Test exact-file recovery and near-match protection

Extend local-cleanup fixtures to prove the central list and CLI expose the exact path, an eligible candidate can remove the regular file, and an ignored near-match remains a `worktree-content` blocker. Keep ordinary generated-directory and full cleanup coverage to ensure file support does not weaken established behavior.

## Risks / Trade-offs

- **[Risk] A source path in the disposable list could be broadened accidentally.** → Use one exact file path in schema and policy, with a near-match rejection test.
- **[Risk] File purge could accept links or special files.** → Continue rejecting symbolic links and allow only `isDirectory()` or `isFile()` before bounded removal.
- **[Risk] Tests leave the file in active worktrees.** → It is ignored, deterministic, shared safely by concurrent tests, and removed only after verified delivery by the central policy.

## Validation Gap Disposition

Exact-head CI exposed pre-existing consumer-inventory drift from merged PR #529: the pinned Pi public API baseline did not name the owned thinking selector's public-package imports. Regenerate only that inventory so its export hashes remain unchanged while its consumer paths match the merged source. This is delivery reconciliation for the prerequisite selector change, not a cleanup-authority expansion.

## Migration Plan

1. Add exact regular-file support and the metadata path with focused tests and documentation.
2. Validate the OpenSpec change and governance fixtures in the isolated worktree.
3. After authorized merge, run the standard exact-candidate cleanup for PR #529; the updated policy removes the generated residue and then the old worktree/ref under existing safeguards.
4. Roll back by reverting the exact schema/allowlist entry and regular-file purge support; no persisted product data changes.
