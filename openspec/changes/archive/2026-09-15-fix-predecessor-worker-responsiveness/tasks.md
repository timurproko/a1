## 1. Authorization and original evidence

- [x] 1.1 After plan approval and a separate implementation request, resume this same worktree/branch/PR; record authorization and verify the source contains merged #398/#390, version-2 linkage is intact, and no unrelated changes are present.
- [x] 1.2 Record the original run/source/jobs, Windows Node 24 RPC error and phase durations, final Windows Node 22 outcome when available, and earlier lane results; verify the evidence distinguishes confirmed synchronous blocking from unproven attribution of the historical worker timeout.

## 2. Responsive and bounded subprocess handling

- [x] 2.1 Add a deterministic parent/child handshake regression that requires the worker to process an event before child exit; verify it fails for the synchronous wait and passes for asynchronous waiting without sleep-based success, production-length RPC waits, or leaked fixture children.
- [x] 2.2 Implement the narrowly scoped asynchronous test runner; verify chunked output is fully drained before success and spawn errors, nonzero exits, signals, cancellation, and overflow of the retained 1 MiB bound fail without unbounded buffers or multiple settlement.
- [x] 2.3 Connect child lifetime and cancellation to existing fixture deadlines and teardown; verify owned process/output closure precedes installation removal, listeners/timers are released, primary errors survive cleanup failures, and unrelated process/path controls remain untouched without increasing any timeout.

## 3. Preserve real predecessor validation

- [x] 3.1 Replace every synchronous command wait in the predecessor suite with awaited execution, including registry listing and proxy synchronization; verify ordering, Windows command/path quoting, npm environment sanitation, exact candidate selection, publication ordering, default/override count semantics, supported-entry checks, and predecessor-owned materialization/warmup are unchanged.
- [x] 3.2 Add bounded phase/version/timing/error diagnostics and prerequisite failure tests; verify malformed registry JSON and failed synchronization cannot continue into dependent phases and arbitrary subprocess output or credentials are not exposed.
- [x] 3.3 Exercise the actual declared published-predecessor scope with a prepared exact package; record source/version/digest and phase timings, verify real published predecessors are exercised, and keep synthetic responsiveness proof distinct from actual compatibility evidence.

- [x] 3.4 Adapt the stale transcript-lifetime copy assertion to the current selection snapshot using the existing serializer; verify the exact `COPY_CURRENT` oracle, both geometry cases, all lifetime scenarios, and repository typecheck pass without production clipboard changes.

## 4. PR CI and complete native regression

- [x] 4.1 Pass strict OpenSpec and applicable governance checks, then push the completed implementation and make the same PR ready before normal PR CI; record the passing current-head run and verify no draft-dispatch duplicate, dependency, workflow, suite-ownership, retry, timeout, baseline, source-ledger, or stable-work-budget change was introduced.
- [x] 4.2 Obtain passing Full regression on Windows Node 22/24, Linux Node 24, and macOS Node 24 for the candidate containing all relevant fixes; record exact run/job/source identities and verify all required stages, including the changed predecessor test and independent input/rendering gates, execute and pass.
- [x] 4.3 Reconcile every remaining failed stage in the recovery ledger with its diagnosis, approved corrective scope/PR, and passing evidence; verify no unresolved failure, reduced coverage, blind retry, or widened exception is treated as successful recovery. Pause for scope approval before unrelated code changes.

## 5. Accepted integration and a genuinely green nightly

- [x] 5.1 Provide exact candidate and focused verification commands, record actual maintainer implementation validation and explicit manual merge authorization, and verify implementation integration with auto-merge disabled; state that this is not yet post-merge nightly acceptance.
- [x] 5.2 Verify the real scheduled nightly Release run selects merged source containing the repairs and a newer numbered package, fully validates the same bytes on all four native lanes, and passes its aggregate publication/verification outcome; record mode, source, merged PR, version, integrity/shasum, run/jobs, registry identity and applicable next-tag result. Do not substitute a branch tarball, reduced-scope manual run, or existing-version development no-op, and do not alter published bytes.
- [x] 5.3 Record final recovery acceptance and the reviewed canonical-spec baseline from actual maintainer review of the completed evidence; reconcile the earlier nightly/input/trust/scoped-model obligations individually and verify unfinished substantive tasks remain visible rather than being auto-completed. Do not prepare completed archival while the numbered-package nightly gate remains pending or failed.

## 6. Mechanical archive preparation

- [x] 6.1 Record verified implementation acceptance and merge evidence for archive preparation.
- [x] 6.2 Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.
