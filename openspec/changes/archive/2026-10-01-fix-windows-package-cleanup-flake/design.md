## Context

See `proposal.md` for motivation and scope. Development publication run [36866816762](https://github.com/timurproko/a1/actions/runs/36866816762) used the same source commit, candidate digest, Windows image, Node version, workload, and assertions on both attempts. Attempt 1 spent 34,544 ms in `backlog-setup`, then remained in `backlog-worker` for about 87 seconds until the test's unchanged 120-second bound expired; teardown found the fixture locked. Attempt 2 spent 3,558 ms in setup and 3,345 ms in the worker. The preceding publication run recorded 2,950 ms and 3,133 ms respectively.

The fixture creates 42 releases sequentially but starts all 128 payload writes for each release in one `Promise.all`. That burst can leave Defender or filesystem work queued when the exact packaged cleanup process begins. The retained specification requires the same release and payload counts, exact worker behavior, failure visibility, and timeout.

## Goals / Non-Goals

**Goals:**
- Remove the fixture's avoidable high-fan-out write burst before the behavior under test starts.
- Preserve exact-package cleanup semantics, representative file topology and bytes, phase evidence, and first-attempt failure authority.
- Make the concurrency policy reviewable and protected by focused tests.

**Non-Goals:**
- Change production cleanup scheduling, retention, or worker bounds.
- Increase the test timeout, add retries, disable Defender, exclude fixture paths from scanning, or accept a later attempt as first-attempt evidence.
- Reduce release count, payload-file count, assertions, supported lanes, or file contents.

## Decisions

### 1. Bound fixture payload writes with a small fixed worker pool

Replace the per-release 128-way `Promise.all` with a local bounded worker loop whose reviewed maximum is eight outstanding payload writes. Releases remain sequential, paths and contents remain identical, and completion still means every write has settled before state publication and worker launch. Eight retains useful setup throughput while reducing peak fan-out by sixteen times.

Alternative: serialize every write. Rejected because it removes all safe overlap and could unnecessarily lengthen every platform's validation. Alternative: retain the burst and sleep before cleanup. Rejected because elapsed delay is not a readiness signal and would conceal scanner variance rather than prevent self-induced pressure.

### 2. Keep the existing workload, worker, and deadline unchanged

The fix changes only fixture preparation scheduling. The test will still create 42 releases with 128 JavaScript payload files each, invoke the candidate's packaged `release-cleanup.js`, and assert protected releases, completed pending state, worker evidence, file-count reduction, and byte reduction under the existing 120-second test timeout.

Alternative: increase the timeout to the invocation's 600-second ceiling or automatically rerun Windows. Rejected because the first failure exposed fixture-generated contention, and either option would accommodate rather than remove it. Alternative: shrink or simplify payloads. Rejected by the representative-backlog contract.

### 3. Protect the bound structurally and validate behavior on Windows

Focused governance coverage will require the retained workload and explicit finite concurrency policy and will reject restoration of unbounded all-at-once payload creation. Because adding the reviewed constant moves legacy package-identity fixture strings, implementation will regenerate the line-sensitive identity inventory and exact approval coordinates and review that only those coordinates and fingerprints changed; approved occurrence values, contexts, classes, and reasons remain unchanged. The selected current-head package-contract lane remains the behavioral proof: phase evidence must show setup and worker completion on the first execution, and all semantic assertions remain authoritative. No test will assert a narrow elapsed-performance threshold; the existing hang bound remains the only deadline.

Alternative: add a timing assertion around setup. Rejected because hosted-runner elapsed time is not deterministic and was never the contract.

## Risks / Trade-offs

- **[Eight writes still create scanner pressure on an unusually degraded host]** → Preserve phase evidence and the existing truthful timeout; do not retry or extend the deadline. If current-head Windows evidence still reproduces the stall, refine the plan rather than weakening validation.
- **[Lower concurrency lengthens normal setup]** → Keep a bounded pool instead of full serialization and compare phase evidence with the recorded 3-second normal baseline without making that baseline a pass/fail budget.
- **[A source-text governance check becomes brittle]** → Assert only the stable workload and finite-concurrency contract; leave exact worker behavior to the integration test.

## Migration Plan

1. Introduce the bounded fixture writer and focused policy assertion without changing product code or validation composition.
2. Run focused governance coverage and strict OpenSpec validation, then rely on the selected Windows exact-package lane for first-attempt integration evidence.
3. Compare emitted setup/worker phases with the failed and successful observations above; retain every failure rather than rerunning it into acceptance.
4. Roll back by reverting the fixture scheduling change if it causes semantic drift; do not roll back by increasing the deadline or reducing workload.
