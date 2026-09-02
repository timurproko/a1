## 1. Evidence and Suite Ownership

- [ ] 1.1 Add structured regression evidence for runs `33617331350`, `33642848728`, and `33657859943`, including platform, failing test, timeout, comparison lane, and excluded unrelated failures; verify the evidence schema and cited job URLs in a focused governance test.
- [ ] 1.2 Declare the initial five evidence-backed resource-sensitive fast test files in the authoritative validation-suite configuration without adding a timeout override; verify every path exists and is otherwise part of the fast universe.
- [ ] 1.3 Add configuration invariants rejecting duplicate paths, overlap with explicit/isolated scopes, missing files, partition timeout overrides, and unowned tests; verify focused negative fixtures fail closed with actionable diagnostics.

## 2. Partitioned Fast-Tier Planning

- [ ] 2.1 Extend the validation-tier planner to subtract resource-sensitive paths from `vitest-fast` and emit one `vitest-fast-resource-sensitive` invocation; verify exact exclusions, exact paths, stable identifiers, and exactly-once ownership in planner tests.
- [ ] 2.2 Apply no file parallelism to the resource-sensitive invocation while retaining the existing five-second fast-test timeout for both partitions; verify generated Windows and non-Windows commands contain no timeout increase.
- [ ] 2.3 Preserve fail-fast command execution without retries, log parsing, or result conversion; verify a simulated nonzero resource-sensitive outcome ends the tier unsuccessfully after one invocation.
- [ ] 2.4 Include separate resource-sensitive command, duration, and result records in existing plan/outcome evidence; verify serialized JSON distinguishes both fast partitions.

## 3. Regression and Governance Coverage

- [ ] 3.1 Add focused validation-tier tests proving pull-request and exact-package selections share the same partition and that full-release composition does not duplicate partition-owned files.
- [ ] 3.2 Add a focused execution regression that repeatedly runs the resource-sensitive files without file parallelism under the existing five-second timeout and records clean per-file plus available fixture/subprocess timing without retrying failures.
- [ ] 3.3 Optimize repository setup, subprocess count, storage operations, or release fixtures for any isolated test that lacks reliable margin under five seconds; verify repeated focused execution passes without weakening hermetic state or assertions.
- [ ] 3.4 Update validation-suite governance tests and operational documentation to explain classification criteria, exact ownership, unchanged timeout policy, optimization requirements, and why timeout increases and automatic retries are forbidden; verify changed-file documentation governance passes.

## 4. Validation and Delivery

- [ ] 4.1 Run focused validation-tier, suite-policy, and repeated resource-sensitive regression tests under five seconds plus typecheck, architecture, changed-file documentation governance, and strict OpenSpec validation; record commands, phase timings, and successful outcomes without running local fast/full/release suites.
- [ ] 4.2 Push the implementation branch and require current-head CI to pass, including the ordinary and resource-sensitive fast partitions; verify the workflow summary exposes distinct successful outcomes.
- [ ] 4.3 After maintainer acceptance and manual merge authorization, merge the implementation and run `npm run develop` once from authoritative updated `develop`; verify one newly numbered exact package passes Windows Node 22/24, macOS Node 24, and Linux Node 24, publishes to npm `next`, and needs no manual rerun.
- [ ] 4.4 Record acceptance with merge, package digest, first-attempt platform outcomes, publisher, and registry evidence, then synchronize and archive the completed change under the default complete-change workflow.
