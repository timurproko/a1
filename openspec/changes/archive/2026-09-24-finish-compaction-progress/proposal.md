## Why

Compaction progress can remain at `99%` after summary text has finished streaming, making a normally finishing compaction look stuck. The status should reach a truthful completion value at the observable stream boundary and then disappear when Pi reports the compaction ended.

## What Changes

- Publish `100%` when an observed compaction summary stream completes normally.
- Keep estimated character-based progress capped at `99%` while summary text is still streaming, so an estimate alone cannot claim completion.
- Clear the compacting status only on the real compaction-end lifecycle event; progress presentation will not abort or otherwise control compaction.
- Extend the owned status contract and focused lifecycle coverage to accept and render the terminal `100%` state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: observable bare-A1 compactions reach `100%` when their summary stream completes, before the actual compaction-end event clears the status.

## Impact

The change affects the compaction progress observer, the owned status validation range, and focused engine/component tests under `src/integrations/pi/` and `test/integrations/pi/`. It does not alter summary generation, compaction thresholds, provider requests, cancellation, queued input, or the `a1 pi` comparison presentation.
