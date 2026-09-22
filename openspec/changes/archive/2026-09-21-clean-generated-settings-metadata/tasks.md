## 1. Exact generated-file policy

- [x] 1.1 Extend persisted disposable-path validation and bounded purge behavior to support approved exact regular files while continuing to reject links and special files; verify existing cleanup coverage remains green.
- [x] 1.2 Add `src/integrations/pi/engine/pi-settings-metadata.json` to the central completed-delivery disposable policy and document why test processes leave it shared until worktree cleanup.

## 2. Fail-closed cleanup coverage

- [x] 2.1 Extend cleanup fixtures for an eligible worktree containing the exact metadata artifact; verify repository-owned cleanup removes it through the ordinary bounded path.
- [x] 2.2 Add near-match and unrelated-content regression cases; verify cleanup still blocks content not named by the exact central policy.

## 3. Validation and completion

- [x] 3.1 Run strict OpenSpec validation, typechecking, and focused cleanup governance tests without prohibited local full suites; record any actual gap explicitly.
- [x] 3.2 Reconcile current `develop` and prepare the accepted change for trusted finalization and exact-head validation.
- [x] 3.3 Verify PR #529's retained worktree is blocked only by the exact generated artifact and record the standard post-merge cleanup command for execution after this policy integrates.
- [x] 3.4 Regenerate the pinned Pi public API consumer inventory after exact-head CI exposed drift from PR #529's merged owned selector; verify the baseline check passes without export hash changes.
