# Implementation evidence

## Authorization and reproduced blocker

The maintainer approved and requested implementation of this change in draft PR #437. The current exact-candidate cleanup command for merged PR #433 advanced past the inert tracked `.gitmodules` check but retained its clean worktree with disposition `deferred` and reason `content-inspection-budget`. Its normal installed dependencies exceeded the shared 20,000-entry traversal allowance.

## Implemented behavior

`inspectWorktree` retains the 20,000-entry ordinary-content allowance and adds a separate finite 100,000-entry allowance for exact registered disposable roots. Exact roots and descendants consume generated capacity; adjacent prefixes remain ordinary. The operation deadline is unchanged. Every visited generated entry still receives nested Git metadata, symbolic-link/junction, and special-file checks, and exhaustion of either allowance still fails closed as `content-inspection-budget`.

No merge/archive evidence, registration ownership, accepted disposable path, remote-ref, or non-force removal contract changed.

## Validation

- `node --test test/repository-governance/local-cleanup.node.mjs` passed **34 tests**.
- `npm run typecheck` passed.
- `openspec validate complete-large-generated-worktree-cleanup --strict` passed.
- `git diff --check` passed.
- A read-only invocation of the implemented `inspectWorktree` against the retained exact PR #433 worktree returned `{ "clean": true }` in **760 ms** with the central disposable roots. It did not remove the worktree or alter cleanup state.

No local fast, full, release, publication, or product command was run. No known gaps remain before exact-head CI and post-merge cleanup verification.
