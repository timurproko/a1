## 1. Absent Registered Worktree

- [x] 1.1 In `scripts/governance/local-cleanup-reconcile.mjs`, add the step-`none` absent-path branch: verify evidence, require no Git row or only this candidate's prunable row, retire that row, journal `deleting` / `worktree-removed` with `worktree-already-absent`, and continue to compare-and-delete ref removal; a valid foreign row blocks with `residual-or-reused-path`.
- [x] 1.2 In `scripts/governance/local-cleanup-complete.mjs`, skip identity recapture for an existing released entry whose path is absent, and block a new registration for an absent path with `worktree-absent-unregistered`.
- [x] 1.3 Fixtures: a released entry whose directory was removed by hand completes with `worktree-already-absent`, `local-ref-removed`; the same with a dangling prunable registration retires it; a fresh valid worktree created at the deleted path blocks with `worktree-identity-changed` and keeps its files; `complete` for an unregistered absent path blocks with `worktree-absent-unregistered` and registers nothing.

## 2. Merge Event Skew

- [x] 2.1 In `scripts/governance/openspec-acceptance-policy.mjs`, replace the `created_at === merged_at` equality with a parsed absolute difference of at most 5000 ms, failing closed on unparsable timestamps; keep the single-event, actor, App, and commit checks.
- [x] 2.2 Fixtures: a `merged` event one second after `merged_at` passes; sixty seconds after fails with `acceptance-merge-provenance`; an unparsable `created_at` fails.

## 3. Artifact Root Policy

- [x] 3.1 Replace `.artifacts/openspec-archive` and `.artifacts/validation` in `COMPLETION_DISPOSABLE_PATHS` with `.artifacts`; keep the registration schema accepting the legacy subroots.
- [x] 3.2 Fixtures: a worktree with `.artifacts/run.log` and `.artifacts/final-package/pack.json` completes; `.artifacts-user/x` and `artifacts/x` still block as unknown ignored content; a link or nested `.git` under `.artifacts` still blocks; an old entry registered with `.artifacts/validation` is widened on the next `complete`.

## 4. Documentation And Evidence

- [x] 4.1 Update `docs/local-worktree-cleanup.md` (disposable policy paragraph, absent-worktree completion, provenance tolerance) and the help text in `local-worktree-cleanup.mjs`.
- [x] 4.2 Run the focused cleanup and acceptance-policy fixtures, typechecking, and the governance commands; record outcomes. After merge, run `complete` for the five stuck entries and for #449 and record the dispositions as post-merge evidence.
