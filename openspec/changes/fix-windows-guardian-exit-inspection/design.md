## Context

The Windows guardian's public inspection command maps `Some(startIdentity)` to exit 0 with JSON and `None` to exit 3. `inspect_process_start` currently opens the PID with `PROCESS_QUERY_LIMITED_INFORMATION`, reads its creation time, and returns `Some` whenever those operations succeed. That proves which process object was opened but not that the object is still active.

Issue #377 captured the observable mismatch: after the JavaScript fixture's liveness poll reported the child dead, the guardian still exited 0. The current focused test passes, so implementation must create a deterministic terminated-object boundary rather than depend on reproducing a narrow scheduler window.

## Goals / Non-Goals

**Goals:**
- Return a live identity only when the exact opened Windows process object is active at the inspection point.
- Keep active identities stable and PID-reuse-safe.
- Return the existing dead/absent outcome for terminated and nonexistent processes.
- Keep access and Win32 failures diagnosable and fail closed.
- Prove behavior through deterministic native evidence and the shipped command boundary.

**Non-Goals:**
- Changing Job Object ownership, guardian parent monitoring, shutdown escalation, or child exit-code propagation.
- Changing macOS/Linux inspection behavior.
- Treating JavaScript `process.kill(pid, 0)` as the Windows liveness authority.
- Raising timeouts, adding retries, or weakening process-containment assertions to hide the race.

## Decisions

### 1. Observe state and identity through one pinned process object

Open the target with the query and synchronization rights needed for both identity and state observation. Use a zero-duration Windows process-object wait to classify that same handle:

- nonsignaled means active at the observation point;
- signaled means terminated and maps to the existing absent/dead result;
- wait or access failure is an inspection error, not evidence of either state.

Read the creation-time token from that same handle only for the active result. Holding one handle throughout prevents the state decision and token from silently referring to different PID generations.

A process may exit immediately after an active observation. That is an ordinary snapshot race handled by later reconciliation; it does not permit returning an identity for an object already observed signaled.

### 2. Preserve the public inspector outcome contract

`--inspect-pid` continues to emit one JSON identity and exit 0 for an active process. A nonexistent PID or a process object already in the terminated state produces no identity and exits 3. Invalid arguments and genuine inspection failures retain the error path and must not be collapsed into exit 3.

The implementation will classify documented Win32 wait outcomes explicitly. Unexpected values, denied synchronization access, and API failure retain bounded diagnostics without exposing unrelated process data.

### 3. Make the historical race deterministic below the scheduler-sensitive fixture

Add native Windows coverage that deliberately retains a process handle after termination and verifies the inspector classifies the signaled object as dead while its creation time remains queryable. This directly tests the operating-system state responsible for the issue without sleeps or PID-probe inference.

Keep public-boundary integration coverage for:

- repeated stable identity while a child is active;
- exit 3 after confirmed child termination;
- invalid/nonexistent PID behavior; and
- repeated runs using the built and packaged guardian.

If deterministic evidence contradicts the proposed mechanism, stop and refine the plan rather than adding speculative production changes.

### 4. Preserve containment and release behavior

The change affects inspection only. Guardian-owned process creation, Job Object assignment, parent/root waits, descendant termination, status publication, and root exit propagation retain their existing paths. Required validation must include those controls so extra process access rights or state checks cannot weaken containment or keep handles alive beyond their established lifetime.

## Risks / Trade-offs

- [Synchronization access can be denied where query access succeeds] -> Report an inspection error and preserve ownership uncertainty rather than claiming dead or live.
- [A process exits immediately after a live snapshot] -> Preserve snapshot semantics; reconciliation compares PID plus creation token and can inspect again.
- [A real process exits with status 259] -> Use process-object wait state rather than interpreting `STILL_ACTIVE` as the sole liveness signal.
- [A test recreates only JavaScript polling behavior] -> Require retained-handle native evidence that proves the object is terminated yet queryable.
- [Additional handle rights alter compatibility] -> Cover supported Windows packaged execution and retain concise failure diagnostics.

## Migration Plan

No persisted migration is required. Ship the corrected guardian in the ordinary package, retaining protocol version and command syntax because the observable contract is unchanged. Rollback restores the prior inspector and therefore may reintroduce the false-live race; it does not make stored instance identities incompatible.
