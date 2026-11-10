## Context and investigation

Recent local fatal records from release `0.2.7-dev.1275` identify `adapter.js:253`, which throws `EngineDeliveryError` from `flushEvents`, not a session-selection or parsing exception. The affected persisted session remains readable with the installed pin's `SessionManager.open(...).buildSessionContext()`.

A read-only probe of the installed release reconstructed 999 context messages and 997 transcript blocks. The existing recursive estimator charged 10,694,890 bytes for that transcript alone, exceeding the 8,388,608-byte pending queue allowance. `PendingEngineDelivery.push` rejected a single authoritative `session-view` with an otherwise empty queue. A runtime stub using those messages and the installed production adapter reproduced both startup flush failure and a second failure after `announceReleaseUpdate({ status: "installed", ... })`. Each caused one session abort through overload recovery, with no listener or renderer failure. The source-file SHA-256 was unchanged before and after inspection. No personal content is committed here.

A second screenshot shows aborted tool operations and a live `Session failed` state. An additional offline runtime stub held an admitted prompt open and emitted the installed notice through the production adapter. The command settled as `failed`, the view lifecycle became `failed`, and `editor.submitEnabled` became false. `#reconcileOverload` refuses to resume while an underlying command remains running, which explains why typing another prompt does not recover this variant. This live path must be part of regression coverage, not only startup flushing.

This establishes a sufficient mechanism for both reported symptoms, not a timestamped proof of the first interruption's initiating event. The fatal records deliberately retain no messages, and the initial live interruption has no matching fatal record. Other full-view emissions can hit the same limit. A newer locally activated release is observed through the existing restart-readiness observer; that path announces a diagnostic and full view, not a hot swap.

## Goals

- Large authoritative history must not be mistaken for accumulated delivery backlog.
- A background installed-update announcement must not abort, replace, dispose, or change the executing session/release.
- Normal large-session resume must reach input readiness without modifying or truncating persisted data.
- Preserve bounded pending work, FIFO semantic barriers, per-turn yielding, generation invalidation, meaningful flush failures, and balanced image-asset ownership.

## Design direction

Keep the repair in the engine delivery ownership boundary. Introduce an explicit bounded representation/accounting contract for immutable authoritative transcript snapshots rather than repeatedly recursively charging the entire already-owned history as new event payload. Historical payload must stay shared, not copied into every notification. Any state retained solely for pending delivery must have an explicit finite accounting and release path; do not exempt arbitrary event payloads, permit unbounded distinct obsolete snapshots, or retain history invisibly behind tiny lazy markers.

Keep side-effect-bearing `session-view` semantics ordered: do not broadly coalesce views, drop lifecycle or command outcomes, or lazily substitute newer state across a semantic barrier. Preserve the emitted snapshot's identity/revisions until delivery. Verify current and obsolete generation disposal and image retention with focused tests. The detailed representation should be chosen after approval against these invariants; merely increasing the 8 MiB limit or swallowing `EngineDeliveryError` is not a repair.

The update observer remains informational. Its regression coverage should flow through the real adapter and local approved-release observation where practical, using isolated paths and no registry/model traffic. Verify that active work continues, executing-release identity remains unchanged, a subsequent command succeeds, and only a later launch selects the successor. Keep bare and comparison presentation paths covered where they share delivery.

Create large persisted fixtures with the pinned public APIs, preserving independent start/end markers and normal compaction support. Public-entry coverage should execute exit/resume hints and compare identity, context, and unchanged source bytes with direct same-pin reopening, not the investigator's personal file.

## Validation strategy

After approval, run only changed queue/event-delivery/adapter tests, the relevant composition and packaged resume test files, typecheck, and strict validation of this change locally. CI owns selected post-ready validation. Include synthetic genuine protected-event saturation to prove the repair does not disable overload recovery. Include ordered multiple distinct snapshots, semantic barriers, generation switches, and asset release to constrain hidden retention.

## Scope boundaries and known gaps

- No live session or installed immutable release is patched during planning. An already running affected binary cannot acquire this code fix automatically.
- No personal session mutation, truncation, forced compaction, migration, credential access, or automatic model request is needed.
- The existing age-based release cleanup intentionally does not inventory all live processes. Its seven-day retention boundary is separate from this same-day failure and is unchanged; this repair does not claim indefinite retention for processes outliving that window.
- The original interruption's exact initiating event is not recoverable from the metadata-only records. The two failure paths above were independently reproduced against installed production code.
- No implementation or regression tests have been changed before approval.
