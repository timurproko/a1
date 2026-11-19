## Why

Bare A1 can finish a successful compaction while its visible estimate still reads roughly `40%` to `50%`. The estimator counts streamed summary characters against a previous-summary or 4,000-character denominator, but pinned Pi's stream resolves its public final-result promise before an independent async iterator can consume the terminal event; Pi can therefore emit `compaction_end` and invalidate A1's observer before the observer publishes `100%`.

## What Changes

- Observe successful completion through the summary stream's public final-result promise, registered before the stream is returned to Pi.
- Publish terminal `100%` before Pi can advance from that same result to the real compaction-end lifecycle event.
- Keep intermediate percentages explicitly estimated from streamed characters, starting at `0%`, remaining monotonic, and capped at `99%` until successful completion is known.
- Reject terminal progress from failed, stale, ended, or disposed observations.
- Add focused coverage for pinned Pi's real result-before-iterator ordering and the default bare-A1 lifecycle.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: a successfully resolved observable compaction summary publishes `100%` even when Pi consumes the final result before A1's independent iterator reaches the stream terminator.

## Impact

The change affects the compaction progress observer in `src/integrations/pi/engine/compaction-progress.ts` and focused observer, adapter, and pinned-session lifecycle tests. It does not change compaction generation, summary prompts, thresholds, provider requests, cancellation, queued input, or the `a1 pi` comparison presentation. Intermediate progress remains an estimate because providers do not expose the final summary length before generation completes; the endpoints become deterministic at `0%` and successful `100%`.
