## 1. Safe branch-cleanup tooling

- [x] 1.1 Implement a repository-owned command that classifies local branches relative to an explicit integration target as protected, current, merged-deletable, or unmerged; validate its default dry-run output with focused tests.
- [x] 1.2 Add explicit apply mode using only Git safe deletion, plus narrowly scoped optional remote-source cleanup that rejects protected, current, or unmerged branches; validate failure and refusal cases in isolated temporary repositories.
- [x] 1.3 Expose the command through the repository package scripts and verify it behaves consistently on Windows-compatible command execution without adding dependencies.

## 2. Workflow governance

- [x] 2.1 Document the required branch lifecycle: branch from `develop`, validate, merge, push, switch to the integration branch, preview cleanup, safely delete the local source branch, then delete its non-protected remote counterpart when present.
- [x] 2.2 Add deterministic governance tests proving `develop`, `master`, the checked-out branch, and unmerged branches cannot enter the deletion set and proving force deletion is never used.
- [x] 2.3 Update affected repository governance inventories or allowlists only when deterministic checks require it, then run typecheck, architecture checks, and focused branch-governance tests.

## 3. Existing branch reconciliation and certification

- [x] 3.1 Run the cleanup command in dry-run mode against the current clone and review the exact protected, merged-deletable, and unmerged sets without altering working-tree files.
- [x] 3.2 Apply cleanup to the reviewed merged-deletable local topic and milestone branches while retaining `develop`, `master`, and every unmerged branch; verify the resulting branch inventory.
- [x] 3.3 Run the full repository check and strict OpenSpec validation, commit only this change's files, and record that this change's own source branch must be safely deleted immediately after its later merge and push.
