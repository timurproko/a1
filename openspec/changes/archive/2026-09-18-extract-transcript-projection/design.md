# Design

## Ports, not references

The cluster reached outside itself in three places. `mergeRunTranscript` read `this.#session.messages` to place run-local messages by their session position; the projection takes those messages as a second argument, so the adapter passes the authoritative scope it already owns. `declarationFailure` read `this.#session.retryAttempt` to word an aborted declaration; the projection asks `ports.retryAttempt()` when it needs it, keeping the wording lazy as before. `upsertTranscriptBlock` emitted `transcript-block`; the projection calls `ports.blockChanged(block)` at the same point, and the adapter's port emits the same event, so ordering relative to other emits is unchanged.

## Sealing stays with delivery

`setTranscript` began with the delivery-seal check (`eventQueue.seal()`, else `beginOverload()`), which belongs to event delivery, not to the transcript. The adapter keeps `#setTranscript` as exactly that check followed by `projection.replace(blocks)`. `rebuild` therefore returns the new block list instead of storing it, so the adapter's `#setTranscript(projection.rebuild(...))` preserves the seal-then-replace order at both call sites (session bind and settlement); the overload path's `replace` of live-to-finalized blocks likewise maps `projection.blocks` and goes through `#setTranscript`.

## Image assets ride along

`TranscriptImageAssets` was retained and released by the moved methods, cleared on bind and dispose by the adapter, and consulted by the pending-delivery queue and the image resolver. It moves into the projection as a public `assets` member so the adapter's remaining uses read `projection.assets`; the retention bookkeeping stays exactly where it was relative to each block change.

## Shared readers

Eleven pure helpers were module-level functions in the adapter and are used on both sides after the cut. They move to `message-values.ts`; the projection imports nine, the adapter four. Nothing else in `engine/` exported an `isRecord`, so no consolidation question arises yet; the components package has its own, which stays.

## Verbatim move

Method bodies are moved without edits beyond renaming the collaborators above and dropping the `#` from the members that become the projection's public surface. That is deliberate: the change is checked by the existing 662 cases plus the new unit suite, and a reviewer can diff each method against its old position.
