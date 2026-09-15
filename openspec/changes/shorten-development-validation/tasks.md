## 1. Baseline and ownership

- [x] 1.1 Reconcile the implementation starting point against accepted develop and document interactions with predecessor/nightly and local-cleanup streams; verify no unrelated fix or unaccepted branch is included in the implementation diff.
- [ ] 1.2 Produce a before/after ledger of every retained test, package-install scenario, required platform/runtime, and PR/full/release owner; verify the ledger accounts for all existing scopes and deliberate cross-runtime repetitions.
- [x] 1.3 Add bounded package fixture phase timing for install, packing, materialization, certification/warmup, launches, shutdown, and cleanup; verify focused tests retain partial records on setup failure and preserve the primary error without exposing secrets.
- [x] 1.4 Record comparable pre-optimization CI baselines before changing orchestration; verify the evidence identifies heads, runner/runtime, cache state, per-phase time, critical path, and failed attempts separately from historical #398/#400 observations.

## 2. Conservative impact selection

- [x] 2.1 Define and validate versioned integration selections with base/head and selection identity, selected owners, platform/runtime applicability, reasons, and explicit exclusions; verify malformed or incomplete selections cannot authorize skips.
- [x] 2.2 Implement batched base/head dependency traversal and reviewed edges/invalidators for dynamic imports, subprocesses, workers, assets, package resolution, emitted-source mapping, and native/build inputs; verify direct/transitive and deleted/renamed/copied dependency fixtures select all affected owners.
- [x] 2.3 Promote changed tests and shared support to their retained owners, including owners normally outside PR validation; verify test-only changes, unknown ownership, and deleted support cannot evade current-head execution.
- [x] 2.4 Add bounded conservative fallback and manual-dispatch behavior; verify classifier errors, unavailable comparison history, unsupported syntax, unknown operational inputs, and policy changes select all applicable integration or block rather than yield empty success.
- [ ] 2.5 Replay representative historical changes and synthetic unrelated/startup/image/history/native/validation-policy changes; verify expected scope reasons and preserved documentation/version/draft exemptions in a recorded selection report.

## 3. Suite decomposition without lost coverage

- [x] 3.1 Expose disjoint fast remainder and resource-sensitive atomic scopes while retaining the complete public fast composition; verify PR and full plans have identical membership, one-file-at-a-time sensitive execution, unchanged timeouts, and no duplicate owners.
- [x] 3.2 Extract first-attempt startup from package identity/layer/recovery/cleanup scenarios with separate fresh startup installation; verify every original scenario, two-profile launch sequence, budget, Defender check, and representative backlog remains in the ownership ledger and focused contract tests.
- [x] 3.3 Declare independent image/history compatibility and selected Pi/release/resume/Unix owners; verify no file executes twice on one platform/runtime merely because owners now use separate jobs.
- [ ] 3.4 Remap full-regression and release compositions to every successor scope without reducing any retained mode/platform/runtime coverage; verify generated full/release plans and governance tests against the before/after ledger.

## 4. Setup reuse and measured fixture optimization

- [ ] 4.1 Record and verify same-job build/package prerequisite receipts bound to inputs, toolchain, platform, and artifact identity; verify missing, changed, incomplete, or tampered artifacts force preparation or failure instead of stale reuse.
- [ ] 4.2 Remove duplicate same-job build/pack invocations and add the compatible startup Rust cache; verify plan/execution evidence shows one successful build and one pack per consuming job with native artifact validation still performed.
- [ ] 4.3 Audit clean global installation cache behavior and enable safe dependency-download reuse where effective; verify cache-hit and cold-cache controls still install exact bytes into fresh prefixes without restoring certified state or measured launch caches.
- [ ] 4.4 Profile release-command, package-message-parity, and session-resume fixture phases and optimize measured repeated immutable setup; verify unchanged command/oracle assertions, isolated writable instances, unchanged purposeful delays/workload sizes, and before/after phase evidence for each optimized fixture.
- [ ] 4.5 Add contamination and failure-path tests for any reused immutable template or capture; verify one scenario cannot observe another's refs, files, processes, profile state, or oracle output and that setup/teardown failures remain visible.

## 5. Workflow scheduling and required evidence

- [ ] 5.1 Schedule mandatory fast partitions and selected integration owners as independent jobs after actual prerequisites, preserving isolated Windows startup/resource-sensitive runners; verify workflow policy tests reject accidental serial dependencies or same-host contention.
- [ ] 5.2 Bind each job's scope outcomes to the current head, run, and selection artifact while retaining the stable required aggregate; verify failure, cancellation, stale/missing/malformed evidence, unexpected skip, and authorized skip for every modular owner.
- [ ] 5.3 Upload ordinary and fixture outcomes on success/failure and summarize setup, gate, aggregate/available queue time, cache state, invocation counts, and runner-seconds; verify artifact completeness and content-free diagnostics in focused reporting tests.
- [ ] 5.4 Enable impact-selected execution only after the conservative-all path and ownership tests pass; verify docs/version/draft controls, manual Development fallback, Node 22-only PR startup, and unchanged Node 22/24 full-validation owners.
- [ ] 5.5 Document the atomic/full commands, selection explanations, cache/receipt invalidation, evidence inspection, and unconditional/fresh-preparation rollback; verify documentation matches the implemented CLI and workflow contracts without changing publication authority.

## 6. CI and performance verification

- [ ] 6.1 Pass strict OpenSpec validation and applicable required current-head PR CI, including all scopes conservatively selected by this change's workflow/config edits; record exact run/head/results and verify no failed check is concealed by the optimization.
- [ ] 6.2 Pass manual Full regression for the exact candidate on Windows Node 22/24, Linux Node 24, and macOS Node 24; record artifacts proving all retained scenarios, first-attempt startup budgets, and unchanged release-composition policy tests without publishing a package.
- [ ] 6.3 Collect at least three independent first-attempt CI observations for each representative unrelated, startup-sensitive, and conservative-full class plus a cold-cache control; verify recorded base/head/selection identities, all attempts, before/after medians/ranges, critical-path time, and runner-cost changes without retry-until-green acceptance.
- [ ] 6.4 Publish an evidence summary comparing actual results with the 2–3-minute ordinary and under-five-minute startup-sensitive goals; verify unmet goals, deferred-cleanup observations, selection limitations, and any increased runner cost are explicit rather than treated as completed performance claims.

## 7. Maintainer review and acceptance

- [ ] 7.1 Provide the exact final candidate and focused non-UI inspection/test commands, then record actual maintainer review of selection, preserved coverage, cache/fixture boundaries, rollback, and measured trade-offs; verify review evidence belongs to the final implementation head and is not inferred from CI.
- [ ] 7.2 Obtain and record explicit final acceptance and separate manual merge authorization, resolving any unmet timing goals or known gaps deliberately; verify the authorized final-head acceptance comment and completed substantive tasks before any archive follow-up.
