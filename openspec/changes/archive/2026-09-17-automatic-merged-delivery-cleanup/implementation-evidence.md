# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/automatic-merged-delivery-cleanup` on top of `develop` at `cfe8cf3b`, on Windows 11 with Git 2.53.0.windows.1 and Node 24.16.0. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused fixtures

| Command | Outcome |
| --- | --- |
| `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` | 79 passed, 0 failed, 42 s. New cases: `handoff` registers and releases a clean pushed worktree, repeats without a second entry, records a repair push, and blocks unstaged/staged/untracked content (ignored content is left to removal time), an owned entry, a changed branch, and a replaced directory; a registered head one App commit behind the merged head is removed with `worktree-removed`, `local-ref-removed` and the journal carries the accepted head; a local-only commit still blocks with `worktree-identity-changed` and `local-ref-advanced`; a hand-deleted worktree whose branch gained the finalization commit completes through its journal; the sweep removes a released merged candidate without `enable`, reports an open one `pending` and a closed-unmerged one `awaiting-discard`, ignores a stale stop sentinel but stops on a fresh one, and its `lines` name each outcome; branch pruning removes `fix/merged` and a behind-tip `fix/behind`, retains `fix/ahead` (`branch-unmerged-commits`), `fix/open`, `fix/closed`, `fix/remote`, `fix/checked-out`, and `fix/none` with their reasons, never looks up a registered or protected ref, rereads the tip before compare-and-delete, and defers on an exhausted remote budget; a dead PID's silent lock is evicted once and journaled while a fresh heartbeat, a live PID, and an unreadable fresh file stay `mutation-busy`; SHA-addressed objects are fetched once per reader while PR and ref state is refetched. |
| `npx vitest run test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/local-cleanup.test.ts test/repository-governance/openspec-archive-github.test.ts` | 31 passed. The config, skill, and runbook pins cover `sweep`, `handoff`, accepted ancestry, branch pruning, and `awaiting-discard`; the skill stays under 600 words. |

## Live runs against the maintainer's repository

The tooling was copied to a scratch directory outside `.worktrees/` (the CLI refuses mutation from inside the removable root) and run with `--repo D:/Git/a1`.

| Run | Result |
| --- | --- |
| `preview` with the ancestry change | #457 and #458, both one App commit behind their merged heads, report `eligible` (they reported `candidate-head-association` on `develop`). |
| First `sweep` (60 s budget) | #457 `removed` (`worktree-already-absent`, `local-ref-already-absent`); #458 `partial` at `worktree-already-absent` on `remote-response-unavailable`; `pass-deadline` after two candidates. Profiling showed 47 sequential requests per version-3 verification, 30 of them blobs by SHA, and 76 for a legacy candidate, three verifications per candidate. |
| `sweep` after the immutable-object cache (180 s budget) | #458 `removed` (`worktree-already-absent`, `local-ref-already-absent`), #425 `removed`, #462 `blocked` (`owned-worktree`, another session's live hand-off), #452 `blocked` (`source-association`: that PR carries no `openspec-implementation` fence); coverage complete; branch pass evaluated four branches, all `retained` (`branch-checked-out`) because every remaining local branch belongs to a live worktree; 55 s total. |
| Stale lock | `mutation.lock` from PID 38204 (no such process) had blocked every mutation since the morning; it was removed with the maintainer's explicit approval before the first live sweep. The heartbeat and eviction rule was added afterwards so the next such lock evicts itself once its holder is provably gone. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate automatic-merged-delivery-cleanup --strict` | `Change 'automatic-merged-delivery-cleanup' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `npm run check:architecture` | Architecture, product identity, package identity, pinned Pi ledger, terminal host provenance OK. |
| `npm run check:docs-governance` | `Docs-sensitive governance OK: 75 inventoried legacy occurrences match`. |
| `npm run check:code-documentation` | `Code documentation governance OK: no violations`. |
| `npm run check:names` | `968 files; 0 violations`. |

## Known gaps

- Registration #452 (`build-script-stdout`) stays `blocked` with `source-association` on every sweep because its merged PR has no `openspec-implementation` fence; its worktree and branch are already gone. Retiring such an entry needs an explicit operation and is out of scope here.
- The sweep prunes only branches that GitHub can associate with a merged pull request by head ref name; a branch renamed locally after its PR merged is retained as `branch-no-pull-request`.
