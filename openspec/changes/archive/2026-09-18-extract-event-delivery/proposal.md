## Why

`src/integrations/pi/engine/adapter.ts` is 3,257 lines after the transcript projection left it. Its next self-contained cluster is event delivery: listener registration, sequence stamping, the bounded pending queue, the one-event-per-turn drain loop, generation invalidation, and the overload transition that cancels admitted work, reserves pending command outcomes, and hands the adapter one reconciliation once the queue drains. That cluster is spread over nine private fields and eight methods, guards eight unrelated call sites through `this.#overload !== undefined`, and can only be exercised today through a full engine session.

## What Changes

- Add `src/integrations/pi/engine/event-delivery.ts`: `PiEventDelivery` owns the listeners, the sequence counter, the `PendingEngineDelivery` queue, the drain loop, the overload promise and counters, and the reserved command outcomes. It takes ports for `sessionId()`, `sessionGeneration()`, `transcriptBlock(id)`, `retainEvent(event)`, `isPendingCommand(id)`, `cancelForOverload()`, `reconcileOverload(cancelled)`, and `listenerFailed(message)`, and exposes `stamp`, `emit`, `enqueue`, `subscribe`, `deliverNow`, `beginOverload`, `seal`, `discardObsolete`, `takeReservedOutcomes`, `settle`, `overloaded`, `failed`, `clearFailure`, `sequence`, and `diagnostics()`. `PiEmittedEvent` is the exported input union.
- The adapter keeps a two-line `#emitEvent` (view revision bump plus `delivery.emit`) so its 18 emit sites are untouched, provides `#cancelForOverload` and `#reconcileOverload(cancelled)` as the ports, and reads `delivery.overloaded` where it used to inspect the promise; 120 lines leave it.
- Add `test/integrations/pi/engine/event-delivery.test.ts` covering ordered delivery, per-turn yielding, live block coalescing, generation invalidation, overload with reserved outcomes, failed cancellation, listener failure, and subscription cut-off.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: bounded delivery is one adapter-owned class with explicit ports, testable without the engine.

## Impact

`adapter.ts` goes from 3,257 to 3,137 lines. No behavior changes: the engine, session-shell, owned-UI, and composition suites pass unchanged, and the moved code differs only in how it names its collaborators. The startup graph baseline moves to the exact new totals (140 files, 1,388,892 bytes) for the new module's header and ports.
