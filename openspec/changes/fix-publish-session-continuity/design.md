## Extended analysis and approval boundary

See [the incident audit](analysis.md) for the broader analysis requested after the initial proposal. It adds reproduced shared-snapshot overcounting, delayed-recovery failure, operation-outcome inconsistency, writer ownership/disposal hazards, and the separate age-based release-retention gap. Its recommended ownership-ledger and recovery architecture supersedes the earlier open-ended design direction below. The maintainer explicitly approved implementation of all audit fixes. The existing two PR outcomes are preserved and three unchecked outcomes now cover recovery/diagnostics, writer safety, and process-lifetime release protection.

## Context and investigation

Recent local fatal records from release `0.2.7-dev.1275` identify `adapter.js:253`, which throws `EngineDeliveryError` from `flushEvents`, not a session-selection or parsing exception. The affected persisted session remains readable with the installed pin's `SessionManager.open(...).buildSessionContext()`.

A read-only probe of the installed release reconstructed 999 context messages and 997 transcript blocks. The existing recursive estimator charged 10,694,890 bytes for that transcript alone, exceeding the 8,388,608-byte pending queue allowance. `PendingEngineDelivery.push` rejected a single authoritative `session-view` with an otherwise empty queue. A runtime stub using those messages and the installed production adapter reproduced both startup flush failure and a second failure after `announceReleaseUpdate({ status: "installed", ... })`. Each caused one session abort through overload recovery, with no listener or renderer failure. The source-file SHA-256 was unchanged before and after inspection. No personal content is committed here.

A second screenshot shows aborted tool operations and a live `Session failed` state. An additional offline runtime stub held an admitted prompt open and emitted the installed notice through the production adapter. The command settled as `failed`, the view lifecycle became `failed`, and `editor.submitEnabled` became false. `#reconcileOverload` refuses to resume while an underlying command remains running, which explains why typing another prompt does not recover this variant. This live path must be part of regression coverage, not only startup flushing.

The maintainer subsequently identified model switching as a direct trigger. A separate synthetic-only offline probe drove the installed adapter's actual `models` workflow with an available model stub and a transcript above the limit. Both idle and active-prompt cases applied the model exactly once, then the workflow returned `cancelled` and flushing raised `EngineDeliveryError`, with one additional overload. The idle case recovered to ready; the admitted still-running prompt case settled that prompt as failed, set lifecycle to failed, and disabled submission. No provider request, publication, update observer, personal session, or real model change was involved. `#selectModel` emits the full view after `session.setModel`, while `executeWorkflow` still accounts for the workflow as running; with another admitted prompt pending, overload reconciliation cannot reopen admission. A model operation can therefore persist successfully even though UI workflow delivery reports cancellation.

This establishes a sufficient mechanism for the reported symptoms, not a timestamped proof of every interruption's initiating event. The fatal records deliberately retain no messages, and the initial live interruption has no matching fatal record. Other full-view emissions can hit the same limit. A newer locally activated release is observed through the existing restart-readiness observer; that path announces a diagnostic and full view, not a hot swap.

## Goals

- Large authoritative history must not be mistaken for accumulated delivery backlog.
- A background installed-update announcement must not abort, replace, dispose, or change the executing session/release.
- Normal large-session resume must reach input readiness without modifying or truncating persisted data.
- Preserve bounded pending work, FIFO semantic barriers, per-turn yielding, generation invalidation, meaningful flush failures, and balanced image-asset ownership.

## Design direction

Keep the repair in the engine delivery ownership boundary. Introduce an explicit bounded representation/accounting contract for immutable authoritative transcript snapshots rather than repeatedly recursively charging the entire already-owned history as new event payload. Historical payload must stay shared, not copied into every notification. Any state retained solely for pending delivery must have an explicit finite accounting and release path; do not exempt arbitrary event payloads, permit unbounded distinct obsolete snapshots, or retain history invisibly behind tiny lazy markers.

Keep side-effect-bearing `session-view` semantics ordered: do not broadly coalesce views, drop lifecycle or command outcomes, or lazily substitute newer state across a semantic barrier. Preserve the emitted snapshot's identity/revisions until delivery. Verify current and obsolete generation disposal and image retention with focused tests. The detailed representation should be chosen after approval against these invariants; merely increasing the 8 MiB limit or swallowing `EngineDeliveryError` is not a repair.

Model switching must also flow through the real adapter model-selection workflow in isolated regression coverage, both while idle and with an admitted prompt still running. Assert that the selected model is applied once, workflow completion matches that change, active work is not spuriously cancelled, submission stays enabled, and later input remains usable. Do not infer provider or authentication failure from a model switch whose state mutation already succeeded.

The update observer remains informational. Its regression coverage should flow through the real adapter and local approved-release observation where practical, using isolated paths and no registry/model traffic. Verify that active work continues, executing-release identity remains unchanged, a subsequent command succeeds, and only a later launch selects the successor. Keep bare and comparison presentation paths covered where they share delivery.

Create large persisted fixtures with the pinned public APIs, preserving independent start/end markers and normal compaction support. Public-entry coverage should execute exit/resume hints and compare identity, context, and unchanged source bytes with direct same-pin reopening, not the investigator's personal file.

## Validation strategy

After approval, run only changed queue/event-delivery/adapter tests, the relevant composition and packaged resume test files, typecheck, and strict validation of this change locally. CI owns selected post-ready validation. Include synthetic genuine protected-event saturation to prove the repair does not disable overload recovery. Include ordered multiple distinct snapshots, semantic barriers, generation switches, and asset release to constrain hidden retention.

## Scope boundaries and known gaps

- No live session or installed immutable release is patched during planning. An already running affected binary cannot acquire this code fix automatically.
- No personal session mutation, truncation, forced compaction, migration, credential access, or automatic model request is needed.
- Age-based cleanup is separate from the same-day delivery failure. The approved expansion adds process-lifetime release protection and conservative legacy retention so age alone cannot remove an executing root.
- The original interruption's exact initiating event is not recoverable from the metadata-only records. The two failure paths above were independently reproduced against installed production code.
- Investigation preceded explicit approval; implementation now proceeds under the expanded approved outcomes.
