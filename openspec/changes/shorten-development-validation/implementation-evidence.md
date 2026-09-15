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

Task 1.4 is complete as **baseline recording**, not as permission to proceed past the failing validation gate. At that checkpoint, scheduling, cache, and build-reuse optimization were held while the failure was diagnosed. The failed sample is preserved alongside, not replaced by, historical #398/#400 data.

## Scoped resume-fixture diagnosis

Read-only comparison against the accepted baseline found no changes in the failing resume test, candidate extractor, product source/entries, or dependencies at the failed CI head. Packaging had timing wrappers but retained its existing npm arguments and native-byte repair. This does not by itself prove the failure is unrelated; causal attribution remains open.

The already-approved resume profiling task (4.4) now adds content-free readiness snapshots and phase timing without changing its seven scenarios, readiness predicate, 30000ms wait, 120000ms scenario limit, fresh extraction, oracles, or warmup behavior. Snapshots distinguish absent/partial trace, last recognized phase, trace readiness versus marker visibility, output byte count, and child exit state, and are retained before teardown. Unknown trace fields and malformed content are not persisted. No repair, timeout increase, rerun-until-green policy, prewarmed fixture, or new production behavior is introduced.

- Twelve new trace-summary unit tests plus thirteen phase-recorder tests passed; typecheck and build passed. The final diagnostic checkpoint passed **55 focused tests across six files**, followed by typecheck, full tracked-file documentation, architecture/identity/provenance, full naming (832 files; zero violations), and strict OpenSpec validation.
- One focused local execution of all seven exact-package resume tests passed in **65.76s** on Windows Node **24.16.0**, using candidate SHA-256 `7d924dd4a6cfafd0cc009ad1338085a9e489322a8d998c8fff3159f509020f81`.
- The first local launch took **21375ms** to satisfy readiness; its trace spent **19331ms** between `bootstrap-start` and `bootstrap-selected`. Later launches were around 2–3 seconds. Cold release bootstrap is a diagnostic lead, not proof of the missing CI phase.
- `evidence/resume-local-diagnostic.json` records that local attempt and explicitly identifies the uncommitted diagnostic working tree; it is not exact-head CI acceptance or a reproduction of the hosted failure.
- The historical passing #402 PR run `34880028901` reported **37881ms** for the same first resume scenario and **81241ms** for the resume file, illustrating existing cold-path cost rather than establishing the cause of the new timeout.
- PR #405 separately plans native regression fixture corrections, including other unresolved Windows failures. Its unaccepted work is not imported, its scope is not assumed to cover this readiness failure, and this change cannot claim those full-regression blockers resolved.

## Successful diagnostic CI and continued implementation

[Development validation 34935952104](https://github.com/timurproko/a1/actions/runs/34935952104) completed successfully at exact head `9454992c190d7698d81ba273f998685da3536bff`, including the required aggregate. Fast validation took **636s**, startup **414s**, rendering **306s**, Linux **113s**, and macOS **133s**. The newly retained first resume launch took **21695ms**, including **19230ms** between bootstrap start and release selection. These are successful diagnostic observations, not proof that the previous untraced timeout has been fixed, not a speedup claim, and not acceptance of subsequent edits. The earlier failure remains retained and relevant to final acceptance risk. No timeout, retry, workload, or oracle was changed to obtain this result.

`evidence/diagnostic-34935952104.json` preserves job outcomes, sanitized phase/readiness records, exact source/candidate identities, and downloaded file digests. It records cache state as unmeasured where the diagnostic itself did not establish it. The current-head success clears the failing-check hold for continued implementation; any new required failure must again be inspected before further work.

The maintainer reported all focused diagnostic tests passing after correcting a pasted shell newline, then requested continued implementation followed by normal PR CI. That feedback is not final implementation acceptance. The draft remains held while incomplete, and no further intermediate manual Development dispatch is requested at this checkpoint.

### Task 3.1: atomic fast ownership

The public `fast` tier now composes `fast-remainder` and `fast-resource-sensitive`. The sole authoritative sensitive list moved to its atomic scope. Remainder exclusion still subtracts it even when only the remainder is requested. Each atomic scope produces only its own existing invocation; requesting both directly and through `fast` does not duplicate them. The resource-sensitive invocation retains one-file-at-a-time execution, the default 5000ms timeout, zero retries, and its existing evidence fields.

Before/after comparison of `fast`, ordinary PR, and `full-release` plans found **byte-identical executable command/invocation structures**, including prerequisites, all timeouts and package handling. Only expanded owner names changed. `evidence/fast-partition-migration.json` maps every old fast test to its successor and separately identifies the newly added integration-selection unit test. All **307** pre-checkpoint fast files remain; with that new test there are **308**: **297** remainder and **11** sensitive. The full population is now **332** test files. General ownership tests verify complete disjoint membership and one full-plan execution per retained file.

Negative tests reject incomplete/duplicate public composition, scope shadowing, duplicate ownership, narrowed remainder roots, missing sensitive files, generic sensitive execution classes, and timeout fields on either atomic owner. Existing workflow-policy assertions were relocated to the new authoritative exclusion list without dropping their checks. An initial focused assertion still read the old configuration path; correcting that mechanical reader resolved it. Typecheck also caught a test-only inferred `unknown` manifest type, resolved by reading the fixture manifest explicitly.

Workflow scheduling has not changed yet: this exposes independent commands but does not claim isolated-runner scheduling (task 5.1) complete. The complete before/after package/platform/release ledger (task 1.2) remains incomplete.

### Task 2.1: integration-selection contract

`integration-selection.mjs` and its declaration define versioned ownership and selection documents with full base/head commits, normalized ownership identity, selection digest, scopes, explicit platform/architecture/Node targets, selected/excluded decisions, and bounded reason/path records. Conservative mode selects every declared development owner. Normally full-only owners can be promoted explicitly. Docs/version exemptions require separate authority from the consuming classifier. Duplicate scope ownership on one target is rejected; deliberate different-target repetitions remain representable.

Forty-five focused tests cover conservative defaults, complete exclusions, full-only promotion, normalization, authority, tampering, unsupported schemas/runtime targets, missing/duplicate owners/scopes/targets, bounds, and malformed decisions even with recomputed digests. Digests prove content binding, not trusted provenance; consumers must supply separately established checkout authority. No current workflow or existing classifier consumes this new schema yet, so it cannot authorize skips. Repository ownership declarations, graph traversal, scope extraction, and aggregate integration remain pending under their own tasks. Adding the declaration and correcting an explicit-undefined test fixture resolved the initial typecheck failures; final typecheck passed.

Final local checkpoint validation: **119 tests across eight focused files passed**, followed by typecheck, full tracked-file code documentation, architecture/identity/provenance, full naming (835 files; zero violations), strict OpenSpec validation, and whitespace checks. No local fast/full/release suite was executed. Tasks 2.1 and 3.1 are complete, bringing progress to **5/29**; this is not completion of scheduling, classifier, setup reuse, full CI, or maintainer acceptance. The previous green diagnostic CI belongs to `9454992c`, not these new edits.

## Tasks 2.2–2.4: dependency graph, changed-owner promotion, and fallback

The integration dependency analyzer reads each immutable Git revision with one bounded `ls-tree` and one bounded `cat-file --batch`, deduplicating identical blobs and memoizing at most the base/head snapshots for one comparison. It never reads worktree files as revision evidence. File count, per-source bytes, total source bytes, Git output, execution time, revision count, graph nodes, graph edges, reasons, changed paths, and chain depth are bounded. Missing history, framing/encoding failures, unavailable commits, resource limits, or graph exceptions cannot become empty success.

Parsed dependency edges include static imports/exports, import types, dynamic literal imports, CommonJS require/resolve (including `createRequire(import.meta.url)`), package imports/self-exports, external package manifest/lockfile ownership, module-relative URL assets, emitted-dist-to-source mapping, generated/native inputs, and source-bound reviewed subprocess/worker edges. The analyzer detects computed imports, indirect/aliased loaders, filesystem reads, subprocesses, workers, module hooks, `eval`/`Function`, symlinks, nested package boundaries, unsupported aliases/configuration/syntax, and unresolved imports as conservative issues. Source-bound reviews fail stale when file bytes change. The initial reviewed ledger covers image, prompt-history, and paste worker factories; native build and generated payload inventory inputs are explicit invalidators/edges.

Base and head graphs are independent and use both rename/copy source and destination. Synthetic direct, transitive, deleted, renamed, copied, worker, subprocess, asset, generated-native, package-resolution, and emitted-source fixtures pass. A temporary real Git repository verifies two commands per revision, blob deduplication, Unicode fidelity, dirty-worktree exclusion, unavailable history, and all configured bounds. The current repository audit loaded **808 unique source/config blobs (5,640,691 bytes)** with two commands for one revision. It remained conservatively selected because many existing runtime file/process loads are not yet reviewed; this is expected and means the new graph cannot currently authorize a selective skip.

Changed exact tests select their owner even when that owner is normally outside development validation. Explicit shared-support rules and transitive base/head support dependencies select every affected owner. Deleted, renamed, and copied support retain base ownership. Unknown retained tests, unknown shared support, and unclassified operational source select all owners; unrelated governance tooling must match a reviewed non-integration prefix. Duplicate test ownership, tests absent from owner entries, malformed support rules, or unavailable ownership identity block.

The fallback wrapper requires full commit identities and valid owner definitions before operation. Docs/version exemptions enumerate explicit exclusions. A manual invocation without a trusted comparison and any caught classifier/history failure select all development owners with a fixed content-free fallback reason. Unknown operational input and policy/native/workflow invalidators select all applicable owners; a same-commit comparison is conservative rather than empty. Normally full-only owners can still be promoted by changed tests. No raw parser, path-content, or Git diagnostic is retained.

After correcting one missing fixture review reason and strengthening indirect `.bind`, module hook, `import.meta.resolve`, `dlopen`, and `getBuiltinModule` handling, **104 focused tests across three files passed**, followed by typecheck. These APIs and their versioned policy remain inert: current workflows still run their pre-existing unconditional integration jobs and do not use this output to skip. Production owner declarations, selection replay, aggregate adoption, and conditional scheduling remain pending.

## Tasks 3.2–3.3: package/startup extraction and logical owners

The former seven-scenario package-install file is split into one exact-package non-timing owner with its original six identity, cancellation, updater-loss, layer-reuse, 42-release/128-file cleanup, and broken-worker scenarios, plus a one-scenario startup owner. Both owners use the same helper contract but create distinct temporary roots and fresh global prefixes from the exact candidate bytes. The helper retains the exact `npm install --global --prefix ... --ignore-scripts --no-audit --no-fund` arguments; download-cache changes are deferred to task 4.3.

Startup runs first on the Windows Node 22 lane. It performs its own proxy synchronization because the old combined ordering did that in the earlier layer scenario. It then retains Defender verification, materialization, candidate record/certification/activation, the declared warmup, supervisor readiness, both `a1`/`pi` profiles, post-update/no-live-supervisor/warm first attempts, existing 5000/3000ms product budgets, 15000ms readiness wait, durable-validation file-read assertion, shutdown, zero retries, and final cleanup. The non-timing owner executes afterward with a separate clean installation while temporarily colocated on that runner; task 5.1 still owns independent-job scheduling. Candidate packing is reused by explicit path only after startup created the same-job tarball; no installed state is shared.

`package-install` is now a compatibility composition of `package-contracts` and `package-startup`, so full-regression and release callers retain both successors. The complete full plan invokes each in its own serialized 600000ms Vitest process and still contains every retained file once. Release contracts now assign startup performance to `package-startup` and immutable layers to `package-contracts`. Current-head package execution has not yet run; five structural package-owner tests and the surrounding 61 governance tests passed, followed by typecheck.

`config/integration-owners.json` declares separate current Development owners for Pi/release/resume (Windows Node 24), package contracts and startup (Windows Node 22), image/history compatibility (Windows Node 22 plus Linux/macOS Node 24), and Unix containment (Linux/macOS Node 24). Shared entries can affect several logical owners, while each retained integration test has one authoritative direct owner. Registry loading rejects malformed fields, absent files, wrong support kinds, test/entry mismatch, and duplicate same-target scopes. Nine registry tests verify current PR target populations have no same-platform/runtime file duplicates and both full/release workflows retain Windows Node 22/24, Linux Node 24, and macOS Node 24. Independent image/history/Unix jobs and aggregate consumption remain task 5 work; declaration alone does not authorize skips.

Final structural checkpoint validation passed **75 focused tests across eight files**, typecheck, full tracked-file documentation governance, architecture/identity/provenance, full naming (852 files; zero violations), strict OpenSpec, and whitespace checks. Moving the package scenarios shifted two existing line-bound legacy rejection fixtures from line 72 to 47; only their inventory locations/fingerprints were updated after exact rescanning, without adding values, reasons, or exceptions. No local package startup, full, fast, release, or interactive suite was run.

`evidence/package-owner-migration.json` maps all seven baseline scenarios to successor files/owners and records exact structural limits, target declarations, full-plan package invocations, and the temporary scheduling limitation. Task 1.2 remains incomplete until the full repository before/after platform/runtime ledger covers every successor owner, not just package and fast migrations.
