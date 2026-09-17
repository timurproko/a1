# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/resume-locked-worktree-removal` on top of `develop` at `39406693`, on Windows 11 with Git 2.53.0.windows.1 and Node 24.16.0. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused fixtures

| Command | Outcome |
| --- | --- |
| `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` | 61 passed, 0 failed, 114 s (57 passed in 77 s on `develop` before the change). New or changed cases: a thrown removal leaves the intact worktree, a later foreign file blocks it with `worktree-content`, and the pass after that removes it with `worktree-removed`, `local-ref-removed`; a dismantled worktree (`.git` pointer and earlier entries gone, tracked files and `node_modules` left) is repaired with `residue-removed`, its prunable registration retired, and an unrelated worktree's registration untouched; an edited tracked file, a foreign file, a junction, and a nested `.git` each block with `residual-content` and their exact paths; a fresh worktree at the same path blocks with `residual-or-reused-path`; an absent residue with a dangling registration completes with `worktree-already-absent`; the Windows exclusive-handle case stays `partial` while the handle is held and completes with `removed` on the pass after release; a locked `node_modules` root blocks with `disposable-path-locked`, `paths: ["node_modules"]`, state `released`, step `none`, and the `.git` pointer intact, then completes after release. |
| `npx vitest run test/repository-governance/local-cleanup.test.ts test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/validation-impact.test.ts` | 16 passed; the bridge ran the three Node suites in 96 s, so its budget was raised from 110 s / 120 s to 170 s / 180 s for the slower hosted Windows runner. |

## Retry budget measurement

`fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })` against one directory holding a single file opened with `FileShare.None` took 66 915 ms before rejecting with `EBUSY`, because Node applies its retry schedule at every nesting level. The same call with `maxRetries: 0` rejected in 2 ms, and removal after release took 1 ms. `removeTree` therefore drives its own loop: six attempts, 300 ms linear backoff (about 6.3 s), only for `EBUSY`, `EPERM`, `EACCES`, and `ENOTEMPTY`, and never past the pass deadline.

## Read-only verification against the maintainer's repository

A copy of the changed scripts outside the removable root ran `inspectResidue` for every entry journaled at `remove-intent` in `D:/Git/a1` (state read only, nothing removed):

| PR | Path | Result |
| --- | --- | --- |
| #443 | `record-startup-budget-on-development-publication` | `{ clean: true, shape: "absent" }` (directory removed by hand earlier; registration already pruned) |
| #448 | `report-publication-failure-clearly` | `{ clean: true, shape: "absent" }` |
| #450 | `restore-impact-selection` | `{ clean: true, shape: "residue" }` in 372 ms: 1 976 tracked files hashed against `3f2c1e28`, all identical; `node_modules` (1 552 files) below the disposable root; Git lists the path as `prunable gitdir file points to non-existent location` |
| #451 | `clear-command-search-on-escape` | `{ clean: true, shape: "absent" }` (the residue was removed by hand between the earlier `preview` that classified it `eligible` and this run) |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate resume-locked-worktree-removal` | `Change 'resume-locked-worktree-removal' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `npm run check:architecture` | `Architecture boundaries OK`, product identity OK, package identity OK, `Pinned Pi source ledger provenance OK`. |
| `npm run check:docs-governance` | `Docs-sensitive governance OK: 75 inventoried legacy occurrences match`. |
| `npm run check:code-documentation` | `Code documentation governance OK: no violations`. |
| `npm run check:names` | `957 files; 0 violations`. |

## Post-merge evidence to record

After merge, the owning agents rerun `local-worktree-cleanup.mjs complete` for #450 from the primary checkout; the expected report is `removed` with steps `residue-removed`, `local-ref-removed`. The next fresh completion on this machine should finish in one pass or report `disposable-path-locked` naming the locked root while the worktree stays intact.
