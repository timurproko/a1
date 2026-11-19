# Design

## Delivery decides when, the adapter decides what

The cluster reached into the adapter in five places: the session id and generation for stamping and invalidation, the projection for lazy block materialization and asset retention, the pending command map for outcome reservation, the cancel-and-abort sequence when the queue saturates, and the state rebuild after it drains. Each becomes a port. The two that carry behavior, `cancelForOverload()` and `reconcileOverload(cancelled)`, stay in the adapter as `#cancelForOverload` and `#reconcileOverload`; the class only sequences them: reserve, cancel with the 2 s timeout, drain, await the cancellation verdict, reconcile, drop the reservation, clear the overload.

## Reentrancy is preserved by construction order

`beginOverload` sets the overload promise to a resolved placeholder before it calls `cancelForOverload()`, and the port runs the pending cancellations synchronously, so an outcome produced reentrantly by a cancellation is reserved rather than pushed into the saturated queue, as before. The port returns the abort as a promise deferred by one microtask so the abort still runs after the cancellations, exactly as the inline code did.

## Reserved outcomes are taken, then dropped

The adapter's reconciliation replays `takeReservedOutcomes()` through `deliverNow` with a macrotask between each, as it did with the private map. An outcome reserved while that replay yields was cleared without delivery before; the class clears its map when the overload ends so that stays true and the next overload starts empty.

## The one-event-per-turn drain stays

`EVENT_DELIVERY_BATCH` moves with its rationale comment and keeps the value 1 that pinned Pi's terminal input responsiveness required; the unit suite asserts one delivery per macrotask so a future change to the batch is a reviewed one.

## Verbatim move

Method bodies move without edits beyond renaming the collaborators above and dropping the `#` from members that become the class's public surface. `#emitEvent` keeps its signature through the exported `PiEmittedEvent` union so the adapter's 18 emit sites and the projection's `blockChanged` port are untouched, and `flushEvents`, `onEvent`, and `deliveryDiagnostics` keep their public contracts.
