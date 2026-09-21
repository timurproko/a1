## Context

`test/support/pi-settings-metadata-setup.ts` invokes `writePiSettingsMetadata("src")` before Vitest suites load the settings bridge. The generated JSON is intentionally ignored and untracked, but the setup currently returns no teardown. Focused local test runs therefore leave the file in their worktree.

Completed-delivery cleanup recognizes only the exact paths in `COMPLETION_DISPOSABLE_PATHS`. This fail-closed policy correctly refuses the generated JSON because it is currently outside that list. PR #529 is merged, archived, remotely pruned, and otherwise eligible, but its released worktree remains blocked solely by this artifact.

## Goals / Non-Goals

**Goals:**

- Remove the generated source-side metadata after ordinary Vitest completion.
- Recover safely after interrupted test processes by recognizing only the exact generated path in the central disposable policy.
- Prove exact-match deletion and continued rejection of near matches or unrelated ignored content.
- Allow the standard cleanup command to remove PR #529's retained worktree after this policy is merged.

**Non-Goals:**

- Treating `src/`, arbitrary JSON, or arbitrary ignored files as disposable.
- Weakening worktree identity, ownership, acceptance, archive, remote-ref, path-boundary, link, special-file, nested-repository, or non-force deletion checks.
- Deleting PR #529's worktree before this policy change is reviewed and merged.

## Decisions

### 1. Return a teardown from the existing Vitest global setup

Capture the path returned by `writePiSettingsMetadata("src")` and return a teardown callback that removes exactly that file with missing-file tolerance. This keeps ordinary successful test runs clean without changing runtime metadata loading.

A broad source-tree cleanup or test-runner shell wrapper was rejected because teardown belongs beside the setup that owns the artifact and must remain exact-path scoped.

### 2. Add the exact generated file to the central disposable policy

Add `src/integrations/pi/engine/pi-settings-metadata.json` to `COMPLETION_DISPOSABLE_PATHS`. Existing cleanup validation already requires approved paths to remain ignored and within the worktree, rejects links and special files, bounds traversal, and removes approved content before non-force Git worktree removal.

Relying only on teardown was rejected because terminated or crashed test processes do not run teardown. Manually deleting the current residue was rejected because delivery policy requires the repository-owned cleanup command to own generated-content deletion.

### 3. Test both ordinary teardown and interrupted-run recovery

Extend focused metadata tests to prove setup writes and teardown removes the source artifact. Extend local-cleanup fixtures to prove the central list contains the exact path, an eligible candidate can remove it, and a near-match path remains a blocker.

## Risks / Trade-offs

- **[Risk] A source path in the disposable list could be broadened accidentally.** → Use one exact file path and retain a near-match rejection test.
- **[Risk] Teardown could race a consumer still reading metadata.** → Vitest invokes global teardown only after suites complete; runtime builds use the separate `dist/` copy.
- **[Risk] Process termination still leaves residue.** → The central cleanup policy provides the reviewed recovery path.

## Migration Plan

1. Add teardown and the exact central disposable path with focused tests and documentation.
2. Validate the OpenSpec change and governance fixtures in the isolated worktree.
3. After authorized merge, run the standard exact-candidate cleanup for PR #529; the updated policy removes the generated residue and then the old worktree/ref under existing safeguards.
4. Roll back by reverting the teardown and exact allowlist entry; no persisted product data changes.
