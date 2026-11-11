## 1. Product operations

- [x] 1.1 Add enter/attach/detach/list dispatch with legacy aliases and canonical successful path/branch output; verify CLI grammar and outcome tests.
- [x] 1.2 Implement bounded Git worktree creation/resumption and atomic attachment without overwrites or deletion; verify Git fixtures for bases, edited resumes, collisions, foreign paths, locks, and competing owners.
- [x] 1.3 Separate ordinary transient coordination from real ownership failures and make inventory consistent; verify contention and preserved-prior-association tests.

## 2. Runtime integration

- [x] 2.1 Activate once per session binding and observe without rewriting claims on each poll; verify registry polling, startup recovery, switch, and disposal tests.
- [x] 2.2 Resolve built-in tool cwd from the verified attachment at invocation time; verify attach/detach, failed verification, absolute path, and comparison isolation tests.

## 3. Guidance and handoff

- [x] 3.1 Replace duplicated A1 worktree rules with the shared minimal guidance and document command semantics; verify documentation and policy regressions.
- [x] 3.2 Prepare the same guidance migration in XR Build while retaining private setup and cleanup protections; verify its focused instruction tests and record the installation prerequisite.
- [x] 3.3 Reconcile specs, focused checks, acceptance outcomes, and known gaps; verify strict OpenSpec validation, typecheck, and final PR body validation.
