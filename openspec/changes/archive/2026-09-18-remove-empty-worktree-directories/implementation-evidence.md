# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/remove-empty-worktree-directories` on top of `develop` at `e5bb79b9`, on Windows 11 with Git 2.53.0.windows.1 and Node 24.16.0 after `npm ci`. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused fixtures

| Command | Outcome |
| --- | --- |
| `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` | 88 passed, 0 failed. New cases: an aged empty directory and a nested tree of only empty directories are removed in one execution pass as `removed (empty-directory)` with step `empty-directory-removed`, the sweep lines name them as `directory <name>: ...`, and the Git-listed `example` worktree stays `unmanaged (not-registered)`; a directory holding a file at depth, one holding a nested `.git` directory, one holding a junction, a directory younger than the grace (`empty-directory-recent`), and an emptied path Git still lists all stay `unmanaged` with their content untouched and out of the lines; preview reports `unmanaged (empty-directory)` and deletes nothing, and a cancelled execution pass deletes nothing; on Windows a nested directory held open as a child process's working directory reports `blocked (empty-directory-locked)` with the path, appears in the lines, keeps the tree, and is removed by the next pass once the process exits. |
| `npx vitest run test/repository-governance/local-cleanup.test.ts test/repository-governance/change-delivery-guidance.test.ts` | 6 passed. |

## Live runs against the maintainer's repository

The `scripts/` tree was copied outside `.worktrees/` and run from the primary checkout with `--repo D:/Git/a1`.

| Run | Result |
| --- | --- |
| `preview` | `.worktrees/erasable-syntax-only` reported `unmanaged (empty-directory)`; the three live worktrees reported `unmanaged (not-registered)`; nothing deleted. |
| First `sweep` | Lines: `directory erasable-syntax-only: removed (empty-directory) [empty-directory-removed]` followed by the three retained checked-out branches; the directory no longer exists. |
| Second `sweep` | No row for that path; only the three retained branches. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate remove-empty-worktree-directories --strict` | `Change 'remove-empty-worktree-directories' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `npm run check:architecture` | Architecture, product identity, package identity, pinned Pi ledger, terminal host provenance OK. |
| `npm run check:docs-governance` | `Docs-sensitive governance OK: 74 inventoried legacy occurrences match`. |
| `npm run check:code-documentation` | `Code documentation governance OK: no violations`. |
| `npm run check:names` | `967 files; 0 violations`. |

## Known gaps

- The lock fixture runs only on Windows, where a process's working directory blocks `rmdir`; on Linux and macOS `rmdir` succeeds regardless, so the `empty-directory-locked` path is exercised there only by an `ENOTEMPTY` race that no fixture provokes.
- The ten-minute grace is measured from the directory's modification time, which Windows updates when the last child is removed; a leftover from a removal that failed in the last ten minutes is reported `empty-directory-recent` and removed by a later pass.
