## 1. Extraction

- [x] 1.1 Add `src/integrations/pi/engine/message-values.ts` with the eleven pure readers moved out of `adapter.ts`.
- [x] 1.2 Add `src/integrations/pi/engine/transcript-projection.ts` (`PiTranscriptProjection` with `retryAttempt` and `blockChanged` ports); move `setTranscript` (as `replace`), `transcriptBlock`, `mergeRunTranscript`, `rebuildTranscript`, `upsertMessageBlock`, `messageBlocks`, `declarationFailure`, `settleFailedDeclarations`, `imageReferences`, `upsertToolExecutionBlock`, `upsertTranscriptBlock`, `messageBlockId`, and `nextBlockRevision` verbatim; expose the image assets.
- [x] 1.3 In `adapter.ts`, replace the eight transcript fields with one projection, keep `#setTranscript` as the seal check plus `replace`, route every call site through the projection, and drop the now-unused imports.

## 2. Proof

- [x] 2.1 Add `test/integrations/pi/engine/transcript-projection.test.ts` (7 cases) for identity stability, repeat suppression, settled-tool protection, declaration settlement, rebuild reuse, run merge, and revision numbering.
- [x] 2.2 Re-pin `config/startup-graph-baseline.json` to 139 files and 1,384,596 bytes; run `npm run typecheck`, `check:architecture`, `check:code-documentation`, and the engine, session-shell, owned-UI, and composition suites; record outcomes: all checks OK, 662 passed plus 7 new, `adapter.ts` 3,756 to 3,257 lines.
