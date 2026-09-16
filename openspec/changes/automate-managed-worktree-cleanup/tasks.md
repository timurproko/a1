## 1. Candidate-Scoped Completion Command

- [ ] 1.1 Add a `complete` CLI contract for exact repository, worktree, change, PR, and role identity; verify argument/schema tests reject missing, conflicting, unsafe, primary, current, or cross-repository candidates.
- [ ] 1.2 Implement explicit registration/release for an unregistered exact candidate with an internal invocation token and repository defaults; verify existing owned/conflicting registrations block while compatible released or completed registrations are reused idempotently.
- [ ] 1.3 Add candidate filtering to the existing bounded reconciler so `complete` evaluates only its requested registration without enabling the watcher or touching unrelated released entries; verify removal, already-absent, retained-blocker, interruption, and journal-resume outcomes.

## 2. Central Generated-Content Policy

- [ ] 2.1 Define and document the exact repository-owned disposable roots for installed dependencies, generated build roots, and OpenSpec finalization reports; verify near-match, path-escape, tracked, untracked, and unknown ignored content remains blocking.
- [ ] 2.2 Apply central defaults automatically during `complete` while preserving explicit low-level registration compatibility; verify eligible ignored generated content is removed only through normal non-force Git worktree removal with no recursive fallback.

## 3. Accurate Nested Repository Detection

- [ ] 3.1 Replace filename-only `.gitmodules` blocking with structural checks for nested `.git` metadata, index gitlinks, configured submodules, and changed submodule state; verify malformed or uncertain structures fail closed.
- [ ] 3.2 Add a fixture matching the tracked empty vendored `.gitmodules` file and verify it does not block an otherwise clean worktree, while real nested repositories and submodules remain protected.

## 4. Delivery Procedure and Documentation

- [ ] 4.1 Update project workflow, the change-delivery skill, and cleanup/archive documentation to mandate the one-command post-merge procedure and prohibit ad hoc generated-file, worktree, or local-branch deletion; verify guidance tests pin the exact handoff.
- [ ] 4.2 Update CLI help and audit output for candidate-scoped completion, central disposables, success/blocker reporting, and retry semantics; verify reports expose no owner token, credentials, or file contents.

## 5. Validation and Bootstrap Evidence

- [ ] 5.1 Run focused cleanup state, Git, evidence, reconciliation, watch, CLI, guidance, and typechecking tests in disposable temporary repositories; record exact commands and outcomes without running local `test:fast`, `test:full`, or `test:release` absent separate authorization.
- [ ] 5.2 Validate the completed OpenSpec change strictly and prepare behavior-specific acceptance scenarios for one-command cleanup, automatic generated-content handling, and protection of real user/nested-repository data; verify the final PR list matches the conditional acceptance manifest.
- [ ] 5.3 Exercise the exact post-merge `complete` handoff end to end in a disposable repository and record the deployed command for this change; verify the live worktree remains retained until authorized merge and can then use that same command without manual disposal decisions.
