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
- Baseline run `34883033336` has now been inspected and recorded below. It failed; no performance improvement, successful current-head aggregate, or full-suite result is claimed.

## Captured pre-optimization CI baseline

Run: https://github.com/timurproko/a1/actions/runs/34883033336
Source: `47d2adbe26e7d13ad1b98ecafccedcc92209d75e`; merge-base selection: `d5d7c1b100158e9d0efdb44f0490ced2ee4ea266`; event: `workflow_dispatch`, attempt 1.

`evidence/baseline-34883033336.json` records the current-head selection, all job outcomes/timings, ordinary/resume/startup gate timings, redacted fixture phases, exact candidate digests, downloaded phase-file digests, runtime and cache observations. These are pre-optimization cost measurements, including an unresolved failure, not a green baseline.

| Job | Wall time | Result |
| --- | ---: | --- |
| Fast validation | 653s | Failed in packaged resume after ordinary validation passed |
| Startup Node 22 | 353s | Passed |
| Rendering | 306s | Passed |
| Linux containment | 118s | Passed |
| macOS containment | 136s | Passed |

Windows used image `windows-2025-vs2026`, version `20260907.229.1`; both startup and ordinary setup-node logs show the same npm download-cache hit. That does not prove the private global install avoided every registry request. Startup's clean global install was **118032ms**, candidate packing **19415ms**, layer materialization/reuse **19934ms**, separate startup materialization **12174ms**, and declared warmup **8379ms**. Its six production startup measurements totaled **15822.54ms**, individually **2386.88–2960.63ms**, with zero automatic retries. Fixture cleanup reported **deferred**, not clean success.

Ordinary repository gates passed in **354985ms**: build 15612ms, fast remainder 241046ms, resource-sensitive partition 78263ms, explicit dist 14500ms, and typecheck/architecture 5563ms. The subsequent Pi/release/resume step failed in **196787ms**. Its explicit Pi/release tests passed; the isolated package scope failed one of ten tests.

The failure was `session-resume.integration.test.ts`, `creates, exits, and executes the default-store hint (compacted: false)`, at the first `ready(saved.marker)`: the existing 30000ms readiness wait expired with empty captured output. That scenario reported 54662ms, including its surrounding fixture work. The remaining resume scenarios and package-surface tests passed. No raw startup trace was retained for this failing launch, so the exact blocked phase cannot be reconstructed from this run. The aggregate correctly failed.

Task 1.4 is complete as **baseline recording**, not as permission to proceed past the failing validation gate. Scheduling, cache, and build-reuse optimization remain held while the failure is diagnosed. The failed sample is preserved alongside, not replaced by, historical #398/#400 data.

## Scoped resume-fixture diagnosis

Read-only comparison against the accepted baseline found no changes in the failing resume test, candidate extractor, product source/entries, or dependencies at the failed CI head. Packaging had timing wrappers but retained its existing npm arguments and native-byte repair. This does not by itself prove the failure is unrelated; causal attribution remains open.

The already-approved resume profiling task (4.4) now adds content-free readiness snapshots and phase timing without changing its seven scenarios, readiness predicate, 30000ms wait, 120000ms scenario limit, fresh extraction, oracles, or warmup behavior. Snapshots distinguish absent/partial trace, last recognized phase, trace readiness versus marker visibility, output byte count, and child exit state, and are retained before teardown. Unknown trace fields and malformed content are not persisted. No repair, timeout increase, rerun-until-green policy, prewarmed fixture, or new production behavior is introduced.

- Twelve new trace-summary unit tests plus thirteen phase-recorder tests passed; typecheck and build passed. The final diagnostic checkpoint passed **55 focused tests across six files**, followed by typecheck, full tracked-file documentation, architecture/identity/provenance, full naming (832 files; zero violations), and strict OpenSpec validation.
- One focused local execution of all seven exact-package resume tests passed in **65.76s** on Windows Node **24.16.0**, using candidate SHA-256 `7d924dd4a6cfafd0cc009ad1338085a9e489322a8d998c8fff3159f509020f81`.
- The first local launch took **21375ms** to satisfy readiness; its trace spent **19331ms** between `bootstrap-start` and `bootstrap-selected`. Later launches were around 2–3 seconds. Cold release bootstrap is a diagnostic lead, not proof of the missing CI phase.
- `evidence/resume-local-diagnostic.json` records that local attempt and explicitly identifies the uncommitted diagnostic working tree; it is not exact-head CI acceptance or a reproduction of the hosted failure.
- The historical passing #402 PR run `34880028901` reported **37881ms** for the same first resume scenario and **81241ms** for the resume file, illustrating existing cold-path cost rather than establishing the cause of the new timeout.
- PR #405 separately plans native regression fixture corrections, including other unresolved Windows failures. Its unaccepted work is not imported, its scope is not assumed to cover this readiness failure, and this change cannot claim those full-regression blockers resolved.
