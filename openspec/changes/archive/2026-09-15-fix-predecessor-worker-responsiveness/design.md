## Context

See proposal.md for motivation and the requested nightly-recovery finish line. This design is required because asynchronous process lifetime, cancellation, exact-package validation, and uncertain historical attribution need explicit decisions before coding.

Historical evidence: Full regression `34871471606`, source `5079baf8b5469ec05e3f81de28e776802c3ae9c6`, Windows Node 24 job `104068253297`, failed owner `vitest-full-without-isolated`. Vitest reported 284 files/3053 tests passed, three files/ten tests skipped by existing policy, and one unhandled `[vitest-worker]: Timeout calling "onTaskUpdate"`. The predecessor suite took 524703 ms, including a 367232 ms test. Passing test assertions do not make that run successful. The log does not identify which worker originated the RPC timeout.

`update-predecessor.integration.test.ts` uses `crossSpawn.sync` for candidate/predecessor npm installation, registry version listing, and shipped proxy synchronization. Its async wrappers do not make these waits nonblocking. This demonstrably prevents its worker from processing messages/timers while the subprocess runs, but attribution of the historical RPC error remains a hypothesis until reproduced. The new frame accounting/observation tests passed in the failed lane; that fact neither blames nor exonerates them as the RPC source.

The planning base `586c48f8cda30ad89358a16160528746b4446253` includes #398's input correction and #390's trust correction. The historical macOS trust mismatch therefore predates this base. Linux passed that old run; Windows Node 22 was still running at the last planning inspection and must receive an actual final disposition, not a presumed pass.

The existing Release workflow schedules nightly at `03:17 UTC`. Its scheduled mode runs `full-release` against one shared numbered package on Windows Node 22/24, Linux Node 24, and macOS Node 24. Manual `channel=develop` runs only package smoke/install, and an already-published version is a successful no-op. Manual development publication is not nightly evidence. The workflow has no manual `nightly` channel.

## Goals / Non-Goals

**Goals:** Keep predecessor-test process waits responsive; preserve compatibility authority, isolation, and bounded fail-closed outcomes; obtain a real successful nightly run over newer numbered merged bytes rather than merely a passing helper test.

**Non-Goals:** Change production release/materialization code, patch published predecessors or Vitest internals, change worker counts or scope classification, add dependencies, change workflows or schedules, raise any timeout/budget, reduce coverage, retry failures into green, publish to `latest`, or rewrite existing package bytes. Unrelated failures require an explicit plan refinement or linked repair before coding; they still block recovery completion.

## Decisions

### 1. Replace waits, not the compatibility oracle

Introduce a narrowly scoped test-support asynchronous runner, using the existing cross-platform spawn dependency and argument arrays rather than command-string concatenation. Await every invocation in the same sequence: install candidate, list published versions, then install/synchronize each selected predecessor before importing its own release entry and invoking its materialization/warmup code. Preserve `npm.cmd` on Windows, working directories with spaces, `shell: false` at the call site, and the existing case-insensitive removal of inherited `npm_config_*` variables. Never install into the real global prefix.

Keep publication-time ordering, exclusion of the candidate version, default three-predecessor limit and existing override semantics, entry-absence compatibility skip, and at-least-one exercised predecessor assertion. Do not replace actual published packages with self-generated compatible fixtures. Continue consuming the exact selected candidate tarball.

**Alternatives rejected:** Increasing RPC timeouts or adding sleeps conceals blocked control-plane work. Serializing/reclassifying the suite does not unblock its own event loop and changes scheduling beyond this repair. A separate synchronous worker adds a second process protocol when an asynchronous child already provides the needed boundary.

### 2. Bound output and own child completion

Capture stdout/stderr without blocking, retaining the effective synchronous runner's 1 MiB output bound rather than introducing unbounded async buffers. Overflow is a failure, never successful truncation. Successful completion requires a zero exit and fully closed output streams. Spawn errors, nonzero exits, signals, cancellation, malformed registry JSON, and failed proxy synchronization remain failures; explicitly check synchronization, whose current result is ignored.

Settle each command once, remove listeners/timers, and retain child ownership until process/output closure. Connect cancellation and failure cleanup to the enclosing fixture lifetime; stop only verified owned subprocesses/descendants using existing supported ownership mechanisms. Do not delete an installation prefix while its command is still running. Unprovable process ownership is a blocker, not permission for process-name or broad PID cleanup.

Retain the existing 900000 ms setup, 1800000 ms test, 120000 ms teardown, and 120000 ms warmup limits. Do not reset a fresh full budget for each child or extend the enclosing deadline. The runner must permit the existing timeout/cancellation machinery to execute; no RPC, workflow, or test-timeout increases are included.

Add bounded phase labels, public predecessor version, executable category, elapsed duration, output byte counts, and exit/error identity. Do not dump environment variables, credentials, arbitrary captured output, or registry bodies in diagnostics. Distinguish command failure from teardown failure without hiding the primary error.

### 3. Prove responsiveness without waiting for a production timeout

Before replacing the wait, add a deterministic handshake/control test that needs the parent worker to process an event while its child remains alive. Use explicit IPC/stdin/stdout coordination and a bounded watchdog for failure containment, not sleep-based success or a minute-long real RPC timeout. Verify the synchronous path cannot satisfy the handshake and the asynchronous path can. The fixture must clean up in both outcomes.

Cover output draining/chunk boundaries, the existing output cap, spawn failure, nonzero exit, signal termination, cancellation, ownership-safe cleanup, paths/arguments containing spaces, sanitized environment, malformed version-list data, and failed synchronization. Verify no subsequent install/import/warm phase runs after a failed prerequisite. Retain unrelated fixture processes as negative cleanup controls.

Then run the actual published-predecessor scope under its declared package preconditions and capture source/version/digest plus bounded phase timings. Focused synthetic tests establish the mechanism, not full nightly recovery or the historical worker's identity.

### 4. Repair the approved stale test consumer without changing clipboard behavior

Implementation typecheck exposed a merged integration mismatch: #388's transcript lifetime test still reads `.copyText`, while #385 changed the viewport result to a `copySelection` snapshot. The maintainer requested continuation after the narrowly scoped adaptation was proposed. Change that test to serialize the returned snapshot's rows with the existing `selectionCopyRowText`, exactly as current viewport-controller tests do. Keep `COPY_CURRENT` as the independent expected string, fail if the snapshot is absent, and retain every geometry/lifetime case. Do not change production code, snapshot semantics, or the expected clipboard content. Verify the focused lifetime suite and repository typecheck.

### 5. Validate the merged recovery, not an obsolete branch

After the approved implementation is complete, push and make this same PR ready before normal PR CI, as explicitly requested by the maintainer and documented in policy PR #401. Do not duplicate ordinary CI through a draft dispatch. Obtain four-lane Full regression on the candidate containing all relevant fixes. Keep every failed run; no silent retries, skips, or timeout inflation.

Maintain a failure ledger with source, run, job, stage, root-cause evidence or uncertainty, corrective PR, and final passing evidence. If another stage fails, investigate it and reconcile the additional scope before implementation; neither declare the helper fix a completed recovery nor silently absorb unrelated runtime changes.

After actual maintainer validation and explicit manual implementation merge, require a newly numbered package from merged source containing the repairs. Use the existing scheduled nightly Release workflow. If an authorized development publication already produced that newer package, scheduled nightly must download and fully verify those immutable bytes; a development no-op does not count. If the package does not exist, nightly must build/stamp/pack once, validate all four lanes, publish to `next`, and verify registry identity. Do not invent a manual nightly input or alter the workflow to avoid waiting for the real schedule.

Record the nightly run's `mode=nightly`, exact source/merged-PR number, package version, integrity/shasum, four successful full-release outcomes, and successful aggregate Publication result; where publication occurs, verify the registry serves exactly the validated bytes and the intended `next` tag. A branch tarball or manual reduced-scope publication cannot substitute. No old numbered package is mutated or republished.

### 6. Close only after the requested outcome exists

The maintainer's implementation review and merge are an integration checkpoint; nightly acceptance remains a separate substantive task afterward. Record final recovery acceptance only from actual evidence, including review of the canonical-spec baseline. Do not manufacture an archive-eligible acceptance record before the post-merge nightly task completes.

After successful numbered-package nightly recovery, reconcile evidence for this change and the affected earlier changes without automatically checking their unrelated tasks. Only then prepare the completed change's OpenSpec synchronization/archive PR, allow its documentation CI/auto-merge, confirm archive integration, and clean eligible retained worktrees. This sequencing preserves the user's explicit prohibition on docs/specs archival before implementation merge.

## Risks / Trade-offs

- [Historical timeout has another origin] → Keep the claim qualified; use deterministic reproduction and native runs, retaining all failures and requiring approved scope refinement when needed.
- [Asynchronous children outlive failing fixtures] → Exercise cancellation, stream closure, exact ownership, and cleanup ordering, including negative process controls.
- [Published predecessor materialization still blocks internally] → Do not rewrite old published code; retain measured phase evidence and escalate rather than hiding it.
- [Registry or runner contention remains] → Diagnose the specific failure; preserve registry/coverage policy and fail closed without a retry campaign.
- [Nightly waits until the scheduled window or develop advances] → This is an explicit pending acceptance gate. Verify the selected source includes every repair and report the package actually tested.
- [Other recovery tasks remain unresolved] → Keep them separately visible; do not archive them merely because this helper or one lane passed.

## Migration Plan

No application-data migration is needed. Implement only after plan approval/request in this same stream. Rollback reverts the test-support changes without modifying published packages or user state. Preserve diagnostic evidence if rollback is required; a rollback or merge alone is not proof of restored nightly builds.
