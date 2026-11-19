## Candidate validation evidence

Recorded 2026-09-15 from `D:/Git/a1/.worktrees/visible-openspec-acceptance`. These are scoped implementation checks, not a complete local fast/full/release run and not post-deployment live acceptance.

- `npm run typecheck`: passed.
- `npm run check:architecture`: passed architecture, product identity, package identity, pinned Pi ledger, and terminal-host provenance checks.
- `node scripts/governance/check-docs-governance.mjs`: passed; 75 inventoried legacy occurrences matched.
- `npm run check:code-documentation`: passed with no violations.
- `openspec validate visible-openspec-acceptance --strict`: passed.
- Focused governance run: 15 files and 277 Vitest tests passed. It covered acceptance schemas/task reconciliation, App publication constraints, manual-only merge provenance, documentation auto-merge exclusions, receipt/archive compatibility, actual pinned OpenSpec staging, archive publication, workflow policy, local cleanup's 42-case native bridge, resource-sensitive partition policy, and validation-suite ownership.
- Read-only live repository audit for implementation #400: passed identity/CI discovery and proposed no mutation. It bound source head `adca201ee0df4a0d64a34b4d00f1230699a8b31f`, implementation merge `710447d99f1bdf28415deeee10e73ead2a361667`, reviewed base `d5d7c1b100158e9d0efdb44f0490ced2ee4ea266`, and required CI run `34935418502`. It reported genuine pending tasks `6.2`, `7.1`, `7.2`, and `7.3`; it did not classify them complete or publish an acceptance request.

## First hosted CI result and same-PR repair

Required run `34942002242` on head `838da76fc566c04e0da6d619457b2b9da4dffb4a` failed for three narrow governance assertions, not acceptance runtime behavior:

- Changed-file documentation validation found four new implementation comments without the repository's required semantic prefix. They now use `Provenance`, `Invariant`, or `Concurrency` while retaining their original meaning.
- `change-delivery-guidance.test.ts` still required the superseded pre-merge acceptance-comment placeholder and phrase. It now asserts the visible record path, manual-merge statement, renewed implementation review, and exact human PR-backed acceptance policy.
- `impact-aware-validation-workflows.test.ts` still expected the old required-job dependency list. It now requires the added `Acceptance record validation` job and dependency.

Repair validation passed: the exact 17 affected Vitest assertions, typecheck, changed-file code-documentation validation using a regenerated impact selection, docs governance, strict all-OpenSpec validation, and whitespace checks. No assertion, required job, coverage behavior, or timeout was removed.

Required run `34943104220` on repair head `95678665c96dbfc12da3079c785895239a4228ae` then reached a separate inherited timing failure in `prompt-history-controller.test.ts`: a real worker-backed persisted-history snapshot exceeded `vi.waitFor`'s implicit one-second polling deadline. The test now awaits the service's matching snapshot event, then retains the exact recall count and restored-text assertions under the unchanged global test timeout. The whole focused file passed three consecutive runs (3/3 each), and typecheck passed.

Required run `34944991121` on head `5262803d4c3914e424855aa819163dcac2bf22e1` then exposed an unrelated loaded-runner timeout in `workspace.test.ts`. Its synchronous durable SQLite restart scenario took 6.096 seconds inside the highly parallel remainder and exceeded the unchanged five-second per-test limit; no assertion identified a product mismatch. The complete file now runs once in the existing serial resource-sensitive partition, with all eight tests, the five-second timeout, zero retries, and existing assertions unchanged. The file passed three focused runs (8/8 each); both partition-policy suites passed 19/19; typecheck passed.

Required run `34946084273` on head `025170ff27aaf6d715f7a1aeb2cd1b8251392c37` recorded a transient Windows Node 22 startup-budget failure: `pi` warm startup measured 3,170 ms against the unchanged 3,000 ms limit, dominated by 2,232 ms of UI module loading. The exact packaged runtime passed the same required gate on each of the preceding three heads (`34942002242`, `34943104220`, and `34944991121`); changes since the last passing head are confined to tests, validation partition metadata, and OpenSpec evidence. No startup source, dependency, package inventory, threshold, retry count, assertion, or timeout changed. A normal evidence update requests a fresh exact-head measurement rather than weakening the performance gate or manually rerunning its workflow.

## Acceptance-review usability refinement

A follow-up in `D:/Git/a1/.worktrees/fix-acceptance-review-usability` addresses the review feedback from acceptance PR #408 without changing that PR's committed record or claiming its pending tasks complete.

- `npm ci --ignore-scripts`: installed the repository-locked dependencies. Before this install, an attempted focused `npx vitest` invocation fetched incompatible Vitest 5 and exited on its unsupported `--minWorkers` option; no repository tests ran in that attempt.
- `npx vitest run test/repository-governance/openspec-acceptance-github.test.ts test/repository-governance/openspec-acceptance-policy.test.ts --maxWorkers=1 --minWorkers=1`: passed 2 files / 18 tests with the pinned Vitest 3.2.7.
- `npm run typecheck -- --pretty false`: passed.
- `node scripts/governance/check-docs-governance.mjs`: passed; 75 inventoried legacy occurrences matched.
- `npm run check:code-documentation`: passed with no violations after its first run identified the new validator rationale comment's missing semantic prefix; the comment now starts with `Rationale` without changing behavior.
- `openspec validate visible-openspec-acceptance --strict --no-interactive`: passed.
- `git diff --check`: passed.

The regression verifies concise `#<source PR>(accept): <original subject>` titles, checklist-only bodies, successful integrity validation for records with unresolved review items, and continued post-merge archival rejection of those incomplete records.

Required run `34950040796` on head `21dd5ed522f9fd7aec97adadb2bb209be52f8645` passed acceptance validation, naming, changed-file documentation, startup, and both Unix containment jobs. Fast validation failed only because two `change-delivery-guidance.test.ts` assertions still required the superseded long-form acceptance sentence. The assertions now require the concise title/checklist and complete-record safety language instead; no behavioral assertion or gate was removed. Repair validation passed 3 focused files / 22 tests, typecheck, docs governance, code-documentation governance, strict OpenSpec validation, and whitespace checks.

Required run `34951268293` on head `94086f4397ed83659d7080b6b16c194bd87a0eaa` passed the ordinary parallel suite (3,237 tests), acceptance validation, naming, changed-file documentation, startup, and both Unix containment jobs. Its shared serial resource-sensitive Vitest process accumulated enough loaded-runner delay for six unchanged Git-fixture tests and one unchanged SQLite test to exceed the unchanged five-second per-test timeout. Both failed files passed immediately in separate fresh Vitest processes (7/7 and 8/8). The planner now gives every declared resource-sensitive file one fresh process while preserving exactly-once ownership, disabled file parallelism, the five-second default timeout, and zero retries. Focused repair validation passed 4 planner/policy files / 33 tests plus both formerly failing files / 15 tests, typecheck, docs governance, code-documentation governance, strict OpenSpec validation, and whitespace checks.

## Deliberately unclaimed evidence

- Required normal PR CI for the completed implementation head is pending task 5.4.
- Maintainer review/handoff is pending task 6.1.
- No acceptance PR was published or manually merged, no archive was published, and no local cleanup registration/release/watch/mutation occurred.
- The isolated post-deployment implementation → acceptance → archive lifecycle and its negative controls require separate authorization and remain pending task 6.2.
- This implementation cannot prove its own future deployed acceptance/archive lifecycle. The acceptance job on this bootstrap PR may be visibly present but its trusted base does not yet contain the new validator; it is not accepted as live receipt evidence.
