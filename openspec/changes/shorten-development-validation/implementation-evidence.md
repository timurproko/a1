# Implementation evidence

## Approval and source reconciliation

The maintainer approved this plan and explicitly requested implementation with "yes implement it" after draft PR #404 was presented. This authorizes implementation in this worktree/branch/PR, not final acceptance or merge.

- Planning commit: `32b5a2d6e0d192c0f537a0c5b0474e3c15ed5182`.
- Planning base: `0bc3624f`.
- Implementation baseline: accepted `origin/develop` at `d5d7c1b100158e9d0efdb44f0490ced2ee4ea266`.
- `gh pr view 402 --json state,mergeCommit` confirmed `MERGED` with that merge commit before integration.
- Merged that accepted develop commit into this existing detached worktree; no separate implementation branch or PR was created.
- Immediately after the merge, `git diff --name-only origin/develop...HEAD` contained only this change's six planning files. Predecessor implementation is inherited accepted base history, not a new fix in this PR. Its remaining nightly recovery obligations are not claimed complete here.
- PR #400's unmerged local-cleanup work is not included. Its failing exclusive-file-handle assertion remains outside this implementation scope.
- PR #404's original documentation auto-merge policy check passed; normal Development validation was skipped because the PR is draft. These are not implementation validation results.

## Baseline instrumentation checkpoint

Phase instrumentation is being added before changes to suite selection, scheduling, caches, or build reuse. The approved task 1.4 requires a comparable CI baseline before that optimization switch. The current startup scenario counts, package installation arguments, declared warmup, budgets, test timeouts, and representative backlog are retained.

Evidence reports immediate start and terminal records with bounded labels, attempt identity, actual checkout head, runtime/platform, and candidate SHA-256 after candidate loading. It never serializes operation errors, output, or arbitrary environment. Launch observation measures the existing trace-wait loop after spawn; production trace timestamps remain the authority for command-to-first-ready latency. Shutdown has separate timing. Deferred Windows fixture cleanup is distinct from successful cleanup. Cache state is explicitly `unmeasured` until workflow/cache evidence is available.

## Debugging evidence (not acceptance)

- Initial focused invocation could not find Vitest in the primary checkout's dependency tree; no tests ran. Installed exact worktree dependencies using `npm ci --ignore-scripts --no-audit --no-fund` (no product build or suite).
- First typecheck detected a local `phases` identifier shadowing the new recorder; renamed the existing local trace-phase array to `observedPhases` without changing its oracle.
- Twelve focused phase-recorder tests passed on Windows Node 24.16.0, including incomplete attempts, redaction, error identity, evidence-sink faults, cleanup guarantees, exact candidate binding, deferred cleanup, synchronous pack failure, bounds, and durable records.
- Typecheck passed after correcting the shadowing. The final focused checkpoint run passed **43 tests across five files**: validation-phase (13), validation-suite-policy (3), validation-tier (9), full-regression-policy (5), and impact-aware-validation-workflows (13). This includes an additional check that a synthetic `GITHUB_SHA` cannot replace the actual checkout head in phase evidence. Typecheck passed again after that run.
- Architecture initially reported two existing line-anchored legacy rejection approvals shifted from line 67 to line 72. Only those two inventory locations and their corresponding location-bound fingerprints were updated; literals, contexts, classes, exception count, reasons, and semantic test baselines remain unchanged. Architecture, exact identity/provenance, the full naming audit (830 files, zero violations), documentation governance, and strict change validation then passed.
- Full tracked-file code-documentation governance passed with the new files staged. No local `test:fast`, `test:full`, `test:release`, exact package installation test, or interactive product launch was run.
- `evidence/ownership-baseline.json` inventories all **329 retained test files** at the accepted implementation baseline, including 305 fast-owned files, the 11-file resource-sensitive partition, 11 release contracts, all seven package-install scenarios, and declared platform/runtime eligibility. It distinguishes declarations from actual execution and proposed successor owners from implemented owners. The after-migration comparison remains pending, so task 1.2 is not marked complete.
- No scheduling, scope-selection, installation argument, cache, build-reuse, startup-budget, timeout, or retry change has been made at this checkpoint. Workflow edits only retain phase/ordinary artifacts; the matching artifact-path assertion was updated without dropping startup coverage checks.
- Actual CI baseline identities/results remain pending; no performance improvement, product integration pass, or full-suite result is claimed yet.
