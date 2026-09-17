# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/automate-openspec-finalization` on top of `develop` at `e52df799` after `npm ci --ignore-scripts`. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Baseline this change is measured against

The last forty merged PRs average 4.7 commits each. PR #428 carried nine `docs(openspec): finalize` / `Revert "docs(openspec): finalize ..."` pairs in thirty commits; each pair surrounds a fix that edited `tasks.md` and `implementation-evidence.md`, which the manifest digests. Every PR merged on 2026-09-17 (#450 through #454) needed at least one such pair or a rebase-and-refinalize because `develop` advanced between finalization and merge.

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/repository-governance/openspec-delivery-finalization.test.ts` | 6 passed: first finalization unchanged; re-finalization after an archived `tasks.md` edit changes only `acceptance.md` under the same archive path and its `tasksDigest` equals the new bytes; re-finalization after a target advance rebuilds the synchronized spec from the new target and records the new `specBaseSha`; the operation is a no-op on its own output; an active head whose canonical specs differ from the target fails `delivery-specs-diverged`; without `targetSpecs` drift still fails `delivery-content-drift`. |
| `npx vitest run test/repository-governance/openspec-finalization-publication.test.ts` | 7 passed against a disposable bare remote: an active ready head gets one `docs(openspec): finalize example` commit authored by the App identity whose diff is confined to `openspec/`, the body fence is patched after the push, and a rerun reports `already-finalized`; an edit to the archived tasks yields one `refinalize` commit and no body edit; a head behind `develop` gets `restore`, `merge`, `refinalize` commits whose merge parent is the `develop` tip and whose spec carries both the delta and `develop`'s new requirement; a conflicting `develop` change stops with `finalization-merge-conflict` and pushes nothing; a developer push between read and push makes the leased push report `retry`; a body edit between read and update leaves the body alone and reports `retry`; drafts, closed, legacy, and unassociated PRs are skipped, a forked head is refused, and incomplete tasks fail closed without a push. |
| `npx vitest run test/repository-governance/openspec-archive-workflow.test.ts test/repository-governance/github-repository-governance.test.ts test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/impact-aware-validation-workflows.test.ts` | 29 passed: the new workflow's triggers, permissions, default-branch trust, concurrency, App secrets, draft and merged skips, absence of PR-head checkout and `contents: write`; the `delivery` job's `Awaiting automated finalization` summary; the governance inventory entry with authority `single-pr-finalization-publication`; the runbook, config, and skill guidance pins. |
| `npx vitest run test/repository-governance` | 1053 of 1056 passed. `startup-descriptor` needs a built `dist/` this worktree does not have; `code-documentation` source roles and `terminal-architecture-policy` timed out at Vitest's 5000 ms default under the full parallel suite and pass in isolation (45 passed on rerun), the same load-sensitive files the previous changes recorded. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate automate-openspec-finalization --strict` | `Change 'automate-openspec-finalization' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `node scripts/governance/check-architecture.mjs` | `Architecture boundaries OK`. |
| `node scripts/governance/check-docs-governance.mjs` | `Docs-sensitive governance OK`. |
| `node scripts/governance/check-code-documentation.mjs --mode full` | `Code documentation governance OK: no violations`. |
| `node scripts/governance/product-identifier-policy.mjs --check` | `964 files; 0 violations`. |

## Not verified locally

The workflow itself cannot run before it exists on `develop`; this PR is finalized with the local command, which now exercises the same re-finalization path. Live evidence for the first automated finalization is post-merge: the `OpenSpec finalization` run for the first ready version-3 PR after this merge, its `docs(openspec): finalize` commit authored by the archive App, the `Development validation` run on that head, the body fence it wrote, and the manual merge. The absence of `Revert "docs(openspec)` commits on PRs merged afterwards is the durable measurement.
