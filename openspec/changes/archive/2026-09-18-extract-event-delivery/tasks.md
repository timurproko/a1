## 1. Extraction

- [x] 1.1 Add `src/integrations/pi/engine/event-delivery.ts` (`PiEventDelivery` with the `sessionId`, `sessionGeneration`, `transcriptBlock`, `retainEvent`, `isPendingCommand`, `cancelForOverload`, `reconcileOverload`, and `listenerFailed` ports); move the listener map, sequence counter, pending queue, drain loop, overload transition, and reserved outcomes verbatim; export `PiEmittedEvent`.
- [x] 1.2 In `adapter.ts`, replace the nine delivery fields with one `PiEventDelivery`, keep `#emitEvent` as the view-revision bump plus `delivery.emit`, turn the cancel and reconcile steps into `#cancelForOverload` and `#reconcileOverload(cancelled)`, route `onEvent`, `deliveryDiagnostics`, `flushEvents`, `view`, `#bindSession`, and `#setTranscript` through the class, and read `delivery.overloaded` at the eight guards.

## 2. Proof

- [x] 2.1 Add `test/integrations/pi/engine/event-delivery.test.ts` (8 cases) for ordered delivery, one delivery per event-loop turn, live block coalescing, generation invalidation, overload with reserved outcomes, failed cancellation, listener failure, and subscription cut-off.
- [x] 2.2 Re-pin `config/startup-graph-baseline.json` to 140 files and 1,388,891 bytes; run `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, and the engine, session-shell, owned-UI, and composition suites; record outcomes: all checks OK, 1,342 passed plus 8 new, `adapter.ts` 3,257 to 3,137 lines.
