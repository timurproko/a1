# Implementation evidence

## Authorization and reproduced blocker

The maintainer requested that the cleanup tooling be fixed and explicitly authorized takeover after the original session stopped. Work continues in draft PR #437, branch `fix/complete-large-generated-worktree-cleanup`, and its existing worktree.

The current exact-candidate cleanup command for merged PR #434 advanced past the inert `.gitmodules` check but retained its clean worktree with disposition `deferred` and reason `content-inspection-budget`. The candidate had already passed manual-merge, archive, exact-head CI, remote-ref, identity, and ownership checks; its normal installed dependencies exhausted the shared 20,000-entry traversal allowance.

## Implemented behavior

`inspectWorktree` retains the 20,000-entry ordinary-content allowance and adds a separate finite 100,000-entry allowance for exact registered disposable roots. Exact roots and descendants consume only generated capacity; adjacent prefixes remain ordinary. The existing operation deadline is unchanged. Every visited generated entry still receives nested Git metadata, symbolic-link/junction, and special-file checks, and exhaustion of either allowance still fails closed as `content-inspection-budget`.

No merge/archive evidence, registration ownership, accepted disposable path, remote-ref, or non-force removal contract changed.

## Validation

- After reconciling PR #438's exact validation-artifact policy, `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` passed **48 tests**.
- `npm run typecheck` passed.
- `openspec validate complete-large-generated-worktree-cleanup --strict --no-interactive` passed before finalization.
- `git diff --check` passed.
- A read-only invocation of the implemented `inspectWorktree` against the retained exact PR #434 worktree returned `{ "clean": true }` in **535 ms** with its released registration. This did not remove the worktree or alter cleanup state.

The unrelated install-time `bin/pi-tui.d.ts` rewrite was restored and is not part of this change. No local fast, full, release, publication, or product command was run. No known gaps remain before exact-head CI and post-merge cleanup verification.

## Hosted attempts

Development run [35115356629](https://github.com/timurproko/a1/actions/runs/35115356629) is retained as a failed attempt against superseded head `e20cef07fe7ff05c87dd3295c6e06dcb18691460`. The resource-sensitive lane passed its first nineteen isolated files, then one assertion in `naming-selection.test.ts` exceeded the unchanged five-second Vitest default under hosted contention; the other nine assertions in that file passed. Every other completed product lane passed, but the protected aggregate failed as required. After reconciliation with current `develop`, `npx vitest run test/repository-governance/naming-selection.test.ts --no-file-parallelism` passed all **10 tests** in 4.10 seconds. No timeout, retry, workload, or assertion changed. The reconciled finalized head requires a fresh exact-head Development run.
