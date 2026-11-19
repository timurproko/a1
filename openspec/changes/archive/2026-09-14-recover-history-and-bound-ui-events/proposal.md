## Why

Transient history contention currently disables persistence for the remainder of the UI session, while streaming pressure can discard unrelated queued events and print misleading cumulative warnings. Both conditions must be handled robustly inside the application, without exposing prompt-history or event-backpressure messages in the normal user interface.

## What Changes

- Recover automatically from transient history locks, worker delays, and recoverable worker loss with bounded asynchronous retries, safe request accounting, and preserved local recall.
- Resume persistence and refresh in the same UI instance without requiring restart; preserve confirmed-commit, uncertain-write, retention, profile-isolation, and two-second shutdown boundaries.
- Replace arbitrary FIFO eviction with keyed supersession of replaceable state, protected semantic/control delivery, generation/order barriers, and explicit bounded recovery for exceptional nonreplaceable saturation.
- Preserve final transcript content, command outcomes, run/message completion, status transitions, keyboard responsiveness, and existing rendering cadence under streaming bursts.
- Keep background-history failures and event-pressure telemetry developer-only. Neither the current messages, renamed equivalents, repeated recovery notices, nor history shutdown warnings may appear in notifications, status text, transcript, or terminal output. This is not a text-filter-only fix.
- Add correctness, resource-bound, automatic-recovery, and zero-user-warning acceptance coverage, including both pressures occurring together.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `persistent-prompt-history`: Require quiet automatic transient recovery and truthful bounded durability without background-storage messages leaking into the normal UI.
- `owned-pi-ui-foundation`: Require safe bounded event supersession, protected semantic ordering, recovery on exceptional saturation, and no user-facing backpressure telemetry.

## Impact

- History service, worker protocol, controller, composition wiring, and shell shutdown reporting; engine adapter event buffering and its shell/contract consumers; focused and rendering/input integration tests.
- No relocation of history files, database erasure, retention expansion, prompt-content logging, changes to the dependency-certification PR, or changes to the `a1 pi`/untouched pinned-Pi comparison paths.
- Existing input-turn and stream-presentation guarantees remain mandatory. Coordinate overlapping rendering work without folding its broader viewport or renderer changes into this change.
