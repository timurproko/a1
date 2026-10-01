## 1. Fixture contention control

- [ ] 1.1 Replace all-at-once payload creation with the reviewed eight-write worker pool and verify the fixture still creates 42 releases with 128 byte-identical JavaScript payload files per release.
- [ ] 1.2 Preserve write completion ordering before release-state publication and packaged-worker launch, and verify setup rejection remains the primary visible failure.

## 2. Regression protection

- [ ] 2.1 Extend focused package-suite governance coverage to require finite payload-write concurrency and reject restoration of the 128-way write burst while retaining the workload assertion.
- [ ] 2.2 Verify the exact packaged cleanup scenario retains its worker invocation, state, protected-release, file/byte reduction, phase-evidence, and 120-second timeout assertions without retries or sleeps.

## 3. Validation and evidence

- [ ] 3.1 Run the focused governance tests, TypeScript typecheck, strict OpenSpec validation, and diff checks; verify all pass without production or workflow changes.
- [ ] 3.2 Obtain one first-attempt selected Windows exact-package result for the current head and inspect `backlog-setup` and `backlog-worker` phase evidence; retain and diagnose any failure instead of rerunning it into acceptance.
