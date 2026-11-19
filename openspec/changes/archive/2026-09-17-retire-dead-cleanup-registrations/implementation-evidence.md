# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/retire-dead-cleanup-registrations` on top of `develop` at `fb1dd7ba`, on Windows 11 with Git 2.53.0.windows.1 and Node 24.16.0. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused fixtures

| Command | Outcome |
| --- | --- |
| `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` | 84 passed, 0 failed. New cases: a released entry with unverifiable evidence stays `blocked` while its ref exists, while its PR is unmerged, and in preview; once path and ref are gone and the PR is merged it is `retired` with `retired-nothing-left` and the original reason, its dangling Git row is retired, it is never evaluated again, and `sweep` lines name it; a deferred failure (`remote-budget`) never retires; `forget` refuses without the flag, with a present path or ref (`something-remains`), for an owned entry, and after completion (`already-complete`), and records `forgotten` for an all-absent released entry; a journal written before completion notes loads with `completion: null` and a note on a non-done entry fails `registration-state`. |
| `npx vitest run test/repository-governance/github-rulesets.test.ts test/repository-governance/github-repository-governance.test.ts test/repository-governance/change-delivery-guidance.test.ts` | 14 passed. The develop ruleset definition pins `strict_required_status_checks_policy: true`; config, skill, and runbook pins cover the update-branch step, `retired-nothing-left`, and `forget`. |

## Live runs against the maintainer's repository

The tooling was copied outside `.worktrees/` and run with `--repo D:/Git/a1`.

| Run | Result |
| --- | --- |
| First `sweep` | `#452 build-script-stdout: retired (source-association) [retired-nothing-left]`, `#461 expose-quit-animation-toggle: retired (delivery-content-drift) [retired-nothing-left]`; the only local branch, this delivery's, retained `branch-checked-out`. |
| Second `sweep` | Coverage total 0; nothing evaluated, nothing reported except the retained branch. |
| `check-github-repository-governance.mjs --check` | `matches: false` with exactly one difference, `rulesets.a1-protect-develop` (live strict policy still false). The maintainer applies it after merge with `--apply --confirm apply-a1-github-governance`. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate retire-dead-cleanup-registrations --strict` | `Change 'retire-dead-cleanup-registrations' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `npm run check:architecture` | Architecture, product identity, package identity, pinned Pi ledger, terminal host provenance OK. |
| `npm run check:docs-governance` | `Docs-sensitive governance OK: 75 inventoried legacy occurrences match`. |
| `npm run check:code-documentation` | `Code documentation governance OK: no violations`. |
| `npm run check:names` | `968 files; 0 violations`. |

## Known gaps

- The live ruleset stays at `strict: false` until the maintainer runs the apply command; `check:repository-governance` reports that one difference in the meantime.
- Retirement covers entries whose path and ref are both gone. An entry whose ref still exists but whose evidence can never verify remains `blocked` by design; the maintainer deletes such a ref by hand and the next sweep retires the entry.
