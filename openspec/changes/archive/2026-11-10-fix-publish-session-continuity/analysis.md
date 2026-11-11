# Session continuity incident analysis

## Status and method

Analysis only. No product code, production tests, installed release, personal settings, or personal session has been modified. The draft's existing Implementation markers remain unchecked. The additional repair scope recommended below is proposed, not approved.

Evidence combines the screenshots, read-only crash/session/release metadata, code tracing, and disposable probes importing the installed production JavaScript. Runtime/model stubs isolate delivery without a provider request; they are not a full terminal or provider certification. A separate disposal probe uses the real isolated Pi runtime with a test lock backend. A two-process writer probe uses the real production lock backend against a disposable text fixture. Scratch lives under this worktree's ignored `.artifacts/investigation/`; none of the personal conversation is copied into fixtures or committed.

## Findings at a glance

| Finding | Evidence | Incident relevance |
| --- | --- | --- |
| Full authoritative history is charged as pending queue payload | Actual saved-session projection and installed queue rejection | Confirmed restore failure mechanism |
| Repeated views count shared history repeatedly | Same object rejected on the third roughly 3 MiB queued view | Also affects sessions below the single-view ceiling |
| Routine model, thinking, scope, metadata, settlement and update changes enter overload | Installed adapter matrix with small/large synthetic histories | Confirmed triggers, not just publishing |
| Overload can leave a permanently failed, unsubscribed session | Real adapter with delayed command cleanup | Matches disabled input and live Session failed symptom |
| A successful mutation can be reported cancelled/failed | Model applied once before workflow cancellation | Explains confusing model-dialog behavior and unsafe retry assumptions |
| Diagnostics erase the reason and initiating operation | Nine records name only generic Error and adapter flush location | Prevents exact attribution of every historical interruption |
| Release retention does not protect every live process | Production retention plan and source | Separate future update hazard, not these same-day crashes |
| Writer takeover ignores lost ownership; adapter disposal omits lock release | Disposable two-process probe and real runtime disposal probe | Separate session-safety defects; no evidence of corruption in the inspected file |

## 1. What the local evidence establishes

Nine retained fatal records on November 10 identify `integrations/pi/engine/adapter.js:253`, the throw in `flushEvents`. Five execute `0.2.7-dev.1275`; four execute `0.2.7-dev.1276`. The queue, delivery, adapter, runtime integration, and session runtime JavaScript files are byte-identical across those two installed releases. Therefore merely taking 1276 cannot fix this defect.

The first recorded restore crash is at 19:42:57 UTC. Local certification/activation evidence for 1276 is at approximately 19:48:59 UTC. That activation cannot explain the earlier failure. A publication/activation notice can independently trigger the same defect, but the records do not establish that every interruption coincided with publication. An older October terminal crash has a different stack and is not attributed to this incident.

Initial read-only inspection rebuilt 999 active messages into 997 UI blocks. The queue's estimator charged 10,694,890 bytes for their transcript alone, against an 8,388,608-byte allowance. The otherwise empty queue rejected the single view. An installed adapter driven with those messages reproduced `EngineDeliveryError` both at startup flush and after an installed-release announcement, each causing an abort.

The session continued to receive user activity during the investigation. At a later read, all 2,277 JSONL records parsed, IDs were unique, and every non-null parent ID resolved. Both installed releases' pinned session readers restored the same session ID and identical active-context digest. Before/after checks for the inspection reported unchanged source bytes. This is evidence of a saved conversation that the owned UI cannot reliably deliver, not evidence that the inspected file was deleted or corrupted. It is not a claim that all other reported sessions are intact or that interrupted tool side effects completed.

Two persisted model-change records are followed by aborted assistant records after approximately 25 ms and 9 ms respectively. This corroborates the maintainer's model-switch report, while the isolated production-adapter reproduction establishes the causal mechanism without contacting that provider.

## 2. Primary defect: confusing history with delivery backlog

`pending-delivery.ts` recursively estimates every event with `retainedEventBytes`. A `session-view` includes the complete `view.transcript`. It is nonreplaceable, so each queued view is charged independently even when `PiTranscriptProjection.snapshot()` returns the same frozen array and the same immutable block objects.

Consequences:

- One sufficiently large restored session is rejected even when zero events are pending.
- A smaller session can fail because routine views arrive close together. The queue probe accepted two shared views of roughly 3 MiB and rejected the third; a roughly 1 MiB shared view was rejected on the eighth enqueue.
- Increasing the ceiling only moves the failure threshold. Deduplicating identical snapshots alone still rejects one larger-than-limit snapshot.
- The recursive walk repeats work proportional to transcript object count on metadata-only changes. This is an algorithmic responsiveness risk, not a measured explanation for a particular stall.
- Large live blocks have a related boundary discontinuity: a compact marker is admitted, but freezing it at a semantic barrier can reject the barrier; a large finalized block is rejected directly. The queue probe reproduced this with a synthetic 10 MiB block. This boundary probe does not establish that a single block caused the user's incident.

### Reproduced trigger matrix

After separately observing and draining startup failure in a large synthetic history, each operation was isolated. The small-history controls had no overloads.

| Operation | Small history | History above 8 MiB |
| --- | --- | --- |
| Restore/startup flush | Completes | EngineDeliveryError |
| Read model-dialog catalog/context | No overload | No additional overload |
| Select available model | Completes | Model applied, workflow cancelled, overload |
| Select valid thinking level | Completes | Workflow cancelled, overload |
| Toggle model scope | No overload | Overload |
| Announce installed update | No overload | Overload |
| Session-info event | No overload | Overload |
| Ordinary agent settlement event | No overload | Overload |

Opening/closing an arbitrary modal is not proven to fail. The Models dialog reads state when opening; selection and scope toggling emit full views. Other background full-view sources include repository metadata changes and session naming. Their shared emission path is established by code inspection, not a separate interactive reproduction for every dialog.

## 3. Failure amplification: presentation pressure stops execution

The causal path is:

1. A routine operation emits a full `session-view`.
2. `PendingEngineDelivery.push` refuses admission.
3. `PiEventDelivery.beginOverload` marks delivery failed and calls cancellation.
4. The adapter fails/cancels pending commands and workflows and calls `session.abort()`.
5. Recovery suspends engine subscriptions and increments the delivery generation.
6. It resumes only if cancellation completed and `#runningCommands === 0` at that instant.
7. Otherwise it sets lifecycle to `failed`, disables submission, and leaves admission closed.

`endRunning` only decrements a counter. It does not revisit failed recovery when work later settles. In a synthetic genuine protected-event flood independent of transcript size, immediate command cleanup recovered normally. Cleanup delayed by 10 ms or 100 ms left the session failed after cleanup, with zero engine listeners and later commands rejected despite zero pending commands. These are controlled scheduling cases; they do not claim every real `session.abort()` finishes before its prompt, since the actual Pi abort waits for idle. The adapter nevertheless admits workflows and post-operation continuations whose settlement it must account for explicitly.

This is why a red tool-abort result can become a dead UI rather than just an interrupted turn. Once failed, ordinary `/new`, `/resume`, and quit workflows also encounter the admission gate; generic workflow cancellation is not a recovery interface.

## 4. Model application and workflow success are conflated

The model-selection workflow awaits `session.setModel`, updates active-model state, and emits a full view. Pi can already have appended the model change to the session before that view is delivered. Overload then cancels the workflow promise. The production-adapter probe applied the model exactly once but returned `cancelled`.

The Models presenter closes only when the workflow reports `completed`. Overload also changes delivery generation, which causes shell replacement concerns to reset surfaces. Thus the resulting dialog/selection behavior is misleading even when model authentication and selection succeeded. Automatic retries must not re-run already-applied side effects just because presentation failed. The fix must preserve honest operation outcomes separately from presentation acknowledgment.

## 5. Why the normal restore command fails repeatedly

Session lookup and same-pin parsing succeed. The restored history is projected successfully. Startup then flushes the rejected view; `runOwnedUi` propagates `EngineDeliveryError`, and the entry's fatal handler exits. Repeating the command with unchanged history repeats the same deterministic limit violation. It is not repaired by changing the model, waiting for a release, or retrying the same command.

Fatal records deliberately exclude raw error messages and retain only broad Error/TypeError/RangeError classification and sanitized code locations. They omit whether the failure was byte saturation, event-count saturation, a listener exception, or shutdown interruption, and omit which typed operation triggered it. Live overload failures often never enter the process fatal handler at all. Privacy-preserving classified diagnostics are needed; copying raw prompts or tool output into logs is not.

## 6. Independent release-lifetime gap

Activation uses immutable roots and does not intentionally hot-swap the running UI. The observer calls the informational announcement path. Both relevant local release roots still exist; there are no current pending cleanup dispositions or cleanup diagnostics. The recorded fatal stacks are not module-not-found failures.

However, `planProtectedReleases` protects active/rollback/pending references, the cleanup caller's own release, an active transaction, and recent approval timestamps. It has no lifetime claim for every live UI process. After seven days and enough successor activations, a process can lose its release and unreferenced dependency layer while still running. A pure production-plan fixture marks such an old release collectible. A later lazy import, dialog, tool helper, or worker start could then fail. This is a documented current trade-off, incompatible with an unconditional promise that publication never breaks existing agents.

For that stronger guarantee, propose process-lifetime release-use claims covering both release and dependency roots, acquired atomically with launch selection relative to collection and released on confirmed process exit. Cleanup must conservatively retain live or unverifiable owners, with PID-reuse-safe identity, and recheck immediately before rename/delete. No supervisor or process hot-swap is required. Older clients cannot retrospectively create claims; the rollout must conservatively protect legacy releases until their use can be ruled out. Keep age-based cleanup only for unclaimed releases. This is an explicit policy/scope expansion requiring approval, not a hidden part of a queue fix.

## 7. Independent writer-safety and disposal gaps

The writer guard is based on a ten-second stale heartbeat. Its `onCompromised` callback does nothing. A disposable two-process reproduction acquired the production lock, stalled the first process for twelve seconds, let a second acquire after eleven seconds, then allowed the first to resume. Both wrote to the fixture; the first still considered its handle bound after the compromised heartbeat got an event-loop turn. This demonstrates missing fencing, not corruption of the user's session.

A separate isolated real-runtime probe shows `adapter.session.dispose()` leaves the acquired writer in the test lock backend; invoking `disposePiRuntimeIntegration(runtime)` releases it. The production `PiEngineRuntime.dispose` calls `runtime.dispose` directly, bypassing that helper. Ordinary process exit may release proper-lockfile locks, so this does not explain the recorded EngineDeliveryError stack. It matters to orderly same-process lifecycle, partial initialization, and safe recovery.

Propose one runtime-lifecycle owner for acquisition/release, releasing on every normal and exceptional construction/disposal path. A live or unverifiable owner must not lose write authority solely because its event loop paused; verify process identity before reclaiming stale claims. If ownership really is lost, fence the old writer before any further SDK append. A no-op compromise callback, a longer timeout alone, or automatically deleting a lock cannot establish single-writer safety.

## 8. Recommended repair architecture

### Priority A: Repair snapshot delivery at its ownership boundary

Use an explicit shared immutable snapshot ownership ledger, preserving the current event semantics rather than blindly making session views replaceable:

- The authoritative current transcript is application state, not repeatedly accumulated pending payload. Give snapshots/revisions explicit identity and retain/release ownership.
- Pending events retain references to the precise immutable snapshot/block revision they represent. Keep FIFO order for lifecycle, tool finalization, command outcomes, and assistant completion; never resolve an old event to arbitrary latest state across a barrier.
- Charge queue metadata and unique content retained only because of delivery, not the same current-history graph once per view. Deduplicate shared arrays/blocks and cache revision sizing; metadata-only notices must not recursively scan history.
- Explicitly account for obsolete revisions and image assets. The budget is current authoritative state plus bounded delivery-only retention and bounded node metadata, not an unlimited hidden snapshot store. Apply backpressure/reconciliation to actual backlog, not session age or the size of one valid authoritative state.
- Cover finalized blocks and barrier sealing as well as `session-view`; otherwise the same cliff reappears at completion.

This is a concrete ownership/accounting repair, not permission to remove bounds or swallow flush errors. Existing consumers matter: the shell mostly reads current backend state, but session naming reads the event's snapshot, and delivery snapshots hold image leases. Replacing events with an unversioned dirty flag or broadly coalescing views would change those semantics and is not the recommended shortcut.

### Priority B: Make exceptional recovery a real lifecycle

Introduce explicit recovery states with one bounded coordination task. Stop new work during genuine saturation, preserve operation dispositions, await cancellation and the admitted operation set's actual quiescence, and reconcile/resubscribe exactly once for the correct generation. A late settlement must trigger a safe reevaluation rather than leave the session permanently failed. Disposal or a new session invalidates old recovery callbacks. Never resume while a tool can still write, automatically resubmit an interrupted prompt, or silently retry applied mutations.

A non-quiescent or unrecoverable session needs an explicit safe stop/resume path and actionable classified reason, not an indefinitely disabled editor that swallows every recovery command. Genuine inability to guarantee safety must remain visible; simply reporting every flush successful is forbidden.

### Priority C: Preserve failure evidence and resource safety

Add a bounded allowlisted local incident record for delivery/recovery with reason, event kind, generation, node/byte counters, phase and outcome. Preserve the distinction between operation success and presentation failure. Include safe classifications in fatal diagnostics without raw message, arguments, file content, credentials, or model payloads. Route runtime teardown through the writer-owning cleanup and fence writer takeover. For the full publication guarantee, implement the separately proposed live-release protection policy.

### Reject these shortcuts

- Raising 8 MiB: delays both single-view and repeated-view failures.
- Deduplicating only identical snapshots: leaves large single-view admission broken.
- Ignoring history in accounting without an ownership ledger: hides obsolete-snapshot and image retention.
- Catching the update callback or suppressing EngineDeliveryError: does not undo the already-requested abort or deliver lost semantic events.
- Disabling automatic updates: model selection, scope changes, settlement, naming, and metadata can still trigger it.
- Forced compaction, truncating the saved session, creating a new conversation, or deleting locks: sacrifices context/safety instead of fixing delivery.
- A longer recovery or lock timeout alone: leaves races and lost-owner writes possible.

## 9. Evidence required before calling the repair complete

1. Small and large synthetic histories through the real adapter, including one above the old ceiling and multiple shared medium-size snapshots; no spurious aborts on metadata-only updates.
2. Public installed-entry restore, exit hint, and restore again, for uncompacted and supported compacted large sessions. Compare identity, markers, active context and unchanged source bytes; no personal fixture or automatic model request.
3. Actual model/thinking/scope dialog-to-workflow path while idle and busy, with exactly-once side effects, truthful outcomes, continued work, and subsequent usable input. Also open/cancel without choosing a model.
4. Local approved-release activation while an older process is busy, including failed registry discovery and Manual discovery mode; executing root stays fixed, next launch uses the successor, and late imports still work.
5. Real protected-event flood with immediate, delayed, timed-out, failed, and eventually settled cancellation; bounded retention, no hangs, no stale-generation replay, no duplicate tool execution, safe recovery or explicit safe terminal outcome.
6. Snapshot/image lifetime tests across semantic barriers, compaction, replacement, disposal, and one large finalized block, plus bounded hidden retention under repeated distinct snapshots.
7. Writer acquisition/release through the real adapter lifecycle, failed startup, crash recovery, live-but-stalled owners, PID reuse and uncertainty; never two writers after takeover.
8. For approved release-lifetime expansion, age-expired active-process roots and dependency layers survive multiple updates; dead-owner roots eventually collect; uncertain and legacy owners stay protected.
9. Diagnostics identify the typed failure without containing fixture prompt text, session content, tool arguments, credentials, or raw error messages.

## Proposed scope decision

The current two PR Implementation outcomes cover snapshot delivery and update/resume continuity. The audit recommends refining the plan before implementation to explicitly include recovery/operation-outcome correctness, writer lifecycle/fencing, classified diagnostics, and (if the unconditional running-version guarantee is required) live-release retention. Do not silently implement that expansion under the existing checklist. Keep this PR draft and obtain approval of the concrete refined outcomes first. No implementation is currently available to run.
