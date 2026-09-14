## 1. Verify retained coverage and reduce the PR matrix

- [x] 1.1 After planning acceptance and explicit implementation authorization, record the current startup job, aggregate dependency, and nightly/release/manual scope ownership; verify every deferred Node 24 startup/image/history test retains a full-validation owner and capture a before-change PR run with its source and timings.
- [x] 1.2 Reduce Development validation's startup matrix to `[22]` for PR and manual invocations; verify the Node 22 job ID/name, complete steps, Defender, first-attempt package validation, artifact retention, timeout, and draft/docs/version-only conditions are unchanged, with no Node 24 placeholder or ignored result.

## 2. Guard the PR and full-validation policies

- [x] 2.1 Update `impact-aware-validation-workflows.test.ts` to require exactly the Node 22 PR startup lane and all retained steps/dependencies; verify it rejects a reintroduced Node 24 PR lane, removed Node 22 coverage, or a dropped startup aggregate dependency.
- [x] 2.2 Strengthen required-gate tests for startup failure, cancellation, missing/unexpected skip, stale head, and valid exemptions; verify successful current-head Node 22 plus all other selected gates can pass without Node 24 evidence while invalid code-path results fail closed, preserving the existing helper when no change is needed.
- [x] 2.3 Add or update policy coverage for release and manual Full regression matrices, full-suite scope ownership, Defender, and publication dependencies; verify both Windows runtimes and all deferred tests remain selected with unchanged startup limits and failure gates.
- [x] 2.4 Update `docs/ci-release-runbook.md` with the PR/full coverage table, manual Node 24 route, and delayed-detection trade-off; verify the declarative workflow inventory remains accurate and change it only for actual governed-field differences, without modifying schedules, permissions, or branch protection.

## 3. Validate, obtain acceptance, and integrate

- [ ] 3.1 Run strict OpenSpec validation and obtain passing required implementation-head CI with focused workflow/gate regressions selected; record the exact head/run, only Node 22 startup, successful required aggregate, and actual queue/execution timings without promising a fixed speedup.
- [ ] 3.2 Provide the exact implementation worktree/commit and focused policy-test commands, record the maintainer's review and explicit manual merge authorization, and report remaining live Node 24 evidence separately; verify code auto-merge remains disabled and no publication is triggered merely to test the cadence change.
- [ ] 3.3 Record successful candidate-bound Node 24 Full regression evidence through an explicitly authorized manual run or matching-source nightly/release validation after integration; verify runtime, source/package identity, unchanged startup/full checks, and ordinary failure gating before claiming full completion.
- [ ] 3.4 After accepted implementation integration and complete live evidence, record acceptance and synchronize/archive this change in an OpenSpec-only follow-up; verify strict validation and confirmed merged/clean states before retained-worktree cleanup.
