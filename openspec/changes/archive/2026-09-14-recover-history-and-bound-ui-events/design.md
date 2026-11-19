## Context

See `proposal.md` for motivation and the two delta specs for behavior. Current history service handling routes both a worker-reported busy result and a 1.5-second operation timeout into a permanent `#failed` state, drains queued writes as skipped, and terminates the worker. The controller turns the failure into an extension warning; shell disposal can also print a history-saving warning after terminal restoration. SQLite already has short bounded retries, so merely extending them does not repair service lifecycle behavior.

The adapter's 1,024-item queue evicts the first superficially coalescible event regardless of entity, or shifts any event if none matches. It records a warning every 128 removals, and diagnostics are copied into visible status. Delivery deliberately yields between transcript updates for terminal input; increasing synchronous batch size would conflict with the accepted `custom-session-viewport` input-turn requirement. Shell listeners perform real side effects on run/message completion and some status transitions, so those notifications are not interchangeable render hints.

## Goals / Non-Goals

**Goals:**
- Recover transient history faults in the same live UI while preserving request certainty, local recall, and finite resources.
- Reduce obsolete UI work before it fills the delivery queue, preserving semantic boundaries and input opportunities.
- Make quiet operation structural: background diagnostics never enter ordinary user-output channels, even during shutdown.

**Non-Goals:**
- Guarantee uncommitted writes survive a hard process termination or replay ambiguous writes without proof.
- Change history file locations, schema, privacy/retention budgets, browsing semantics, or `a1 pi` behavior.
- Rework the renderer/viewport, remove input yields, enlarge queues indefinitely, or hide genuine provider/user-command errors.

## Decisions

### 1. Model history recovery instead of treating every failure as terminal

Replace the single failure latch with explicit starting, ready, recovering/backoff, blocked-storage, closing, and closed states. Only one worker generation and one request may own dispatched storage work. Keep at most one coalesced refresh intention rather than accumulating reads behind writes.

Worker responses must distinguish a definitive non-commit from unknown commit status. A busy failure is retryable only when the operation never began its transaction or rollback conclusively succeeded; ambiguous transaction/worker failures cannot be relabeled as non-commits. Preserve the original submission ID and local admission order when retrying confirmed-uncommitted writes. Use generation plus attempt IDs to reject late responses and settle each promise exactly once.

For recoverable worker loss, confirm termination before replacing the worker. The unacknowledged in-flight write remains local and is not automatically replayed; reconcile it only if a later snapshot proves its submission ID committed. Not-yet-dispatched work can survive the transition within its original bounds, and new submissions and polling resume once the replacement is ready. Corrupt, profile-mismatched, or newer-schema storage enters a conservative blocked state without recreating or modifying its files.

Retain 32 admitted pending writes, 1 MiB per entry, and 8 MiB total pending text. Use asynchronous retry backoff starting at 100 ms, doubling to a 5-second ceiling with bounded jitter. Retain a confirmed-uncommitted candidate for at most 30 seconds from admission, then settle it as skipped while local recall remains available; future recovery probes continue at the capped cadence without accumulating timers. A dispatched worker operation has a 10-second hard liveness deadline, distinct from short database retries; missing that deadline triggers the unknown-outcome replacement path, not blind replay. All timers stop on disposal, and the existing two-second close deadline overrides operation/recovery deadlines. Use injectable clocks and worker factories for deterministic tests.

Alternatives rejected: permanent disablement after a short lock; endless per-write retries; concurrent replacement writers; unconditional resubmission after an uncertain commit; timeout increases without a recovery state machine.

### 2. Keep persistence accounting separate from user presentation

Retain classified internal failure/transition observation, but remove its wiring to `addExtensionNotification` and the post-stop history warning. Expected contention, timeout recovery, capacity refusal, blocked storage, and shutdown outcomes remain developer-only. Do not replace the old text with a quieter toast, footer status, recovery notification, or stderr line. The controller continues to merge local and confirmed snapshots without claiming persistence for skipped or ambiguous entries.

Record only bounded counters, state transitions, durations, and failure categories through an explicit developer-diagnostics sink. It must not feed the session's user-visible diagnostic/status arrays or default terminal writers. Never include prompt text, SQL parameters, paths/provenance beyond existing privacy policy, or arbitrary exception strings. If diagnostics are not explicitly requested, quiet operation requires no output. Preserve ordinary provider errors and direct user-command results; this routing change is scoped to background history and event pressure.

Alternatives rejected: filtering two literal strings at rendering time; suppressing all application diagnostics; printing a success message on reconnect; treating the absence of a warning as a committed-write acknowledgement.

### 3. Buffer by semantic identity with protected ordering barriers

Extract the adapter's pending-delivery policy into a separately testable buffer. Classify every event and every relevant status/transcript transition before coalescing:

- Replaceable notifications carry complete state, not deltas, and have no required side effect of their own. Key them by event kind, entity/block ID, session generation, and ordering segment.
- Protected notifications include lifecycle changes, run start/settlement, assistant-message completion, command outcomes, final/error tool transitions, and status/editor/terminal changes whose listeners require an intermediate transition.
- Treat a protected notification as an ordering barrier. Never move a newer state across that barrier by overwriting an older queue slot. Maintain monotonic delivered sequence order within a generation; unused sequence numbers are acceptable only for documented supersession.

On a safe replacement, unlink the superseded pending node in constant time and retain the newer node at its proper ordered position. Preserve another block's state rather than evicting it. Keep latest-view invalidation cheap and avoid constructing full historical view snapshots for intermediate notifications that are already superseded; use the existing authoritative state and indexed block lookup without copying accumulated payload per chunk. Track retained queue bytes as well as node count, including immutable snapshots required at barriers.

Keep the ordinary node ceiling at 1,024 and cap extra retained queue payload at 8 MiB; authoritative transcript storage is not duplicated to evade that budget. A large individual replaceable value should use a compact authoritative-state reconciliation marker at a safe boundary rather than retaining repeated complete payload copies. If that cannot preserve required boundary semantics, use the explicit overload path rather than discard data. Continue yielding a terminal-input turn between transcript deliveries and honoring the existing presentation coordinator. Flush final states before completion and make `flushEvents()` wait for all required state/control delivery, or return an explicit failure when delivery cannot finish.

Alternatives rejected: increasing the FIFO cap; evicting the oldest event of any type; coalescing all transcript/status events by type alone; putting newer sequence numbers into older queue positions; serializing a full transcript for every chunk; synchronously draining a burst to conceal backlog.

### 4. Define exceptional protected-event saturation honestly

Finite storage cannot promise lossless handling of an unlimited nonreplaceable synchronous producer. Normal streaming must stay below the protected ceiling through safe supersession; validate at least 16,384 accumulated updates across 32 active block identities with interleaved legitimate semantic boundaries and input, without entering overload recovery.

For a synthetic all-critical flood, reserve a single out-of-band recovery state and bounded pending-command settlement path that cannot itself be blocked by the full ordinary queue. Stop accepting new ordinary commands, retain authoritative session state, drain already admitted protected notifications cooperatively, and initiate controlled cancellation of the affected run if production cannot be contained. Settle each admitted command through its normal typed result or explicit failure/cancellation, never by assuming a missing outcome succeeded. Reconcile transcript/status from authoritative state, invalidate obsolete generation-bound callbacks and suggestion work, then resume admission only when reconciliation is complete; if safe resumption is impossible, leave the run stopped rather than claim readiness with uncertain state.

This is an internal recovery protocol, not a new technical banner. It must not allocate an unbounded emergency event log or discard accepted controls. Update all owned contract validators/consumers together if an internal reconciliation marker is needed. The supported ordinary-burst tests must prove that this exceptional fallback is not used to pass normal streaming acceptance.

Alternatives rejected: pretending every possible event burst fits finite memory; silently dropping command/completion events; using a diagnostic event in the already-full queue as the only recovery mechanism.

### 5. Verify robustness and silence together

History coverage uses deterministic worker delays/loss and real independent processes contending on an isolated same-profile SQLite database. Cover acknowledgement after delay, known rollback, unknown commit, cross-process repeats, same-instance recovery, disposal during backoff, and shutdown limits. Assert unique recency and no automatic uncertain replay, not just absence of exceptions.

Event coverage compares every final block and protected event disposition against an uncoalesced reference trace. Include multiple block IDs, interleaved terminal transitions, completion/error barriers, session replacement, a stalled listener, explicit flush, reentrant listeners, and exceptional protected-only saturation. Preserve existing input responsiveness and presentation-budget gates instead of relaxing thresholds.

A combined shell fixture holds the database busy for three seconds while streaming the declared burst and exercising typing, history browsing, and cancellation, then releases the lock. Assert recovery, final content, zero pending accepted input after presentation, finite worker/timer/queue resources, and zero technical history/backpressure/recovery messages across notifications, statuses, transcript, stdout, stderr, and post-stop output. Developer-only evidence must prove that contention and supersession actually occurred; a fixture that never triggers either condition is not a pass.

## Risks / Trade-offs

- Delayed acknowledgement can be mistaken for non-commit -> explicit certainty and generation/attempt accounting; unknown writes remain local rather than being replayed.
- Some statuses that resemble replaceable snapshots have side effects -> classify from actual consumers and test boundary semantics before allowing supersession.
- Quiet background failures reduce incidental user visibility -> keep bounded opt-in developer evidence and honest commit results, without reintroducing unsolicited messages.
- A pathological protected-only flood cannot be made lossless with infinite throughput -> controlled bounded cancellation/reconciliation; ordinary streaming must not use that fallback.
- Concurrent streaming work touches adapter/shell code -> preserve integrated input-yield and presentation behavior; do not include unrelated renderer changes.

## Migration Plan

1. Land recovery and internal diagnostic routing together so removing warnings does not leave permanent history disablement in place.
2. Land semantic event buffering, protected overflow handling, and developer-only pressure metrics together so silence does not conceal arbitrary eviction.
3. Run focused Windows and POSIX recovery/order tests plus existing rendering/input gates and combined-load output capture in CI.
4. Validate the exact built bare-A1 candidate with concurrent same-profile instances and high-output streaming; preserve `a1 pi` as the unchanged comparison path.
5. No data conversion is required. A rollback leaves committed history intact and does not replay pending in-memory writes from the newer process.
