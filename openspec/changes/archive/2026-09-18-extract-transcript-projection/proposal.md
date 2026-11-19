## Why

`src/integrations/pi/engine/adapter.ts` is 3,756 lines, one class with 142 methods and 99 private fields. Its largest self-contained cluster is transcript reconciliation: the block list and its index, message and tool block identity across streaming and rebuilds, revision numbering, image asset retention, the projection of Pi's untyped messages into `OwnedUiTranscriptBlock`s, and the rules that keep late or duplicate tool events from disturbing a settled block. It is pure data transformation with three outside touch points (the session's messages and retry attempt, the delivery seal, and the `transcript-block` emit), which makes it the safest first cut and the one that can be unit-tested without an engine.

## What Changes

- Add `src/integrations/pi/engine/transcript-projection.ts`: `PiTranscriptProjection` owns the transcript state and the message, tool, rebuild, merge, settle, and revision logic moved verbatim from the adapter; it takes `retryAttempt()` and `blockChanged(block)` ports and exposes `blocks`, `snapshot()`, `block(id)`, `replace`, `rebuild` (returns the new list), `mergeRun(messages, sessionMessages)`, `upsertMessage`, `messageBlocks`, `upsertToolExecution`, `upsert`, `settleFailedDeclarations`, `imageReferences`, `nextRevision`, and `assets`.
- Add `src/integrations/pi/engine/message-values.ts` with the pure readers both modules share (`isRecord`, `stringValue`, `finiteNumber`, `textFromContent`, `assistantContent`, `contentImageCount`, `jsonSummary`, `sanitizeJson`, `messageFallbackKey`, `retainCompletedArguments`, `sameBlockContent`).
- The adapter keeps `#setTranscript` as the delivery-seal check around `projection.replace`, forwards every event to the projection, and emits `transcript-block` from the port; 500 lines leave it.
- Add `test/integrations/pi/engine/transcript-projection.test.ts` covering identity stability, repeat suppression, settled-tool protection, declaration settlement, rebuild reuse, run merge, and revision numbering.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: transcript reconciliation is one adapter-owned projection with explicit inputs and a change port, testable without the engine.

## Impact

`adapter.ts` goes from 3,756 to 3,257 lines. No behavior changes: the 662 engine, session-shell, owned-UI, and composition cases pass unchanged, and the moved code differs only in how it names its collaborators. The startup graph baseline moves to the exact new totals (139 files, 1,384,596 bytes) for the two new modules' headers and imports.
