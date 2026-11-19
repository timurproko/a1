# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/close-absent-and-skewed-cleanup` on top of `develop` at `c17efd7b`, on Windows 11 with Git 2.53.0.windows.1 and Node 24.16.0. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused fixtures

| Command | Outcome |
| --- | --- |
| `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` | 64 passed, 0 failed, 42 s. New cases: a released worktree deleted by hand completes with `worktree-already-absent`, `local-ref-removed` whether Git still holds the prunable registration or it was pruned, the registration is retired, the journal ends `done` / `complete`, and the next preview reports `already-absent`; `complete` finishes such an entry and refuses an unregistered absent path with `worktree-absent-unregistered` without registering it; a fresh valid worktree at the deleted path blocks with `worktree-identity-changed` and keeps its files; a worktree carrying `.artifacts/run-35072062726-core.log` and `.artifacts/final-package/pack.json` completes; `.artifacts-user/` and `artifacts/` still block as `worktree-content`; a junction under `.artifacts` still blocks as `content-link`; a legacy `.artifacts/validation` registration is widened to `.artifacts` on `complete`. |
| `npx vitest run test/repository-governance/openspec-acceptance-policy.test.ts test/repository-governance/openspec-acceptance-github.test.ts test/repository-governance/openspec-archive-github.test.ts test/repository-governance/local-cleanup.test.ts test/repository-governance/change-delivery-guidance.test.ts` | 52 passed. Merge events at −1 s, +1 s, and +5 s from `merged_at` pass; +6 s, +60 s, a day earlier, `not-a-time`, and `undefined` fail with `acceptance-merge-provenance`; the doc pins follow the new policy text. |

## Read-only verification against the maintainer's repository

| Check | Result |
| --- | --- |
| `reconcile-openspec-archive.mjs --dry-run --pr 449` with the changed policy | `accepted-and-archived` (was `invalid-provenance` / `acceptance-merge-provenance` on `develop`; GitHub reports `merged_at` 08:50:20Z and the `merged` event at 08:50:21Z). |
| `inspectResidue` for every `released` / `none` entry whose path is absent (#404, #425, #428, #432, #436) | `{ clean: true, shape: "absent" }` for all five; the two present entries (#449, #452) were left to their ordinary path. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate close-absent-and-skewed-cleanup` | `Change 'close-absent-and-skewed-cleanup' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `npm run check:architecture` | Architecture, product identity, package identity, pinned Pi ledger, terminal host provenance OK. |
| `npm run check:docs-governance` | `Docs-sensitive governance OK: 75 inventoried legacy occurrences match`. |
| `npm run check:code-documentation` | `Code documentation governance OK: no violations`. |
| `npm run check:names` | `967 files; 0 violations`. |

## Post-merge evidence to record

After merge, `complete` for #404, #425, #428, #432, and #436 should each report `removed` with `worktree-already-absent`, `local-ref-already-absent`, and `complete` for #449 should remove its worktree and ref. The journal should then hold no `released` entry for an absent path.
