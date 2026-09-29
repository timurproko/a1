## 1. Define complete-regression shard authority

- [ ] 1.1 Add stable `core`, `resource`, `rendering`, and `package` shard identities derived from the canonical `full-release` plan.
- [ ] 1.2 Make the exhaustive predecessor test an explicit package-shard invocation while preserving its three-release oracle, time limits, assertions, and exhaustive cadence.
- [ ] 1.3 Prove every canonical command and Vitest invocation is assigned exactly once, shard union equals the unsharded plan, and unknown/duplicate assignments fail.

## 2. Bind and merge exact shard evidence

- [ ] 2.1 Record source, runtime, run, attempt, shard, canonical-plan digest, assigned work, structural evidence, outcomes, and timing for each shard.
- [ ] 2.2 Add a fail-closed Windows lane merger that requires all four current-run shards and reconstructs one canonical full result only after complete successful coverage.
- [ ] 2.3 Add regressions for missing, duplicate, stale, cross-runtime, wrong-plan, malformed, cancelled, and failed shard evidence plus deterministic successful merging.

## 3. Run Windows shards concurrently

- [ ] 3.1 Keep Linux and macOS on the existing single complete job and replace each Windows runtime job with four independently prepared shard jobs.
- [ ] 3.2 Limit packing and shared exact-package preparation to the package shard; enable Defender before unchanged first-attempt startup and retain startup-before-contract ordering and artifacts.
- [ ] 3.3 Collect the two reconstructed Windows lane envelopes with the two unchanged non-Windows envelopes and retain the existing exact four-lane required aggregate.
- [ ] 3.4 Preserve always-uploaded owner, phase, package, receipt, and startup evidence with bounded retention and no retry or continue-on-error path.

## 4. Preserve policy, diagnostics, and delivery

- [ ] 4.1 Update workflow/governance tests to prove both Windows runtimes schedule every shard, serial partitions remain serial, complete ownership is unchanged, and no shard can independently satisfy the gate.
- [ ] 4.2 Update nightly triage and startup-trend fixtures so failed shard owners remain mapped to the canonical Windows lane with shard-specific logs and exactly one startup source.
- [ ] 4.3 Run focused validation-tier, full-regression evidence, workflow policy, triage, startup-trend, OpenSpec, typecheck, and documentation-governance checks; do not run local full/release suites.
- [ ] 4.4 Reconcile current `origin/develop`, complete evidence and known-gap disposition, review the implementation diff, and add implementation-specific acceptance scenarios.
- [ ] 4.5 Dispatch exact-head Full regression, require every shard and all four reconstructed lanes to pass, and record Windows shard overlap, elapsed time, runner-minute trade-off, and remaining critical path in the handoff.
