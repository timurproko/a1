# Implementation evidence

## Authorization and reproduced blocker

The maintainer requested that the cleanup tooling be fixed and explicitly authorized takeover after the original session stopped. Work continues in draft PR #437, branch `fix/complete-large-generated-worktree-cleanup`, and its existing worktree.

The current exact-candidate cleanup command for merged PR #434 advanced past the inert `.gitmodules` check but retained its clean worktree with disposition `deferred` and reason `content-inspection-budget`. The candidate had already passed manual-merge, archive, exact-head CI, remote-ref, identity, and ownership checks; its normal installed dependencies exhausted the shared 20,000-entry traversal allowance.

## Implemented behavior

`inspectWorktree` retains the 20,000-entry ordinary-content allowance and adds a separate finite 100,000-entry allowance for exact registered disposable roots. Exact roots and descendants consume only generated capacity; adjacent prefixes remain ordinary. The existing operation deadline is unchanged. Every visited generated entry still receives nested Git metadata, symbolic-link/junction, and special-file checks, and exhaustion of either allowance still fails closed as `content-inspection-budget`.

No merge/archive evidence, registration ownership, accepted disposable path, remote-ref, or non-force removal contract changed.

## Validation

- `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` passed **47 tests**.
- `npm run typecheck` passed.
- `openspec validate complete-large-generated-worktree-cleanup --strict --no-interactive` passed before finalization.
- `git diff --check` passed.
- A read-only invocation of the implemented `inspectWorktree` against the retained exact PR #434 worktree returned `{ "clean": true }` in **710 ms** with its released registration. This did not remove the worktree or alter cleanup state.

The unrelated install-time `bin/pi-tui.d.ts` rewrite was restored and is not part of this change. No local fast, full, release, publication, or product command was run. No known gaps remain before exact-head CI and post-merge cleanup verification.
