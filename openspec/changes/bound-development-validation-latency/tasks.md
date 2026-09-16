## 1. Establish Cadence Authority

- [x] 1.1 Add explicit `pull-request`/`exhaustive` cadence to every integration owner, generated ownership evidence, and TypeScript declarations; verify registry tests reject missing, duplicate, and unknown cadence while retaining every existing owner, scope, and target.
- [x] 1.2 Classify only the real `update-predecessor` owner as exhaustive and keep all other current owners pull-request eligible; verify ownership-ledger tests show unchanged complete-suite membership and exact predecessor scope/target identity.

## 2. Bound Development Selection

- [x] 2.1 Update impact and conservative integration selection to return selected pull-request owners and explicit exhaustive deferrals with affected reasons; verify focused selection tests cover owned paths, direct exhaustive-test changes, invalidators, unknown paths, renames, and manual Development dispatch.
- [x] 2.2 Fail closed when cadence or ownership authority is malformed instead of guessing a deferral; verify negative selector fixtures block omitted/unsupported cadence and contradictory selected/deferred states.
- [x] 2.3 Update Development job resolution so cadence-deferred owners cannot activate a modular cell or enter its selected scopes; verify workflow and resolver tests prove a PR #429-shaped invalidator excludes `update-predecessor` while selecting every pull-request owner.
- [x] 2.4 Update the protected aggregate to require exactly the current selected pull-request outcomes and reject exhaustive evidence as a substitute; verify aggregate tests cover missing/failed selected owners, valid deferrals, undeclared deferrals, stale identities, and same-run failed-job reuse.

## 3. Preserve Predecessor Coverage

- [x] 3.1 Audit deterministic predecessor command, lifecycle, fault, fixture, materialization, warmup, package, and update tests against the exhaustive fixture's source paths; record the mapping and add focused hermetic regressions for any uncovered PR-relevant contract, verified by their focused test files.
- [x] 3.2 Keep the real three-release exact-package predecessor test unchanged in `full-release`; verify Full regression, nightly, and stable plan/policy tests include it with its existing target, default count, timeouts, and no retry or mutable-install cache.
- [x] 3.3 Add direct exhaustive-test/support selection fixtures; verify Development reports focused contracts plus an exhaustive cadence deferral without claiming published-predecessor evidence.

## 4. Make Latency Auditable

- [x] 4.1 Emit separate owner/scope invocation durations while sharing verified build and package preparation; verify tier-orchestration tests preserve command failure, timeout, and exact-artifact semantics and expose each selected scope's elapsed time.
- [x] 4.2 Extend modular and aggregate evidence with selected/deferred cadence, setup time, scope time, job elapsed time, aggregate overhead, and runner execution critical path; verify schema tests reject malformed timing and cadence evidence without counting queue delay as test execution.
- [x] 4.3 Add deterministic baseline/replay evidence for conservative invalidator, ordinary release/update, and direct exhaustive-test changes; verify reports evaluate the eight-minute critical-path and five-minute per-scope targets as met or unmet without retries or workload reduction.

## 5. Documentation and Acceptance Evidence

- [x] 5.1 Update validation and release runbooks to explain cadence, delayed real-history detection, manual Full escalation, timing definitions, and rollback; verify documentation governance and runbook policy tests pass.
- [x] 5.2 Run the focused ownership, impact, resolver, aggregate, workflow, suite, tier, Full, and release policy tests plus typechecking; record exact commands and results in `implementation-evidence.md` without running local fast/full/release tiers.
- [ ] 5.3 Obtain an authorized hosted Development dispatch against the implementation head using the new policy; record selected/deferred owners, all attempts, critical path, per-scope maxima, and whether both latency targets were met, leaving an over-target result explicitly unmet.
- [ ] 5.4 Validate the completed change with strict OpenSpec validation and repository diff checks; verify every substantive task and evidence item is complete before in-branch finalization.
