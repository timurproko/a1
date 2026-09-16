## 1. Explicit discard authority

- [x] 1.1 Add the `discard` CLI surface with exact repository/path/change/PR arguments and mandatory `--confirm-closed-unmerged`; verify missing, malformed, or conflicting arguments perform no mutation.
- [x] 1.2 Add bounded live evidence classification for a same-repository PR that is closed without merge and targets `develop`; verify open, merged, forked, malformed, reserved, protected, advanced, and unverifiable candidates fail closed.
- [x] 1.3 Extend registration/journal state for an exact discard role and remote-deletion steps while preserving existing records; verify only an exact released registration can be rebound and queue/watch never evaluates discard entries.

## 2. Journaled remote and local deletion

- [x] 2.1 Implement expected-SHA remote compare-and-delete plus absence verification using non-interactive bounded Git operations; verify exact deletion and refusal of advanced, missing-auth, malformed, protected, and reserved refs in disposable repositories.
- [x] 2.2 Implement the candidate-scoped discard transaction so full local inspection precedes remote mutation, remote absence precedes non-force worktree removal, and unchanged local-ref deletion remains atomic; verify successful discard touches no unrelated registration or ref.
- [x] 2.3 Add resumable journal handling for already-absent remote refs, interruption, remote-success/local-blocker partial state, Windows removal failure, recreated paths, reopened PRs, and repeated exact discard; verify retries perform only remaining authorized steps.
- [x] 2.4 Verify dirty, untracked, unknown ignored, nested-repository, link, special-file, active-owner, current-worktree, changed-head, and mutation-lock candidates preserve all remote and local resources.

## 3. Documentation and evidence

- [x] 3.1 Update local cleanup and delivery documentation with the exact discard command, explicit remote-deletion authority, destructive ordering, refusal boundaries, partial recovery, and prohibition on age/name/session inference; verify guidance tests pin the distinction from `complete` and automatic branch cleanup.
- [x] 3.2 Run focused local-cleanup, evidence, watch, and governance fixtures plus typecheck, strict OpenSpec validation, and diff checks; record exact results, remote-mutation fixture boundaries, and explicit gap disposition in implementation evidence.
