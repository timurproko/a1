## Context

Run: https://github.com/timurproko/a1/actions/runs/43732033913
Source: 3f2ed26f0cc99a5ac22901221a3ea2b89de755c3
Failed Windows job: 132870943620.

The uploaded published-installer smoke artifact records stage `update-predecessor`, status null, signal SIGTERM, and `spawnSync C:\\Windows\\system32\\cmd.exe ETIMEDOUT`. Its only updater output is `a1 update: 0.2.7-dev.1307 → 0.2.7-dev.1313`. The newest npm log reaches dependency lifecycle completion but does not record a final npm exit. Job cleanup subsequently reports EBUSY removing the fixture root, and Actions terminates orphan conhost and node processes. These observations establish an unsettled Windows update and error masking, not the exact inner hang cause.

Registry inspection confirms both 0.2.7-dev.1313 package versions and their expected SHA-512 integrities exist. Application `next` remains 0.2.7-dev.1307 and `a1-staging` names 0.2.7-dev.1313. Promotion correctly did not run. Current state must be reread before any separately requested publication recovery.

The actual immutable 0.2.7-dev.1307 recovery entry executes its worker unconditionally after invocation validation; it does not have the newer lexical direct-entry guard. Therefore the earlier macOS direct-entry alias repair must not be assumed to explain this predecessor failure.

## Decisions

1. Reproduce the Windows predecessor replacement boundary, including public command-shim execution and detached recovery/npm settlement. Prefer a small hermetic native fixture, then a bounded exact-pair reproduction when needed. Do not relabel a candidate-only test as predecessor compatibility.
2. Repair the smallest demonstrated cause. Do not increase the ten-minute timeout, skip predecessor replacement, change assertions, select an easier predecessor, or promote the staged package to make the smoke pass.
3. Track and settle only fixture-owned processes. A timed-out command shell must not leave an updater, guardian, or npm descendant running inside the fixture; process identity and bounded shutdown are required before removal. Cleanup must cover data/update-recovery records as well as runtime records where relevant.
4. Preserve the primary failure independently of cleanup. Cleanup-only failure is still nonzero and receives explicit evidence; secondary cleanup errors accompany rather than replace an update failure. Diagnostics remain bounded, sanitized, and restricted to the fixture.
5. Emit a bounded Actions failure annotation naming the smoke stage and primary child failure, with a separate cleanup annotation when appropriate. Reuse the existing publication client's annotation reader unless reproduction exposes a separate defect there.

## Risks and scope boundaries

The public predecessor owns the executing updater, so changing candidate updater code alone may not repair this smoke. Do not patch the immutable predecessor package or bypass its updater. If an inherent predecessor product incompatibility is demonstrated rather than a harness/process defect, present the concrete remediation and reconcile the plan before implementation.

Native Windows behavior needs native coverage. Cross-platform injected failures can prove evidence precedence but cannot prove Windows child-tree settlement. No broad suite is required locally beyond focused reproduction and changed-owner tests.

## Implementation observations

The immutable 1307-to-1313 pair completed successfully on native Windows twice: first under Node 24.21.0/npm 11.19.0, then under the failed job's Node 24.22.2/npm 11.19.1 with isolated empty npm configuration. The latter executed the dependency lifecycle scripts shown in the failed run. The original inner npm stall did not recur; no predecessor, target, installation arguments, or installed payload was changed. This rules out a deterministic incompatible predecessor in these local conditions, not a hosted-runner-specific failure.

A native command-shim fixture isolates the demonstrated timeout boundary: cmd.exe invokes an updater, which starts a detached recovery owner under update-data and a relative npm descendant. The async supervisor retains the shell until it can inventory descendants, rechecks process-start identities, protects caller ancestry, stops only fixture-associated processes, and verifies settlement before deletion. It replaces the synchronous shell-only timeout and unverified runtime JSON PID cleanup; public predecessor execution and its ten-minute deadline remain unchanged.

Focused native coverage includes command completion, output limits, detached/relative descendants, unrelated paths, stale parent IDs, changed start identity, unavailable caller identity, and actual fixture removal. Existing shared process-inspection tests exercise the reused creation-time-pinned Windows termination handle.

Primary-error evidence now remains authoritative when process settlement, fixture removal, or evidence writing also fails. Cleanup-only failure rewrites the final outcome to failure; neither the success artifact nor success banner is emitted before cleanup completes. If process settlement fails, removal is not attempted. Failure annotations identify the primary stage, separate secondary cleanup/evidence failures, redact environment credentials and URL secrets, bound text, and escape Actions command syntax. Focused tests pass emitted annotations through the existing publication-summary reader, so no artifact download is required for the primary diagnostic.

Local targeted validation: core build, both typechecks, architecture boundaries, strict OpenSpec validation, smoke/process ownership tests including native Windows timeout settlement, existing shared process-inspection tests, and publication-client reporting tests. The initial bin typecheck required the normal core build because the fresh worktree deliberately installed dependencies without lifecycle scripts; it passed after that build.

## Known gaps

The exact inner npm stall from the hosted Windows run remains unreproduced. Disposition: retain the original deadline, fail closed on any recurrence, and use the repaired process settlement and stage diagnostics rather than guessing at an updater fix or increasing budgets. Native exact-pair success and timeout containment are local evidence only; they do not establish live publication recovery. No publication retry or registry mutation has been performed.
